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
	ErrUserInactive            = errors.New("el usuario se encuentra inactivo o pendiente de aprobacion rethus")
	ErrUnauthorizedRole        = errors.New("el rol del usuario no tiene permisos para esta accion")
	ErrMissingProfessionalCard = errors.New("la tarjeta profesional o registro rethus es obligatoria para personal medico y asistencial")
)

// Role representa los perfiles de acceso bajo control RBAC.
type Role struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// User representa a un profesional o administrativo dentro de la IPS.
type User struct {
	ID               string    `json:"id"`
	RoleID           int       `json:"role_id"`
	RoleName         string    `json:"role_name,omitempty"`
	FullName         string    `json:"full_name"`
	DocumentType     string    `json:"document_type"` // CC, CE, PA
	DocumentNumber   string    `json:"document_number"`
	Email            string    `json:"email"`
	PasswordHash     string    `json:"-"`
	Phone            string    `json:"phone"`
	ProfessionalCard string    `json:"professional_card"` // Obligatorio para MEDICO/ENFERMERO
	Specialty        string    `json:"specialty"`          // Medicina General, Pediatria, Urgencias, etc.
	Branch           string    `json:"branch"`             // Cartago, La Union, Tulua, Brigada Rural
	MFASecret        *string   `json:"-"`
	MFAEnabled       bool      `json:"mfa_enabled"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// HasMedicalLicense verifica si el usuario cuenta con registro medico habilitante ReTHUS.
func (u *User) HasMedicalLicense() bool {
	return u.ProfessionalCard != ""
}
