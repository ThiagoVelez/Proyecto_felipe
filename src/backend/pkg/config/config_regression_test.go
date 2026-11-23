package config

import (
	"strings"
	"testing"
)

// TestDEF12ValidateJWTSecret garantiza que el servidor no arranque con un secreto ausente, corto o publicado.
// Reemplaza la prueba de la v1 (cmd/api) porque el equipo trasladó la validación al paquete config.
func TestDEF12ValidateJWTSecret(t *testing.T) {
	fuerte := strings.Repeat("k", MinJWTSecretLength)
	casos := []struct {
		nombre   string
		valor    string
		aceptado bool
	}{
		{"ausente", "", false},
		{"corto", "secreto-corto", false},
		{"valor publicado historico", "super-secret-key-saludconecta-ips-v24-2026", false},
		{"valor publicado en la plantilla", "clave_secreta_jwt_saludconecta_ips_v24_iso25010_2026", false},
		{"fuerte", fuerte, true},
	}
	for _, c := range casos {
		err := ValidateJWTSecret(c.valor)
		if c.aceptado && err != nil {
			t.Errorf("%s: se esperaba aceptar el secreto; err=%v", c.nombre, err)
		}
		if !c.aceptado && err == nil {
			t.Errorf("%s: se esperaba rechazo al arrancar", c.nombre)
		}
	}
}

// TestDEF12LoadFromSinSecretoFalla verifica que la carga completa de configuración falle sin JWT_SECRET,
// también con DB_DRIVER=memory.
func TestDEF12LoadFromSinSecretoFalla(t *testing.T) {
	for _, driver := range []string{"mysql", "postgres", "memory"} {
		env := map[string]string{"DB_DRIVER": driver}
		if _, err := LoadFrom(func(k string) string { return env[k] }); err == nil {
			t.Errorf("driver %s: se esperaba error sin JWT_SECRET", driver)
		}
	}
}
