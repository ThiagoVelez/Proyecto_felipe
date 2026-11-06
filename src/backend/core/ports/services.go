package ports

import (
	"context"

	"saludconecta-backend/core/domain"
)

// AuthService define el contrato de casos de uso para autenticacion, roles y MFA.
type AuthService interface {
	Login(ctx context.Context, email, password, totpCode string) (token string, user *domain.User, err error)
	LoginWithTokens(ctx context.Context, email, password, totpCode string) (tokens *domain.TokenPair, user *domain.User, err error)
	RefreshToken(ctx context.Context, refreshToken string) (tokens *domain.TokenPair, user *domain.User, err error)
	RevokeToken(ctx context.Context, refreshToken string) error
	Register(ctx context.Context, user *domain.User, plainPassword string) error
	RegisterStaff(ctx context.Context, user *domain.User, plainPassword string) error
	RegisterAdmin(ctx context.Context, user *domain.User, plainPassword string) error
	GetMFASeed(ctx context.Context, email string) (secret string, uri string, err error)
	// ValidateSession verifica que la cuenta del token siga existiendo y activa, y retorna su estado vigente.
	ValidateSession(ctx context.Context, userID string) (*domain.User, error)
	// SetupMFA genera un nuevo secreto TOTP; si el usuario ya tiene MFA habilitado exige el codigo vigente.
	SetupMFA(ctx context.Context, userID, currentCode string) (secret string, err error)
	EnableMFA(ctx context.Context, userID, totpCode string) error
}

// AdminService define los casos de uso administrativos y de gobernanza ReTHUS.
type AdminService interface {
	ListUsers(ctx context.Context, roleID *int, isActive *bool) ([]*domain.User, error)
	ActivateUser(ctx context.Context, userID string) error
	DeactivateUser(ctx context.Context, userID string) error
	GetAuditLogs(ctx context.Context, limit int) ([]*domain.AuditLog, error)
}

// PatientService define los casos de uso de admision de pacientes y registro de antecedentes alergicos.
type PatientService interface {
	RegisterPatient(ctx context.Context, patient *domain.Patient) (*domain.Patient, error)
	GetPatient(ctx context.Context, id string) (*domain.Patient, error)
	FindByDocument(ctx context.Context, docType domain.DocumentType, docNumber string) (*domain.Patient, error)
	ListPatients(ctx context.Context, limit, offset int) ([]domain.Patient, error)
	AddAllergy(ctx context.Context, allergy *domain.PatientAllergy) (*domain.PatientAllergy, error)
	GetAllergies(ctx context.Context, patientID string) ([]domain.PatientAllergy, error)
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

	// Kit Informatico Medico (Escala EVA y Modelo Anatomico)
	AddAnatomicalNote(ctx context.Context, note *domain.ClinicalAnatomicalNote) (*domain.ClinicalAnatomicalNote, error)
	GetAnatomicalNotesByRecord(ctx context.Context, recordID string) ([]domain.ClinicalAnatomicalNote, error)
	GetAnatomicalNotesByPatient(ctx context.Context, patientID string) ([]domain.ClinicalAnatomicalNote, error)
	UpdateAnatomicalNote(ctx context.Context, note *domain.ClinicalAnatomicalNote) (*domain.ClinicalAnatomicalNote, error)
	DeleteAnatomicalNote(ctx context.Context, noteID, doctorID string) error
	UpdatePainAndMapping(ctx context.Context, recordID, doctorID string, painScore int, painObs *string, mapping *string) error
}

// PrescriptionService define los casos de uso para generacion segura de formulas y cruce de alergias.
type PrescriptionService interface {
	IssuePrescription(ctx context.Context, prescription *domain.Prescription) (*domain.Prescription, error)
	GetPrescriptionByID(ctx context.Context, id string) (*domain.Prescription, error)
	GetByClinicalRecord(ctx context.Context, recordID string) (*domain.Prescription, error)
	SearchMedications(ctx context.Context, query string) ([]domain.MedicationCatalog, error)
}

// SyncService define los casos de uso para sincronizacion por lotes de atencion rural desconectada.
// El autor de los folios es siempre el medico autenticado; la cadena SHA-256 se calcula en el servidor.
type SyncService interface {
	ProcessOfflineBatch(ctx context.Context, doctorID, batchID string, records []domain.ClinicalRecord) (int, error)
}

// RIPSGeneratorPort define la exportacion estandarizada de datos clinicos bajo la Resolucion 2275.
type RIPSGeneratorPort interface {
	GenerateRIPSJSON(ctx context.Context, invoiceNumber string, packageType domain.RIPSPackageType, record *domain.ClinicalRecord, patient *domain.Patient) (string, error)
}

// FHIRMapperPort define la transformacion del folio a recursos interoperables HL7 FHIR R4.
type FHIRMapperPort interface {
	MapToFHIRBundle(ctx context.Context, record *domain.ClinicalRecord, patient *domain.Patient, prescription *domain.Prescription) (map[string]interface{}, error)
}

// AppointmentService define los casos de uso para agendamiento, calendario y generacion asincrona de comprobante PDF.
type AppointmentService interface {
	ScheduleAppointment(ctx context.Context, app *domain.Appointment) (*domain.Appointment, error)
	GetDoctorAppointments(ctx context.Context, doctorID string) ([]domain.Appointment, error)
	GetDoctorAppointmentsByRange(ctx context.Context, doctorID string, start, end string) ([]domain.Appointment, error)
}

// TreatmentService define el seguimiento del tratamiento, generacion de codigo unico y emision tripartita.
type TreatmentService interface {
	DispatchTreatment(ctx context.Context, presc *domain.PrescriptionV2) (*domain.PrescriptionV2, error)
	GetPrescriptionByID(ctx context.Context, id string) (*domain.PrescriptionV2, error)
}

// PharmacyService define la gestion del inventario diferenciado por dosis, buzon y dispensacion con escaner PDF417.
type PharmacyService interface {
	GetInventory(ctx context.Context) ([]domain.InventoryItem, error)
	AddInventoryItem(ctx context.Context, item *domain.InventoryItem) (*domain.InventoryItem, error)
	UpdateInventoryItem(ctx context.Context, item *domain.InventoryItem) (*domain.InventoryItem, error)
	DeleteInventoryItem(ctx context.Context, id string) error
	AdjustStock(ctx context.Context, id string, newStock int, batch string) error
	GetInbox(ctx context.Context, status *domain.PrescriptionStatusV2, query string) ([]domain.PrescriptionV2, error)
	GetPrescriptionByCodeOrDocument(ctx context.Context, term string) (*domain.PrescriptionV2, error)
	DispensePrescription(ctx context.Context, req domain.DispenseRequestDTO) (*domain.PrescriptionV2, error)
}
