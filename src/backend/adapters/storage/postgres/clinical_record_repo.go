package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type clinicalRecordRepo struct {
	db *sql.DB
}

// NewClinicalRecordRepository crea la implementacion PostgreSQL para historias clinicas e inmutabilidad.
func NewClinicalRecordRepository(db *sql.DB) ports.ClinicalRecordRepository {
	return &clinicalRecordRepo{db: db}
}

func (r *clinicalRecordRepo) Create(ctx context.Context, record *domain.ClinicalRecord) error {
	query := `
		INSERT INTO clinical_records (
			id, patient_id, doctor_id, triage_id, anamnesis, physical_exam, cie11_code,
			diagnosis_description, treatment_plan, is_closed, signature_token, previous_hash,
			hash_sha256, is_offline_sync, sync_batch_id, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	_, err := r.db.ExecContext(ctx, query,
		record.ID,
		record.PatientID,
		record.DoctorID,
		record.TriageID,
		record.Anamnesis,
		record.PhysicalExam,
		record.CIE11Code,
		record.DiagnosisDescription,
		record.TreatmentPlan,
		record.IsClosed,
		record.SignatureToken,
		record.PreviousHash,
		record.HashSHA256,
		record.IsOfflineSync,
		record.SyncBatchID,
		record.CreatedAt,
	)
	return err
}

func (r *clinicalRecordRepo) GetByID(ctx context.Context, id string) (*domain.ClinicalRecord, error) {
	query := `
		SELECT cr.id, cr.patient_id, cr.doctor_id, COALESCE(u.full_name, ''), cr.triage_id,
		       cr.anamnesis, cr.physical_exam, cr.cie11_code, cr.diagnosis_description, cr.treatment_plan,
		       cr.is_closed, cr.signature_token, cr.previous_hash, cr.hash_sha256, cr.is_offline_sync,
		       cr.sync_batch_id, cr.created_at, cr.closed_at
		FROM clinical_records cr
		LEFT JOIN users u ON cr.doctor_id = u.id
		WHERE cr.id = $1
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var cr domain.ClinicalRecord
	err := row.Scan(
		&cr.ID, &cr.PatientID, &cr.DoctorID, &cr.DoctorName, &cr.TriageID,
		&cr.Anamnesis, &cr.PhysicalExam, &cr.CIE11Code, &cr.DiagnosisDescription, &cr.TreatmentPlan,
		&cr.IsClosed, &cr.SignatureToken, &cr.PreviousHash, &cr.HashSHA256, &cr.IsOfflineSync,
		&cr.SyncBatchID, &cr.CreatedAt, &cr.ClosedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrRecordNotFound
	}
	if err != nil {
		return nil, err
	}

	clarifications, err := r.getClarifications(ctx, cr.ID)
	if err == nil {
		cr.Clarifications = clarifications
	}

	return &cr, nil
}

func (r *clinicalRecordRepo) GetLastClosedRecordByPatient(ctx context.Context, patientID string) (*domain.ClinicalRecord, error) {
	query := `
		SELECT cr.id, cr.patient_id, cr.doctor_id, COALESCE(u.full_name, ''), cr.triage_id,
		       cr.anamnesis, cr.physical_exam, cr.cie11_code, cr.diagnosis_description, cr.treatment_plan,
		       cr.is_closed, cr.signature_token, cr.previous_hash, cr.hash_sha256, cr.is_offline_sync,
		       cr.sync_batch_id, cr.created_at, cr.closed_at
		FROM clinical_records cr
		LEFT JOIN users u ON cr.doctor_id = u.id
		WHERE cr.patient_id = $1 AND cr.is_closed = TRUE
		ORDER BY cr.closed_at DESC, cr.created_at DESC
		LIMIT 1
	`
	row := r.db.QueryRowContext(ctx, query, patientID)

	var cr domain.ClinicalRecord
	err := row.Scan(
		&cr.ID, &cr.PatientID, &cr.DoctorID, &cr.DoctorName, &cr.TriageID,
		&cr.Anamnesis, &cr.PhysicalExam, &cr.CIE11Code, &cr.DiagnosisDescription, &cr.TreatmentPlan,
		&cr.IsClosed, &cr.SignatureToken, &cr.PreviousHash, &cr.HashSHA256, &cr.IsOfflineSync,
		&cr.SyncBatchID, &cr.CreatedAt, &cr.ClosedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &cr, nil
}

func (r *clinicalRecordRepo) ListByPatient(ctx context.Context, patientID string) ([]domain.ClinicalRecord, error) {
	query := `
		SELECT cr.id, cr.patient_id, cr.doctor_id, COALESCE(u.full_name, ''), cr.triage_id,
		       cr.anamnesis, cr.physical_exam, cr.cie11_code, cr.diagnosis_description, cr.treatment_plan,
		       cr.is_closed, cr.signature_token, cr.previous_hash, cr.hash_sha256, cr.is_offline_sync,
		       cr.sync_batch_id, cr.created_at, cr.closed_at
		FROM clinical_records cr
		LEFT JOIN users u ON cr.doctor_id = u.id
		WHERE cr.patient_id = $1
		ORDER BY cr.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.ClinicalRecord
	for rows.Next() {
		var cr domain.ClinicalRecord
		if err := rows.Scan(
			&cr.ID, &cr.PatientID, &cr.DoctorID, &cr.DoctorName, &cr.TriageID,
			&cr.Anamnesis, &cr.PhysicalExam, &cr.CIE11Code, &cr.DiagnosisDescription, &cr.TreatmentPlan,
			&cr.IsClosed, &cr.SignatureToken, &cr.PreviousHash, &cr.HashSHA256, &cr.IsOfflineSync,
			&cr.SyncBatchID, &cr.CreatedAt, &cr.ClosedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, cr)
	}
	return list, rows.Err()
}

func (r *clinicalRecordRepo) CloseRecord(ctx context.Context, id string, signatureToken, previousHash, hashSHA256 string, closedAt time.Time) error {
	query := `
		UPDATE clinical_records
		SET is_closed = TRUE, signature_token = $1, previous_hash = $2, hash_sha256 = $3, closed_at = $4
		WHERE id = $5 AND is_closed = FALSE
	`
	res, err := r.db.ExecContext(ctx, query, signatureToken, previousHash, hashSHA256, closedAt, id)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return domain.ErrRecordAlreadyClosed
	}
	return nil
}

func (r *clinicalRecordRepo) AddClarification(ctx context.Context, clarification *domain.ClinicalRecordClarification) error {
	query := `
		INSERT INTO clinical_record_clarifications (clinical_record_id, doctor_id, note)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	return r.db.QueryRowContext(ctx, query, clarification.ClinicalRecordID, clarification.DoctorID, clarification.Note).Scan(&clarification.ID)
}

func (r *clinicalRecordRepo) getClarifications(ctx context.Context, recordID string) ([]domain.ClinicalRecordClarification, error) {
	query := `
		SELECT c.id, c.clinical_record_id, c.doctor_id, COALESCE(u.full_name, ''), c.note, c.created_at
		FROM clinical_record_clarifications c
		LEFT JOIN users u ON c.doctor_id = u.id
		WHERE c.clinical_record_id = $1
		ORDER BY c.created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, recordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.ClinicalRecordClarification
	for rows.Next() {
		var item domain.ClinicalRecordClarification
		if err := rows.Scan(&item.ID, &item.ClinicalRecordID, &item.DoctorID, &item.DoctorName, &item.Note, &item.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	return list, rows.Err()
}

func (r *clinicalRecordRepo) SaveBatch(ctx context.Context, records []domain.ClinicalRecord) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO clinical_records (
			id, patient_id, doctor_id, triage_id, anamnesis, physical_exam, cie11_code,
			diagnosis_description, treatment_plan, is_closed, signature_token, previous_hash,
			hash_sha256, is_offline_sync, sync_batch_id, created_at, closed_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		ON CONFLICT (id) DO UPDATE SET sync_batch_id = EXCLUDED.sync_batch_id
	`
	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, rec := range records {
		_, err := stmt.ExecContext(ctx,
			rec.ID,
			rec.PatientID,
			rec.DoctorID,
			rec.TriageID,
			rec.Anamnesis,
			rec.PhysicalExam,
			rec.CIE11Code,
			rec.DiagnosisDescription,
			rec.TreatmentPlan,
			rec.IsClosed,
			rec.SignatureToken,
			rec.PreviousHash,
			rec.HashSHA256,
			rec.IsOfflineSync,
			rec.SyncBatchID,
			rec.CreatedAt,
			rec.ClosedAt,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

