package services

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/crypto"
)

// MinBootstrapPasswordLength es la longitud minima exigida a la contrasena del administrador inicial.
const MinBootstrapPasswordLength = 12

var (
	ErrBootstrapCredentialsMissing = errors.New("no existe administrador y faltan ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD para crearlo")
	ErrBootstrapPasswordWeak       = errors.New("ADMIN_INITIAL_PASSWORD debe tener al menos 12 caracteres")
)

// BootstrapAdmin crea el administrador inicial unicamente cuando el sistema no tiene ninguno y el operador definio
// sus credenciales por entorno. No existe ninguna credencial por defecto: sin variables no se crea cuenta alguna.
// Retorna true si se creo la cuenta.
func BootstrapAdmin(ctx context.Context, userRepo ports.UserRepository, email, password string) (bool, error) {
	admins, err := userRepo.CountAdmins(ctx)
	if err != nil {
		return false, err
	}
	if admins > 0 {
		return false, nil
	}

	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return false, ErrBootstrapCredentialsMissing
	}
	if utf8.RuneCountInString(password) < MinBootstrapPasswordLength {
		return false, ErrBootstrapPasswordWeak
	}

	hash, err := crypto.HashPassword(password)
	if err != nil {
		return false, err
	}

	now := time.Now().UTC()
	admin := &domain.User{
		ID:             uuid.New().String(),
		RoleID:         1,
		RoleName:       "ADMIN",
		FullName:       "Administrador del Sistema",
		DocumentType:   "CC",
		DocumentNumber: "",
		Email:          email,
		PasswordHash:   hash,
		Specialty:      "Seguridad y Gobernanza Hospitalaria",
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := userRepo.Create(ctx, admin); err != nil {
		return false, err
	}
	return true, nil
}
