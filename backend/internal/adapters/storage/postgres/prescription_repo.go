package postgres

import (
	"context"
	"database/sql"
	"errors"

	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

type prescriptionRepo struct {
	db *sql.DB
}

// NewPrescriptionRepository instancia el repositorio PostgreSQL para prescripciones y catalogo CUM.
func NewPrescriptionRepository(db *sql.DB) ports.PrescriptionRepository {
	return &prescriptionRepo{db: db}
}

func (r *prescriptionRepo) Create(ctx context.Context, prescription *domain.Prescription) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	queryPresc := `
		INSERT INTO prescriptions (id, clinical_record_id, patient_id, doctor_id, observations, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err = tx.ExecContext(ctx, queryPresc,
		prescription.ID,
		prescription.ClinicalRecordID,
		prescription.PatientID,
		prescription.DoctorID,
		prescription.Observations,
		prescription.CreatedAt,
	)
	if err != nil {
		return err
	}

	queryItem := `
		INSERT INTO prescription_items (prescription_id, medication_id, dosage, frequency_hours, duration_days, total_quantity, indication_notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	stmt, err := tx.PrepareContext(ctx, queryItem)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for i := range prescription.Items {
		item := &prescription.Items[i]
		err := stmt.QueryRowContext(ctx,
			prescription.ID,
			item.MedicationID,
			item.Dosage,
			item.FrequencyHours,
			item.DurationDays,
			item.TotalQuantity,
			item.IndicationNotes,
		).Scan(&item.ID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *prescriptionRepo) GetByID(ctx context.Context, id string) (*domain.Prescription, error) {
	query := `
		SELECT id, clinical_record_id, patient_id, doctor_id, observations, created_at
		FROM prescriptions
		WHERE id = $1
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var p domain.Prescription
	err := row.Scan(&p.ID, &p.ClinicalRecordID, &p.PatientID, &p.DoctorID, &p.Observations, &p.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrPrescriptionNotFound
	}
	if err != nil {
		return nil, err
	}

	items, err := r.getItems(ctx, p.ID)
	if err == nil {
		p.Items = items
	}

	return &p, nil
}

func (r *prescriptionRepo) GetByClinicalRecordID(ctx context.Context, recordID string) (*domain.Prescription, error) {
	query := `
		SELECT id, clinical_record_id, patient_id, doctor_id, observations, created_at
		FROM prescriptions
		WHERE clinical_record_id = $1
		LIMIT 1
	`
	row := r.db.QueryRowContext(ctx, query, recordID)

	var p domain.Prescription
	err := row.Scan(&p.ID, &p.ClinicalRecordID, &p.PatientID, &p.DoctorID, &p.Observations, &p.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrPrescriptionNotFound
	}
	if err != nil {
		return nil, err
	}

	items, err := r.getItems(ctx, p.ID)
	if err == nil {
		p.Items = items
	}

	return &p, nil
}

func (r *prescriptionRepo) getItems(ctx context.Context, prescriptionID string) ([]domain.PrescriptionItem, error) {
	query := `
		SELECT pi.id, pi.prescription_id, pi.medication_id, pi.dosage, pi.frequency_hours,
		       pi.duration_days, pi.total_quantity, pi.indication_notes,
		       m.cum_code, m.commercial_name, m.generic_name, m.active_ingredient,
		       m.concentration, m.pharmaceutical_form, m.stock_quantity
		FROM prescription_items pi
		INNER JOIN medications_catalog m ON pi.medication_id = m.id
		WHERE pi.prescription_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, prescriptionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.PrescriptionItem
	for rows.Next() {
		var item domain.PrescriptionItem
		var med domain.MedicationCatalog
		if err := rows.Scan(
			&item.ID, &item.PrescriptionID, &item.MedicationID, &item.Dosage, &item.FrequencyHours,
			&item.DurationDays, &item.TotalQuantity, &item.IndicationNotes,
			&med.CUMCode, &med.CommercialName, &med.GenericName, &med.ActiveIngredient,
			&med.Concentration, &med.PharmaceuticalForm, &med.StockQuantity,
		); err != nil {
			return nil, err
		}
		med.ID = item.MedicationID
		item.Medication = &med
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *prescriptionRepo) GetMedicationByID(ctx context.Context, id int) (*domain.MedicationCatalog, error) {
	query := `
		SELECT id, cum_code, commercial_name, generic_name, active_ingredient, concentration, pharmaceutical_form, stock_quantity
		FROM medications_catalog
		WHERE id = $1
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var m domain.MedicationCatalog
	err := row.Scan(
		&m.ID, &m.CUMCode, &m.CommercialName, &m.GenericName, &m.ActiveIngredient,
		&m.Concentration, &m.PharmaceuticalForm, &m.StockQuantity,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrMedicationNotFound
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *prescriptionRepo) SearchMedications(ctx context.Context, query string) ([]domain.MedicationCatalog, error) {
	q := "%" + query + "%"
	sqlQuery := `
		SELECT id, cum_code, commercial_name, generic_name, active_ingredient, concentration, pharmaceutical_form, stock_quantity
		FROM medications_catalog
		WHERE commercial_name ILIKE $1 OR generic_name ILIKE $2 OR active_ingredient ILIKE $3
		ORDER BY commercial_name ASC
		LIMIT 20
	`
	rows, err := r.db.QueryContext(ctx, sqlQuery, q, q, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.MedicationCatalog
	for rows.Next() {
		var m domain.MedicationCatalog
		if err := rows.Scan(
			&m.ID, &m.CUMCode, &m.CommercialName, &m.GenericName, &m.ActiveIngredient,
			&m.Concentration, &m.PharmaceuticalForm, &m.StockQuantity,
		); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

func (r *prescriptionRepo) DeductStock(ctx context.Context, medicationID int, quantity int) error {
	query := `
		UPDATE medications_catalog
		SET stock_quantity = stock_quantity - $1
		WHERE id = $2 AND stock_quantity >= $3
	`
	res, err := r.db.ExecContext(ctx, query, quantity, medicationID, quantity)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return domain.ErrInsufficientMedicationStock
	}
	return nil
}

