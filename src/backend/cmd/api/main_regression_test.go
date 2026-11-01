package main

import (
	"strings"
	"testing"
)

// TestDEF12ResolveJWTSecret garantiza que el servidor no arranque con un secreto ausente, corto o publicado.
func TestDEF12ResolveJWTSecret(t *testing.T) {
	fuerte := strings.Repeat("k", minJWTSecretLength)

	casos := []struct {
		nombre   string
		valor    string
		driver   string
		aceptado bool
	}{
		{"ausente con mysql", "", "mysql", false},
		{"ausente con postgres", "", "postgres", false},
		{"corto", "secreto-corto", "mysql", false},
		{"valor por defecto historico", legacyDefaultJWTSecret, "mysql", false},
		{"valor por defecto historico en memoria", legacyDefaultJWTSecret, "memory", false},
		{"fuerte", fuerte, "mysql", true},
	}
	for _, c := range casos {
		secreto, _, err := resolveJWTSecret(c.valor, c.driver)
		if c.aceptado && (err != nil || secreto != c.valor) {
			t.Errorf("%s: se esperaba aceptar el secreto; err=%v", c.nombre, err)
		}
		if !c.aceptado && err == nil {
			t.Errorf("%s: se esperaba rechazo al arrancar", c.nombre)
		}
	}

	// En memoria, sin secreto configurado, se genera uno aleatorio y efimero: nunca un valor conocido.
	s1, efimero, err := resolveJWTSecret("", "memory")
	s2, _, _ := resolveJWTSecret("", "memory")
	if err != nil || !efimero || len(s1) < minJWTSecretLength || s1 == s2 {
		t.Errorf("Modo memoria sin secreto: se esperaba secreto aleatorio efimero; efimero=%v len=%d err=%v", efimero, len(s1), err)
	}
}
