package domain

import "time"

// PharmacyStockReport representa un reporte formal de alerta por desabastecimiento o nivel bajo de medicamento
type PharmacyStockReport struct {
	ID              string     `json:"id"`
	ReportCode      string     `json:"report_code"`
	InventoryItemID string     `json:"inventory_item_id"`
	MedicationName  string     `json:"medication_name"`
	GenericName     string     `json:"generic_name"`
	CodeCUM         string     `json:"code_cum"`
	Dosage          string     `json:"dosage"`
	Presentation    string     `json:"presentation"`
	BatchNumber     string     `json:"batch_number"`
	CurrentStock    int        `json:"current_stock"`
	MinStock        int        `json:"min_stock"`
	Deficit         int        `json:"deficit"`
	Severity        string     `json:"severity"` // AGOTADO, CRITICO, BAJO
	ClinicalImpact  string     `json:"clinical_impact"`
	Branch          string     `json:"branch"`
	Status          string     `json:"status"` // PENDIENTE, EN_GESTION, REABASTECIDO
	Notes           string     `json:"notes,omitempty"`
	ResolvedBy      string     `json:"resolved_by,omitempty"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}
