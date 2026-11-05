package domain

import (
	"errors"
	"time"
)

var (
	ErrAppointmentInPast    = errors.New("no es posible agendar citas en fechas u horas pasadas")
	ErrDoctorScheduleOverlap = errors.New("el médico ya cuenta con una cita programada en ese rango horario")
	ErrAppointmentNotFound  = errors.New("cita médica no encontrada en el sistema")
)

// AppointmentStatus define el ciclo de vida de la cita médica
type AppointmentStatus string

const (
	AppointmentScheduled AppointmentStatus = "SCHEDULED"
	AppointmentAttended  AppointmentStatus = "ATTENDED"
	AppointmentCancelled AppointmentStatus = "CANCELLED"
)

// Appointment modela una cita programada entre un médico y un paciente
type Appointment struct {
	ID              string            `json:"id"`
	DoctorID        string            `json:"doctor_id"`
	DoctorName      string            `json:"doctor_name,omitempty"`
	DoctorSpecialty string            `json:"doctor_specialty,omitempty"`
	DoctorCard      string            `json:"doctor_card,omitempty"`
	PatientID       string            `json:"patient_id"`
	PatientName     string            `json:"patient_name,omitempty"`
	PatientDocument string            `json:"patient_document,omitempty"`
	PatientEmail    string            `json:"patient_email,omitempty"`
	PatientPhone    string            `json:"patient_phone,omitempty"`
	AppointmentDate time.Time         `json:"appointment_date"`
	Observations    string            `json:"observations"`
	Status          AppointmentStatus `json:"status"`
	PDFPath         string            `json:"pdf_path,omitempty"`
	EmailSent       bool              `json:"email_sent"`
	CreatedAt       time.Time         `json:"created_at"`
}

