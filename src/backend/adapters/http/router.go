package http

import (
	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/http/middlewares"
)

type RouterConfig struct {
	AuthHandler           *handlers.AuthHandler
	TriageHandler         *handlers.TriageHandler
	ClinicalRecordHandler *handlers.ClinicalRecordHandler
	PrescriptionHandler   *handlers.PrescriptionHandler
	SyncHandler           *handlers.SyncHandler
	JWTSecret             string
}

// SetupRoutes define los puntos de enlace REST y el control RBAC de la API.
func SetupRoutes(app *fiber.App, cfg RouterConfig) {
	api := app.Group("/api/v1")

	// 1. Verificacion de estado del servicio
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":      "UP",
			"system":      "SaludConecta IPS v2.4",
			"iso_quality": "ISO/IEC 25010 Evaluated",
		})
	})

	// 2. Modulo Autenticacion y Credenciales
	auth := api.Group("/auth")
	auth.Post("/login", cfg.AuthHandler.Login)
	auth.Post("/register", cfg.AuthHandler.Register)

	authProtected := auth.Use(middlewares.AuthMiddleware(cfg.JWTSecret))
	authProtected.Post("/mfa/setup", cfg.AuthHandler.SetupMFA)
	authProtected.Post("/mfa/enable", cfg.AuthHandler.EnableMFA)

	// Proteccion global JWT para endpoints clinicos asistenciales
	protected := api.Group("/", middlewares.AuthMiddleware(cfg.JWTSecret))

	// 3. Modulo Triaje Manchester
	triage := protected.Group("/triage")
	triage.Post("/", middlewares.RequireRoles("ENFERMERO", "MEDICO", "ADMIN"), cfg.TriageHandler.Create)
	triage.Get("/", cfg.TriageHandler.GetQueue)
	triage.Get("/:id", cfg.TriageHandler.GetByID)
	triage.Patch("/:id/status", middlewares.RequireRoles("ENFERMERO", "MEDICO", "ADMIN"), cfg.TriageHandler.UpdateStatus)

	// 4. Modulo Historia Clinica Electronica (HCE) e Inmutabilidad
	hce := protected.Group("/clinical-records")
	hce.Post("/", middlewares.RequireRoles("MEDICO", "ADMIN"), cfg.ClinicalRecordHandler.CreateDraft)
	hce.Post("/:id/close", middlewares.RequireRoles("MEDICO", "ADMIN"), cfg.ClinicalRecordHandler.CloseAndSign)
	hce.Post("/:id/clarifications", middlewares.RequireRoles("MEDICO", "ADMIN"), cfg.ClinicalRecordHandler.AddClarification)
	hce.Get("/:id", cfg.ClinicalRecordHandler.GetByID)
	hce.Get("/patient/:patient_id", cfg.ClinicalRecordHandler.GetPatientHistory)
	hce.Get("/:id/verify", cfg.ClinicalRecordHandler.VerifyIntegrity)
	hce.Get("/:id/rips", middlewares.RequireRoles("MEDICO", "AUDITOR", "ADMIN"), cfg.ClinicalRecordHandler.ExportRIPS)
	hce.Get("/:id/fhir", middlewares.RequireRoles("MEDICO", "AUDITOR", "ADMIN"), cfg.ClinicalRecordHandler.ExportFHIR)

	// 5. Modulo Prescripcion Farmacologica y Cruce de Alergias
	presc := protected.Group("/prescriptions")
	presc.Post("/", middlewares.RequireRoles("MEDICO", "ADMIN"), cfg.PrescriptionHandler.Create)
	presc.Get("/:id", cfg.PrescriptionHandler.GetByID)
	presc.Get("/record/:record_id", cfg.PrescriptionHandler.GetByClinicalRecord)

	// 6. Modulo Sincronizacion Offline Rural
	syncGroup := protected.Group("/sync")
	syncGroup.Post("/batch", middlewares.RequireRoles("MEDICO", "ADMIN"), cfg.SyncHandler.ProcessBatch)
}

