package postgres

import (
	"database/sql"
	_ "embed"
	"fmt"

	"saludconecta-backend/adapters/storage/catalog"
)

//go:embed schema.sql
var schemaSQL string

// Migrate aplica de forma idempotente el esquema, los disparadores de inmutabilidad y el catalogo farmacologico inicial.
func Migrate(db *sql.DB) error {
	if db == nil {
		return nil
	}
	if _, err := db.Exec(schemaSQL); err != nil {
		return fmt.Errorf("fallo aplicando el esquema postgresql: %w", err)
	}

	for _, med := range catalog.DemoMedications() {
		_, err := db.Exec(`
			INSERT INTO medications_catalog (cum_code, commercial_name, generic_name, active_ingredient, concentration, pharmaceutical_form, stock_quantity)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (cum_code) DO NOTHING`,
			med.CUMCode, med.CommercialName, med.GenericName, med.ActiveIngredient,
			med.Concentration, med.PharmaceuticalForm, med.StockQuantity,
		)
		if err != nil {
			return fmt.Errorf("fallo sembrando el catalogo farmacologico: %w", err)
		}
	}
	return nil
}
