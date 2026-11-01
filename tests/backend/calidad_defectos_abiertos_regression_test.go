package backend_test

// Pruebas que documentan defectos ABIERTOS registrados en docs/calidad/04-bitacora-defectos.md.
// Cada prueba afirma el comportamiento correcto; por eso falla mientras el defecto exista.
// Se omiten por defecto y se ejecutan con CALIDAD_DEFECTOS_ABIERTOS=1 (ver requireDefectoAbierto).

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/crypto"
)

const medicoSemillaID = "usr-med-0002"

func sembrarPacienteYFolio(t *testing.T, ds *memory.DataStore, patientID, recordID, doctorID string) {
	t.Helper()
	ctx := context.Background()
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

// DEF-06: el cruce de alergias compara cadenas exactas; no reconoce la familia farmacologica ni las tildes.
func TestDEF06CruceAlergiasReactividadCruzadaYTildes(t *testing.T) {
	requireDefectoAbierto(t, "DEF-06")
	casos := []struct{ alergia, principio string }{
		{"PENICILINA", "AMOXICILINA"},
		{"ÁCIDO ACETILSALICÍLICO", "ACIDO ACETILSALICILICO"},
	}
	for i, c := range casos {
		ds := memory.NewDataStore()
		ctx := context.Background()
		sembrarPacienteYFolio(t, ds, "p-def06", "cr-def06", medicoSemillaID)
		_ = memory.NewPatientMemoryRepo(ds).AddPatientAllergy(ctx, &domain.PatientAllergy{PatientID: "p-def06", ActiveIngredient: c.alergia, Severity: domain.SeveritySevere})
		ds.SeedMedication(&domain.MedicationCatalog{ID: 600 + i, CommercialName: c.principio, ActiveIngredient: c.principio, StockQuantity: 100})
		svc := services.NewPrescriptionService(memory.NewPrescriptionMemoryRepo(ds), memory.NewClinicalRecordMemoryRepo(ds), memory.NewPatientMemoryRepo(ds))

		_, err := svc.IssuePrescription(ctx, &domain.Prescription{
			ClinicalRecordID: "cr-def06", PatientID: "p-def06", DoctorID: medicoSemillaID,
			Items: []domain.PrescriptionItem{{MedicationID: 600 + i, TotalQuantity: 1}},
		})
		var conflicto *domain.AllergyConflictError
		if !errors.As(err, &conflicto) {
			t.Errorf("Alergia %q frente a %q: se esperaba bloqueo por alergia y se obtuvo err=%v", c.alergia, c.principio, err)
		}
	}
}

// DEF-07: reenviar por sincronizacion un folio cerrado reemplaza su contenido en el adaptador en memoria.
func TestDEF07SincronizacionNoSobrescribeFolioCerrado(t *testing.T) {
	requireDefectoAbierto(t, "DEF-07")
	ds := memory.NewDataStore()
	ctx := context.Background()
	sembrarPacienteYFolio(t, ds, "p-def07", "cr-def07", medicoSemillaID)
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	recordSvc := services.NewClinicalRecordService(recordRepo, memory.NewPatientMemoryRepo(ds), memory.NewUserMemoryRepo(ds))
	if _, err := recordSvc.CloseAndSign(ctx, "cr-def07", medicoSemillaID, "firma"); err != nil {
		t.Fatalf("No se pudo cerrar el folio: %v", err)
	}

	syncSvc := services.NewSyncService(recordRepo, memory.NewPatientMemoryRepo(ds))
	_, _ = syncSvc.ProcessOfflineBatch(ctx, "lote-def07", []domain.ClinicalRecord{{
		ID: "cr-def07", PatientID: "p-def07", DoctorID: medicoSemillaID, Anamnesis: "Anamnesis ALTERADA",
	}})

	rec, _ := recordRepo.GetByID(ctx, "cr-def07")
	if rec.Anamnesis != "Anamnesis original" || !rec.IsClosed {
		t.Errorf("El folio cerrado fue modificado por la sincronizacion: anamnesis=%q cerrado=%v", rec.Anamnesis, rec.IsClosed)
	}
}

// DEF-09: una hipotermia severa (30 °C) con el resto de signos normales se clasifica como no urgente.
func TestDEF09HipotermiaSeveraNoEsNoUrgente(t *testing.T) {
	requireDefectoAbierto(t, "DEF-09")
	tr := &domain.TriageRecord{SystolicBP: 120, DiastolicBP: 80, HeartRate: 75, RespiratoryRate: 16, OxygenSaturation: 98, BodyTemperature: 30.0, GlasgowScore: 15}
	if nivel := tr.SuggestManchesterPriority(); nivel == domain.ManchesterLevelV || nivel == domain.ManchesterLevelIV {
		t.Errorf("Temperatura 30.0 °C clasificada como %s; se esperaba un nivel urgente", nivel)
	}
}

// DEF-13: un token emitido antes de desactivar la cuenta sigue autorizando acceso clinico.
func TestDEF13TokenDeUsuarioDesactivadoEsRechazado(t *testing.T) {
	requireDefectoAbierto(t, "DEF-13")
	env := newCalidadEnv(t)
	token := calidadToken(t, medicoSemillaID, "MEDICO")
	if err := memory.NewUserMemoryRepo(env.ds).UpdateStatus(context.Background(), medicoSemillaID, false); err != nil {
		t.Fatalf("No se pudo desactivar el usuario: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/clinical-records/patient/cualquiera", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := env.app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusUnauthorized && res.StatusCode != http.StatusForbidden {
		t.Errorf("Usuario desactivado obtuvo estado %d con su token previo; se esperaba 401/403", res.StatusCode)
	}
}

// DEF-14: SetupMFA reemplaza el secreto y deja MFA deshabilitado sin exigir el factor actual.
func TestDEF14SetupMFANoDesactivaSegundoFactor(t *testing.T) {
	requireDefectoAbierto(t, "DEF-14")
	ctx := context.Background()
	ds := memory.NewDataStore()
	userRepo := memory.NewUserMemoryRepo(ds)
	auth := services.NewAuthService(userRepo, calidadJWTSecret, time.Hour)
	const clave = "ClaveDePrueba-Calidad-2026"
	user := &domain.User{ID: "usr-def14", RoleID: 2, RoleName: "MEDICO", FullName: "Prueba", Email: "def14@example.com", ProfessionalCard: "RM-1", IsActive: true}
	if err := auth.Register(ctx, user, clave); err != nil {
		t.Fatalf("No se pudo registrar: %v", err)
	}
	secreto, _ := crypto.GenerateMFASecret()
	_ = userRepo.UpdateMFA(ctx, user.ID, secreto, true)

	// Un atacante con un token robado invoca /auth/mfa/setup.
	if _, err := auth.SetupMFA(ctx, user.ID); err != nil {
		t.Fatalf("SetupMFA fallo: %v", err)
	}
	if _, _, err := auth.Login(ctx, user.Email, clave, ""); !errors.Is(err, domain.ErrMFARequired) {
		t.Errorf("Tras SetupMFA el login sin TOTP devolvio err=%v; se esperaba ErrMFARequired", err)
	}
}

// barreraRepo sincroniza dos cierres concurrentes justo despues de leer el ultimo folio cerrado.
type barreraRepo struct {
	ports.ClinicalRecordRepository
	wg *sync.WaitGroup
}

func (b barreraRepo) GetLastClosedRecordByPatient(ctx context.Context, patientID string) (*domain.ClinicalRecord, error) {
	rec, err := b.ClinicalRecordRepository.GetLastClosedRecordByPatient(ctx, patientID)
	b.wg.Done()
	listo := make(chan struct{})
	go func() { b.wg.Wait(); close(listo) }()
	select {
	case <-listo:
	case <-time.After(300 * time.Millisecond):
	}
	return rec, err
}

// DEF-16: dos cierres simultaneos del mismo paciente toman el mismo previous_hash y bifurcan la cadena.
func TestDEF16CierreConcurrenteNoBifurcaCadena(t *testing.T) {
	requireDefectoAbierto(t, "DEF-16")
	ctx := context.Background()
	ds := memory.NewDataStore()
	sembrarPacienteYFolio(t, ds, "p-def16", "cr-def16-a", medicoSemillaID)
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	_ = recordRepo.Create(ctx, &domain.ClinicalRecord{ID: "cr-def16-b", PatientID: "p-def16", DoctorID: medicoSemillaID, Anamnesis: "B", PhysicalExam: "B", CIE11Code: "CA02", TreatmentPlan: "B"})

	var wg sync.WaitGroup
	wg.Add(2)
	svc := services.NewClinicalRecordService(barreraRepo{recordRepo, &wg}, memory.NewPatientMemoryRepo(ds), memory.NewUserMemoryRepo(ds))

	var cerrados sync.WaitGroup
	for _, id := range []string{"cr-def16-a", "cr-def16-b"} {
		cerrados.Add(1)
		go func(id string) {
			defer cerrados.Done()
			_, _ = svc.CloseAndSign(ctx, id, medicoSemillaID, "firma")
		}(id)
	}
	cerrados.Wait()

	a, _ := recordRepo.GetByID(ctx, "cr-def16-a")
	b, _ := recordRepo.GetByID(ctx, "cr-def16-b")
	if a.PreviousHash != nil && b.PreviousHash != nil && *a.PreviousHash == *b.PreviousHash {
		t.Errorf("Ambos folios encadenan al mismo hash previo (%s...); la cadena se bifurco", (*a.PreviousHash)[:16])
	}
}

// DEF-17: un medico puede cerrar el borrador de otro, y la verificacion posterior falla.
func TestDEF17MedicoNoCierraFolioAjeno(t *testing.T) {
	requireDefectoAbierto(t, "DEF-17")
	ctx := context.Background()
	ds := memory.NewDataStore()
	userRepo := memory.NewUserMemoryRepo(ds)
	_ = userRepo.Create(ctx, newDoctorFixture("usr-def17-b", "RM-DEF17"))
	sembrarPacienteYFolio(t, ds, "p-def17", "cr-def17", medicoSemillaID)
	svc := services.NewClinicalRecordService(memory.NewClinicalRecordMemoryRepo(ds), memory.NewPatientMemoryRepo(ds), userRepo)

	_, err := svc.CloseAndSign(ctx, "cr-def17", "usr-def17-b", "firma")
	if err == nil {
		ok, _ := svc.VerifyIntegrity(ctx, "cr-def17")
		t.Errorf("Otro medico cerro el folio ajeno sin error; VerifyIntegrity posterior=%v", ok)
	}
}

// DEF-18: la sincronizacion acepta el DoctorID enviado en el cuerpo en lugar del usuario autenticado.
func TestDEF18SincronizacionUsaMedicoAutenticado(t *testing.T) {
	requireDefectoAbierto(t, "DEF-18")
	env := newCalidadEnv(t)
	_ = memory.NewPatientMemoryRepo(env.ds).Create(context.Background(), newPatientFixture("p-def18", "DOC-18"))

	cuerpo := `{"batch_id":"lote-def18","records":[{"ID":"cr-def18","PatientID":"p-def18","DoctorID":"usr-suplantado","Anamnesis":"x"}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sync/batch", strings.NewReader(cuerpo))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+calidadToken(t, medicoSemillaID, "MEDICO"))
	res, err := env.app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Lote rechazado: estado=%d", res.StatusCode)
	}
	rec, _ := memory.NewClinicalRecordMemoryRepo(env.ds).GetByID(context.Background(), "cr-def18")
	if rec.DoctorID != medicoSemillaID {
		t.Errorf("El folio sincronizado quedo firmado por %q; se esperaba el medico autenticado %q", rec.DoctorID, medicoSemillaID)
	}
}

// DEF-29: el separador '|' no se escapa, por lo que entradas distintas producen el mismo hash.
func TestDEF29HashSinColisionPorDelimitador(t *testing.T) {
	requireDefectoAbierto(t, "DEF-29")
	h1 := crypto.CalculateChainedRecordHash("prev", "pac", "doc", "dolor|toracico", "normal", "BA00", "dx", "plan", "2026-01-01T00:00:00Z")
	h2 := crypto.CalculateChainedRecordHash("prev", "pac", "doc", "dolor", "toracico|normal", "BA00", "dx", "plan", "2026-01-01T00:00:00Z")
	if h1 == h2 {
		t.Errorf("Dos folios con anamnesis y examen fisico distintos producen el mismo hash: %s", h1)
	}
}

// DEF-30: VerifyIntegrity recalcula con el previous_hash almacenado sin comprobar que exista en la cadena.
func TestDEF30VerificacionValidaEnlaceConFolioAnterior(t *testing.T) {
	requireDefectoAbierto(t, "DEF-30")
	ctx := context.Background()
	ds := memory.NewDataStore()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def30", "DOC-30"))
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	cerrado := time.Now().UTC()
	inventado := strings.Repeat("f", 64)
	syncSvc := services.NewSyncService(recordRepo, memory.NewPatientMemoryRepo(ds))
	if _, err := syncSvc.ProcessOfflineBatch(ctx, "lote-def30", []domain.ClinicalRecord{{
		ID: "cr-def30", PatientID: "p-def30", DoctorID: medicoSemillaID, Anamnesis: "x",
		IsClosed: true, ClosedAt: &cerrado, PreviousHash: &inventado,
	}}); err != nil {
		t.Fatalf("Lote rechazado: %v", err)
	}

	svc := services.NewClinicalRecordService(recordRepo, memory.NewPatientMemoryRepo(ds), memory.NewUserMemoryRepo(ds))
	if ok, _ := svc.VerifyIntegrity(ctx, "cr-def30"); ok {
		t.Errorf("Un folio cuyo previous_hash no corresponde a ningun folio anterior se reporta como integro")
	}
}

// DEF-31: una cuenta inactiva responde distinto que una contrasena incorrecta, aun con clave erronea.
func TestDEF31LoginNoRevelaCuentaInactivaConClaveErronea(t *testing.T) {
	requireDefectoAbierto(t, "DEF-31")
	ds := memory.NewDataStore()
	auth := services.NewAuthService(memory.NewUserMemoryRepo(ds), calidadJWTSecret, time.Hour)
	_, _, err := auth.Login(context.Background(), "cyaima@saludconecta.ips.gov.co", "clave-incorrecta", "")
	if !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Errorf("Login con clave incorrecta sobre cuenta inactiva devolvio %v; se esperaba ErrInvalidCredentials", err)
	}
}

// DEF-37: GetByID escribe Clarifications bajo RLock. Solo se manifiesta con el detector de carreras (-race).
func TestDEF37LecturaConcurrenteDeFolioSinCarrera(t *testing.T) {
	requireDefectoAbierto(t, "DEF-37")
	ctx := context.Background()
	ds := memory.NewDataStore()
	sembrarPacienteYFolio(t, ds, "p-def37", "cr-def37", medicoSemillaID)
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	_ = recordRepo.AddClarification(ctx, &domain.ClinicalRecordClarification{ClinicalRecordID: "cr-def37", DoctorID: medicoSemillaID, Note: "n"})

	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = recordRepo.GetByID(ctx, "cr-def37")
		}()
	}
	wg.Wait()
}
