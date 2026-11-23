package backend_test

// Pruebas de regresion de los defectos de backend que seguian abiertos tras la revision R3 (cierre v2, nov 2026).
// Cada prueba falla con el codigo anterior a la correccion y pasa con el actual.

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	"saludconecta-backend/adapters/email"
	httpadapter "saludconecta-backend/adapters/http"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/http/middlewares"
	"saludconecta-backend/adapters/storage"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/config"
	"saludconecta-backend/pkg/crypto"
	"saludconecta-backend/pkg/logger"
	"saludconecta-backend/pkg/retention"
)

// DEF-15: sin TRUSTED_PROXIES solo se acepta X-Real-IP enviada desde la propia maquina.
func TestDEF15ProxiesDeConfianzaPorDefectoSoloLoopback(t *testing.T) {
	env := map[string]string{"JWT_SECRET": strings.Repeat("s", 40)}
	cfg, err := config.LoadFrom(func(k string) string { return env[k] })
	if err != nil {
		t.Fatal(err)
	}
	for _, proxy := range cfg.TrustedProxies {
		if proxy != "127.0.0.1" && proxy != "::1" {
			t.Fatalf("por defecto se confia en %q; un equipo de la red local podria falsear su IP", proxy)
		}
	}

	// Con la configuracion por defecto un cliente que rota X-Real-IP comparte el limite con su IP real
	server := httpadapter.NewServer(httpadapter.ServerConfig{
		RateLimitMax: 1, RateLimitTime: time.Minute, JWTSecret: jwtTestSecret, TrustedProxies: cfg.TrustedProxies,
		RouterConfig: httpadapter.RouterConfig{AuthHandler: handlers.NewAuthHandler(nil), JWTSecret: jwtTestSecret},
	})
	estado := func(ip string) int {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		req.Header.Set("X-Real-IP", ip)
		res, err := server.App().Test(req, -1)
		if err != nil {
			t.Fatal(err)
		}
		return res.StatusCode
	}
	if estado("192.168.1.10") != http.StatusOK {
		t.Fatal("la primera solicitud debia pasar")
	}
	if estado("192.168.1.99") != http.StatusTooManyRequests {
		t.Fatal("cambiar X-Real-IP desde un origen no confiable no debe evadir el limite")
	}
}

// DEF-32: /health/ready responde 503 si la base de datos no responde y no publica afirmaciones de certificacion.
func TestDEF32HealthReadyConsultaLaBaseDeDatos(t *testing.T) {
	var caida bool
	app := fiber.New()
	httpadapter.SetupRoutes(app, httpadapter.RouterConfig{
		JWTSecret:   jwtTestSecret,
		StorageMode: storage.ModePersistent,
		Readiness: func(context.Context) error {
			if caida {
				return errors.New("sin conexion")
			}
			return nil
		},
	})
	pedir := func(ruta string) (int, string) {
		res, err := app.Test(httptest.NewRequest(http.MethodGet, ruta, nil), -1)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(res.Body)
		return res.StatusCode, string(body)
	}
	if code, body := pedir("/api/v1/health/ready"); code != http.StatusOK || !strings.Contains(body, "persistente") {
		t.Fatalf("base disponible: %d %s", code, body)
	}
	caida = true
	if code, _ := pedir("/api/v1/health/ready"); code != http.StatusServiceUnavailable {
		t.Fatalf("con la base caida /health/ready respondio %d; se esperaba 503", code)
	}
	if code, body := pedir("/api/v1/health"); code != http.StatusOK || strings.Contains(body, "ISO") {
		t.Fatalf("/health es la prueba de vida y no debe afirmar certificaciones: %d %s", code, body)
	}
}

// DEF-10: con PostgreSQL los modulos v2 quedarian en memoria; no se arranca asi sin autorizacion explicita.
func TestDEF10PostgresNoArrancaEnModoMixtoSinAutorizacion(t *testing.T) {
	_, err := storage.NewRepositoryBundle(storage.Config{Driver: "postgres", Host: "127.0.0.1", Port: "1"}, logger.New())
	if err == nil || !strings.Contains(err.Error(), "ALLOW_POSTGRES_MEMORY_MODULES") {
		t.Fatalf("se esperaba el rechazo explicito del modo mixto; err=%v", err)
	}
	mem, err := storage.NewRepositoryBundle(storage.Config{Driver: "memory"}, logger.New())
	if err != nil || mem.Mode != storage.ModeMemory {
		t.Fatalf("el adaptador en memoria debe declarar su modo: %+v (%v)", mem, err)
	}
}

// DEF-38: dos recetas simultaneas que juntas superan el stock: una se rechaza completa y no queda guardada.
func TestDEF38RecetaYDescuentoDeStockSonAtomicos(t *testing.T) {
	env := newPrescriptionEnv(t)
	paciente := env.patientWithAllergy(t, "p-def38", "DOC-38", "")
	sembrarMedicoSemilla(t, memory.NewUserMemoryRepo(env.store))
	startMedInjection(env.store, &domain.MedicationCatalog{ID: 838, GenericName: "Losartan", ActiveIngredient: "LOSARTAN", StockQuantity: 5})
	for i := 0; i < 8; i++ {
		env.record(t, fmt.Sprintf("cr-def38-%d", i), paciente.ID, medicoSemillaID)
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	exitos, sinStock := 0, 0
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			err := env.issue(838, fmt.Sprintf("cr-def38-%d", i), paciente.ID, medicoSemillaID)
			mu.Lock()
			defer mu.Unlock()
			switch {
			case err == nil:
				exitos++
			case errors.Is(err, domain.ErrInsufficientMedicationStock):
				sinStock++
			default:
				t.Errorf("error inesperado: %v", err)
			}
		}(i)
	}
	wg.Wait()

	med, _ := env.presc.GetMedicationByID(env.ctx, 838)
	guardadas := 0
	for i := 0; i < 8; i++ {
		if _, err := env.presc.GetByClinicalRecordID(env.ctx, fmt.Sprintf("cr-def38-%d", i)); err == nil {
			guardadas++
		}
	}
	// Cada receta pide 3 unidades y hay 5: solo una puede emitirse
	if exitos != 1 || sinStock != 7 || med.StockQuantity != 2 || guardadas != 1 {
		t.Fatalf("exitos=%d sin stock=%d stock final=%d recetas guardadas=%d; se esperaba 1, 7, 2 y 1",
			exitos, sinStock, med.StockQuantity, guardadas)
	}
}

// DEF-62: las copias locales de PDF y correos se borran al vencer su plazo y el correo no aparece completo en los logs.
func TestDEF62RetencionDeDocumentosYCorreoEnmascarado(t *testing.T) {
	dir := t.TempDir()
	viejo := filepath.Join(dir, "sub", "Receta_vieja.pdf")
	nuevo := filepath.Join(dir, "Receta_nueva.pdf")
	_ = os.MkdirAll(filepath.Dir(viejo), 0o700)
	for _, f := range []string{viejo, nuevo} {
		if err := os.WriteFile(f, []byte("pdf"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	hace40Dias := time.Now().Add(-40 * 24 * time.Hour)
	_ = os.Chtimes(viejo, hace40Dias, hace40Dias)

	borrados, err := retention.PurgeOlderThan(dir, retention.DefaultMaxAge, time.Now())
	if err != nil || borrados != 1 {
		t.Fatalf("borrados=%d err=%v", borrados, err)
	}
	if _, err := os.Stat(viejo); !os.IsNotExist(err) {
		t.Fatal("el documento vencido debia borrarse")
	}
	if _, err := os.Stat(nuevo); err != nil {
		t.Fatal("el documento vigente no debe borrarse")
	}
	if got := email.MaskEmail("lucia@correo.example"); got != "l***@correo.example" {
		t.Fatalf("correo enmascarado: %q", got)
	}
}

// DEF-64: el servidor genera codigos de receta de alta entropia sin repetir, y la busqueda por documento no elige
// la primera receta cuando el paciente tiene varias pendientes.
func TestDEF64CodigosDeRecetaYBusquedaAmbigua(t *testing.T) {
	ds, treat, pharm := entornoV2(t)
	ctx := context.Background()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def64", "DOC-64"))

	vistos := map[string]bool{}
	for i := 0; i < 2000; i++ {
		code := services.GenerateRandomRXCode()
		if vistos[code] {
			t.Fatalf("codigo repetido tras %d generaciones: %s", i, code)
		}
		vistos[code] = true
	}

	item := domain.PrescriptionItemV2{InventoryItemID: "inv-aceta-500", MedicationName: "Acetaminofen", Dosage: "500 mg", QuantityPrescribed: 1}
	recetaCliente := recetaV2("p-def64", item)
	recetaCliente.UniqueCode = "RX-2026-00001"
	primera, err := treat.DispatchTreatment(ctx, recetaCliente)
	if err != nil {
		t.Fatal(err)
	}
	if primera.UniqueCode == "RX-2026-00001" || len(primera.UniqueCode) != len("RX-2026-XXXX-XXXX") {
		t.Fatalf("el codigo debe generarlo el servidor: %s", primera.UniqueCode)
	}
	if _, err := pharm.GetPrescriptionByCodeOrDocument(ctx, "DOC-64"); err != nil {
		t.Fatalf("con una sola receta pendiente la busqueda por documento debe encontrarla: %v", err)
	}
	if _, err := treat.DispatchTreatment(ctx, recetaV2("p-def64", item)); err != nil {
		t.Fatal(err)
	}
	if _, err := pharm.GetPrescriptionByCodeOrDocument(ctx, "DOC-64"); !errors.Is(err, domain.ErrAmbiguousPrescription) {
		t.Fatalf("con dos recetas pendientes se esperaba ErrAmbiguousPrescription; err=%v", err)
	}
	if got, err := pharm.GetPrescriptionByCodeOrDocument(ctx, primera.UniqueCode); err != nil || got.ID != primera.ID {
		t.Fatalf("por codigo debe encontrar exactamente la receta: %v", err)
	}
}

// folioQueFalla simula un repositorio que no puede leer el folio (base de datos caida o error de red).
type folioQueFalla struct {
	ports.ClinicalRecordRepository
}

func (folioQueFalla) GetByID(context.Context, string) (*domain.ClinicalRecord, error) {
	return nil, errors.New("timeout consultando el folio")
}

// DEF-66: si no se puede comprobar el folio, la nota anatomica no se edita ni se borra (falla cerrada).
func TestDEF66NotaAnatomicaFallaCerradaSiNoSePuedeLeerElFolio(t *testing.T) {
	ds := memory.NewDataStore()
	ctx := context.Background()
	records := memory.NewClinicalRecordMemoryRepo(ds)
	folio := "cr-def66"
	nota := &domain.ClinicalAnatomicalNote{ID: "nota-def66", PatientID: "p-def66", DoctorID: medicoSemillaID,
		ClinicalRecordID: &folio, PainLevel: 4, DoctorObservation: "dolor", CreatedAt: time.Now(), UpdatedAt: time.Now()}
	if err := records.SaveAnatomicalNote(ctx, nota); err != nil {
		t.Fatal(err)
	}
	svc := services.NewClinicalRecordService(folioQueFalla{records}, memory.NewPatientMemoryRepo(ds), memory.NewUserMemoryRepo(ds))

	cambio := *nota
	cambio.PainLevel = 0
	if _, err := svc.UpdateAnatomicalNote(ctx, &cambio); err == nil {
		t.Fatal("la nota se edito sin poder comprobar si el folio estaba cerrado")
	}
	if err := svc.DeleteAnatomicalNote(ctx, nota.ID, medicoSemillaID); err == nil {
		t.Fatal("la nota se borro sin poder comprobar si el folio estaba cerrado")
	}
}

// DEF-66: el sello del folio incluye la escala de dolor EVA y el mapeo anatomico; los folios sellados con la formula
// anterior siguen verificando.
func TestDEF66SelloIncluyeDolorYMapeo(t *testing.T) {
	base := func(dolor int, mapeo string) string {
		return crypto.CalculateChainedRecordHashV2("prev", "pac", "doc", "a", "e", "BA00", "dx", "plan", "2026-11-20T10:00:00Z", dolor, "", mapeo)
	}
	if base(7, "torax") == base(2, "torax") || base(7, "torax") == base(7, "abdomen") {
		t.Fatal("cambiar el dolor o el mapeo debe cambiar el sello")
	}
	if !crypto.IsRecordHashV2(base(7, "torax")) {
		t.Fatal("el sello vigente debe reconocerse como version 2")
	}

	env := newChainEnv(t)
	env.seed(t, "p-def66-v2", "7066", "doc-def66")
	env.seed(t, "p-def66-v1", "7067")
	sellado := env.draft(t, "p-def66-v2", "doc-def66")
	mapeo := "rodilla izquierda"
	if err := env.clinical.UpdatePainAndMapping(env.ctx, sellado.ID, "doc-def66", 8, nil, &mapeo); err != nil {
		t.Fatal(err)
	}
	cerradoV2, err := env.clinical.CloseAndSign(env.ctx, sellado.ID, "doc-def66", "firma")
	if err != nil {
		t.Fatal(err)
	}
	if cerradoV2.HashSHA256 == nil || !crypto.IsRecordHashV2(*cerradoV2.HashSHA256) {
		t.Fatal("el cierre debe usar el sello version 2")
	}
	if ok, err := env.clinical.VerifyIntegrity(env.ctx, sellado.ID); err != nil || !ok {
		t.Fatalf("el folio sellado con la version 2 debe verificar: ok=%v err=%v", ok, err)
	}

	// Folio cerrado antes de la correccion: sello version 1 (hexadecimal minuscula), primer eslabon de su paciente
	legado := env.draft(t, "p-def66-v1", "doc-def66")
	cerrado := time.Now().UTC().Truncate(time.Second)
	v1 := crypto.CalculateChainedRecordHash(services.GenesisHash, legado.PatientID, legado.DoctorID, legado.Anamnesis,
		legado.PhysicalExam, legado.CIE11Code, legado.DiagnosisDescription, legado.TreatmentPlan, cerrado.Format(time.RFC3339))
	if err := env.records.CloseRecord(env.ctx, legado.ID, "firma", services.GenesisHash, v1, cerrado); err != nil {
		t.Fatal(err)
	}
	if ok, err := env.clinical.VerifyIntegrity(env.ctx, legado.ID); err != nil || !ok {
		t.Fatalf("un folio sellado con la version 1 debe seguir verificando: ok=%v err=%v", ok, err)
	}
}

// DEF-69: veinte citas simultaneas al mismo medico y hora: solo una se agenda.
func TestDEF69CitasSimultaneasNoSeDuplican(t *testing.T) {
	ds, svc := servicioCitasR3(t)
	ctx := context.Background()
	if err := memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def69", "DOC-69")); err != nil {
		t.Fatal(err)
	}
	hora := time.Now().Add(72 * time.Hour).Truncate(time.Minute)

	var wg sync.WaitGroup
	var mu sync.Mutex
	agendadas, cruzadas := 0, 0
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := svc.ScheduleAppointment(ctx, &domain.Appointment{DoctorID: medicoSemillaID, PatientID: "p-def69", AppointmentDate: hora})
			mu.Lock()
			defer mu.Unlock()
			switch {
			case err == nil:
				agendadas++
			case errors.Is(err, domain.ErrDoctorScheduleOverlap):
				cruzadas++
			default:
				t.Errorf("error inesperado: %v", err)
			}
		}()
	}
	wg.Wait()
	if agendadas != 1 || cruzadas != 19 {
		t.Fatalf("agendadas=%d cruzadas=%d; se esperaba 1 y 19", agendadas, cruzadas)
	}
}

// DEF-69: un medico no consulta la agenda de otro, y otros roles no agendan citas a nombre propio.
func TestDEF69AgendaSoloDelMedicoDeLaSesion(t *testing.T) {
	env := newCalidadEnv(t)
	token := calidadToken(t, medicoSemillaID, "MEDICO")
	if code, _ := peticionJSON(t, env, http.MethodGet, "/api/v2/appointments/doctor/otro-medico", "", token); code != http.StatusForbidden {
		t.Fatalf("la agenda de otro medico respondio %d; se esperaba 403", code)
	}
	if code, _ := peticionJSON(t, env, http.MethodGet, "/api/v2/appointments/doctor/"+medicoSemillaID, "", token); code != http.StatusOK {
		t.Fatalf("la agenda propia respondio %d", code)
	}
	enfermera := crearUsuarioRol(t, env, "usr-enf-def69", 3, "Enf. Prueba", "Sede Tuluá - Ambulatoria")
	if code, _ := peticionJSON(t, env, http.MethodPost, "/api/v2/appointments/", `{}`, enfermera); code != http.StatusForbidden {
		t.Fatalf("un enfermero agendo una cita a su nombre: %d", code)
	}
}

// DEF-71: las lecturas de datos de pacientes en /api/v2 quedan en la bitacora.
func TestDEF71LecturasV2QuedanAuditadas(t *testing.T) {
	repo := &auditoriaRetenida{entradas: make(chan *domain.AuditLog, 20)}
	app := fiber.New()
	app.Use(middlewares.CorrelationIDMiddleware())
	app.Use(middlewares.AuditMiddleware(logger.New(), repo))
	app.Get("/*", func(c *fiber.Ctx) error { return c.SendStatus(http.StatusOK) })

	rutas := []string{"/api/v2/treatments/x", "/api/v2/lab-orders", "/api/v2/nursing/p-1", "/api/v2/appointments/",
		"/api/v2/pharmacy/inbox", "/api/v2/pharmacy/prescriptions/lookup", "/api/v2/appointment-requests"}
	for _, ruta := range rutas {
		if _, err := app.Test(httptest.NewRequest(http.MethodGet, ruta, nil), -1); err != nil {
			t.Fatal(err)
		}
		select {
		case entrada := <-repo.entradas:
			if entrada.Action != domain.ActionRead {
				t.Fatalf("%s: accion %s", ruta, entrada.Action)
			}
		case <-time.After(2 * time.Second):
			t.Fatalf("la lectura de %s no quedo en la bitacora", ruta)
		}
	}
}

// DEF-86: el documento de la cedula se compara normalizado (el PDF417 trae ceros a la izquierda).
func TestDEF86DocumentoDeCedulaNormalizado(t *testing.T) {
	casos := map[string]string{"0001094111222": "1094111222", " 1.094.111.222 ": "1094111222", "pa-123456": "PA123456", "0000": ""}
	for entrada, esperado := range casos {
		if got := domain.NormalizeDocument(entrada); got != esperado {
			t.Errorf("NormalizeDocument(%q) = %q; se esperaba %q", entrada, got, esperado)
		}
	}

	ds, treat, pharm := entornoV2(t)
	ctx := context.Background()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def86", "1094111222"))
	presc, err := treat.DispatchTreatment(ctx, recetaV2("p-def86",
		domain.PrescriptionItemV2{InventoryItemID: "inv-aceta-500", MedicationName: "Acetaminofen", Dosage: "500 mg", QuantityPrescribed: 1}))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pharm.DispensePrescription(ctx, domain.DispenseRequestDTO{PrescriptionID: presc.ID, PatientDocument: "0001094111222"}); err != nil {
		t.Fatalf("el documento leido de la cedula (con ceros) debe coincidir: %v", err)
	}
}

// DEF-44: verificar un folio inexistente responde 404, no 500.
func TestDEF44VerificarFolioInexistenteResponde404(t *testing.T) {
	env := newCalidadEnv(t)
	token := calidadToken(t, medicoSemillaID, "MEDICO")
	if code, _ := peticionJSON(t, env, http.MethodGet, "/api/v1/clinical-records/no-existe/verify", "", token); code != http.StatusNotFound {
		t.Fatalf("verificar un folio inexistente respondio %d", code)
	}
}
