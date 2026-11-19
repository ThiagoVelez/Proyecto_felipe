package domain

import (
	"errors"
	"time"
)

// LabOrderStatus es el estado de una orden de laboratorio clinico.
type LabOrderStatus string

const (
	LabPending    LabOrderStatus = "PENDIENTE"
	LabInProgress LabOrderStatus = "EN_PROCESO"
	LabCompleted  LabOrderStatus = "COMPLETADO"
)

var (
	ErrLabOrderNotFound   = errors.New("orden de laboratorio no encontrada")
	ErrInvalidLabOrder    = errors.New("la orden de laboratorio es incompleta o invalida")
	ErrLabOrderSealed     = errors.New("el resultado ya fue validado y sellado; no puede modificarse")
	ErrLabOrderNotSealed  = errors.New("solo se pueden despachar resultados validados y sellados")
	ErrLabResultsRequired = errors.New("debe ingresar los parametros analiticos antes de sellar el resultado")
)

// LabOrder es una orden de examen de laboratorio: la emite el medico (o la recepcion del laboratorio), el
// bacteriologo registra el avance, valida y sella el resultado con su registro ReTHUS y lo despacha por correo.
type LabOrder struct {
	ID                    string         `json:"id"`
	PatientID             string         `json:"patient_id,omitempty"`
	PatientName           string         `json:"patient_name"`
	PatientDocument       string         `json:"patient_document"`
	PatientDocumentType   string         `json:"patient_document_type"`
	PatientEmail          string         `json:"patient_email"`
	PatientPhone          string         `json:"patient_phone"`
	PatientEPS            string         `json:"patient_eps"`
	PatientAge            int            `json:"patient_age"`
	PatientGender         string         `json:"patient_gender"`
	TestType              string         `json:"test_type"`
	SampleType            string         `json:"sample_type"`
	Priority              string         `json:"priority"`
	Status                LabOrderStatus `json:"status"`
	Observations          string         `json:"observations"`
	OrderingDoctorID      string         `json:"ordering_doctor_id,omitempty"`
	OrderingDoctor        string         `json:"ordering_doctor"`
	DoctorLicense         string         `json:"doctor_license"`
	DoctorSpecialty       string         `json:"doctor_specialty"`
	DoctorEmail           string         `json:"doctor_email"`
	Results               string         `json:"results"`
	MethodNotes           string         `json:"method_notes"`
	ValidatedAt           *time.Time     `json:"validated_at,omitempty"`
	ValidatedBy           string         `json:"validated_by,omitempty"`
	BacteriologistLicense string         `json:"bacteriologist_license,omitempty"`
	EmailDispatchedAt     *time.Time     `json:"email_dispatched_at,omitempty"`
	DispatchedTo          string         `json:"dispatched_to,omitempty"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
}

// ValidLabPriorities son las prioridades aceptadas por el laboratorio.
var ValidLabPriorities = map[string]bool{"RUTINA": true, "PRIORITARIO": true, "URGENTE": true}
