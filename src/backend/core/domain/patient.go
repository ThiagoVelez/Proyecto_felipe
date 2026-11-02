package domain

import (
	"errors"
	"time"
)

var (
	ErrPatientNotFound      = errors.New("paciente no encontrado")
	ErrPatientAlreadyExists = errors.New("ya existe un paciente con el documento proporcionado")
	ErrInvalidDocumentType  = errors.New("tipo de documento de identificacion invalido")
	ErrInvalidPatientData   = errors.New("los datos del paciente son invalidos o estan incompletos")
	ErrInvalidAllergyData   = errors.New("los datos de la alergia son invalidos o estan incompletos")
)

// DocumentType define los tipos de documento validos en el sistema de salud colombiano.
type DocumentType string

const (
	DocCC DocumentType = "CC"
	DocTI DocumentType = "TI"
	DocRC DocumentType = "RC"
	DocCE DocumentType = "CE"
	DocPA DocumentType = "PA"
	DocMS DocumentType = "MS"
)

// Gender define la clasificacion de genero del paciente.
type Gender string

const (
	GenderMale   Gender = "M"
	GenderFemale Gender = "F"
	GenderOther  Gender = "OTRO"
)

// BloodType define el grupo sanguineo y factor RH.
type BloodType string

// AffiliationStatus define el estado de afiliacion al Sistema General de Seguridad Social en Salud (SGSSS).
type AffiliationStatus string

const (
	AffiliationActive    AffiliationStatus = "ACTIVO"
	AffiliationInactive  AffiliationStatus = "INACTIVO"
	AffiliationSuspended AffiliationStatus = "SUSPENDIDO"
)

// AllergySeverity define la gravedad clinica de una reaccion alergica.
type AllergySeverity string

const (
	SeverityMild     AllergySeverity = "LEVE"
	SeverityModerate AllergySeverity = "MODERADA"
	SeveritySevere   AllergySeverity = "SEVERA"
)

// PatientAllergy representa el registro de una hipersensibilidad o alergia a principios activos.
type PatientAllergy struct {
	ID               int             `json:"id"`
	PatientID        string          `json:"patient_id"`
	ActiveIngredient string          `json:"active_ingredient"`
	Severity         AllergySeverity `json:"severity"`
	Notes            string          `json:"notes"`
	CreatedAt        time.Time       `json:"created_at"`
}

// Patient representa la entidad del paciente atendido en la IPS.
type Patient struct {
	ID                string            `json:"id"`
	DocumentType      DocumentType      `json:"document_type"`
	DocumentNumber    string            `json:"document_number"`
	FirstName         string            `json:"first_name"`
	SecondName        *string           `json:"second_name"`
	LastName          string            `json:"last_name"`
	SecondLastName    *string           `json:"second_last_name"`
	BirthDate         time.Time         `json:"birth_date"`
	Gender            Gender            `json:"gender"`
	BloodType         BloodType         `json:"blood_type"`
	EPSName           string            `json:"eps_name"`
	AffiliationStatus AffiliationStatus `json:"affiliation_status"`
	Phone             *string           `json:"phone"`
	IsRuralZone       bool              `json:"is_rural_zone"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
	Allergies         []PatientAllergy  `json:"allergies"`
}

// FullName retorna el nombre completo formateado del paciente.
func (p *Patient) FullName() string {
	name := p.FirstName
	if p.SecondName != nil && *p.SecondName != "" {
		name += " " + *p.SecondName
	}
	name += " " + p.LastName
	if p.SecondLastName != nil && *p.SecondLastName != "" {
		name += " " + *p.SecondLastName
	}
	return name
}

// IsAllergicToIngredient determina si el paciente presenta hipersensibilidad registrada a un principio activo,
// considerando normalizacion de tildes/mayusculas y pertenencia a la misma familia farmacologica.
func (p *Patient) IsAllergicToIngredient(ingredient string) (bool, *PatientAllergy) {
	if allergy := MatchAllergy(p.Allergies, ingredient); allergy != nil {
		return true, allergy
	}
	return false, nil
}
