package domain

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrPrescriptionNotFound        = errors.New("receta o prescripcion medica no encontrada")
	ErrMedicationNotFound          = errors.New("medicamento no hallado en el catalogo institucional")
	ErrInsufficientMedicationStock = errors.New("cantidad insuficiente en stock hospitalario")
	ErrEmptyPrescriptionItems      = errors.New("la prescripcion medica debe contener al menos un item farmacologico")
)

// AllergyConflictError representa una contraindicacion por hipersensibilidad previa del paciente.
type AllergyConflictError struct {
	PatientID        string
	ActiveIngredient string
	Severity         AllergySeverity
	MedicationName   string
}

func (e *AllergyConflictError) Error() string {
	return fmt.Sprintf("alerta critica de seguridad: el paciente registra alergia conocida (%s - severidad: %s) al principio activo del medicamento %s",
		e.ActiveIngredient, e.Severity, e.MedicationName)
}

// MedicationCatalog representa un medicamento codificado bajo el estandar CUM de Colombia.
type MedicationCatalog struct {
	ID                 int
	CUMCode            string
	CommercialName     string
	GenericName        string
	ActiveIngredient   string
	Concentration      string
	PharmaceuticalForm string
	StockQuantity      int
}

// PrescriptionItem representa un renglon individual en una orden farmacologica.
type PrescriptionItem struct {
	ID              int
	PrescriptionID  string
	MedicationID    int
	Medication      *MedicationCatalog
	Dosage          string
	FrequencyHours  int
	DurationDays    int
	TotalQuantity   int
	IndicationNotes *string
}

// Prescription agrupa la orden de medicamentos ligada a un folio clinico.
type Prescription struct {
	ID               string
	ClinicalRecordID string
	PatientID        string
	DoctorID         string
	Observations     *string
	CreatedAt        time.Time
	Items            []PrescriptionItem
}

