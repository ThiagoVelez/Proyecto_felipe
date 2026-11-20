package domain

import (
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrNursingCareNotFound = errors.New("el paciente no tiene registro de enfermeria")
	ErrInvalidNursingData  = errors.New("los datos de enfermeria son incompletos o invalidos")
)

// NursingDuty es un deber de la lista de chequeo de enfermeria (administrar un farmaco, verificar brazalete...).
// CompletedAt y CompletedBy los fija el servidor con la hora de Colombia y el nombre de la sesion.
type NursingDuty struct {
	ID           string  `json:"id"`
	Category     string  `json:"category"`
	Label        string  `json:"label"`
	Instructions string  `json:"instructions,omitempty"`
	Completed    bool    `json:"completed"`
	CompletedAt  *string `json:"completedAt"`
	CompletedBy  *string `json:"completedBy"`
}

// NursingNote es una nota de evolucion de turno. Es de solo anexo (Resolucion 1995 de 1999).
type NursingNote struct {
	ID        string    `json:"id"`
	Timestamp string    `json:"timestamp"`
	Author    string    `json:"author"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// NursingCare es el registro de enfermeria de un paciente: la ultima orden de tratamiento que envio el medico,
// la lista de chequeo y las notas de turno. Vive en el servidor para que todo el personal vea lo mismo.
type NursingCare struct {
	PatientID string          `json:"patient_id"`
	Order     json.RawMessage `json:"order,omitempty"`
	Duties    []NursingDuty   `json:"duties"`
	Notes     []NursingNote   `json:"notes"`
	UpdatedAt time.Time       `json:"updated_at"`
	UpdatedBy string          `json:"updated_by"`
	// Saved indica si el registro existe en el servidor o es la lista inicial sugerida
	Saved bool `json:"saved"`
}
