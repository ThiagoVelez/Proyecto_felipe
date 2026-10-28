package mysql

import (
	"context"
	"database/sql"
	"errors"

	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

type triageRepo struct {
	db *sql.DB
}

// NewTriageRepository construye la implementacion de persistencia para triaje de urgencias.
func NewTriageRepository(db *sql.DB) ports.TriageRepository {
	return &triageRepo{db: db}
}

func (r *triageRepo) Create(ctx context.Context, record *domain.TriageRecord) error {
	query := `
		INSERT INTO triage_records (
			id, patient_id, evaluated_by, systolic_bp, diastolic_bp, heart_rate, respiratory_rate,
			oxygen_saturation, body_temperature, glasgow_score, manchester_level, reason_for_consultation, status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.ExecContext(ctx, query,
		record.ID,
		record.PatientID,
		record.EvaluatedBy,
		record.SystolicBP,
		record.DiastolicBP,
		record.HeartRate,
		record.RespiratoryRate,
		record.OxygenSaturation,
		record.BodyTemperature,
		record.GlasgowScore,
		record.ManchesterLevel,
		record.ReasonForConsultation,
		record.Status,
	)
	return err
}

func (r *triageRepo) GetByID(ctx context.Context, id string) (*domain.TriageRecord, error) {
	query := `
		SELECT id, patient_id, evaluated_by, systolic_bp, diastolic_bp, heart_rate, respiratory_rate,
		       oxygen_saturation, body_temperature, glasgow_score, manchester_level, reason_for_consultation,
		       status, created_at
		FROM triage_records
		WHERE id = ?
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var t domain.TriageRecord
	err := row.Scan(
		&t.ID, &t.PatientID, &t.EvaluatedBy, &t.SystolicBP, &t.DiastolicBP, &t.HeartRate, &t.RespiratoryRate,
		&t.OxygenSaturation, &t.BodyTemperature, &t.GlasgowScore, &t.ManchesterLevel, &t.ReasonForConsultation,
		&t.Status, &t.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrTriageNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *triageRepo) ListPending(ctx context.Context) ([]domain.TriageRecord, error) {
	// Ordenamiento prioritario estricto segun urgencia vital de Manchester
	query := `
		SELECT id, patient_id, evaluated_by, systolic_bp, diastolic_bp, heart_rate, respiratory_rate,
		       oxygen_saturation, body_temperature, glasgow_score, manchester_level, reason_for_consultation,
		       status, created_at
		FROM triage_records
		WHERE status IN ('PENDIENTE', 'EN_ATENCION')
		ORDER BY 
			CASE manchester_level
				WHEN 'NIVEL_I' THEN 1
				WHEN 'NIVEL_II' THEN 2
				WHEN 'NIVEL_III' THEN 3
				WHEN 'NIVEL_IV' THEN 4
				ELSE 5
			END ASC,
			created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.TriageRecord
	for rows.Next() {
		var t domain.TriageRecord
		if err := rows.Scan(
			&t.ID, &t.PatientID, &t.EvaluatedBy, &t.SystolicBP, &t.DiastolicBP, &t.HeartRate, &t.RespiratoryRate,
			&t.OxygenSaturation, &t.BodyTemperature, &t.GlasgowScore, &t.ManchesterLevel, &t.ReasonForConsultation,
			&t.Status, &t.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func (r *triageRepo) UpdateStatus(ctx context.Context, id string, status domain.TriageStatus) error {
	query := `UPDATE triage_records SET status = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}
