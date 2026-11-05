package mysql

import (
	"context"
	"database/sql"
	"time"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type inventoryRepository struct {
	db *sql.DB
}

// NewInventoryRepository crea el adaptador MySQL para inventario farmacéutico valorizado
func NewInventoryRepository(db *sql.DB) ports.InventoryRepository {
	return &inventoryRepository{db: db}
}

func (r *inventoryRepository) GetAll(ctx context.Context) ([]domain.InventoryItem, error) {
	query := `
		SELECT id, code_cum, generic_name, COALESCE(brand_name, ''), dosage, presentation,
		       unit_price, stock_quantity, min_stock, batch_number, expiry_date, is_active, created_at, updated_at
		FROM inventory_items
		WHERE is_active = TRUE
		ORDER BY generic_name ASC, dosage ASC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.InventoryItem
	for rows.Next() {
		var it domain.InventoryItem
		var expiryRaw string
		if err := rows.Scan(
			&it.ID, &it.CodeCUM, &it.GenericName, &it.BrandName, &it.Dosage, &it.Presentation,
			&it.UnitPrice, &it.StockQuantity, &it.MinStock, &it.BatchNumber, &expiryRaw,
			&it.IsActive, &it.CreatedAt, &it.UpdatedAt,
		); err != nil {
			return nil, err
		}
		it.ExpiryDate, _ = time.Parse("2006-01-02", expiryRaw)
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *inventoryRepository) GetByID(ctx context.Context, id string) (*domain.InventoryItem, error) {
	query := `
		SELECT id, code_cum, generic_name, COALESCE(brand_name, ''), dosage, presentation,
		       unit_price, stock_quantity, min_stock, batch_number, expiry_date, is_active, created_at, updated_at
		FROM inventory_items
		WHERE id = ?
	`
	var it domain.InventoryItem
	var expiryRaw string
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&it.ID, &it.CodeCUM, &it.GenericName, &it.BrandName, &it.Dosage, &it.Presentation,
		&it.UnitPrice, &it.StockQuantity, &it.MinStock, &it.BatchNumber, &expiryRaw,
		&it.IsActive, &it.CreatedAt, &it.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrInventoryItemNotFound
	}
	if err != nil {
		return nil, err
	}
	it.ExpiryDate, _ = time.Parse("2006-01-02", expiryRaw)
	return &it, nil
}

func (r *inventoryRepository) Create(ctx context.Context, item *domain.InventoryItem) error {
	query := `
		INSERT INTO inventory_items (id, code_cum, generic_name, brand_name, dosage, presentation, unit_price, stock_quantity, min_stock, batch_number, expiry_date, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	expiryStr := item.ExpiryDate.Format("2006-01-02")
	_, err := r.db.ExecContext(ctx, query,
		item.ID, item.CodeCUM, item.GenericName, item.BrandName, item.Dosage, item.Presentation,
		item.UnitPrice, item.StockQuantity, item.MinStock, item.BatchNumber, expiryStr, item.IsActive,
	)
	return err
}

func (r *inventoryRepository) UpdateStock(ctx context.Context, id string, quantityChange int) error {
	query := `UPDATE inventory_items SET stock_quantity = stock_quantity + ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, quantityChange, id)
	return err
}

func (r *inventoryRepository) AdjustStock(ctx context.Context, id string, newStock int, batch string) error {
	query := `UPDATE inventory_items SET stock_quantity = ?, batch_number = COALESCE(NULLIF(?, ''), batch_number) WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, newStock, batch, id)
	return err
}

func (r *inventoryRepository) Update(ctx context.Context, item *domain.InventoryItem) error {
	query := `
		UPDATE inventory_items
		SET code_cum = ?, generic_name = ?, brand_name = ?, dosage = ?, presentation = ?,
		    unit_price = ?, stock_quantity = ?, min_stock = ?, batch_number = ?, expiry_date = ?, is_active = ?
		WHERE id = ?
	`
	expiryStr := item.ExpiryDate.Format("2006-01-02")
	_, err := r.db.ExecContext(ctx, query,
		item.CodeCUM, item.GenericName, item.BrandName, item.Dosage, item.Presentation,
		item.UnitPrice, item.StockQuantity, item.MinStock, item.BatchNumber, expiryStr, item.IsActive,
		item.ID,
	)
	return err
}

func (r *inventoryRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM inventory_items WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

