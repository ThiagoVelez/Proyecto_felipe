package domain

import (
	"errors"
	"time"
)

var (
	ErrInventoryItemNotFound = errors.New("ítem de inventario farmacológico no encontrado")
	ErrInsufficientStock     = errors.New("stock insuficiente para dispensar la cantidad requerida")
)

// InventoryItem representa un fármaco o insumo médico valorizado y diferenciado por concentración/dosis
type InventoryItem struct {
	ID            string    `json:"id"`
	CodeCUM       string    `json:"code_cum"`
	GenericName   string    `json:"generic_name"`
	BrandName     string    `json:"brand_name,omitempty"`
	Dosage        string    `json:"dosage"` // Distingue ej: 3 mg vs 5 mg o 250 mg vs 500 mg
	Presentation  string    `json:"presentation"`
	UnitPrice     float64   `json:"unit_price"`
	StockQuantity int       `json:"stock_quantity"`
	MinStock      int       `json:"min_stock"`
	BatchNumber   string    `json:"batch_number"`
	ExpiryDate    time.Time `json:"expiry_date"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// IsLowStock indica si el inventario actual se encuentra en o por debajo del umbral mínimo de seguridad
func (i *InventoryItem) IsLowStock() bool {
	return i.StockQuantity <= i.MinStock
}

