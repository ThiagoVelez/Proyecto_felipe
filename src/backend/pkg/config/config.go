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
	"changeme",
	"secret",
	// DEF-63: marcador de .env.example; quien copia la plantilla sin editarla firmaria con un secreto publico.
	"defina_un_secreto_aleatorio_de_al_menos_32_caracteres",
}

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
	DBConnectTries int
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
		data, err := os.ReadFile(p)
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
						os.Setenv(key, val)
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
		Port:         getEnv(lookup, "PORT", "8080"),
		DBDriver:     strings.ToLower(getEnv(lookup, "DB_DRIVER", "mysql")),
		DBHost:       getEnv(lookup, "DB_HOST", "127.0.0.1"),
		DBPort:       getEnv(lookup, "DB_PORT", "3306"),
		DBUser:       getEnv(lookup, "DB_USER", "root"),
		DBPassword:   lookup("DB_PASSWORD"),
		DBName:       getEnv(lookup, "DB_NAME", "saludconecta_db"),
		JWTSecret:    lookup("JWT_SECRET"),
		JWTTTL:       15 * time.Minute,
		JWTAccessTTL: 15 * time.Minute,
		JWTRefreshTTL: 7 * 24 * time.Hour,
		CORSOrigins:  getEnv(lookup, "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5174"),
		IPSNIT:       getEnv(lookup, "IPS_NIT", "000000000"),
		CodPrestador: getEnv(lookup, "COD_PRESTADOR", "000000000000"),
		AdminEmail:   strings.TrimSpace(lookup("ADMIN_INITIAL_EMAIL")),

		AdminPassword:  lookup("ADMIN_INITIAL_PASSWORD"),
		DBConnectTries: 10,
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

	// Por defecto solo se confia en cabeceras de reenvio provenientes de redes privadas (proxy inverso interno)
	proxies := getEnv(lookup, "TRUSTED_PROXIES", "127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16")
	for _, proxy := range strings.Split(proxies, ",") {
		if proxy = strings.TrimSpace(proxy); proxy != "" {
			cfg.TrustedProxies = append(cfg.TrustedProxies, proxy)
		}
	}

	return cfg, nil
}
