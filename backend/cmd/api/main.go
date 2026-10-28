package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"saludconecta-backend/internal/adapters/http"
	"saludconecta-backend/internal/adapters/http/handlers"
	"saludconecta-backend/internal/adapters/interoperability"
	"saludconecta-backend/internal/adapters/storage/mysql"
	"saludconecta-backend/internal/core/services"
	"saludconecta-backend/pkg/logger"
)

func getEnv(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}

func main() {
	// 1. Inicializacion del logger estructurado institucional
	log := logger.New()
	log.Info("Iniciando Sistema Hospitalario SaludConecta IPS v2.4 (ISO/IEC 25010)")

	// 2. Carga de configuracion de entorno
	port := getEnv("PORT", "8080")
	dbHost := getEnv("DB_HOST", "127.0.0.1")
	dbPort := getEnv("DB_PORT", "3306")
	dbUser := getEnv("DB_USER", "root")
	dbPassword := getEnv("DB_PASSWORD", "")
	dbName := getEnv("DB_NAME", "saludconecta_db")
	jwtSecret := getEnv("JWT_SECRET", "super-secret-key-saludconecta-ips-v24-2026")
	corsOrigins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
	ipsNIT := getEnv("IPS_NIT", "900123456")
	codPrestador := getEnv("COD_PRESTADOR", "110010999901")

	// 3. Conexion y configuracion del pool de almacenamiento secundario (MySQL)
	dbCfg := mysql.Config{
		Host:            dbHost,
		Port:            dbPort,
		User:            dbUser,
		Password:        dbPassword,
		DBName:          dbName,
		MaxOpenConns:    30,
		MaxIdleConns:    10,
		ConnMaxLifetime: 5 * time.Minute,
		ConnMaxIdleTime: 2 * time.Minute,
	}

	db, err := mysql.NewConnection(dbCfg)
	if err != nil {
		log.Error("No fue posible establecer conexion con la base de datos MySQL", map[string]interface{}{
			"host":  dbHost,
			"port":  dbPort,
			"db":    dbName,
			"error": err.Error(),
		})
		log.Warn("El servidor iniciara en modo degradado o verificacion estatica")
	} else {
		defer db.Close()
		log.Info("Conexion a MySQL 8.0+ establecida y verificada exitosamente", map[string]interface{}{
			"database": dbName,
		})
	}

	// 4. Instanciacion de Adaptadores de Persistencia (Secundarios)
	userRepo := mysql.NewUserRepository(db)
	patientRepo := mysql.NewPatientRepository(db)
	triageRepo := mysql.NewTriageRepository(db)
	recordRepo := mysql.NewClinicalRecordRepository(db)
	prescRepo := mysql.NewPrescriptionRepository(db)
	auditRepo := mysql.NewAuditRepository(db)

	// 5. Instanciacion de Servicios de Dominio (Casos de Uso Puros)
	jwtTTL := 8 * time.Hour
	authService := services.NewAuthService(userRepo, jwtSecret, jwtTTL)
	triageService := services.NewTriageService(triageRepo, patientRepo)
	recordService := services.NewClinicalRecordService(recordRepo, patientRepo, userRepo)
	prescService := services.NewPrescriptionService(prescRepo, recordRepo, patientRepo)
	syncService := services.NewSyncService(recordRepo, patientRepo)

	// 6. Adaptadores de Interoperabilidad Normativa (MinSalud & HL7)
	ripsGen := interoperability.NewRIPSGenerator(ipsNIT, codPrestador)
	fhirMap := interoperability.NewFHIRMapper()

	// 7. Instanciacion de Controladores HTTP (Adaptadores Primarios)
	authHandler := handlers.NewAuthHandler(authService)
	triageHandler := handlers.NewTriageHandler(triageService)
	recordHandler := handlers.NewClinicalRecordHandler(recordService, patientRepo, prescRepo, ripsGen, fhirMap)
	prescHandler := handlers.NewPrescriptionHandler(prescService)
	syncHandler := handlers.NewSyncHandler(syncService)

	// 8. Configuracion del Servidor HTTP Fiber v2
	serverCfg := http.ServerConfig{
		AllowedOrigins: corsOrigins,
		RateLimitMax:   120,
		RateLimitTime:  1 * time.Minute,
		JWTSecret:      jwtSecret,
		AuditRepo:      auditRepo,
		Logger:         log,
		RouterConfig: http.RouterConfig{
			AuthHandler:           authHandler,
			TriageHandler:         triageHandler,
			ClinicalRecordHandler: recordHandler,
			PrescriptionHandler:   prescHandler,
			SyncHandler:           syncHandler,
			JWTSecret:             jwtSecret,
		},
	}

	server := http.NewServer(serverCfg)

	// 9. Inicio del servidor en segundo plano y captura de senales para apagado elegante
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		address := fmt.Sprintf(":%s", port)
		log.Info("Servidor HTTP Fiber v2 en escucha", map[string]interface{}{
			"address": address,
			"port":    port,
		})
		if err := server.Listen(address); err != nil {
			log.Info("Servidor HTTP detenido", map[string]interface{}{"info": err.Error()})
		}
	}()

	<-shutdownChan
	log.Info("Senal de interrupcion recibida. Procediendo con el apagado elegante del sistema...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(); err != nil {
		log.Error("Fallo durante el apagado elegante del servidor HTTP", map[string]interface{}{
			"error": err.Error(),
		})
	}

	_ = ctx
	log.Info("SaludConecta IPS v2.4 finalizado de forma controlada.")
}
