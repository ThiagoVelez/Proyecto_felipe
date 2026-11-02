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
	ErrPatientMismatch             = errors.New("el paciente indicado no corresponde al paciente del folio clinico")
	ErrInvalidPrescriptionItem     = errors.New("cada item de la prescripcion requiere medicamento y cantidad mayor a cero")
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
	ID                 int    `json:"id"`
	CUMCode            string `json:"cum_code"`
	CommercialName     string `json:"commercial_name"`
	GenericName        string `json:"generic_name"`
	ActiveIngredient   string `json:"active_ingredient"`
	Concentration      string `json:"concentration"`
	PharmaceuticalForm string `json:"pharmaceutical_form"`
	StockQuantity      int    `json:"stock_quantity"`
}

// PrescriptionItem representa un renglon individual en una orden farmacologica.
type PrescriptionItem struct {
	ID              int                `json:"id"`
	PrescriptionID  string             `json:"prescription_id"`
	MedicationID    int                `json:"medication_id"`
	Medication      *MedicationCatalog `json:"medication"`
	Dosage          string             `json:"dosage"`
	FrequencyHours  int                `json:"frequency_hours"`
	DurationDays    int                `json:"duration_days"`
	TotalQuantity   int                `json:"total_quantity"`
	IndicationNotes *string            `json:"indication_notes"`
}

// Prescription agrupa la orden de medicamentos ligada a un folio clinico.
type Prescription struct {
	ID               string             `json:"id"`
	ClinicalRecordID string             `json:"clinical_record_id"`
	PatientID        string             `json:"patient_id"`
	DoctorID         string             `json:"doctor_id"`
	Observations     *string            `json:"observations"`
	CreatedAt        time.Time          `json:"created_at"`
	Items            []PrescriptionItem `json:"items"`
}
