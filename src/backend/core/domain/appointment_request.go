package domain

import (
	"errors"
	"time"
)

// AppointmentRequestStatus representa el estado de una solicitud de primera cita hecha por un paciente.
type AppointmentRequestStatus string

const (
	RequestPending   AppointmentRequestStatus = "PENDIENTE"
	RequestScheduled AppointmentRequestStatus = "AGENDADA"
	RequestRejected  AppointmentRequestStatus = "RECHAZADA"
)

var (
	ErrAppointmentRequestNotFound = errors.New("solicitud de cita no encontrada")
	ErrInvalidAppointmentRequest  = errors.New("los datos de la solicitud de cita son incompletos o invalidos")
	ErrConsentRequired            = errors.New("debe aceptar el tratamiento de datos personales (Ley 1581 de 2012)")
	ErrNoDoctorAvailable          = errors.New("la sede no tiene medicos habilitados para recibir solicitudes")
	ErrRequestNotPending          = errors.New("la solicitud ya fue atendida")
	ErrRequestNotAssigned         = errors.New("la solicitud no esta asignada a este medico")
)

// AppointmentRequest es la solicitud de primera cita que un paciente envia desde el portal publico.
// No es un paciente del sistema: el paciente se crea (o se asocia por documento) cuando el medico agenda la cita.
type AppointmentRequest struct {
	ID             string                   `json:"id"`
	Code           string                   `json:"code"`
	Branch         string                   `json:"branch"`
	DoctorID       string                   `json:"doctor_id"`
	DoctorName     string                   `json:"doctor_name,omitempty"`
	DocumentType   DocumentType             `json:"document_type"`
	DocumentNumber string                   `json:"document_number"`
	FirstName      string                   `json:"first_name"`
	LastName       string                   `json:"last_name"`
	BirthDate      time.Time                `json:"birth_date"`
	Gender         Gender                   `json:"gender"`
	BloodType      BloodType                `json:"blood_type"`
	EPSName        string                   `json:"eps_name"`
	Phone          string                   `json:"phone"`
	Email          string                   `json:"email"`
	Address        string                   `json:"address"`
	Observations   string                   `json:"observations"`
	ConsentAt      time.Time                `json:"consent_at"`
	Status         AppointmentRequestStatus `json:"status"`
	ResponseNote   string                   `json:"response_note,omitempty"`
	AppointmentID  string                   `json:"appointment_id,omitempty"`
	PatientID      string                   `json:"patient_id,omitempty"`
	CreatedAt      time.Time                `json:"created_at"`
	UpdatedAt      time.Time                `json:"updated_at"`
}

// FullName retorna el nombre completo del solicitante.
func (r *AppointmentRequest) FullName() string {
	return r.FirstName + " " + r.LastName
}
