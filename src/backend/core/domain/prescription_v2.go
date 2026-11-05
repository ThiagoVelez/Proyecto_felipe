package domain

import (
	"errors"
	"time"
)

var (
	ErrAlreadyDispensed      = errors.New("la receta médica ya fue dispensada con anterioridad")
	ErrDocumentMismatch      = errors.New("el documento de identidad escaneado no coincide con el paciente de la receta")
	ErrPrescriptionCancelled = errors.New("la receta médica se encuentra cancelada")
)

// PrescriptionStatusV2 representa el estado del ciclo de dispensación
type PrescriptionStatusV2 string

const (
	PrescriptionStatusPending   PrescriptionStatusV2 = "PENDING"
	PrescriptionStatusDispensed PrescriptionStatusV2 = "DISPENSED"
	PrescriptionStatusCancelled PrescriptionStatusV2 = "CANCELLED"
)

// CoverageType representa el esquema de cobertura en salud
type CoverageType string

const (
	CoverageEPSPBS100  CoverageType = "EPS_PBS_100"
	CoverageCopay      CoverageType = "COPAY"
	CoverageParticular CoverageType = "PARTICULAR"
)

// PaymentMethod representa los canales de recaudo para venta particular o copago
type PaymentMethod string

const (
	PaymentEPSDirect  PaymentMethod = "EPS_DIRECT"
	PaymentCash       PaymentMethod = "CASH"
	PaymentCreditCard PaymentMethod = "CREDIT_CARD"
	PaymentDebitCard  PaymentMethod = "DEBIT_CARD"
	PaymentTransfer   PaymentMethod = "TRANSFER"
	PaymentExempt     PaymentMethod = "EXEMPT"
)

// PrescriptionItemV2 detalla cada fármaco recetado vinculado a su concentración exacta en inventario
type PrescriptionItemV2 struct {
	ID                 string  `json:"id"`
	PrescriptionID     string  `json:"prescription_id"`
	InventoryItemID    string  `json:"inventory_item_id"`
	MedicationName     string  `json:"medication_name"`
	Dosage             string  `json:"dosage"` // Concentración prescrita
	QuantityPrescribed int     `json:"quantity_prescribed"`
	UnitPrice          float64 `json:"unit_price"`
	TotalItemPrice     float64 `json:"total_item_price"`
	Instructions       string  `json:"instructions"`
}

// PrescriptionV2 agrupa la orden de farmacia completa con liquidación y trazabilidad de dispensación
type PrescriptionV2 struct {
	ID                   string               `json:"id"`
	HCEID                string               `json:"hce_id"`
	DoctorID             string               `json:"doctor_id"`
	DoctorName           string               `json:"doctor_name,omitempty"`
	PatientID            string               `json:"patient_id"`
	PatientDocument      string               `json:"patient_document"`
	PatientName          string               `json:"patient_name"`
	PatientEPS           string               `json:"patient_eps"`
	UniqueCode           string               `json:"unique_code"` // Ej: RX-2026-89412
	TreatmentNotes       string               `json:"treatment_notes"`
	SubtotalAmount       float64              `json:"subtotal_amount"`
	CoverageType         CoverageType         `json:"coverage_type"`
	PatientPayableAmount float64              `json:"patient_payable_amount"`
	EPSCoverageAmount    float64              `json:"eps_coverage_amount"`
	PaymentMethod        PaymentMethod        `json:"payment_method"`
	Status               PrescriptionStatusV2 `json:"status"`
	DispensedAt          *time.Time           `json:"dispensed_at,omitempty"`
	DispensedBy          *string              `json:"dispensed_by,omitempty"`
	DispenserName        string               `json:"dispenser_name,omitempty"`
	PDFPatientPath       string               `json:"pdf_patient_path,omitempty"`
	CreatedAt            time.Time            `json:"created_at"`
	Items                []PrescriptionItemV2 `json:"items"`
}

// DispenseRequestDTO encapsula los datos recibidos tras el escaneo de la cédula PDF417
type DispenseRequestDTO struct {
	PrescriptionID  string `json:"prescription_id"`
	PatientDocument string `json:"patient_document"` // Obtenido del lector PDF417
	CoverageType    string `json:"coverage_type"`    // EPS_PBS_100, COPAY, PARTICULAR
	PaymentMethod   string `json:"payment_method"`   // EPS_DIRECT, CASH, CREDIT_CARD, etc.
	DispensedByID   string `json:"-"`
}

