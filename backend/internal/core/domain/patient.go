package domain

import (
	"errors"
	"time"
)

var (
	ErrPatientNotFound      = errors.New("paciente no encontrado")
	ErrPatientAlreadyExists = errors.New("ya existe un paciente con el documento proporcionado")
	ErrInvalidDocumentType  = errors.New("tipo de documento de identificacion invalido")
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
	ID               int
	PatientID        string
	ActiveIngredient string
	Severity         AllergySeverity
	Notes            string
	CreatedAt        time.Time
}

// Patient representa la entidad del paciente atendido en la IPS.
type Patient struct {
	ID                 string
	DocumentType       DocumentType
	DocumentNumber     string
	FirstName          string
	SecondName         *string
	LastName           string
	SecondLastName     *string
	BirthDate          time.Time
	Gender             Gender
	BloodType          BloodType
	EPSName            string
	AffiliationStatus  AffiliationStatus
	Phone              *string
	IsRuralZone        bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
	Allergies          []PatientAllergy
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

// IsAllergicToIngredient determina si el paciente presenta hipersensibilidad registrada a un principio activo.
func (p *Patient) IsAllergicToIngredient(ingredient string) (bool, *PatientAllergy) {
	for i := range p.Allergies {
		if p.Allergies[i].ActiveIngredient == ingredient {
			return true, &p.Allergies[i]
		}
	}
	return false, nil
}
