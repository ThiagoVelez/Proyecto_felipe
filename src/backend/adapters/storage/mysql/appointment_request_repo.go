package mysql

import (
	"context"
	"database/sql"
	"errors"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type appointmentRequestRepository struct {
	db *sql.DB
}

// NewAppointmentRequestRepository crea el adaptador MySQL de las solicitudes de primera cita.
func NewAppointmentRequestRepository(db *sql.DB) ports.AppointmentRequestRepository {
	return &appointmentRequestRepository{db: db}
}

const requestColumns = `r.id, r.code, r.branch, r.doctor_id, COALESCE(u.full_name, ''), r.document_type, r.document_number,
	r.first_name, r.last_name, r.birth_date, r.gender, r.blood_type, r.eps_name, r.phone, r.email, r.address,
	r.observations, r.consent_at, r.status, COALESCE(r.response_note, ''), COALESCE(r.appointment_id, ''),
	COALESCE(r.patient_id, ''), r.created_at, r.updated_at`

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanRequest(row rowScanner) (*domain.AppointmentRequest, error) {
	var r domain.AppointmentRequest
	var docType, gender, blood, status string
	err := row.Scan(&r.ID, &r.Code, &r.Branch, &r.DoctorID, &r.DoctorName, &docType, &r.DocumentNumber,
		&r.FirstName, &r.LastName, &r.BirthDate, &gender, &blood, &r.EPSName, &r.Phone, &r.Email, &r.Address,
		&r.Observations, &r.ConsentAt, &status, &r.ResponseNote, &r.AppointmentID,
		&r.PatientID, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, err
	}
	r.DocumentType = domain.DocumentType(docType)
	r.Gender = domain.Gender(gender)
	r.BloodType = domain.BloodType(blood)
	r.Status = domain.AppointmentRequestStatus(status)
	return &r, nil
}

func nullable(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func (r *appointmentRequestRepository) Create(ctx context.Context, req *domain.AppointmentRequest) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO appointment_requests (id, code, branch, doctor_id, document_type, document_number, first_name, last_name,
			birth_date, gender, blood_type, eps_name, phone, email, address, observations, consent_at, status,
			response_note, appointment_id, patient_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		req.ID, req.Code, req.Branch, req.DoctorID, string(req.DocumentType), req.DocumentNumber, req.FirstName, req.LastName,
		req.BirthDate.Format("2006-01-02"), string(req.Gender), string(req.BloodType), req.EPSName, req.Phone, req.Email,
		req.Address, req.Observations, req.ConsentAt, string(req.Status), nullable(req.ResponseNote),
		nullable(req.AppointmentID), nullable(req.PatientID), req.CreatedAt, req.UpdatedAt)
	return err
}

func (r *appointmentRequestRepository) GetByID(ctx context.Context, id string) (*domain.AppointmentRequest, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+requestColumns+`
		FROM appointment_requests r LEFT JOIN users u ON u.id = r.doctor_id WHERE r.id = ?`, id)
	req, err := scanRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrAppointmentRequestNotFound
	}
	return req, err
}

func (r *appointmentRequestRepository) ListByDoctor(ctx context.Context, doctorID string, status domain.AppointmentRequestStatus) ([]domain.AppointmentRequest, error) {
	query := `SELECT ` + requestColumns + ` FROM appointment_requests r LEFT JOIN users u ON u.id = r.doctor_id
		WHERE r.doctor_id = ?`
	args := []interface{}{doctorID}
	if status != "" {
		query += ` AND r.status = ?`
		args = append(args, string(status))
	}
	query += ` ORDER BY r.created_at DESC LIMIT 500`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []domain.AppointmentRequest{}
	for rows.Next() {
		req, err := scanRequest(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *req)
	}
	return list, rows.Err()
}

func (r *appointmentRequestRepository) CountPendingByDoctor(ctx context.Context, doctorID string) (int, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM appointment_requests WHERE doctor_id = ? AND status = ?`,
		doctorID, string(domain.RequestPending)).Scan(&n)
	return n, err
}

func (r *appointmentRequestRepository) Update(ctx context.Context, req *domain.AppointmentRequest) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE appointment_requests SET status = ?, response_note = ?, appointment_id = ?, patient_id = ?, updated_at = ?
		WHERE id = ?`,
		string(req.Status), nullable(req.ResponseNote), nullable(req.AppointmentID), nullable(req.PatientID), req.UpdatedAt, req.ID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrAppointmentRequestNotFound
	}
	return nil
}
