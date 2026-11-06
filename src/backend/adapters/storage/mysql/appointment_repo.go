package mysql

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type appointmentRepository struct {
	db *sql.DB
}

func normalizeAppointmentStatus(s string) domain.AppointmentStatus {
	switch strings.ToUpper(strings.TrimSpace(s)) {
	case "AGENDADA", "SCHEDULED", "":
		return domain.AppointmentScheduled
	case "ATENDIDA", "ATTENDED":
		return domain.AppointmentAttended
	case "CANCELADA", "CANCELLED", "CANCELED":
		return domain.AppointmentCancelled
	default:
		return domain.AppointmentScheduled
	}
}

// NewAppointmentRepository inicializa el repositorio de citas en MySQL
func NewAppointmentRepository(db *sql.DB) ports.AppointmentRepository {
	return &appointmentRepository{db: db}
}

func (r *appointmentRepository) Create(ctx context.Context, app *domain.Appointment) error {
	query := `
		INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, observations, status, pdf_path, email_sent, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	if app.CreatedAt.IsZero() {
		app.CreatedAt = time.Now().UTC()
	}
	statusStr := string(app.Status)
	if statusStr == "" {
		statusStr = string(domain.AppointmentScheduled)
	}
	_, err := r.db.ExecContext(ctx, query,
		app.ID, app.PatientID, app.DoctorID, app.AppointmentDate, app.Observations,
		statusStr, app.PDFPath, app.EmailSent, app.CreatedAt,
	)
	return err
}

func (r *appointmentRepository) GetByID(ctx context.Context, id string) (*domain.Appointment, error) {
	query := `
		SELECT a.id, a.doctor_id, u.full_name, u.specialty, COALESCE(u.professional_card, ''),
		       a.patient_id, CONCAT(p.first_name, ' ', p.last_name), p.document_number, COALESCE(p.phone, ''),
		       a.appointment_date, COALESCE(a.observations, ''), a.status, COALESCE(a.pdf_path, ''), a.email_sent, a.created_at
		FROM appointments a
		INNER JOIN users u ON a.doctor_id = u.id
		INNER JOIN patients p ON a.patient_id = p.id
		WHERE a.id = ?
	`
	var app domain.Appointment
	var status string
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&app.ID, &app.DoctorID, &app.DoctorName, &app.DoctorSpecialty, &app.DoctorCard,
		&app.PatientID, &app.PatientName, &app.PatientDocument, &app.PatientPhone,
		&app.AppointmentDate, &app.Observations, &status, &app.PDFPath, &app.EmailSent, &app.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrAppointmentNotFound
	}
	if err != nil {
		return nil, err
	}
	app.Status = normalizeAppointmentStatus(status)
	return &app, nil
}

func (r *appointmentRepository) GetByDoctorID(ctx context.Context, doctorID string) ([]domain.Appointment, error) {
	query := `
		SELECT a.id, a.doctor_id, u.full_name, u.specialty, COALESCE(u.professional_card, ''),
		       a.patient_id, CONCAT(p.first_name, ' ', p.last_name), p.document_number, COALESCE(p.phone, ''),
		       a.appointment_date, COALESCE(a.observations, ''), a.status, COALESCE(a.pdf_path, ''), a.email_sent, a.created_at
		FROM appointments a
		INNER JOIN users u ON a.doctor_id = u.id
		INNER JOIN patients p ON a.patient_id = p.id
		WHERE a.doctor_id = ?
		ORDER BY a.appointment_date ASC
	`
	rows, err := r.db.QueryContext(ctx, query, doctorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Appointment
	for rows.Next() {
		var app domain.Appointment
		var status string
		if err := rows.Scan(
			&app.ID, &app.DoctorID, &app.DoctorName, &app.DoctorSpecialty, &app.DoctorCard,
			&app.PatientID, &app.PatientName, &app.PatientDocument, &app.PatientPhone,
			&app.AppointmentDate, &app.Observations, &status, &app.PDFPath, &app.EmailSent, &app.CreatedAt,
		); err != nil {
			return nil, err
		}
		app.Status = normalizeAppointmentStatus(status)
		result = append(result, app)
	}
	return result, rows.Err()
}

func (r *appointmentRepository) GetByDateRange(ctx context.Context, doctorID string, start, end time.Time) ([]domain.Appointment, error) {
	query := `
		SELECT a.id, a.doctor_id, u.full_name, u.specialty, COALESCE(u.professional_card, ''),
		       a.patient_id, CONCAT(p.first_name, ' ', p.last_name), p.document_number, COALESCE(p.phone, ''),
		       a.appointment_date, COALESCE(a.observations, ''), a.status, COALESCE(a.pdf_path, ''), a.email_sent, a.created_at
		FROM appointments a
		INNER JOIN users u ON a.doctor_id = u.id
		INNER JOIN patients p ON a.patient_id = p.id
		WHERE a.doctor_id = ? AND a.appointment_date >= ? AND a.appointment_date <= ?
		ORDER BY a.appointment_date ASC
	`
	rows, err := r.db.QueryContext(ctx, query, doctorID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Appointment
	for rows.Next() {
		var app domain.Appointment
		var status string
		if err := rows.Scan(
			&app.ID, &app.DoctorID, &app.DoctorName, &app.DoctorSpecialty, &app.DoctorCard,
			&app.PatientID, &app.PatientName, &app.PatientDocument, &app.PatientPhone,
			&app.AppointmentDate, &app.Observations, &status, &app.PDFPath, &app.EmailSent, &app.CreatedAt,
		); err != nil {
			return nil, err
		}
		app.Status = normalizeAppointmentStatus(status)
		result = append(result, app)
	}
	return result, rows.Err()
}

func (r *appointmentRepository) HasOverlap(ctx context.Context, doctorID string, date time.Time) (bool, error) {
	// Ventana de 20 minutos alrededor de la cita
	start := date.Add(-20 * time.Minute)
	end := date.Add(20 * time.Minute)

	query := `
		SELECT COUNT(*)
		FROM appointments
		WHERE doctor_id = ? AND appointment_date > ? AND appointment_date < ?
		  AND status != 'CANCELLED' AND status != 'CANCELADA'
	`
	var count int
	if err := r.db.QueryRowContext(ctx, query, doctorID, start, end).Scan(&count); err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *appointmentRepository) UpdatePDFAndEmailStatus(ctx context.Context, id, pdfPath string, emailSent bool) error {
	query := `UPDATE appointments SET pdf_path = ?, email_sent = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, pdfPath, emailSent, id)
	return err
}

