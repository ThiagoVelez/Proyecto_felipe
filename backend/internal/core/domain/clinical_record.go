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
)

// ClinicalRecordClarification representa una adicion o enmienda legal a un folio previamente cerrado.
type ClinicalRecordClarification struct {
	ID               int
	ClinicalRecordID string
	DoctorID         string
	DoctorName       string
	Note             string
	CreatedAt        time.Time
}

// ClinicalRecord representa un folio de la Historia Clinica Electronica (HCE).
type ClinicalRecord struct {
	ID                   string
	PatientID            string
	DoctorID             string
	DoctorName           string
	TriageID             *string
	Anamnesis            string
	PhysicalExam         string
	CIE11Code            string
	DiagnosisDescription string
	TreatmentPlan        string
	IsClosed             bool
	SignatureToken       *string
	PreviousHash         *string
	HashSHA256           *string
	IsOfflineSync        bool
	SyncBatchID          *string
	CreatedAt            time.Time
	ClosedAt             *time.Time
	Clarifications       []ClinicalRecordClarification
}

// CanModify determina si el registro clinico permite aun ser editado antes de su firma de cierre.
func (c *ClinicalRecord) CanModify() bool {
	return !c.IsClosed
}
