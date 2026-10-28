package mysql

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

type auditRepo struct {
	db *sql.DB
}

// NewAuditRepository crea la implementacion MySQL para auditoria forense y transacciones RIPS.
func NewAuditRepository(db *sql.DB) ports.AuditRepository {
	return &auditRepo{db: db}
}

func (r *auditRepo) CreateLog(ctx context.Context, log *domain.AuditLog) error {
	var detailsJSON *string
	if log.Details != nil {
		bytes, err := json.Marshal(log.Details)
		if err == nil {
			str := string(bytes)
			detailsJSON = &str
		}
	}

	query := `
		INSERT INTO audit_logs (user_id, role, action, resource, ip_address, correlation_id, details)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	res, err := r.db.ExecContext(ctx, query,
		log.UserID,
		log.Role,
		log.Action,
		log.Resource,
		log.IPAddress,
		log.CorrelationID,
		detailsJSON,
	)
	if err != nil {
		return err
	}
	id, err := res.LastInsertId()
	if err == nil {
		log.ID = id
	}
	return nil
}

func (r *auditRepo) SaveRIPSTransaction(ctx context.Context, tx *domain.RIPSTransaction) error {
	query := `
		INSERT INTO rips_transactions (id, invoice_number, package_type, payload_json, validation_status, sent_to_minsalud_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.ExecContext(ctx, query,
		tx.ID,
		tx.InvoiceNumber,
		tx.PackageType,
		tx.PayloadJSON,
		tx.ValidationStatus,
		tx.SentToMinSaludAt,
		tx.CreatedAt,
	)
	return err
}

func (r *auditRepo) GetRIPSTransactionByID(ctx context.Context, id string) (*domain.RIPSTransaction, error) {
	query := `
		SELECT id, invoice_number, package_type, payload_json, validation_status, sent_to_minsalud_at, created_at
		FROM rips_transactions
		WHERE id = ?
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var tx domain.RIPSTransaction
	err := row.Scan(
		&tx.ID,
		&tx.InvoiceNumber,
		&tx.PackageType,
		&tx.PayloadJSON,
		&tx.ValidationStatus,
		&tx.SentToMinSaludAt,
		&tx.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("transaccion RIPS no encontrada")
	}
	if err != nil {
		return nil, err
	}
	return &tx, nil
}
