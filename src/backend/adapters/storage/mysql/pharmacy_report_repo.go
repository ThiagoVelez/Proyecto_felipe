package mysql

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type pharmacyReportRepository struct {
	db *sql.DB
}

// NewPharmacyReportRepository inicializa el repositorio relacional MySQL para reportes y alertas de farmacia
func NewPharmacyReportRepository(db *sql.DB) ports.PharmacyReportRepository {
	return &pharmacyReportRepository{db: db}
}

func (r *pharmacyReportRepository) Create(ctx context.Context, report *domain.PharmacyStockReport) error {
	query := `
		INSERT INTO pharmacy_stock_reports (
			id, report_code, inventory_item_id, medication_name, generic_name,
			code_cum, dosage, presentation, batch_number, current_stock,
			min_stock, deficit, severity, clinical_impact, branch,
			status, notes, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	now := time.Now()
	if report.CreatedAt.IsZero() {
		report.CreatedAt = now
	}
	report.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, query,
		report.ID, report.ReportCode, report.InventoryItemID, report.MedicationName, report.GenericName,
		report.CodeCUM, report.Dosage, report.Presentation, report.BatchNumber, report.CurrentStock,
		report.MinStock, report.Deficit, report.Severity, report.ClinicalImpact, report.Branch,
		report.Status, report.Notes, report.CreatedAt, report.UpdatedAt,
	)
	return err
}

func (r *pharmacyReportRepository) GetAll(ctx context.Context, status string) ([]domain.PharmacyStockReport, error) {
	query := `
		SELECT id, report_code, inventory_item_id, medication_name, generic_name,
		       code_cum, dosage, presentation, COALESCE(batch_number, ''), current_stock,
		       min_stock, deficit, severity, COALESCE(clinical_impact, ''), COALESCE(branch, ''),
		       status, COALESCE(notes, ''), COALESCE(resolved_by, ''), resolved_at,
		       created_at, updated_at
		FROM pharmacy_stock_reports
	`
	var args []interface{}
	if status != "" && status != "TODOS" {
		query += " WHERE status = ?"
		args = append(args, status)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []domain.PharmacyStockReport
	for rows.Next() {
		var rep domain.PharmacyStockReport
		var resolvedAt sql.NullTime
		if err := rows.Scan(
			&rep.ID, &rep.ReportCode, &rep.InventoryItemID, &rep.MedicationName, &rep.GenericName,
			&rep.CodeCUM, &rep.Dosage, &rep.Presentation, &rep.BatchNumber, &rep.CurrentStock,
			&rep.MinStock, &rep.Deficit, &rep.Severity, &rep.ClinicalImpact, &rep.Branch,
			&rep.Status, &rep.Notes, &rep.ResolvedBy, &resolvedAt,
			&rep.CreatedAt, &rep.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if resolvedAt.Valid {
			rep.ResolvedAt = &resolvedAt.Time
		}
		reports = append(reports, rep)
	}
	return reports, rows.Err()
}

func (r *pharmacyReportRepository) GetByID(ctx context.Context, id string) (*domain.PharmacyStockReport, error) {
	query := `
		SELECT id, report_code, inventory_item_id, medication_name, generic_name,
		       code_cum, dosage, presentation, COALESCE(batch_number, ''), current_stock,
		       min_stock, deficit, severity, COALESCE(clinical_impact, ''), COALESCE(branch, ''),
		       status, COALESCE(notes, ''), COALESCE(resolved_by, ''), resolved_at,
		       created_at, updated_at
		FROM pharmacy_stock_reports
		WHERE id = ?
	`
	var rep domain.PharmacyStockReport
	var resolvedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&rep.ID, &rep.ReportCode, &rep.InventoryItemID, &rep.MedicationName, &rep.GenericName,
		&rep.CodeCUM, &rep.Dosage, &rep.Presentation, &rep.BatchNumber, &rep.CurrentStock,
		&rep.MinStock, &rep.Deficit, &rep.Severity, &rep.ClinicalImpact, &rep.Branch,
		&rep.Status, &rep.Notes, &rep.ResolvedBy, &resolvedAt,
		&rep.CreatedAt, &rep.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("reporte de farmacia no encontrado")
	}
	if err != nil {
		return nil, err
	}
	if resolvedAt.Valid {
		rep.ResolvedAt = &resolvedAt.Time
	}
	return &rep, nil
}

func (r *pharmacyReportRepository) GetOpenByItemID(ctx context.Context, itemID string) (*domain.PharmacyStockReport, error) {
	query := `
		SELECT id, report_code, inventory_item_id, medication_name, generic_name,
		       code_cum, dosage, presentation, COALESCE(batch_number, ''), current_stock,
		       min_stock, deficit, severity, COALESCE(clinical_impact, ''), COALESCE(branch, ''),
		       status, COALESCE(notes, ''), COALESCE(resolved_by, ''), resolved_at,
		       created_at, updated_at
		FROM pharmacy_stock_reports
		WHERE inventory_item_id = ? AND status IN ('PENDIENTE', 'EN_GESTION')
		ORDER BY created_at DESC
		LIMIT 1
	`
	var rep domain.PharmacyStockReport
	var resolvedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, query, itemID).Scan(
		&rep.ID, &rep.ReportCode, &rep.InventoryItemID, &rep.MedicationName, &rep.GenericName,
		&rep.CodeCUM, &rep.Dosage, &rep.Presentation, &rep.BatchNumber, &rep.CurrentStock,
		&rep.MinStock, &rep.Deficit, &rep.Severity, &rep.ClinicalImpact, &rep.Branch,
		&rep.Status, &rep.Notes, &rep.ResolvedBy, &resolvedAt,
		&rep.CreatedAt, &rep.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if resolvedAt.Valid {
		rep.ResolvedAt = &resolvedAt.Time
	}
	return &rep, nil
}

func (r *pharmacyReportRepository) UpdateStatus(ctx context.Context, id, status, notes, resolvedBy string) error {
	query := `
		UPDATE pharmacy_stock_reports
		SET status = ?, notes = COALESCE(NULLIF(?, ''), notes),
		    resolved_by = COALESCE(NULLIF(?, ''), resolved_by),
		    resolved_at = CASE WHEN ? = 'REABASTECIDO' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	_, err := r.db.ExecContext(ctx, query, status, notes, resolvedBy, status, id)
	return err
}

func (r *pharmacyReportRepository) GetMetrics(ctx context.Context) (map[string]interface{}, error) {
	metrics := make(map[string]interface{})

	// 1. Métricas de inventario
	var totalItems int
	var totalStock int
	var inventoryValue float64
	var lowStockCount int
	var outOfStockCount int

	_ = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(SUM(stock_quantity), 0), COALESCE(SUM(stock_quantity * unit_price), 0),
		       COALESCE(SUM(CASE WHEN stock_quantity <= min_stock AND stock_quantity > 0 THEN 1 ELSE 0 END), 0),
		       COALESCE(SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END), 0)
		FROM inventory_items
		WHERE is_active = TRUE
	`).Scan(&totalItems, &totalStock, &inventoryValue, &lowStockCount, &outOfStockCount)

	metrics["total_items"] = totalItems
	metrics["total_stock"] = totalStock
	metrics["inventory_value"] = inventoryValue
	metrics["low_stock_count"] = lowStockCount
	metrics["out_of_stock_count"] = outOfStockCount

	// 2. Métricas de dispensaciones
	var totalDispensed int
	var totalDispensedAmount float64
	_ = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(SUM(subtotal_amount), 0)
		FROM prescriptions
		WHERE status = 'DISPENSED'
	`).Scan(&totalDispensed, &totalDispensedAmount)

	metrics["total_dispensed"] = totalDispensed
	metrics["total_dispensed_amount"] = totalDispensedAmount

	// 3. Métricas de reportes de stock
	var pendingReports int
	var managingReports int
	var resolvedReports int
	_ = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(CASE WHEN status = 'PENDIENTE' THEN 1 ELSE 0 END), 0),
		       COALESCE(SUM(CASE WHEN status = 'EN_GESTION' THEN 1 ELSE 0 END), 0),
		       COALESCE(SUM(CASE WHEN status = 'REABASTECIDO' THEN 1 ELSE 0 END), 0)
		FROM pharmacy_stock_reports
	`).Scan(&pendingReports, &managingReports, &resolvedReports)

	metrics["pending_reports"] = pendingReports
	metrics["managing_reports"] = managingReports
	metrics["resolved_reports"] = resolvedReports
	metrics["active_reports_count"] = pendingReports + managingReports

	return metrics, nil
}
