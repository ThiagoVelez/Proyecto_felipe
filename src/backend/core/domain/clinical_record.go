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
	ID                    string                        `json:"id"`
	PatientID             string                        `json:"patient_id"`
	DoctorID              string                        `json:"doctor_id"`
	DoctorName            string                        `json:"doctor_name"`
	TriageID              *string                       `json:"triage_id"`
	Anamnesis             string                        `json:"anamnesis"`
	PhysicalExam          string                        `json:"physical_exam"`
	CIE11Code             string                        `json:"cie11_code"`
	DiagnosisDescription  string                        `json:"diagnosis_description"`
	TreatmentPlan         string                        `json:"treatment_plan"`
	PainScaleScore        int                           `json:"pain_scale_score"`
	PainScaleObservations *string                       `json:"pain_scale_observations,omitempty"`
	AnatomicalMapping     *string                       `json:"anatomical_mapping,omitempty"`
	AnatomicalNotes       []ClinicalAnatomicalNote      `json:"anatomical_notes,omitempty"`
	IsClosed              bool                          `json:"is_closed"`
	SignatureToken        *string                       `json:"signature_token"`
	PreviousHash          *string                       `json:"previous_hash"`
	HashSHA256            *string                       `json:"hash_sha256"`
	IsOfflineSync         bool                          `json:"is_offline_sync"`
	SyncBatchID           *string                       `json:"sync_batch_id"`
	CreatedAt             time.Time                     `json:"created_at"`
	ClosedAt              *time.Time                    `json:"closed_at"`
	Clarifications        []ClinicalRecordClarification `json:"clarifications"`
}

// AnatomicalLayer define las capas corporales del visor interactivo.
type AnatomicalLayer string

const (
	LayerBone     AnatomicalLayer = "BONE"
	LayerMuscle   AnatomicalLayer = "MUSCLE"
	LayerOrgan    AnatomicalLayer = "ORGAN"
	LayerVascular AnatomicalLayer = "VASCULAR"
)

// ViewOrientation define la orientacion del visor anatomico.
type ViewOrientation string

const (
	OrientationAnterior  ViewOrientation = "ANTERIOR"
	OrientationPosterior ViewOrientation = "POSTERIOR"
)

// ClinicalAnatomicalNote modela las observaciones medicas vinculadas a una estructura anatomica y al paciente.
type ClinicalAnatomicalNote struct {
	ID                string          `json:"id"`
	ClinicalRecordID  *string         `json:"clinical_record_id,omitempty"`
	PatientID         string          `json:"patient_id"`
	DoctorID          string          `json:"doctor_id"`
	DoctorName        string          `json:"doctor_name,omitempty"`
	StructureKey      string          `json:"structure_key"`
	StructureName     string          `json:"structure_name"`
	Layer             AnatomicalLayer `json:"layer"`
	ViewOrientation   ViewOrientation `json:"view_orientation"`
	CoordinatesX      int             `json:"coordinates_x"`
	CoordinatesY      int             `json:"coordinates_y"`
	PainLevel         int             `json:"pain_level"`
	DoctorObservation string          `json:"doctor_observation"`
	PreliminaryCIE11  string          `json:"preliminary_cie11,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// CanModify determina si el registro clinico permite aun ser editado antes de su firma de cierre.
func (c *ClinicalRecord) CanModify() bool {
	return !c.IsClosed
}
