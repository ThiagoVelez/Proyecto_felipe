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
	List(ctx context.Context, roleID *int, isActive *bool) ([]*domain.User, error)
	UpdateStatus(ctx context.Context, userID string, isActive bool) error
	CountAdmins(ctx context.Context) (int, error)
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

	// Metodos del Kit Informatico Medico (Escala EVA y Modelo Anatomico)
	SaveAnatomicalNote(ctx context.Context, note *domain.ClinicalAnatomicalNote) error
	GetAnatomicalNotesByRecord(ctx context.Context, recordID string) ([]domain.ClinicalAnatomicalNote, error)
	GetAnatomicalNotesByPatient(ctx context.Context, patientID string) ([]domain.ClinicalAnatomicalNote, error)
	GetAnatomicalNoteByID(ctx context.Context, id string) (*domain.ClinicalAnatomicalNote, error)
	UpdateAnatomicalNote(ctx context.Context, note *domain.ClinicalAnatomicalNote) error
	DeleteAnatomicalNote(ctx context.Context, id string) error
	UpdatePainAndMapping(ctx context.Context, recordID string, painScore int, painObs *string, mapping *string) error
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
	ListLogs(ctx context.Context, limit int) ([]*domain.AuditLog, error)
	SaveRIPSTransaction(ctx context.Context, tx *domain.RIPSTransaction) error
	GetRIPSTransactionByID(ctx context.Context, id string) (*domain.RIPSTransaction, error)
}

// AppointmentRepository define el contrato para el agendamiento y calendario medico.
type AppointmentRepository interface {
	Create(ctx context.Context, appointment *domain.Appointment) error
	GetByID(ctx context.Context, id string) (*domain.Appointment, error)
	GetByDoctorID(ctx context.Context, doctorID string) ([]domain.Appointment, error)
	GetByDateRange(ctx context.Context, doctorID string, start, end time.Time) ([]domain.Appointment, error)
	HasOverlap(ctx context.Context, doctorID string, date time.Time) (bool, error)
	UpdatePDFAndEmailStatus(ctx context.Context, id, pdfPath string, emailSent bool) error
}

// InventoryRepository define el contrato de persistencia para el inventario de farmacia diferenciado por dosis.
type InventoryRepository interface {
	GetAll(ctx context.Context) ([]domain.InventoryItem, error)
	GetByID(ctx context.Context, id string) (*domain.InventoryItem, error)
	Create(ctx context.Context, item *domain.InventoryItem) error
	Update(ctx context.Context, item *domain.InventoryItem) error
	Delete(ctx context.Context, id string) error
	UpdateStock(ctx context.Context, id string, quantityChange int) error
	AdjustStock(ctx context.Context, id string, newStock int, batch string) error
}

// PrescriptionV2Repository define el contrato para el buzon de farmacia y dispensacion atomica con escaner PDF417.
type PrescriptionV2Repository interface {
	CreateWithItemsTx(ctx context.Context, presc *domain.PrescriptionV2) error
	GetPendingInbox(ctx context.Context) ([]domain.PrescriptionV2, error)
	GetAllInbox(ctx context.Context, status *domain.PrescriptionStatusV2, query string) ([]domain.PrescriptionV2, error)
	GetByID(ctx context.Context, id string) (*domain.PrescriptionV2, error)
	GetByUniqueCodeOrDocument(ctx context.Context, term string) (*domain.PrescriptionV2, error)
	MarkAsDispensedTx(ctx context.Context, req domain.DispenseRequestDTO, items []domain.PrescriptionItemV2) error
}

// HealthEducationRepository define el contrato de persistencia para el muro de concientización y educación en salud.
type HealthEducationRepository interface {
	Create(ctx context.Context, post *domain.HealthEducationPost) error
	GetAll(ctx context.Context, category string) ([]domain.HealthEducationPost, error)
	GetByID(ctx context.Context, id string) (*domain.HealthEducationPost, error)
	Update(ctx context.Context, post *domain.HealthEducationPost) error
	Delete(ctx context.Context, id string) error
}
