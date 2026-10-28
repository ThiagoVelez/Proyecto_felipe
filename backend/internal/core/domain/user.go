package domain

import (
	"errors"
	"time"
)

var (
	ErrUserNotFound            = errors.New("usuario no encontrado")
	ErrEmailAlreadyRegistered  = errors.New("el correo electronico ya esta registrado")
	ErrInvalidCredentials      = errors.New("credenciales de acceso invalidas")
	ErrMFAValidationFailed     = errors.New("codigo de verificacion mfa invalido")
	ErrMFARequired             = errors.New("se requiere autenticacion de dos factores")
	ErrUserInactive            = errors.New("el usuario se encuentra inactivo")
	ErrUnauthorizedRole        = errors.New("el rol del usuario no tiene permisos para esta accion")
)

// Role representa los perfiles de acceso bajo control RBAC.
type Role struct {
	ID          int
	Name        string
	Description string
	CreatedAt   time.Time
}

// User representa a un profesional o administrativo dentro de la IPS.
type User struct {
	ID               string
	RoleID           int
	RoleName         string
	FullName         string
	Email            string
	PasswordHash     string
	ProfessionalCard *string
	MFASecret        *string
	MFAEnabled       bool
	IsActive         bool
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// HasMedicalLicense verifica si el usuario cuenta con registro medico habilitante.
func (u *User) HasMedicalLicense() bool {
	return u.ProfessionalCard != nil && *u.ProfessionalCard != ""
}

