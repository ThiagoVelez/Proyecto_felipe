package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/http/middlewares"
)

type RouterConfig struct {
	AuthHandler           *handlers.AuthHandler
	AdminHandler          *handlers.AdminHandler
	PatientHandler        *handlers.PatientHandler
	TriageHandler         *handlers.TriageHandler
	ClinicalRecordHandler *handlers.ClinicalRecordHandler
	PrescriptionHandler   *handlers.PrescriptionHandler
	SyncHandler           *handlers.SyncHandler
	AppointmentHandler    *handlers.AppointmentHandler
	TreatmentHandler      *handlers.TreatmentHandler
	PharmacyHandler       *handlers.PharmacyHandler
	HealthEducationHandler *handlers.HealthEducationHandler
	// Sessions valida en cada solicitud que la cuenta del token siga activa
	Sessions  middlewares.SessionValidator
	JWTSecret string
}

// SetupRoutes define los puntos de enlace REST y el control RBAC estricto de la API.
func SetupRoutes(app *fiber.App, cfg RouterConfig) {
	api := app.Group("/api/v1")
	authMW := middlewares.AuthMiddleware(cfg.JWTSecret, cfg.Sessions)

	// 1. Verificacion de estado del servicio
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":      "UP",
			"system":      "SaludConecta IPS v2.4",
			"iso_quality": "ISO/IEC 25010 Evaluated",
		})
	})

	// 2. Modulo Autenticacion y Credenciales: limites por IP independientes por ruta
	auth := api.Group("/auth")
	loginLimit := middlewares.AuthRateLimitMiddleware(30, 1*time.Minute)
	refreshLimit := middlewares.RateLimitMiddleware(120, 1*time.Minute)
	seedLimit := middlewares.RateLimitMiddleware(120, 1*time.Minute)
	adminRegLimit := middlewares.AuthRateLimitMiddleware(20, 1*time.Minute)

	auth.Post("/login", loginLimit, cfg.AuthHandler.Login)
	auth.Post("/refresh", refreshLimit, cfg.AuthHandler.RefreshToken)
	auth.Post("/logout", cfg.AuthHandler.Logout)
	auth.Post("/register-admin", adminRegLimit, cfg.AuthHandler.RegisterAdmin)
	auth.Get("/mfa-seed", seedLimit, cfg.AuthHandler.GetMFASeed)

	authProtected := auth.Use(authMW)
	authProtected.Get("/me", cfg.AuthHandler.Me)
	authProtected.Post("/mfa/setup", loginLimit, cfg.AuthHandler.SetupMFA)
	authProtected.Post("/mfa/enable", loginLimit, cfg.AuthHandler.EnableMFA)

	// Proteccion global JWT para v1
	protected := api.Group("/", authMW)

	// 3. Modulo Administrativo y Gobernanza ReTHUS (Exclusivo ADMIN)
	if cfg.AdminHandler != nil {
		admin := protected.Group("/admin", middlewares.RequireRoles("ADMIN"))
		admin.Get("/users", cfg.AdminHandler.ListUsers)
		admin.Post("/users", cfg.AuthHandler.RegisterStaff) // Registro de personal por el administrador (entra inactivo)
		admin.Patch("/users/:id/status", cfg.AdminHandler.UpdateUserStatus)
		admin.Get("/audit-logs", cfg.AdminHandler.GetAuditLogs)
	}

	// 4. Modulo Admision de Pacientes y Antecedentes Alergicos (ADMISION, ENFERMERO, MEDICO)
	if cfg.PatientHandler != nil {
		patientRoles := middlewares.RequireRoles("ADMISION", "ENFERMERO", "MEDICO")
		patients := protected.Group("/patients", patientRoles)
		patients.Post("/", cfg.PatientHandler.Create)
		patients.Get("/", cfg.PatientHandler.List)
		patients.Get("/lookup", cfg.PatientHandler.Lookup)
		patients.Get("/:id", cfg.PatientHandler.GetByID)
		patients.Post("/:id/allergies", cfg.PatientHandler.AddAllergy)
		patients.Get("/:id/allergies", cfg.PatientHandler.GetAllergies)
		if cfg.ClinicalRecordHandler != nil {
			patients.Get("/:id/anatomical-notes", middlewares.RequireRoles("MEDICO", "ENFERMERO", "AUDITOR"), cfg.ClinicalRecordHandler.GetPatientAnatomicalNotes)
			patients.Post("/:id/anatomical-notes", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.CreateAnatomicalNote)
		}
	}

	// 5. Modulo Triaje Manchester (Exclusivo Asistencial: ENFERMERO, MEDICO)
	if cfg.TriageHandler != nil {
		triage := protected.Group("/triage")
		triage.Post("/", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.Create)
		triage.Get("/", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.GetQueue)
		triage.Get("/:id", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.GetByID)
		triage.Patch("/:id/status", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.UpdateStatus)
	}

	// 6. Modulo Historia Clinica Electronica (HCE) e Inmutabilidad (Exclusivo Asistencial: MEDICO)
	if cfg.ClinicalRecordHandler != nil {
		hce := protected.Group("/clinical-records")
		hce.Post("/", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.CreateDraft)
		hce.Post("/:id/close", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.CloseAndSign)
		hce.Post("/:id/clarifications", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.AddClarification)
		hce.Get("/:id", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.GetByID)
		hce.Get("/patient/:patient_id", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.GetPatientHistory)
		hce.Get("/:id/verify", middlewares.RequireRoles("MEDICO", "AUDITOR"), cfg.ClinicalRecordHandler.VerifyIntegrity)
		hce.Get("/:id/rips", middlewares.RequireRoles("MEDICO", "AUDITOR"), cfg.ClinicalRecordHandler.ExportRIPS)
		hce.Get("/:id/fhir", middlewares.RequireRoles("MEDICO", "AUDITOR"), cfg.ClinicalRecordHandler.ExportFHIR)

		// Kit Informatico Medico: Escala EVA y Modelo Anatomico Interactivo
		hce.Get("/:id/anatomical-notes", middlewares.RequireRoles("MEDICO", "ENFERMERO", "AUDITOR"), cfg.ClinicalRecordHandler.GetRecordAnatomicalNotes)
		hce.Post("/:id/anatomical-notes", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.CreateAnatomicalNote)
		hce.Put("/:id/anatomical-notes/:note_id", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.UpdateAnatomicalNote)
		hce.Delete("/:id/anatomical-notes/:note_id", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.DeleteAnatomicalNote)
		hce.Put("/:id/pain-mapping", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.UpdatePainAndMapping)

		protected.Put("/anatomical-notes/:note_id", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.UpdateAnatomicalNote)
		protected.Delete("/anatomical-notes/:note_id", middlewares.RequireRoles("MEDICO"), cfg.ClinicalRecordHandler.DeleteAnatomicalNote)
	}

	// 7. Modulo Prescripcion Farmacologica y Cruce de Alergias (Exclusivo Asistencial: MEDICO)
	if cfg.PrescriptionHandler != nil {
		protected.Get("/medications", middlewares.RequireRoles("MEDICO"), cfg.PrescriptionHandler.SearchMedications)
		presc := protected.Group("/prescriptions")
		presc.Post("/", middlewares.RequireRoles("MEDICO"), cfg.PrescriptionHandler.Create)
		presc.Get("/:id", middlewares.RequireRoles("MEDICO"), cfg.PrescriptionHandler.GetByID)
		presc.Get("/record/:record_id", middlewares.RequireRoles("MEDICO"), cfg.PrescriptionHandler.GetByClinicalRecord)
	}

	// 8. Modulo Sincronizacion Offline Rural (Exclusivo Asistencial: MEDICO)
	if cfg.SyncHandler != nil {
		syncGroup := protected.Group("/sync")
		syncGroup.Post("/batch", middlewares.RequireRoles("MEDICO"), cfg.SyncHandler.ProcessBatch)
	}

	// 8.5. Modulo Muro de Salud, Prevencion y Concientizacion (Kit Informatico Medico)
	if cfg.HealthEducationHandler != nil {
		healthGroup := protected.Group("/health-education")
		healthGroup.Get("/", middlewares.RequireRoles("MEDICO", "ENFERMERO", "ADMIN", "FARMACIA"), cfg.HealthEducationHandler.ListPosts)
		healthGroup.Get("/:id", middlewares.RequireRoles("MEDICO", "ENFERMERO", "ADMIN", "FARMACIA"), cfg.HealthEducationHandler.GetPost)
		healthGroup.Post("/", middlewares.RequireRoles("MEDICO"), cfg.HealthEducationHandler.CreatePost)
		healthGroup.Put("/:id", middlewares.RequireRoles("MEDICO"), cfg.HealthEducationHandler.UpdatePost)
		healthGroup.Delete("/:id", middlewares.RequireRoles("MEDICO"), cfg.HealthEducationHandler.DeletePost)
	}

	// =========================================================================
	// RUTAS Y MODULOS DE DOMINIO V2 (AGENDAMIENTO, SEGUIMIENTO, FARMACIA PDF417)
	// =========================================================================
	apiV2 := app.Group("/api/v2", authMW)

	// Compatibilidad triaje asistencial v2
	if cfg.TriageHandler != nil {
		triageV2 := apiV2.Group("/triage")
		triageV2.Post("/", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.Create)
		triageV2.Get("/", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.GetQueue)
		triageV2.Get("/:id", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.GetByID)
		triageV2.Patch("/:id/status", middlewares.RequireRoles("ENFERMERO", "MEDICO"), cfg.TriageHandler.UpdateStatus)
	}

	// 9. Modulo de Agendamiento y Calendario Medico (/api/v2/appointments)
	if cfg.AppointmentHandler != nil {
		appGroup := apiV2.Group("/appointments")
		appGroup.Post("/", middlewares.RequireRoles("MEDICO", "ADMIN", "ENFERMERO"), cfg.AppointmentHandler.Create)
		appGroup.Get("/", middlewares.RequireRoles("MEDICO", "ADMIN", "ENFERMERO"), cfg.AppointmentHandler.GetByRange)
		appGroup.Get("/doctor/:id", middlewares.RequireRoles("MEDICO", "ADMIN", "ENFERMERO"), cfg.AppointmentHandler.GetByDoctor)
	}

	// 10. Modulo de Seguimiento de Tratamiento y Prescripcion Tripartita (/api/v2/treatments)
	if cfg.TreatmentHandler != nil {
		treatGroup := apiV2.Group("/treatments")
		treatGroup.Post("/dispatch", middlewares.RequireRoles("MEDICO"), cfg.TreatmentHandler.Dispatch)
		treatGroup.Get("/:id", middlewares.RequireRoles("MEDICO", "FARMACIA", "ADMIN", "ENFERMERO"), cfg.TreatmentHandler.GetByID)
	}

	// 11. Modulo de Farmacia, Inventario por Dosis y Dispensacion PDF417 (/api/v2/pharmacy)
	if cfg.PharmacyHandler != nil {
		pharmGroup := apiV2.Group("/pharmacy")
		pharmGroup.Get("/inbox", middlewares.RequireRoles("FARMACIA", "ADMIN", "MEDICO", "ENFERMERO"), cfg.PharmacyHandler.GetInbox)
		pharmGroup.Get("/inventory", middlewares.RequireRoles("FARMACIA", "ADMIN", "MEDICO", "ENFERMERO"), cfg.PharmacyHandler.GetInventory)
		pharmGroup.Post("/inventory", middlewares.RequireRoles("FARMACIA", "ADMIN"), cfg.PharmacyHandler.AddInventoryItem)
		pharmGroup.Put("/inventory/:id", middlewares.RequireRoles("FARMACIA", "ADMIN"), cfg.PharmacyHandler.UpdateInventoryItem)
		pharmGroup.Delete("/inventory/:id", middlewares.RequireRoles("FARMACIA", "ADMIN"), cfg.PharmacyHandler.DeleteInventoryItem)
		pharmGroup.Patch("/inventory/:id/stock", middlewares.RequireRoles("FARMACIA", "ADMIN"), cfg.PharmacyHandler.AdjustStock)
		pharmGroup.Get("/prescriptions/lookup", middlewares.RequireRoles("FARMACIA", "ADMIN"), cfg.PharmacyHandler.LookupPrescription)
		pharmGroup.Post("/dispense", middlewares.RequireRoles("FARMACIA", "ADMIN"), cfg.PharmacyHandler.Dispense)
	}
}
