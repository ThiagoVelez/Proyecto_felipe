package domain

import (
	"errors"
	"time"
)

var (
	ErrRecordAlreadyClosed    = errors.New("la historia clinica se encuentra cerrada y es inmutable segun Resolucion 1995")
	ErrRecordNotFound         = errors.New("historia clinica no encontrada")
	ErrInvalidChainHash       = errors.New("la cadena de integridad SHA-256 ha sido vulnerada")
	ErrDoctorSignatureMissing = errors.New("se requiere la firma o identificador digital del facultativo para cerrar el folio")
	ErrEmptyClarificationNote = errors.New("la nota aclaratoria no puede ser vacia")
	ErrRecordNotClosed        = errors.New("la nota aclaratoria solo puede anexarse a un folio previamente cerrado")
	ErrNotRecordOwner         = errors.New("solo el medico autor del folio puede realizar esta operacion")
	ErrChainConflict          = errors.New("la cadena de integridad del paciente cambio durante el cierre; reintente la operacion")
)

// ClinicalRecordClarification representa una adicion o enmienda legal a un folio previamente cerrado.
type ClinicalRecordClarification struct {
	ID               int       `json:"id"`
	ClinicalRecordID string    `json:"clinical_record_id"`
	DoctorID         string    `json:"doctor_id"`
	DoctorName       string    `json:"doctor_name"`
	Note             string    `json:"note"`
	CreatedAt        time.Time `json:"created_at"`
}

// ClinicalRecord representa un folio de la Historia Clinica Electronica (HCE).
type ClinicalRecord struct {
	ID                   string                        `json:"id"`
	PatientID            string                        `json:"patient_id"`
	DoctorID             string                        `json:"doctor_id"`
	DoctorName           string                        `json:"doctor_name"`
	TriageID             *string                       `json:"triage_id"`
	Anamnesis            string                        `json:"anamnesis"`
	PhysicalExam         string                        `json:"physical_exam"`
	CIE11Code            string                        `json:"cie11_code"`
	DiagnosisDescription string                        `json:"diagnosis_description"`
	TreatmentPlan        string                        `json:"treatment_plan"`
	IsClosed             bool                          `json:"is_closed"`
	SignatureToken       *string                       `json:"signature_token"`
	PreviousHash         *string                       `json:"previous_hash"`
	HashSHA256           *string                       `json:"hash_sha256"`
	IsOfflineSync        bool                          `json:"is_offline_sync"`
	SyncBatchID          *string                       `json:"sync_batch_id"`
	CreatedAt            time.Time                     `json:"created_at"`
	ClosedAt             *time.Time                    `json:"closed_at"`
	Clarifications       []ClinicalRecordClarification `json:"clarifications"`
}

// CanModify determina si el registro clinico permite aun ser editado antes de su firma de cierre.
func (c *ClinicalRecord) CanModify() bool {
	return !c.IsClosed
}
