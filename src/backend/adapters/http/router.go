package http

import (
	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/http/middlewares"
)

type RouterConfig struct {
	AuthHandler           *handlers.AuthHandler
	AdminHandler          *handlers.AdminHandler
	TriageHandler         *handlers.TriageHandler
	ClinicalRecordHandler *handlers.ClinicalRecordHandler
	PrescriptionHandler   *handlers.PrescriptionHandler
	SyncHandler           *handlers.SyncHandler
	JWTSecret             string
}

// SetupRoutes define los puntos de enlace REST y el control RBAC estricto de la API.
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
	auth.Post("/register-staff", cfg.AuthHandler.RegisterStaff) // Autorregistro de personal (entra inactivo)

	authProtected := auth.Use(middlewares.AuthMiddleware(cfg.JWTSecret))
	authProtected.Post("/mfa/setup", cfg.AuthHandler.SetupMFA)
	authProtected.Post("/mfa/enable", cfg.AuthHandler.EnableMFA)

	// Proteccion global JWT
	protected := api.Group("/", middlewares.AuthMiddleware(cfg.JWTSecret))

	// 3. Modulo Administrativo y Gobernanza ReTHUS (Exclusivo ADMIN)
	if cfg.AdminHandler != nil {
		admin := protected.Group("/admin", middlewares.RequireRoles("ADMIN"))
		admin.Get("/users", cfg.AdminHandler.ListUsers)
		admin.Patch("/users/:id/status", cfg.AdminHandler.UpdateUserStatus)
		admin.Get("/audit-logs", cfg.AdminHandler.GetAuditLogs)
	}

	// 4. Modulo Triaje Manchester (Exclusivo Asistencial: ENFERMERO, MEDICO)
	triage := protected.Group("/triage")
	triage.Post("/", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.Create)
	triage.Get("/", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.GetQueue)
	triage.Get("/:id", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.GetByID)
	triage.Patch("/:id/status", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.UpdateStatus)

	// 5. Modulo Historia Clinica Electronica (HCE) e Inmutabilidad (Exclusivo Asistencial: MEDICO)
	hce := protected.Group("/clinical-records")
	hce.Post("/", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.CreateDraft)
	hce.Post("/:id/close", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.CloseAndSign)
	hce.Post("/:id/clarifications", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.AddClarification)
	hce.Get("/:id", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.GetByID)
	hce.Get("/patient/:patient_id", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.GetPatientHistory)
	hce.Get("/:id/verify", middlewares.RequireRoles("MEDICO", "AUDITOR"), cfg.ClinicalRecordHandler.VerifyIntegrity)
	hce.Get("/:id/rips", middlewares.RequireRoles("MEDICO", "AUDITOR"), cfg.ClinicalRecordHandler.ExportRIPS)
	hce.Get("/:id/fhir", middlewares.RequireRoles("MEDICO", "AUDITOR"), cfg.ClinicalRecordHandler.ExportFHIR)

	// 6. Modulo Prescripcion Farmacologica y Cruce de Alergias (Exclusivo Asistencial: MEDICO)
	presc := protected.Group("/prescriptions")
	presc.Post("/", middlewares.RequireRoles("MEDICO"), cfg.PrescriptionHandler.Create)
	presc.Get("/:id", middlewares.RequireRoles("MEDICO"), cfg.PrescriptionHandler.GetByID)
	presc.Get("/record/:record_id", middlewares.RequireRoles("MEDICO"), cfg.PrescriptionHandler.GetByClinicalRecord)

	// 7. Modulo Sincronizacion Offline Rural (Exclusivo Asistencial: MEDICO)
	syncGroup := protected.Group("/sync")
	syncGroup.Post("/batch", middlewares.RequireRoles("MEDICO"), cfg.SyncHandler.ProcessBatch)
}
