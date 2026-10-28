package ports

import (
	"context"

	"saludconecta-backend/internal/core/domain"
)

// AuthService define el contrato de casos de uso para autenticacion, roles y MFA.
type AuthService interface {
	Login(ctx context.Context, email, password, totpCode string) (token string, user *domain.User, err error)
	Register(ctx context.Context, user *domain.User, plainPassword string) error
	SetupMFA(ctx context.Context, userID string) (secret string, err error)
	EnableMFA(ctx context.Context, userID, totpCode string) error
}

// TriageService define los casos de uso para clasificacion y priorizacion clinica.
type TriageService interface {
	RegisterTriage(ctx context.Context, record *domain.TriageRecord) (*domain.TriageRecord, error)
	GetTriageQueue(ctx context.Context) ([]domain.TriageRecord, error)
	GetTriageByID(ctx context.Context, id string) (*domain.TriageRecord, error)
	UpdateTriageStatus(ctx context.Context, id string, status domain.TriageStatus) error
}

// ClinicalRecordService define los casos de uso para apertura, firma y auditoria de folios HCE.
type ClinicalRecordService interface {
	CreateDraft(ctx context.Context, record *domain.ClinicalRecord) (*domain.ClinicalRecord, error)
	CloseAndSign(ctx context.Context, recordID, doctorID, signatureToken string) (*domain.ClinicalRecord, error)
	AddClarification(ctx context.Context, recordID, doctorID, note string) error
	GetPatientHistory(ctx context.Context, patientID string) ([]domain.ClinicalRecord, error)
	GetRecordByID(ctx context.Context, recordID string) (*domain.ClinicalRecord, error)
	VerifyIntegrity(ctx context.Context, recordID string) (bool, error)
}

// PrescriptionService define los casos de uso para generacion segura de formulas y cruce de alergias.
type PrescriptionService interface {
	IssuePrescription(ctx context.Context, prescription *domain.Prescription) (*domain.Prescription, error)
	GetPrescriptionByID(ctx context.Context, id string) (*domain.Prescription, error)
	GetByClinicalRecord(ctx context.Context, recordID string) (*domain.Prescription, error)
}

// SyncService define los casos de uso para sincronizacion por lotes de atencion rural desconectada.
type SyncService interface {
	ProcessOfflineBatch(ctx context.Context, batchID string, records []domain.ClinicalRecord) (int, error)
}

// RIPSGeneratorPort define la exportacion estandarizada de datos clinicos bajo la Resolucion 2275.
type RIPSGeneratorPort interface {
	GenerateRIPSJSON(ctx context.Context, invoiceNumber string, packageType domain.RIPSPackageType, record *domain.ClinicalRecord, patient *domain.Patient) (string, error)
}

// FHIRMapperPort define la transformacion del folio a recursos interoperables HL7 FHIR R4.
type FHIRMapperPort interface {
	MapToFHIRBundle(ctx context.Context, record *domain.ClinicalRecord, patient *domain.Patient, prescription *domain.Prescription) (map[string]interface{}, error)
}

