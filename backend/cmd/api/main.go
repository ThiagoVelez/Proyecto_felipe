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
	"saludconecta-backend/internal/adapters/storage"
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
	dbDriver := getEnv("DB_DRIVER", "mysql")
	dbHost := getEnv("DB_HOST", "127.0.0.1")
	dbPort := getEnv("DB_PORT", "3306")
	dbUser := getEnv("DB_USER", "root")
	dbPassword := getEnv("DB_PASSWORD", "")
	dbName := getEnv("DB_NAME", "saludconecta_db")
	jwtSecret := getEnv("JWT_SECRET", "super-secret-key-saludconecta-ips-v24-2026")
	corsOrigins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
	ipsNIT := getEnv("IPS_NIT", "900123456")
	codPrestador := getEnv("COD_PRESTADOR", "110010999901")

	// 3. Resolucion del Adaptador de Persistencia (Inyeccion Hexagonal de Puertos)
	// Permite intercambiar el motor (MySQL, PostgreSQL, MongoDB, Memoria) mediante configuracion
	storageCfg := storage.Config{
		Driver:          dbDriver,
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

	repos, err := storage.NewRepositoryBundle(storageCfg, log)
	if err != nil {
		log.Error("No fue posible inicializar el adaptador principal configurado", map[string]interface{}{
			"driver": dbDriver,
			"error":  err.Error(),
		})
		log.Warn("Conmutando a Adaptador en Memoria para permitir pruebas inmediatas sin motor activo")
		storageCfg.Driver = "memory"
		repos, _ = storage.NewRepositoryBundle(storageCfg, log)
	}
	defer repos.Close()

	// 4. Instanciacion de Servicios de Dominio (Casos de Uso Puros)
	// Notese que los servicios dependen estrictamente de los Puertos (interfaces ports.*),
	// por lo que desconocen si los datos residen en MySQL, PostgreSQL o Memoria.
	jwtTTL := 8 * time.Hour
	authService := services.NewAuthService(repos.User, jwtSecret, jwtTTL)
	triageService := services.NewTriageService(repos.Triage, repos.Patient)
	recordService := services.NewClinicalRecordService(repos.ClinicalRecord, repos.Patient, repos.User)
	prescService := services.NewPrescriptionService(repos.Prescription, repos.ClinicalRecord, repos.Patient)
	syncService := services.NewSyncService(repos.ClinicalRecord, repos.Patient)

	// 5. Adaptadores de Interoperabilidad Normativa (MinSalud & HL7)
	ripsGen := interoperability.NewRIPSGenerator(ipsNIT, codPrestador)
	fhirMap := interoperability.NewFHIRMapper()

	// 6. Instanciacion de Controladores HTTP (Adaptadores Primarios)
	authHandler := handlers.NewAuthHandler(authService)
	triageHandler := handlers.NewTriageHandler(triageService)
	recordHandler := handlers.NewClinicalRecordHandler(recordService, repos.Patient, repos.Prescription, ripsGen, fhirMap)
	prescHandler := handlers.NewPrescriptionHandler(prescService)
	syncHandler := handlers.NewSyncHandler(syncService)

	// 7. Configuracion del Servidor HTTP Fiber v2
	serverCfg := http.ServerConfig{
		AllowedOrigins: corsOrigins,
		RateLimitMax:   120,
		RateLimitTime:  1 * time.Minute,
		JWTSecret:      jwtSecret,
		AuditRepo:      repos.Audit,
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

