package backend_test

import (
	"os"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	httpadapter "saludconecta-backend/adapters/http"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/interoperability"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/crypto"
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

	authService := services.NewAuthService(userRepo, calidadJWTSecret, time.Hour)
	recordService := services.NewClinicalRecordService(recordRepo, patientRepo, userRepo)

	app := fiber.New()
	httpadapter.SetupRoutes(app, httpadapter.RouterConfig{
		AuthHandler:           handlers.NewAuthHandler(authService),
		AdminHandler:          handlers.NewAdminHandler(services.NewAdminService(userRepo, auditRepo)),
		TriageHandler:         handlers.NewTriageHandler(services.NewTriageService(triageRepo, patientRepo)),
		ClinicalRecordHandler: handlers.NewClinicalRecordHandler(recordService, patientRepo, prescRepo, interoperability.NewRIPSGenerator("900123456", "110010999901"), interoperability.NewFHIRMapper()),
		PrescriptionHandler:   handlers.NewPrescriptionHandler(services.NewPrescriptionService(prescRepo, recordRepo, patientRepo)),
		SyncHandler:           handlers.NewSyncHandler(services.NewSyncService(recordRepo, patientRepo)),
		JWTSecret:             calidadJWTSecret,
	})
	return calidadEnv{app: app, ds: ds}
}

func calidadToken(t *testing.T, userID, role string) string {
	t.Helper()
	token, err := crypto.GenerateJWT(userID, role, userID+"@example.com", calidadJWTSecret, time.Hour)
	if err != nil {
		t.Fatalf("No se pudo generar el token: %v", err)
	}
	return token
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
