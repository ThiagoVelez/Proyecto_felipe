package ports

import (
	"context"
	"time"

	"saludconecta-backend/core/domain"
)

// UserRepository define el contrato de persistencia para usuarios y credenciales.
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Create(ctx context.Context, user *domain.User) error
	UpdateMFA(ctx context.Context, userID string, secret string, enabled bool) error
}

// PatientRepository define el contrato para gestion de pacientes y sus alergias.
type PatientRepository interface {
	GetByID(ctx context.Context, id string) (*domain.Patient, error)
	GetByDocument(ctx context.Context, docType domain.DocumentType, docNumber string) (*domain.Patient, error)
	Create(ctx context.Context, patient *domain.Patient) error
	List(ctx context.Context, limit, offset int) ([]domain.Patient, error)
	GetPatientAllergies(ctx context.Context, patientID string) ([]domain.PatientAllergy, error)
	AddPatientAllergy(ctx context.Context, allergy *domain.PatientAllergy) error
}

// TriageRepository define el contrato para el registro y consulta de triajes de urgencias.
type TriageRepository interface {
	Create(ctx context.Context, record *domain.TriageRecord) error
	GetByID(ctx context.Context, id string) (*domain.TriageRecord, error)
	ListPending(ctx context.Context) ([]domain.TriageRecord, error)
	UpdateStatus(ctx context.Context, id string, status domain.TriageStatus) error
}

// ClinicalRecordRepository define el contrato para folios clinicos e inmutabilidad.
type ClinicalRecordRepository interface {
	Create(ctx context.Context, record *domain.ClinicalRecord) error
	GetByID(ctx context.Context, id string) (*domain.ClinicalRecord, error)
	GetLastClosedRecordByPatient(ctx context.Context, patientID string) (*domain.ClinicalRecord, error)
	ListByPatient(ctx context.Context, patientID string) ([]domain.ClinicalRecord, error)
	CloseRecord(ctx context.Context, id string, signatureToken, previousHash, hashSHA256 string, closedAt time.Time) error
	AddClarification(ctx context.Context, clarification *domain.ClinicalRecordClarification) error
	SaveBatch(ctx context.Context, records []domain.ClinicalRecord) error
}

// PrescriptionRepository define el contrato para recetas medicas y catalogo de medicamentos CUM.
type PrescriptionRepository interface {
	Create(ctx context.Context, prescription *domain.Prescription) error
	GetByID(ctx context.Context, id string) (*domain.Prescription, error)
	GetByClinicalRecordID(ctx context.Context, recordID string) (*domain.Prescription, error)
	GetMedicationByID(ctx context.Context, id int) (*domain.MedicationCatalog, error)
	SearchMedications(ctx context.Context, query string) ([]domain.MedicationCatalog, error)
	DeductStock(ctx context.Context, medicationID int, quantity int) error
}

// AuditRepository define el contrato para la bitacora forense y transacciones RIPS.
type AuditRepository interface {
	CreateLog(ctx context.Context, log *domain.AuditLog) error
	SaveRIPSTransaction(ctx context.Context, tx *domain.RIPSTransaction) error
	GetRIPSTransactionByID(ctx context.Context, id string) (*domain.RIPSTransaction, error)
}

