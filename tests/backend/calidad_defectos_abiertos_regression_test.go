package backend_test

// Pruebas que documentan defectos ABIERTOS registrados en docs/calidad/04-bitacora-defectos.md.
// Cada prueba afirma el comportamiento correcto; por eso falla mientras el defecto exista.
// Se omiten por defecto y se ejecutan con CALIDAD_DEFECTOS_ABIERTOS=1 (ver requireDefectoAbierto).

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"saludconecta-backend/adapters/email"
	"saludconecta-backend/adapters/pdf"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/crypto"
	"saludconecta-backend/pkg/logger"
)

const medicoSemillaID = "usr-med-0002"

// Desde la v2 la sincronizacion descarta folios cuyo ID no es un UUID, por eso estos folios usan UUID fijos.
const (
	folioDEF07 = "0b7e2f43-0007-4c1a-9a00-000000000007"
	folioDEF18 = "0b7e2f43-0018-4c1a-9a00-000000000018"
	folioDEF30 = "0b7e2f43-0030-4c1a-9a00-000000000030"
)

func sembrarPacienteYFolio(t *testing.T, ds *memory.DataStore, patientID, recordID, doctorID string) {
	t.Helper()
	ctx := context.Background()
	sembrarMedicoSemilla(t, memory.NewUserMemoryRepo(ds))
	if err := memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture(patientID, "DOC-"+patientID)); err != nil {
		t.Fatalf("No se pudo crear el paciente: %v", err)
	}
	record := &domain.ClinicalRecord{
		ID: recordID, PatientID: patientID, DoctorID: doctorID,
		Anamnesis: "Anamnesis original", PhysicalExam: "Examen", CIE11Code: "CA02",
		DiagnosisDescription: "Diagnostico", TreatmentPlan: "Plan", CreatedAt: time.Now().UTC(),
	}
	if err := memory.NewClinicalRecordMemoryRepo(ds).Create(ctx, record); err != nil {
		t.Fatalf("No se pudo crear el folio: %v", err)
	}
}

// DEF-29: el separador '|' no se escapa, por lo que entradas distintas producen el mismo hash.
func TestDEF29HashSinColisionPorDelimitador(t *testing.T) {
	requireDefectoAbierto(t, "DEF-29")
	h1 := crypto.CalculateChainedRecordHash("prev", "pac", "doc", "dolor|toracico", "normal", "BA00", "dx", "plan", "2026-01-01T00:00:00Z")
	h2 := crypto.CalculateChainedRecordHash("prev", "pac", "doc", "dolor", "toracico|normal", "BA00", "dx", "plan", "2026-01-01T00:00:00Z")
	if h1 == h2 {
		defectoReproducido(t, "DEF-29", "Dos folios con anamnesis y examen fisico distintos producen el mismo hash: %s", h1)
	}
}

// DEF-30: VerifyIntegrity recalcula con el previous_hash almacenado sin comprobar que exista en la cadena.
// v2: la sincronizacion ya no acepta el hash previo del cliente, pero la verificacion sigue sin validar el
// enlace. Se simula un folio alterado en el almacenamiento (acceso directo a la base de datos o adaptador
// defectuoso) cuyo previous_hash no corresponde a ningun folio anterior del paciente.
func TestDEF30VerificacionValidaEnlaceConFolioAnterior(t *testing.T) {
	requireDefectoAbierto(t, "DEF-30")
	ctx := context.Background()
	ds := memory.NewDataStore()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def30", "DOC-30"))
	sembrarMedicoSemilla(t, memory.NewUserMemoryRepo(ds))
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	cerrado := time.Now().UTC().Truncate(time.Second)
	inventado := strings.Repeat("f", 64)
	firma := "firma"
	rec := &domain.ClinicalRecord{
		ID: folioDEF30, PatientID: "p-def30", DoctorID: medicoSemillaID, Anamnesis: "x", PhysicalExam: "y",
		CIE11Code: "CA02", DiagnosisDescription: "dx", TreatmentPlan: "plan", CreatedAt: cerrado,
	}
	hash := crypto.CalculateChainedRecordHash(inventado, rec.PatientID, rec.DoctorID, rec.Anamnesis, rec.PhysicalExam,
		rec.CIE11Code, rec.DiagnosisDescription, rec.TreatmentPlan, cerrado.Format(time.RFC3339))
	rec.IsClosed, rec.ClosedAt, rec.PreviousHash, rec.HashSHA256, rec.SignatureToken = true, &cerrado, &inventado, &hash, &firma
	if err := recordRepo.Create(ctx, rec); err != nil {
		t.Fatalf("No se pudo preparar el folio alterado: %v", err)
	}

	svc := services.NewClinicalRecordService(recordRepo, memory.NewPatientMemoryRepo(ds), memory.NewUserMemoryRepo(ds))
	if ok, _ := svc.VerifyIntegrity(ctx, folioDEF30); ok {
		defectoReproducido(t, "DEF-30", "Un folio cuyo previous_hash no corresponde a ningun folio anterior se reporta como integro")
	}
}

// ---------------------------------------------------------------------------------------------
// Defectos nuevos detectados en la reverificacion v2 (7 nov 2026). Fichas DEF-49 en adelante.
// ---------------------------------------------------------------------------------------------

func entornoV2(t *testing.T) (*memory.DataStore, ports.TreatmentService, ports.PharmacyService) {
	t.Helper()
	ds := memory.NewDataStore()
	sembrarMedicoSemilla(t, memory.NewUserMemoryRepo(ds))
	// El PDF se genera en una goroutine que puede terminar despues de la prueba; el directorio se borra con margen.
	dir, err := os.MkdirTemp("", "calidad-pdf-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { time.Sleep(300 * time.Millisecond); _ = os.RemoveAll(dir) })
	log := logger.New()
	prescV2 := memory.NewPrescriptionV2MemoryRepo(ds)
	treat := services.NewTreatmentService(prescV2, memory.NewPatientMemoryRepo(ds), memory.NewUserMemoryRepo(ds),
		pdf.NewGenerator(dir), email.NewService(email.Config{}, log), log)
	pharm := services.NewPharmacyService(memory.NewInventoryMemoryRepo(ds), prescV2, log)
	return ds, treat, pharm
}

func recetaV2(patientID string, items ...domain.PrescriptionItemV2) *domain.PrescriptionV2 {
	return &domain.PrescriptionV2{DoctorID: medicoSemillaID, PatientID: patientID, Items: items}
}

func peticionJSON(t *testing.T, env calidadEnv, metodo, ruta, cuerpo, token string) (int, map[string]interface{}) {
	t.Helper()
	req := httptest.NewRequest(metodo, ruta, strings.NewReader(cuerpo))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := env.app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]interface{}
	_ = json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

// DEF-49: POST /api/v1/auth/register-admin es publico y crea un ADMIN activo sin autenticacion.
func TestDEF49RegistroDeAdministradorRequiereAutenticacion(t *testing.T) {
	requireDefectoAbierto(t, "DEF-49")
	env := newCalidadEnv(t)
	cuerpo := `{"full_name":"Atacante Anonimo","document_type":"CC","document_number":"900000049","email":"intruso49@example.com","password":"ClaveIntrusa-2026!","phone":"3000000049","branch":"Sede Cartago","professional_card":"ADM-49"}`
	estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v1/auth/register-admin", cuerpo, "")
	u, err := memory.NewUserMemoryRepo(env.ds).GetByEmail(context.Background(), "intruso49@example.com")
	creado := err == nil && u.RoleName == "ADMIN" && u.IsActive
	if creado || (estado != http.StatusUnauthorized && estado != http.StatusForbidden) {
		defectoReproducido(t, "DEF-49", "Peticion anonima a register-admin: estado %d; administrador activo creado=%v", estado, creado)
	}
}

// DEF-50: GET /api/v1/auth/mfa-seed es publico y devuelve el secreto TOTP vigente de cualquier cuenta.
func TestDEF50SemillaMFANoSeExponeSinAutenticacion(t *testing.T) {
	requireDefectoAbierto(t, "DEF-50")
	env := newCalidadEnv(t)
	repo := memory.NewUserMemoryRepo(env.ds)
	secreto, _ := crypto.GenerateMFASecret()
	u, err := repo.GetByID(context.Background(), medicoSemillaID)
	if err != nil {
		t.Fatal(err)
	}
	_ = repo.UpdateMFA(context.Background(), medicoSemillaID, secreto, true)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/mfa-seed?email="+u.Email, nil)
	res, err := env.app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var cuerpo bytes.Buffer
	_, _ = cuerpo.ReadFrom(res.Body)
	if strings.Contains(cuerpo.String(), secreto) {
		defectoReproducido(t, "DEF-50", "Sin token, mfa-seed devolvio (estado %d) el secreto TOTP vigente del medico", res.StatusCode)
	}
}

// DEF-51: la prescripcion v2 (/api/v2/treatments/dispatch) no cruza las alergias del paciente.
func TestDEF51PrescripcionV2CruzaAlergias(t *testing.T) {
	requireDefectoAbierto(t, "DEF-51")
	ds, treat, _ := entornoV2(t)
	ctx := context.Background()
	patients := memory.NewPatientMemoryRepo(ds)
	_ = patients.Create(ctx, newPatientFixture("p-def51", "DOC-51"))
	_ = patients.AddPatientAllergy(ctx, &domain.PatientAllergy{PatientID: "p-def51", ActiveIngredient: "PENICILINA", Severity: domain.SeveritySevere})

	_, err := treat.DispatchTreatment(ctx, recetaV2("p-def51", domain.PrescriptionItemV2{InventoryItemID: "inv-amox-500", MedicationName: "Amoxicilina", Dosage: "500 mg", QuantityPrescribed: 10}))
	var conflicto *domain.AllergyConflictError
	if !errors.As(err, &conflicto) {
		defectoReproducido(t, "DEF-51", "Receta v2 de amoxicilina para paciente alergico a penicilina emitida; err=%v", err)
	}
}

// DEF-52: la receta v2 acepta cantidades negativas; al dispensarla el inventario aumenta.
func TestDEF52RecetaV2RechazaCantidadNoPositiva(t *testing.T) {
	requireDefectoAbierto(t, "DEF-52")
	ds, treat, pharm := entornoV2(t)
	ctx := context.Background()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def52", "DOC-52"))
	inv := memory.NewInventoryMemoryRepo(ds)
	antes, err := inv.GetByID(ctx, "inv-risp-3")
	if err != nil {
		t.Fatal(err)
	}
	stockAntes := antes.StockQuantity

	presc, err := treat.DispatchTreatment(ctx, recetaV2("p-def52", domain.PrescriptionItemV2{InventoryItemID: "inv-risp-3", MedicationName: "Risperidona", Dosage: "3 mg", QuantityPrescribed: -50}))
	if err != nil {
		return
	}
	_, _ = pharm.DispensePrescription(ctx, domain.DispenseRequestDTO{PrescriptionID: presc.ID, PatientDocument: "DOC-52"})
	despues, _ := inv.GetByID(ctx, "inv-risp-3")
	defectoReproducido(t, "DEF-52", "Receta con cantidad -50 emitida; stock de risperidona %d -> %d tras dispensar", stockAntes, despues.StockQuantity)
}

// DEF-53: la farmacia dispensa sin verificar el documento del paciente cuando no se escanea.
func TestDEF53DispensacionExigeDocumentoDelPaciente(t *testing.T) {
	requireDefectoAbierto(t, "DEF-53")
	ds, treat, pharm := entornoV2(t)
	ctx := context.Background()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def53", "DOC-53"))
	presc, err := treat.DispatchTreatment(ctx, recetaV2("p-def53", domain.PrescriptionItemV2{InventoryItemID: "inv-aceta-500", MedicationName: "Acetaminofen", Dosage: "500 mg", QuantityPrescribed: 2}))
	if err != nil {
		t.Fatalf("No se pudo emitir la receta: %v", err)
	}
	if _, err := pharm.DispensePrescription(ctx, domain.DispenseRequestDTO{PrescriptionID: presc.ID}); err == nil {
		defectoReproducido(t, "DEF-53", "Receta dispensada sin documento de identidad del paciente")
	}
}

// DEF-54: la dispensacion no comprueba la fecha de vencimiento del lote.
func TestDEF54NoDispensaMedicamentoVencido(t *testing.T) {
	requireDefectoAbierto(t, "DEF-54")
	ds, treat, pharm := entornoV2(t)
	ctx := context.Background()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def54", "DOC-54"))
	inv := memory.NewInventoryMemoryRepo(ds)
	item, err := inv.GetByID(ctx, "inv-amox-250")
	if err != nil {
		t.Fatal(err)
	}
	item.ExpiryDate = time.Now().AddDate(0, 0, -1)
	if err := inv.Update(ctx, item); err != nil {
		t.Fatalf("No se pudo vencer el lote: %v", err)
	}
	presc, err := treat.DispatchTreatment(ctx, recetaV2("p-def54", domain.PrescriptionItemV2{InventoryItemID: "inv-amox-250", MedicationName: "Amoxicilina", Dosage: "250 mg", QuantityPrescribed: 1}))
	if err != nil {
		t.Fatalf("No se pudo emitir la receta: %v", err)
	}
	if _, err := pharm.DispensePrescription(ctx, domain.DispenseRequestDTO{PrescriptionID: presc.ID, PatientDocument: "DOC-54"}); err == nil {
		defectoReproducido(t, "DEF-54", "Se dispenso un lote vencido el %s", item.ExpiryDate.Format("2006-01-02"))
	}
}

// DEF-55: eliminar un paciente borra sus alergias; al readmitirlo el cruce de alergias deja de alertar.
func TestDEF55EliminarPacienteNoPierdeAntecedentesAlergicos(t *testing.T) {
	requireDefectoAbierto(t, "DEF-55")
	ctx := context.Background()
	svc := services.NewPatientService(memory.NewPatientMemoryRepo(memory.NewDataStore()))
	p, err := svc.RegisterPatient(ctx, newPatientFixture("", "DOC-55"))
	if err != nil {
		t.Fatalf("No se pudo admitir: %v", err)
	}
	if _, err := svc.AddAllergy(ctx, &domain.PatientAllergy{PatientID: p.ID, ActiveIngredient: "PENICILINA", Severity: domain.SeveritySevere}); err != nil {
		t.Fatalf("No se pudo registrar la alergia: %v", err)
	}
	if err := svc.DeletePatient(ctx, p.ID); err != nil {
		return
	}
	readmitido, err := svc.RegisterPatient(ctx, newPatientFixture("", "DOC-55"))
	if err != nil {
		t.Fatalf("No se pudo readmitir: %v", err)
	}
	alergias, _ := svc.GetAllergies(ctx, readmitido.ID)
	if len(alergias) == 0 {
		defectoReproducido(t, "DEF-55", "Paciente eliminado fisicamente; al readmitirlo no conserva su alergia a penicilina")
	}
}

// DEF-57: una nota anatomica puede asociarse al folio de otro paciente y de otro medico.
func TestDEF57NotaAnatomicaCoincideConPacienteDelFolio(t *testing.T) {
	requireDefectoAbierto(t, "DEF-57")
	ctx := context.Background()
	ds := memory.NewDataStore()
	sembrarPacienteYFolio(t, ds, "p-def57-a", "cr-def57-a", medicoSemillaID)
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def57-b", "DOC-57B"))
	userRepo := memory.NewUserMemoryRepo(ds)
	_ = userRepo.Create(ctx, newDoctorFixture("usr-def57-b", "RM-DEF57"))
	svc := services.NewClinicalRecordService(memory.NewClinicalRecordMemoryRepo(ds), memory.NewPatientMemoryRepo(ds), userRepo)

	folio := "cr-def57-a"
	_, err := svc.AddAnatomicalNote(ctx, &domain.ClinicalAnatomicalNote{
		ClinicalRecordID: &folio, PatientID: "p-def57-b", DoctorID: "usr-def57-b",
		StructureKey: "torax", StructureName: "Torax", PainLevel: 7, DoctorObservation: "Dolor",
	})
	if err == nil {
		defectoReproducido(t, "DEF-57", "Nota del paciente B aceptada sobre el folio del paciente A, escrita por un medico ajeno al folio")
	}
}

// DEF-58: reenviar una receta v2 con el ID de una receta ya dispensada la reactiva y permite dispensarla otra vez.
func TestDEF58RecetaDispensadaNoSeReactiva(t *testing.T) {
	requireDefectoAbierto(t, "DEF-58")
	ds, treat, pharm := entornoV2(t)
	ctx := context.Background()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def58", "DOC-58"))
	item := domain.PrescriptionItemV2{InventoryItemID: "inv-ibup-400", MedicationName: "Ibuprofeno", Dosage: "400 mg", QuantityPrescribed: 5}
	presc, err := treat.DispatchTreatment(ctx, recetaV2("p-def58", item))
	if err != nil {
		t.Fatalf("No se pudo emitir la receta: %v", err)
	}
	if _, err := pharm.DispensePrescription(ctx, domain.DispenseRequestDTO{PrescriptionID: presc.ID, PatientDocument: "DOC-58"}); err != nil {
		t.Fatalf("Primera dispensacion fallida: %v", err)
	}
	repetida := recetaV2("p-def58", item)
	repetida.ID = presc.ID
	if _, err := treat.DispatchTreatment(ctx, repetida); err != nil {
		return
	}
	if _, err := pharm.DispensePrescription(ctx, domain.DispenseRequestDTO{PrescriptionID: presc.ID, PatientDocument: "DOC-58"}); err == nil {
		defectoReproducido(t, "DEF-58", "La receta %s se dispenso dos veces tras reenviarla con el mismo ID", presc.ID)
	}
}

// DEF-59: el adaptador en memoria dispensa recetas canceladas.
func TestDEF59NoDispensaRecetaCancelada(t *testing.T) {
	requireDefectoAbierto(t, "DEF-59")
	ds := memory.NewDataStore()
	ctx := context.Background()
	repo := memory.NewPrescriptionV2MemoryRepo(ds)
	presc := &domain.PrescriptionV2{ID: "rx-def59", PatientDocument: "DOC-59", Status: domain.PrescriptionStatusCancelled,
		Items: []domain.PrescriptionItemV2{{ID: "it-59", InventoryItemID: "inv-aceta-500", QuantityPrescribed: 1}}}
	if err := repo.CreateWithItemsTx(ctx, presc); err != nil {
		t.Fatal(err)
	}
	pharm := services.NewPharmacyService(memory.NewInventoryMemoryRepo(ds), repo, logger.New())
	if _, err := pharm.DispensePrescription(ctx, domain.DispenseRequestDTO{PrescriptionID: "rx-def59", PatientDocument: "DOC-59"}); err == nil {
		defectoReproducido(t, "DEF-59", "Receta en estado CANCELLED dispensada")
	}
}

// DEF-60: una alergia registrada a un farmaco concreto no se extiende a su familia (amoxicilina -> ampicilina).
func TestDEF60AlergiaAFarmacoSeExtiendeASuFamilia(t *testing.T) {
	requireDefectoAbierto(t, "DEF-60")
	casos := []struct{ alergia, farmaco string }{
		{"AMOXICILINA", "AMPICILINA"},
		{"CEFTRIAXONA", "CEFALEXINA"},
	}
	for _, c := range casos {
		if domain.MatchAllergy([]domain.PatientAllergy{{ActiveIngredient: c.alergia, Severity: domain.SeveritySevere}}, c.farmaco) == nil {
			defectoReproducido(t, "DEF-60", "Alergia a %s no bloquea %s (misma familia farmacologica)", c.alergia, c.farmaco)
		}
	}
}

// DEF-61: el codigo unico de la receta, enviado por el cliente, permite escribir el PDF fuera del directorio.
func TestDEF61PDFNoSaleDelDirectorioDeDocumentos(t *testing.T) {
	requireDefectoAbierto(t, "DEF-61")
	docs := filepath.Join(t.TempDir(), "documents")
	gen := pdf.NewGenerator(docs)
	ruta, _, err := gen.GeneratePrescriptionPDF(&domain.PrescriptionV2{UniqueCode: "/../../escape-def61", PatientName: "X",
		Items: []domain.PrescriptionItemV2{{MedicationName: "M", QuantityPrescribed: 1}}})
	if err != nil {
		return
	}
	abs, _ := filepath.Abs(ruta)
	if !strings.HasPrefix(abs, docs+string(filepath.Separator)) {
		defectoReproducido(t, "DEF-61", "El PDF se escribio fuera de %s: %s", docs, abs)
	}
}

// DEF-67: un dolor EVA fuera de 0-10 se convierte en 0 (sin dolor) sin avisar.
func TestDEF67EscalaEVAFueraDeRangoSeRechaza(t *testing.T) {
	requireDefectoAbierto(t, "DEF-67")
	tr := &domain.TriageRecord{SystolicBP: 120, DiastolicBP: 80, HeartRate: 75, RespiratoryRate: 16, OxygenSaturation: 98, BodyTemperature: 36.8, GlasgowScore: 15, PainScaleScore: 11}
	if err := tr.Validate(); err == nil {
		defectoReproducido(t, "DEF-67", "EVA 11 aceptada y registrada como %d", tr.PainScaleScore)
	}
}

// DEF-68: actualizar solo el telefono borra el correo y la direccion del paciente.
func TestDEF68ActualizacionParcialConservaContacto(t *testing.T) {
	requireDefectoAbierto(t, "DEF-68")
	ctx := context.Background()
	svc := services.NewPatientService(memory.NewPatientMemoryRepo(memory.NewDataStore()))
	p, err := svc.RegisterPatient(ctx, newPatientFixture("", "DOC-68"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.UpdateContact(ctx, p.ID, "paciente68@example.com", "Calle 1", "3000000068"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.UpdateContact(ctx, p.ID, "", "", "3000000069"); err != nil {
		return
	}
	actual, _ := svc.GetPatient(ctx, p.ID)
	if actual.Email == "" {
		defectoReproducido(t, "DEF-68", "Tras actualizar solo el telefono, el correo quedo vacio y la direccion=%q", actual.Address)
	}
}

// DEF-70: un medico puede editar la publicacion de salud de otro medico.
func TestDEF70PublicacionSoloLaEditaSuAutor(t *testing.T) {
	requireDefectoAbierto(t, "DEF-70")
	ctx := context.Background()
	svc := services.NewHealthEducationService(memory.NewHealthEducationMemoryRepo(memory.NewDataStore()))
	autor := newDoctorFixture("usr-def70-a", "RM-70A")
	otro := newDoctorFixture("usr-def70-b", "RM-70B")
	post, err := svc.CreatePost(ctx, autor, &domain.HealthEducationPost{Title: "Lavado de manos", Category: domain.CategoryConsejos, Content: "Contenido original"})
	if err != nil {
		t.Fatalf("No se pudo publicar: %v", err)
	}
	if _, err := svc.UpdatePost(ctx, otro, post.ID, &domain.HealthEducationPost{Title: "Lavado de manos", Category: domain.CategoryConsejos, Content: "Contenido alterado"}); err == nil {
		defectoReproducido(t, "DEF-70", "Un medico distinto al autor modifico la publicacion %s", post.ID)
	}
}

// DEF-72: la ruta de notas anatomicas por paciente declara acceso para AUDITOR, pero el grupo /patients lo bloquea.
func TestDEF72AuditorConsultaNotasAnatomicasDelPaciente(t *testing.T) {
	requireDefectoAbierto(t, "DEF-72")
	env := newCalidadEnv(t)
	sembrarUsuariosPorRol(t, env, []string{"AUDITOR"})
	estado, _ := peticionJSON(t, env, http.MethodGet, "/api/v1/patients/x/anatomical-notes", "", calidadToken(t, "usr-rbac-auditor", "AUDITOR"))
	if estado == http.StatusForbidden || estado == http.StatusUnauthorized {
		defectoReproducido(t, "DEF-72", "AUDITOR recibio %d en una ruta que router.go declara accesible para AUDITOR", estado)
	}
}
