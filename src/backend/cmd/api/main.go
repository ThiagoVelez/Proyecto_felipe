package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"saludconecta-backend/adapters/email"
	"saludconecta-backend/adapters/http"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/interoperability"
	"saludconecta-backend/adapters/pdf"
	"saludconecta-backend/adapters/storage"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/config"
	"saludconecta-backend/pkg/logger"
	"saludconecta-backend/pkg/retention"
)

// connectRetryDelay es la espera entre intentos de conexion mientras el motor de base de datos termina de iniciar.
const connectRetryDelay = 3 * time.Second

func main() {
	// 1. Inicializacion del logger estructurado institucional
	log := logger.New()
	log.Info("Iniciando Sistema Hospitalario SaludConecta IPS v2.4 (ISO/IEC 25010)")

	// 2. Carga y validacion de configuracion: sin JWT_SECRET seguro el servicio no arranca
	cfg, err := config.Load()
	if err != nil {
		log.Error("Configuracion invalida; el servicio no se inicia", map[string]interface{}{"error": err.Error()})
		os.Exit(1)
	}

	// 3. Resolucion del Adaptador de Persistencia (Inyeccion Hexagonal de Puertos)
	storageCfg := storage.Config{
		Driver:                     cfg.DBDriver,
		Host:                       cfg.DBHost,
		Port:                       cfg.DBPort,
		User:                       cfg.DBUser,
		Password:                   cfg.DBPassword,
		DBName:                     cfg.DBName,
		MaxOpenConns:               30,
		MaxIdleConns:               10,
		ConnMaxLifetime:            5 * time.Minute,
		ConnMaxIdleTime:            2 * time.Minute,
		AllowPostgresMemoryModules: cfg.AllowPostgresMemoryModules,
	}

	repos, err := connectWithRetry(storageCfg, log, cfg.DBConnectTries)
	if err != nil {
		log.Error("No fue posible inicializar el adaptador de persistencia configurado; el servicio no se inicia", map[string]interface{}{
			"driver": cfg.DBDriver,
			"error":  err.Error(),
		})
		os.Exit(1)
	}
	defer repos.Close()

	if cfg.DBDriver == "memory" {
		log.Warn("Persistencia EN MEMORIA activa: los datos clinicos se perderan al reiniciar. Uso exclusivo de desarrollo y pruebas")
	}

	// 4. Administrador inicial
	created, err := services.BootstrapAdmin(context.Background(), repos.User, cfg.AdminEmail, cfg.AdminPassword)
	switch {
	case err != nil:
		log.Warn("No se creo el administrador inicial", map[string]interface{}{"motivo": err.Error()})
	case created:
		log.Info("Administrador inicial creado con las credenciales definidas por el operador", map[string]interface{}{"email": cfg.AdminEmail})
	}

	// 5. Adaptadores de Salida (PDF, SMTP y Comunicaciones en segundo plano)
	pdfGen := pdf.NewGenerator("storage/documents")
	emailSvc := email.NewService(email.Config{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     os.Getenv("SMTP_PORT"),
		Username: os.Getenv("SMTP_USER"),
		Password: os.Getenv("SMTP_PASSWORD"),
		From:     os.Getenv("SMTP_FROM"),
	}, log)

	// DEF-62: las copias locales de PDF y correos contienen datos del paciente; se borran al vencer su plazo
	go purgeLocalDocuments([]string{pdfGen.OutputDir(), emailSvc.OutboxDir()}, cfg.DocumentRetention, log)

	// 6. Instanciacion de Servicios de Dominio (Casos de Uso Puros)
	// Codigo de instalacion: sin el (o si es invalido) el Encargado de TI no puede registrarse desde el login
	switch err := services.ValidateSetupCode(cfg.SetupCode); {
	case err != nil:
		log.Warn("Registro del Encargado de TI deshabilitado", map[string]interface{}{"motivo": err.Error()})
	case cfg.SetupCode == "":
		log.Warn("Registro del Encargado de TI deshabilitado: defina TI_SETUP_CODE para habilitarlo")
	}
	authService := services.NewAuthServiceFull(repos.User, repos.Branch, cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL, cfg.SetupCode)
	adminService := services.NewAdminService(repos.User, repos.Audit)
	patientService := services.NewPatientService(repos.Patient)
	triageService := services.NewTriageService(repos.Triage, repos.Patient)
	recordService := services.NewClinicalRecordService(repos.ClinicalRecord, repos.Patient, repos.User)
	prescService := services.NewPrescriptionService(repos.Prescription, repos.ClinicalRecord, repos.Patient)
	syncService := services.NewSyncService(repos.ClinicalRecord, repos.Patient)

	appointmentService := services.NewAppointmentService(repos.Appointment, repos.Patient, repos.User, pdfGen, emailSvc, log)
	treatmentService := services.NewTreatmentService(repos.PrescriptionV2, repos.Patient, repos.User, pdfGen, emailSvc, log)
	pharmacyService := services.NewPharmacyService(repos.Inventory, repos.PrescriptionV2, repos.PharmacyReport, log)
	healthEducationService := services.NewHealthEducationService(repos.HealthEducation)

	// 7. Adaptadores de Interoperabilidad Normativa (MinSalud & HL7)
	ripsGen := interoperability.NewRIPSGenerator(cfg.IPSNIT, cfg.CodPrestador)
	fhirMap := interoperability.NewFHIRMapper()

	// 8. Instanciacion de Controladores HTTP (Adaptadores Primarios)
	authHandler := handlers.NewAuthHandler(authService)
	adminHandler := handlers.NewAdminHandler(adminService)
	tiHandler := handlers.NewTIHandler(services.NewTIService(repos.User, repos.Audit, repos.Branch, cfg.DBDriver, "v2.4", time.Now().UTC()))
	patientHandler := handlers.NewPatientHandler(patientService)
	triageHandler := handlers.NewTriageHandler(triageService)
	recordHandler := handlers.NewClinicalRecordHandler(recordService, repos.Patient, repos.Prescription, ripsGen, fhirMap)
	prescHandler := handlers.NewPrescriptionHandler(prescService)
	syncHandler := handlers.NewSyncHandler(syncService)

	appointmentHandler := handlers.NewAppointmentHandler(appointmentService)
	appointmentRequestHandler := handlers.NewAppointmentRequestHandler(services.NewAppointmentRequestService(
		repos.AppointmentRequest, repos.Branch, repos.User, repos.Appointment, patientService, appointmentService, emailSvc, log))
	treatmentHandler := handlers.NewTreatmentHandler(treatmentService)
	pharmacyHandler := handlers.NewPharmacyHandler(pharmacyService)
	healthEducationHandler := handlers.NewHealthEducationHandler(healthEducationService)

	// 9. Configuracion del Servidor HTTP Fiber v2
	serverCfg := http.ServerConfig{
		AllowedOrigins: cfg.CORSOrigins,
		RateLimitMax:   120,
		RateLimitTime:  1 * time.Minute,
		JWTSecret:      cfg.JWTSecret,
		TrustedProxies: cfg.TrustedProxies,
		AuditRepo:      repos.Audit,
		Logger:         log,
		RouterConfig: http.RouterConfig{
			Readiness:                 repos.Ping,
			StorageMode:               repos.Mode,
			MemoryModules:             repos.MemoryModules,
			AuthHandler:               authHandler,
			AdminHandler:              adminHandler,
			PatientHandler:            patientHandler,
			TriageHandler:             triageHandler,
			ClinicalRecordHandler:     recordHandler,
			PrescriptionHandler:       prescHandler,
			SyncHandler:               syncHandler,
			AppointmentHandler:        appointmentHandler,
			TreatmentHandler:          treatmentHandler,
			PharmacyHandler:           pharmacyHandler,
			HealthEducationHandler:    healthEducationHandler,
			TIHandler:                 tiHandler,
			AppointmentRequestHandler: appointmentRequestHandler,
			LabOrderHandler:           handlers.NewLabOrderHandler(services.NewLabOrderService(repos.LabOrder, repos.User, repos.Patient, emailSvc, log)),
			NursingHandler:            handlers.NewNursingHandler(services.NewNursingService(repos.Nursing, repos.User, repos.Patient)),
			BranchHandler:             handlers.NewBranchHandler(services.NewBranchService(repos.Branch, repos.User)),
			Sessions:                  authService,
			JWTSecret:                 cfg.JWTSecret,
		},
	}

	server := http.NewServer(serverCfg)

	// 10. Inicio del servidor en segundo plano y captura de senales para apagado elegante
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		address := fmt.Sprintf(":%s", cfg.Port)
		log.Info("Servidor HTTP Fiber v2 en escucha", map[string]interface{}{
			"address": address,
			"port":    cfg.Port,
		})
		if err := server.Listen(address); err != nil {
			log.Info("Servidor HTTP detenido", map[string]interface{}{"info": err.Error()})
		}
	}()

	<-shutdownChan
	log.Info("Senal de interrupcion recibida. Procediendo con el apagado elegante del sistema...")

	if err := server.Shutdown(); err != nil {
		log.Error("Fallo durante el apagado elegante del servidor HTTP", map[string]interface{}{
			"error": err.Error(),
		})
	}

	log.Info("SaludConecta IPS v2.4 finalizado de forma controlada.")
}

// connectWithRetry reintenta la conexion al motor configurado antes de rendirse; el motor puede estar arrancando.
func connectWithRetry(cfg storage.Config, log *logger.Logger, attempts int) (*storage.RepositoryBundle, error) {
	if attempts <= 0 {
		attempts = 1
	}

	var lastErr error
	for i := 1; i <= attempts; i++ {
		repos, err := storage.NewRepositoryBundle(cfg, log)
		if err == nil {
			return repos, nil
		}

		lastErr = err
		if i == attempts {
			break
		}

		log.Warn("El motor de base de datos aun no esta listo; reintentando conexion", map[string]interface{}{
			"intento":   i,
			"limite":    attempts,
			"espera_ms": connectRetryDelay.Milliseconds(),
			"error":     err.Error(),
		})
		time.Sleep(connectRetryDelay)
	}

	return nil, fmt.Errorf("se agotaron los %d intentos de conexion a %s: %w", attempts, cfg.Driver, lastErr)
}

// purgeLocalDocuments borra al arrancar y luego una vez al dia los PDF y correos locales mas antiguos que maxAge.
func purgeLocalDocuments(dirs []string, maxAge time.Duration, log *logger.Logger) {
	for {
		for _, dir := range dirs {
			removed, err := retention.PurgeOlderThan(dir, maxAge, time.Now())
			if err != nil {
				log.Warn("No se pudo depurar la carpeta de documentos locales", map[string]interface{}{"carpeta": dir, "error": err.Error()})
			} else if removed > 0 {
				log.Info("Documentos locales vencidos eliminados", map[string]interface{}{"carpeta": dir, "archivos": removed})
			}
		}
		time.Sleep(24 * time.Hour)
	}
}
