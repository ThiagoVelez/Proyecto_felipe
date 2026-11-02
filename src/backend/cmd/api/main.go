package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"os/signal"
	"syscall"
	"time"

	"saludconecta-backend/adapters/http"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/interoperability"
	"saludconecta-backend/adapters/storage"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/logger"
)

func getEnv(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}

const minJWTSecretLength = 32

// legacyDefaultJWTSecret es el valor que versiones anteriores usaban por defecto; al estar publicado
// en el repositorio, cualquiera podia forjar tokens validos (DEF-12). Se conserva solo para rechazarlo.
const legacyDefaultJWTSecret = "super-secret-key-saludconecta-ips-v24-2026"

// resolveJWTSecret valida el secreto de firma JWT. Con un motor persistente el arranque falla si falta,
// es corto o es el valor publicado. En modo memoria (solo desarrollo) se genera uno aleatorio y efimero.
func resolveJWTSecret(raw, driver string) (secret string, ephemeral bool, err error) {
	if raw == "" && strings.EqualFold(strings.TrimSpace(driver), "memory") {
		buf := make([]byte, minJWTSecretLength)
		if _, err := rand.Read(buf); err != nil {
			return "", false, fmt.Errorf("no fue posible generar un JWT_SECRET efimero: %w", err)
		}
		return hex.EncodeToString(buf), true, nil
	}
	if raw == "" {
		return "", false, errors.New("JWT_SECRET es obligatorio con un motor de persistencia real")
	}
	if raw == legacyDefaultJWTSecret {
		return "", false, errors.New("JWT_SECRET usa el valor publicado en el repositorio; genere uno nuevo")
	}
	if len(raw) < minJWTSecretLength {
		return "", false, fmt.Errorf("JWT_SECRET debe tener al menos %d caracteres", minJWTSecretLength)
	}
	return raw, false, nil
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
	jwtSecret, ephemeralSecret, err := resolveJWTSecret(os.Getenv("JWT_SECRET"), dbDriver)
	if err != nil {
		log.Error("Configuracion de seguridad invalida; el servidor no arrancara", map[string]interface{}{
			"error": err.Error(),
		})
		os.Exit(1)
	}
	if ephemeralSecret {
		log.Warn("JWT_SECRET no definido en modo memoria: se genero un secreto efimero; los tokens se invalidan al reiniciar")
	}
	corsOrigins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5174")
	ipsNIT := getEnv("IPS_NIT", "900123456")
	codPrestador := getEnv("COD_PRESTADOR", "110010999901")

	// 3. Resolucion del Adaptador de Persistencia (Inyeccion Hexagonal de Puertos)
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
		log.Warn("Conmutando a Adaptador en Memoria para permitir pruebas inmediatas con gobernanza")
		storageCfg.Driver = "memory"
		repos, _ = storage.NewRepositoryBundle(storageCfg, log)
	}
	defer repos.Close()

	// 4. Instanciacion de Servicios de Dominio (Casos de Uso Puros)
	jwtTTL := 8 * time.Hour
	authService := services.NewAuthService(repos.User, jwtSecret, jwtTTL)
	adminService := services.NewAdminService(repos.User, repos.Audit)
	triageService := services.NewTriageService(repos.Triage, repos.Patient)
	recordService := services.NewClinicalRecordService(repos.ClinicalRecord, repos.Patient, repos.User)
	prescService := services.NewPrescriptionService(repos.Prescription, repos.ClinicalRecord, repos.Patient)
	syncService := services.NewSyncService(repos.ClinicalRecord, repos.Patient)

	// 5. Adaptadores de Interoperabilidad Normativa (MinSalud & HL7)
	ripsGen := interoperability.NewRIPSGenerator(ipsNIT, codPrestador)
	fhirMap := interoperability.NewFHIRMapper()

	// 6. Instanciacion de Controladores HTTP (Adaptadores Primarios)
	authHandler := handlers.NewAuthHandler(authService)
	adminHandler := handlers.NewAdminHandler(adminService)
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
			AdminHandler:          adminHandler,
			TriageHandler:         triageHandler,
			ClinicalRecordHandler: recordHandler,
			PrescriptionHandler:   prescHandler,
			SyncHandler:           syncHandler,
			JWTSecret:             jwtSecret,
		},
	}

	server := http.NewServer(serverCfg)

	// 8. Inicio del servidor en segundo plano y captura de senales para apagado elegante
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
