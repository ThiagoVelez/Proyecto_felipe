package postgres

import (
	"context"
	"database/sql"
	"errors"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type patientRepo struct {
	db *sql.DB
}

// NewPatientRepository instancia el repositorio PostgreSQL para pacientes y alergias.
func NewPatientRepository(db *sql.DB) ports.PatientRepository {
	return &patientRepo{db: db}
}

func (r *patientRepo) GetByID(ctx context.Context, id string) (*domain.Patient, error) {
	query := `
		SELECT id, document_type, document_number, first_name, second_name, last_name, second_last_name,
		       birth_date, gender, blood_type, eps_name, affiliation_status, phone, is_rural_zone, created_at, updated_at
		FROM patients
		WHERE id = $1
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var p domain.Patient
	err := row.Scan(
		&p.ID, &p.DocumentType, &p.DocumentNumber, &p.FirstName, &p.SecondName, &p.LastName, &p.SecondLastName,
		&p.BirthDate, &p.Gender, &p.BloodType, &p.EPSName, &p.AffiliationStatus, &p.Phone, &p.IsRuralZone, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrPatientNotFound
	}
	if err != nil {
		return nil, err
	}

	allergies, err := r.GetPatientAllergies(ctx, p.ID)
	if err == nil {
		p.Allergies = allergies
	}

	return &p, nil
}

func (r *patientRepo) GetByDocument(ctx context.Context, docType domain.DocumentType, docNumber string) (*domain.Patient, error) {
	query := `
		SELECT id, document_type, document_number, first_name, second_name, last_name, second_last_name,
		       birth_date, gender, blood_type, eps_name, affiliation_status, phone, is_rural_zone, created_at, updated_at
		FROM patients
		WHERE document_type = $1 AND document_number = $2
	`
	row := r.db.QueryRowContext(ctx, query, docType, docNumber)

	var p domain.Patient
	err := row.Scan(
		&p.ID, &p.DocumentType, &p.DocumentNumber, &p.FirstName, &p.SecondName, &p.LastName, &p.SecondLastName,
		&p.BirthDate, &p.Gender, &p.BloodType, &p.EPSName, &p.AffiliationStatus, &p.Phone, &p.IsRuralZone, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrPatientNotFound
	}
	if err != nil {
		return nil, err
	}

	allergies, err := r.GetPatientAllergies(ctx, p.ID)
	if err == nil {
		p.Allergies = allergies
	}

	return &p, nil
}

func (r *patientRepo) Create(ctx context.Context, patient *domain.Patient) error {
	query := `
		INSERT INTO patients (
			id, document_type, document_number, first_name, second_name, last_name, second_last_name,
			birth_date, gender, blood_type, eps_name, affiliation_status, phone, is_rural_zone
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	_, err := r.db.ExecContext(ctx, query,
		patient.ID,
		patient.DocumentType,
		patient.DocumentNumber,
		patient.FirstName,
		patient.SecondName,
		patient.LastName,
		patient.SecondLastName,
		patient.BirthDate,
		patient.Gender,
		patient.BloodType,
		patient.EPSName,
		patient.AffiliationStatus,
		patient.Phone,
		patient.IsRuralZone,
	)
	return err
}

func (r *patientRepo) List(ctx context.Context, limit, offset int) ([]domain.Patient, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT id, document_type, document_number, first_name, second_name, last_name, second_last_name,
		       birth_date, gender, blood_type, eps_name, affiliation_status, phone, is_rural_zone, created_at, updated_at
		FROM patients
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var patients []domain.Patient
	for rows.Next() {
		var p domain.Patient
		if err := rows.Scan(
			&p.ID, &p.DocumentType, &p.DocumentNumber, &p.FirstName, &p.SecondName, &p.LastName, &p.SecondLastName,
			&p.BirthDate, &p.Gender, &p.BloodType, &p.EPSName, &p.AffiliationStatus, &p.Phone, &p.IsRuralZone, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		patients = append(patients, p)
	}
	return patients, rows.Err()
}

func (r *patientRepo) GetPatientAllergies(ctx context.Context, patientID string) ([]domain.PatientAllergy, error) {
	query := `
		SELECT id, patient_id, active_ingredient, severity, COALESCE(notes, ''), created_at
		FROM patient_allergies
		WHERE patient_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.PatientAllergy
	for rows.Next() {
		var a domain.PatientAllergy
		if err := rows.Scan(&a.ID, &a.PatientID, &a.ActiveIngredient, &a.Severity, &a.Notes, &a.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

func (r *patientRepo) AddPatientAllergy(ctx context.Context, allergy *domain.PatientAllergy) error {
	query := `
		INSERT INTO patient_allergies (patient_id, active_ingredient, severity, notes)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	err := r.db.QueryRowContext(ctx, query, allergy.PatientID, allergy.ActiveIngredient, allergy.Severity, allergy.Notes).Scan(&allergy.ID)
	return err
}

func (r *patientRepo) UpdateContact(ctx context.Context, id string, email, address, phone string) error {
	query := `
		UPDATE patients
		SET email = $1, address = $2, phone = $3, updated_at = NOW()
		WHERE id = $4
	`
	res, err := r.db.ExecContext(ctx, query, email, address, phone, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return domain.ErrPatientNotFound
	}
	return nil
}

func (r *patientRepo) Delete(ctx context.Context, id string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, _ = tx.ExecContext(ctx, "DELETE FROM clinical_anatomical_notes WHERE patient_id = $1", id)
	_, _ = tx.ExecContext(ctx, "DELETE FROM prescriptions WHERE patient_id = $1", id)
	_, _ = tx.ExecContext(ctx, "DELETE FROM clinical_records WHERE patient_id = $1", id)
	_, _ = tx.ExecContext(ctx, "DELETE FROM triage_records WHERE patient_id = $1", id)
	_, _ = tx.ExecContext(ctx, "DELETE FROM appointments WHERE patient_id = $1", id)
	_, _ = tx.ExecContext(ctx, "DELETE FROM patient_allergies WHERE patient_id = $1", id)

	res, err := tx.ExecContext(ctx, "DELETE FROM patients WHERE id = $1", id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return domain.ErrPatientNotFound
	}
	return tx.Commit()
}

