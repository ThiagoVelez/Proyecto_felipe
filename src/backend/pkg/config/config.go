package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// MinJWTSecretLength es la longitud minima aceptada para firmar tokens HS256.
const MinJWTSecretLength = 32

// knownInsecureSecrets reune valores que alguna vez se publicaron en el repositorio, la documentacion o las plantillas.
var knownInsecureSecrets = []string{
	"super-secret-key-saludconecta-ips-v24-2026",
	"clave_secreta_jwt_saludconecta_ips_v24_iso25010_2026",
	"super_secret_seed_key",
	"tu_clave_secreta_jwt_de_alta_entropia_aqui",
	"defina_un_secreto_aleatorio_de_32_o_mas",
	"defina_un_secreto_aleatorio_de_al_menos_32_caracteres",
	"changeme",
	"secret",
}

// DefaultTrustedProxies son los origenes cuya cabecera X-Real-IP se acepta si no se configura TRUSTED_PROXIES.
const DefaultTrustedProxies = "127.0.0.1,::1"

// Config concentra la configuracion de arranque ya validada.
type Config struct {
	Port           string
	DBDriver       string
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	JWTSecret      string
	JWTTTL         time.Duration
	JWTAccessTTL   time.Duration
	JWTRefreshTTL  time.Duration
	CORSOrigins    string
	IPSNIT         string
	CodPrestador   string
	TrustedProxies []string
	AdminEmail     string
	AdminPassword  string
	// SetupCode (TI_SETUP_CODE) habilita el registro del Encargado de TI desde el inicio de sesion
	SetupCode      string
	DBConnectTries int
	// AllowPostgresMemoryModules (ALLOW_POSTGRES_MEMORY_MODULES=true) acepta arrancar PostgreSQL con modulos en memoria (DEF-10)
	AllowPostgresMemoryModules bool
	// DocumentRetention (RETENCION_DOCUMENTOS_DIAS) es el plazo de las copias locales de PDF y correos (DEF-62)
	DocumentRetention time.Duration
}

func getEnv(lookup func(string) string, key, fallback string) string {
	if val := strings.TrimSpace(lookup(key)); val != "" {
		return val
	}
	return fallback
}

// ValidateJWTSecret rechaza secretos ausentes, cortos o publicados en el codigo.
func ValidateJWTSecret(secret string) error {
	if secret == "" {
		return errors.New("JWT_SECRET es obligatorio: defina un secreto aleatorio de al menos 32 caracteres")
	}
	if len(secret) < MinJWTSecretLength {
		return fmt.Errorf("JWT_SECRET debe tener al menos %d caracteres", MinJWTSecretLength)
	}
	for _, known := range knownInsecureSecrets {
		if strings.EqualFold(secret, known) {
			return errors.New("JWT_SECRET coincide con un valor publicado en el repositorio; genere uno nuevo y privado")
		}
	}
	return nil
}

// loadDotEnv carga variables desde un archivo .env si existe en el entorno local
func loadDotEnv() {
	paths := []string{".env", "../.env", "../../.env"}
	for _, p := range paths {
		data, err := os.ReadFile(p) // #nosec G304 -- rutas fijas del archivo .env local, no provienen del usuario
		if err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					key := strings.TrimSpace(parts[0])
					val := strings.TrimSpace(parts[1])
					val = strings.Trim(val, "\"'`\r")
					if os.Getenv(key) == "" {
						_ = os.Setenv(key, val)
					}
				}
			}
			break
		}
	}
}

// Load lee la configuracion del entorno y falla de forma explicita ante valores inseguros o ausentes.
func Load() (*Config, error) {
	loadDotEnv()
	return LoadFrom(os.Getenv)
}

// LoadFrom permite inyectar el origen de variables (pruebas).
func LoadFrom(lookup func(string) string) (*Config, error) {
	cfg := &Config{
		Port:          getEnv(lookup, "PORT", "8080"),
		DBDriver:      strings.ToLower(getEnv(lookup, "DB_DRIVER", "mysql")),
		DBHost:        getEnv(lookup, "DB_HOST", "127.0.0.1"),
		DBPort:        getEnv(lookup, "DB_PORT", "3306"),
		DBUser:        getEnv(lookup, "DB_USER", "root"),
		DBPassword:    lookup("DB_PASSWORD"),
		DBName:        getEnv(lookup, "DB_NAME", "saludconecta_db"),
		JWTSecret:     lookup("JWT_SECRET"),
		JWTTTL:        15 * time.Minute,
		JWTAccessTTL:  15 * time.Minute,
		JWTRefreshTTL: 7 * 24 * time.Hour,
		CORSOrigins:   getEnv(lookup, "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5174"),
		IPSNIT:        getEnv(lookup, "IPS_NIT", "000000000"),
		CodPrestador:  getEnv(lookup, "COD_PRESTADOR", "000000000000"),
		AdminEmail:    strings.TrimSpace(lookup("ADMIN_INITIAL_EMAIL")),

		AdminPassword:              lookup("ADMIN_INITIAL_PASSWORD"),
		SetupCode:                  strings.TrimSpace(lookup("TI_SETUP_CODE")),
		DBConnectTries:             10,
		AllowPostgresMemoryModules: strings.EqualFold(strings.TrimSpace(lookup("ALLOW_POSTGRES_MEMORY_MODULES")), "true"),
	}

	cfg.DocumentRetention = 30 * 24 * time.Hour
	if days := strings.TrimSpace(lookup("RETENCION_DOCUMENTOS_DIAS")); days != "" {
		if val, err := strconv.Atoi(days); err == nil && val > 0 {
			cfg.DocumentRetention = time.Duration(val) * 24 * time.Hour
		}
	}

	if accessMinsStr := lookup("JWT_ACCESS_TTL_MINUTES"); accessMinsStr != "" {
		if val, err := strconv.Atoi(strings.TrimSpace(accessMinsStr)); err == nil && val > 0 {
			cfg.JWTAccessTTL = time.Duration(val) * time.Minute
			cfg.JWTTTL = cfg.JWTAccessTTL
		}
	}
	if refreshHoursStr := lookup("JWT_REFRESH_TTL_HOURS"); refreshHoursStr != "" {
		if val, err := strconv.Atoi(strings.TrimSpace(refreshHoursStr)); err == nil && val > 0 {
			cfg.JWTRefreshTTL = time.Duration(val) * time.Hour
		}
	}

	if err := ValidateJWTSecret(cfg.JWTSecret); err != nil {
		return nil, err
	}

	// DEF-15: por defecto solo se confia en X-Real-IP enviada desde la misma maquina. Confiar en redes privadas
	// completas permitia que cualquier equipo de la red local rotara la cabecera y evadiera el limite por IP.
	// Detras de un proxy inverso se declara su IP exacta (docker-compose fija la del contenedor nginx).
	proxies := getEnv(lookup, "TRUSTED_PROXIES", DefaultTrustedProxies)
	for _, proxy := range strings.Split(proxies, ",") {
		if proxy = strings.TrimSpace(proxy); proxy != "" {
			cfg.TrustedProxies = append(cfg.TrustedProxies, proxy)
		}
	}

	return cfg, nil
}
