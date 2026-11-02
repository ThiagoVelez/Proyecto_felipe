package domain

import (
	"time"
)

// AuditAction define el tipo de operacion registrada en la bitacora de auditoria forense.
type AuditAction string

const (
	ActionRead            AuditAction = "READ"
	ActionCreate          AuditAction = "CREATE"
	ActionUpdate          AuditAction = "UPDATE"
	ActionUnmutableReject AuditAction = "UNMUTABLE_REJECT"
	ActionLogin           AuditAction = "LOGIN"
)

// AuditLog representa una traza inalterable de actividad del sistema para cumplimiento ISO/IEC 27001.
type AuditLog struct {
	ID            int64                  `json:"id"`
	UserID        *string                `json:"user_id"`
	Role          *string                `json:"role"`
	Action        AuditAction            `json:"action"`
	Resource      string                 `json:"resource"`
	IPAddress     string                 `json:"ip_address"`
	CorrelationID string                 `json:"correlation_id"`
	Details       map[string]interface{} `json:"details"`
	Timestamp     time.Time              `json:"timestamp"`
}

// RIPSPackageType define la categoria del paquete RIPS bajo la Resolucion 2275 de 2023.
type RIPSPackageType string

const (
	RIPSTypeConsultas      RIPSPackageType = "CONSULTAS"
	RIPSTypeProcedimientos RIPSPackageType = "PROCEDIMIENTOS"
	RIPSTypeUrgencias      RIPSPackageType = "URGENCIAS"
	RIPSTypeMedicamentos   RIPSPackageType = "MEDICAMENTOS"
)

// RIPSValidationStatus define el estado de procesamiento del JSON ante el validador oficial del MinSalud.
type RIPSValidationStatus string

const (
	RIPSStatusPending RIPSValidationStatus = "PENDIENTE"
	RIPSStatusSuccess RIPSValidationStatus = "EXITOSO"
	RIPSStatusGlosado RIPSValidationStatus = "GLOSADO"
)

// RIPSTransaction almacena el intercambio de datos estructurados para facturacion electronica en salud.
type RIPSTransaction struct {
	ID               string
	InvoiceNumber    string
	PackageType      RIPSPackageType
	PayloadJSON      string
	ValidationStatus RIPSValidationStatus
	SentToMinSaludAt *time.Time
	CreatedAt        time.Time
}
