package mysql

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type prescriptionV2Repository struct {
	db *sql.DB
}

// NewPrescriptionV2Repository inicializa el repositorio relacional de prescripciones y farmacia
func NewPrescriptionV2Repository(db *sql.DB) ports.PrescriptionV2Repository {
	return &prescriptionV2Repository{db: db}
}

func (r *prescriptionV2Repository) CreateWithItemsTx(ctx context.Context, presc *domain.PrescriptionV2) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	queryPresc := `
		INSERT INTO prescriptions (
			id, hce_id, doctor_id, patient_id, patient_document, patient_name, patient_eps,
			unique_code, treatment_notes, subtotal_amount, coverage_type, patient_payable_amount,
			eps_coverage_amount, payment_method, status, pdf_patient_path, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	if presc.CreatedAt.IsZero() {
		presc.CreatedAt = time.Now().UTC()
	}

	_, err = tx.ExecContext(ctx, queryPresc,
		presc.ID, presc.HCEID, presc.DoctorID, presc.PatientID, presc.PatientDocument,
		presc.PatientName, presc.PatientEPS, presc.UniqueCode, presc.TreatmentNotes,
		presc.SubtotalAmount, string(presc.CoverageType), presc.PatientPayableAmount,
		presc.EPSCoverageAmount, string(presc.PaymentMethod), string(presc.Status),
		presc.PDFPatientPath, presc.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("error insertando cabecera de prescripcion: %w", err)
	}

	queryItem := `
		INSERT INTO prescription_items (
			id, prescription_id, inventory_item_id, medication_name, dosage,
			quantity_prescribed, unit_price, total_item_price, instructions
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	for _, it := range presc.Items {
		_, err := tx.ExecContext(ctx, queryItem,
			it.ID, presc.ID, it.InventoryItemID, it.MedicationName, it.Dosage,
			it.QuantityPrescribed, it.UnitPrice, it.TotalItemPrice, it.Instructions,
		)
		if err != nil {
			return fmt.Errorf("error insertando item formulado %s: %w", it.MedicationName, err)
		}
	}

	return tx.Commit()
}

func (r *prescriptionV2Repository) loadItems(ctx context.Context, prescID string) ([]domain.PrescriptionItemV2, error) {
	query := `
		SELECT id, prescription_id, inventory_item_id, medication_name, dosage,
		       quantity_prescribed, unit_price, total_item_price, COALESCE(instructions, '')
		FROM prescription_items
		WHERE prescription_id = ?
	`
	rows, err := r.db.QueryContext(ctx, query, prescID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.PrescriptionItemV2
	for rows.Next() {
		var it domain.PrescriptionItemV2
		if err := rows.Scan(
			&it.ID, &it.PrescriptionID, &it.InventoryItemID, &it.MedicationName, &it.Dosage,
			&it.QuantityPrescribed, &it.UnitPrice, &it.TotalItemPrice, &it.Instructions,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *prescriptionV2Repository) GetPendingInbox(ctx context.Context) ([]domain.PrescriptionV2, error) {
	return r.GetAllInbox(ctx, nil, "")
}

func (r *prescriptionV2Repository) GetAllInbox(ctx context.Context, statusFilter *domain.PrescriptionStatusV2, queryTerm string) ([]domain.PrescriptionV2, error) {
	baseQuery := `
		SELECT p.id, p.hce_id, p.doctor_id, COALESCE(u.full_name, ''), p.patient_id, p.patient_document,
		       p.patient_name, p.patient_eps, p.unique_code, COALESCE(p.treatment_notes, ''),
		       p.subtotal_amount, p.coverage_type, p.patient_payable_amount, p.eps_coverage_amount,
		       p.payment_method, p.status, p.dispensed_at, p.dispensed_by, COALESCE(disp.full_name, ''),
		       COALESCE(p.pdf_patient_path, ''), p.created_at
		FROM prescriptions p
		LEFT JOIN users u ON p.doctor_id = u.id
		LEFT JOIN users disp ON p.dispensed_by = disp.id
		WHERE 1=1
	`
	var args []interface{}
	if statusFilter != nil && *statusFilter != "" {
		baseQuery += " AND p.status = ?"
		args = append(args, string(*statusFilter))
	}
	if queryTerm != "" {
		baseQuery += " AND (p.unique_code LIKE ? OR p.patient_document LIKE ? OR p.patient_name LIKE ?)"
		like := "%" + queryTerm + "%"
		args = append(args, like, like, like)
	}
	baseQuery += " ORDER BY p.created_at DESC"

	rows, err := r.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.PrescriptionV2
	for rows.Next() {
		var p domain.PrescriptionV2
		var cov, pay, stat string
		var dispensedAt sql.NullTime
		var dispensedBy sql.NullString

		if err := rows.Scan(
			&p.ID, &p.HCEID, &p.DoctorID, &p.DoctorName, &p.PatientID, &p.PatientDocument,
			&p.PatientName, &p.PatientEPS, &p.UniqueCode, &p.TreatmentNotes,
			&p.SubtotalAmount, &cov, &p.PatientPayableAmount, &p.EPSCoverageAmount,
			&pay, &stat, &dispensedAt, &dispensedBy, &p.DispenserName,
			&p.PDFPatientPath, &p.CreatedAt,
		); err != nil {
			return nil, err
		}

		p.CoverageType = domain.CoverageType(cov)
		p.PaymentMethod = domain.PaymentMethod(pay)
		p.Status = domain.PrescriptionStatusV2(stat)
		if dispensedAt.Valid {
			p.DispensedAt = &dispensedAt.Time
		}
		if dispensedBy.Valid {
			p.DispensedBy = &dispensedBy.String
		}

		items, err := r.loadItems(ctx, p.ID)
		if err != nil {
			return nil, err
		}
		p.Items = items
		result = append(result, p)
	}

	return result, rows.Err()
}

func (r *prescriptionV2Repository) GetByID(ctx context.Context, id string) (*domain.PrescriptionV2, error) {
	query := `
		SELECT p.id, p.hce_id, p.doctor_id, COALESCE(u.full_name, ''), p.patient_id, p.patient_document,
		       p.patient_name, p.patient_eps, p.unique_code, COALESCE(p.treatment_notes, ''),
		       p.subtotal_amount, p.coverage_type, p.patient_payable_amount, p.eps_coverage_amount,
		       p.payment_method, p.status, p.dispensed_at, p.dispensed_by, COALESCE(disp.full_name, ''),
		       COALESCE(p.pdf_patient_path, ''), p.created_at
		FROM prescriptions p
		LEFT JOIN users u ON p.doctor_id = u.id
		LEFT JOIN users disp ON p.dispensed_by = disp.id
		WHERE p.id = ?
	`
	var p domain.PrescriptionV2
	var cov, pay, stat string
	var dispensedAt sql.NullTime
	var dispensedBy sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.HCEID, &p.DoctorID, &p.DoctorName, &p.PatientID, &p.PatientDocument,
		&p.PatientName, &p.PatientEPS, &p.UniqueCode, &p.TreatmentNotes,
		&p.SubtotalAmount, &cov, &p.PatientPayableAmount, &p.EPSCoverageAmount,
		&pay, &stat, &dispensedAt, &dispensedBy, &p.DispenserName,
		&p.PDFPatientPath, &p.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrPrescriptionNotFound
	}
	if err != nil {
		return nil, err
	}

	p.CoverageType = domain.CoverageType(cov)
	p.PaymentMethod = domain.PaymentMethod(pay)
	p.Status = domain.PrescriptionStatusV2(stat)
	if dispensedAt.Valid {
		p.DispensedAt = &dispensedAt.Time
	}
	if dispensedBy.Valid {
		p.DispensedBy = &dispensedBy.String
	}

	items, err := r.loadItems(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	p.Items = items

	return &p, nil
}

func (r *prescriptionV2Repository) GetByUniqueCodeOrDocument(ctx context.Context, term string) (*domain.PrescriptionV2, error) {
	query := `
		SELECT p.id
		FROM prescriptions p
		WHERE (p.unique_code = ? OR p.patient_document = ?)
		ORDER BY CASE WHEN p.status = 'PENDING' THEN 0 ELSE 1 END, p.created_at DESC
		LIMIT 1
	`
	var id string
	err := r.db.QueryRowContext(ctx, query, term, term).Scan(&id)
	if err == sql.ErrNoRows {
		return nil, domain.ErrPrescriptionNotFound
	}
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *prescriptionV2Repository) MarkAsDispensedTx(ctx context.Context, req domain.DispenseRequestDTO, items []domain.PrescriptionItemV2) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Bloquear y verificar estado actual de la prescripcion (SELECT FOR UPDATE)
	var currentStatus, patientDoc string
	checkQuery := `SELECT status, patient_document FROM prescriptions WHERE id = ? FOR UPDATE`
	err = tx.QueryRowContext(ctx, checkQuery, req.PrescriptionID).Scan(&currentStatus, &patientDoc)
	if err == sql.ErrNoRows {
		return domain.ErrPrescriptionNotFound
	}
	if err != nil {
		return err
	}

	if currentStatus == string(domain.PrescriptionStatusDispensed) {
		return domain.ErrAlreadyDispensed
	}
	if currentStatus == string(domain.PrescriptionStatusCancelled) {
		return domain.ErrPrescriptionCancelled
	}
	if req.PatientDocument != "" && req.PatientDocument != patientDoc {
		return domain.ErrDocumentMismatch
	}

	// 2. Descontar stock de cada concentracion de forma atomica
	for _, it := range items {
		var currentStock int
		stockCheck := `SELECT stock_quantity FROM inventory_items WHERE id = ? FOR UPDATE`
		if err := tx.QueryRowContext(ctx, stockCheck, it.InventoryItemID).Scan(&currentStock); err != nil {
			return fmt.Errorf("error verificando stock para %s: %w", it.MedicationName, err)
		}

		if currentStock < it.QuantityPrescribed {
			return fmt.Errorf("%w: %s requiere %d unds, disponibles: %d",
				domain.ErrInsufficientStock, it.MedicationName, it.QuantityPrescribed, currentStock)
		}

		deductQuery := `UPDATE inventory_items SET stock_quantity = stock_quantity - ? WHERE id = ?`
		if _, err := tx.ExecContext(ctx, deductQuery, it.QuantityPrescribed, it.InventoryItemID); err != nil {
			return fmt.Errorf("error descontando inventario de %s: %w", it.MedicationName, err)
		}
	}

	// 3. Marcar la prescripcion como DISPENSED
	now := time.Now().UTC()
	cov := req.CoverageType
	if cov == "" {
		cov = string(domain.CoverageEPSPBS100)
	}
	pay := req.PaymentMethod
	if pay == "" {
		pay = string(domain.PaymentEPSDirect)
	}

	updateQuery := `
		UPDATE prescriptions 
		SET status = 'DISPENSED', dispensed_at = ?, dispensed_by = ?, coverage_type = ?, payment_method = ?
		WHERE id = ?
	`
	var dispensedBy sql.NullString
	if req.DispensedByID != "" {
		dispensedBy = sql.NullString{String: req.DispensedByID, Valid: true}
	}

	if _, err := tx.ExecContext(ctx, updateQuery, now, dispensedBy, cov, pay, req.PrescriptionID); err != nil {
		return fmt.Errorf("error actualizando estado de dispensacion: %w", err)
	}

	return tx.Commit()
}

