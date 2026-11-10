package backend_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	httpadapter "saludconecta-backend/adapters/http"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/interoperability"
	"saludconecta-backend/adapters/email"
	"saludconecta-backend/adapters/pdf"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/crypto"
	"saludconecta-backend/pkg/logger"
)

const calidadJWTSecret = "secreto-de-prueba-calidad-iso25010-0123456789"

// calidadEnv agrupa la aplicacion completa montada igual que cmd/api/main.go, pero sobre el adaptador en memoria.
type calidadEnv struct {
	app *fiber.App
	ds  *memory.DataStore
}

func newCalidadEnv(t *testing.T) calidadEnv {
	t.Helper()
	ds := memory.NewDataStore()
	userRepo := memory.NewUserMemoryRepo(ds)
	patientRepo := memory.NewPatientMemoryRepo(ds)
	triageRepo := memory.NewTriageMemoryRepo(ds)
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	prescRepo := memory.NewPrescriptionMemoryRepo(ds)
	auditRepo := memory.NewAuditMemoryRepo(ds)
	appointmentRepo := memory.NewAppointmentMemoryRepo(ds)
	inventoryRepo := memory.NewInventoryMemoryRepo(ds)
	prescV2Repo := memory.NewPrescriptionV2MemoryRepo(ds)
	healthRepo := memory.NewHealthEducationMemoryRepo(ds)
	sembrarMedicoSemilla(t, userRepo)

	// El cableado replica cmd/api/main.go (v2), incluido el validador de sesion activa.
	log := logger.New()
	pdfGen := pdf.NewGenerator(t.TempDir())
	emailSvc := email.NewService(email.Config{}, log)
	authService := services.NewAuthService(userRepo, calidadJWTSecret, time.Hour)
	recordService := services.NewClinicalRecordService(recordRepo, patientRepo, userRepo)

	app := fiber.New()
	httpadapter.SetupRoutes(app, httpadapter.RouterConfig{
		AuthHandler:            handlers.NewAuthHandler(authService),
		AdminHandler:           handlers.NewAdminHandler(services.NewAdminService(userRepo, auditRepo)),
		PatientHandler:         handlers.NewPatientHandler(services.NewPatientService(patientRepo)),
		TriageHandler:          handlers.NewTriageHandler(services.NewTriageService(triageRepo, patientRepo)),
		ClinicalRecordHandler:  handlers.NewClinicalRecordHandler(recordService, patientRepo, prescRepo, interoperability.NewRIPSGenerator("900123456", "110010999901"), interoperability.NewFHIRMapper()),
		PrescriptionHandler:    handlers.NewPrescriptionHandler(services.NewPrescriptionService(prescRepo, recordRepo, patientRepo)),
		SyncHandler:            handlers.NewSyncHandler(services.NewSyncService(recordRepo, patientRepo)),
		AppointmentHandler:     handlers.NewAppointmentHandler(services.NewAppointmentService(appointmentRepo, patientRepo, userRepo, pdfGen, emailSvc, log)),
		TreatmentHandler:       handlers.NewTreatmentHandler(services.NewTreatmentService(prescV2Repo, patientRepo, userRepo, pdfGen, emailSvc, log)),
		PharmacyHandler:        handlers.NewPharmacyHandler(services.NewPharmacyService(inventoryRepo, prescV2Repo, log)),
		HealthEducationHandler: handlers.NewHealthEducationHandler(services.NewHealthEducationService(healthRepo)),
		Sessions:               authService,
		JWTSecret:              calidadJWTSecret,
	})
	return calidadEnv{app: app, ds: ds}
}

// sembrarMedicoSemilla crea la cuenta medica que usan las pruebas de calidad. Desde la v2 el almacen en
// memoria ya no siembra cuentas (DEF-11), por lo que cada prueba la crea de forma explicita.
func sembrarMedicoSemilla(t *testing.T, userRepo ports.UserRepository) {
	t.Helper()
	if _, err := userRepo.GetByID(context.Background(), medicoSemillaID); err == nil {
		return
	}
	if err := userRepo.Create(context.Background(), newDoctorFixture(medicoSemillaID, "RM-CALIDAD-0002")); err != nil {
		t.Fatalf("No se pudo sembrar el medico de calidad: %v", err)
	}
}

func calidadToken(t *testing.T, userID, role string) string {
	t.Helper()
	token, err := crypto.GenerateJWT(userID, role, userID+"@example.com", calidadJWTSecret, time.Hour)
	if err != nil {
		t.Fatalf("No se pudo generar el token: %v", err)
	}
	return token
}

// marcaDefecto prefija la asercion que demuestra un defecto abierto. La herramienta
// tests/backend/herramientas/controldefectos la usa para distinguir un fallo por el defecto de un
// fallo por otra causa (preparacion fallida, panico o error de compilacion).
const marcaDefecto = "DEFECTO-REPRODUCIDO"

func defectoReproducido(t *testing.T, id, formato string, args ...interface{}) {
	t.Helper()
	t.Errorf("%s %s: %s", marcaDefecto, id, fmt.Sprintf(formato, args...))
}

// requireDefectoAbierto omite por defecto las pruebas que documentan defectos aun no corregidos.
// Con CALIDAD_DEFECTOS_ABIERTOS=1 se ejecutan y fallan mientras el defecto siga presente,
// lo que permite reproducirlo sin romper el pipeline del equipo.
func requireDefectoAbierto(t *testing.T, id string) {
	t.Helper()
	if os.Getenv("CALIDAD_DEFECTOS_ABIERTOS") != "1" {
		t.Skipf("%s abierto: ejecute con CALIDAD_DEFECTOS_ABIERTOS=1 para reproducirlo", id)
	}
}
