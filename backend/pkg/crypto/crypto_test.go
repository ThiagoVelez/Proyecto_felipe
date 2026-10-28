package crypto_test

import (
	"testing"
	"time"

	"saludconecta-backend/pkg/crypto"
)

func TestPasswordHashingAndVerification(t *testing.T) {
	password := "SecretMed123*"
	hash, err := crypto.HashPassword(password)
	if err != nil {
		t.Fatalf("Error calculando hash bcrypt: %v", err)
	}

	if !crypto.CheckPassword(password, hash) {
		t.Fatal("La contrasena valida no coincidio con su hash")
	}

	if crypto.CheckPassword("WrongPassword", hash) {
		t.Fatal("Una contrasena incorrecta no debe coincidir")
	}
}

func TestJWTIssuanceAndValidation(t *testing.T) {
	secret := "test-secret-key-32-bytes-long!!"
	userID := "u1234567-0000-0000-0000-000000000001"
	role := "MEDICO"
	email := "medico@saludconecta.com"

	token, err := crypto.GenerateJWT(userID, role, email, secret, 1*time.Hour)
	if err != nil {
		t.Fatalf("Error emitiendo JWT: %v", err)
	}

	claims, err := crypto.ValidateJWT(token, secret)
	if err != nil {
		t.Fatalf("Error validando token emitido: %v", err)
	}

	if claims.UserID != userID || claims.Role != role || claims.Email != email {
		t.Fatalf("Discrepancia en claims del token: %+v", claims)
	}

	// Validar token con firma equivocada
	_, err = crypto.ValidateJWT(token, "wrong-secret-key")
	if err == nil {
		t.Fatal("Un token firmado con una clave distinta no debe ser aceptado")
	}
}
