package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
	"saludconecta-backend/pkg/crypto"
)

const GenesisHash = "GENESIS_SALUDCONECTA_000000000000000000000000000000000000000000000000"

type clinicalRecordService struct {
	recordRepo  ports.ClinicalRecordRepository
	patientRepo ports.PatientRepository
	userRepo    ports.UserRepository
}

// NewClinicalRecordService construye el servicio de gestion de historias clinicas e inmutabilidad SHA-256.
func NewClinicalRecordService(
	recordRepo ports.ClinicalRecordRepository,
	patientRepo ports.PatientRepository,
	userRepo ports.UserRepository,
) ports.ClinicalRecordService {
	return &clinicalRecordService{
		recordRepo:  recordRepo,
		patientRepo: patientRepo,
		userRepo:    userRepo,
	}
}

func (s *clinicalRecordService) CreateDraft(ctx context.Context, record *domain.ClinicalRecord) (*domain.ClinicalRecord, error) {
	// Verificar existencia de paciente y medico habilitado
	if _, err := s.patientRepo.GetByID(ctx, record.PatientID); err != nil {
		return nil, domain.ErrPatientNotFound
	}

	doctor, err := s.userRepo.GetByID(ctx, record.DoctorID)
	if err != nil {
		return nil, domain.ErrUserNotFound
	}
	if !doctor.HasMedicalLicense() {
		return nil, domain.ErrUnauthorizedRole
	}

	if record.ID == "" {
		record.ID = uuid.New().String()
	}
	record.IsClosed = false
	record.CreatedAt = time.Now().UTC()

	if err := s.recordRepo.Create(ctx, record); err != nil {
		return nil, err
	}

	return record, nil
}

func (s *clinicalRecordService) CloseAndSign(ctx context.Context, recordID, doctorID, signatureToken string) (*domain.ClinicalRecord, error) {
	if signatureToken == "" {
		return nil, domain.ErrDoctorSignatureMissing
	}

	record, err := s.recordRepo.GetByID(ctx, recordID)
	if err != nil {
		return nil, err
	}

	if record.IsClosed {
		return nil, domain.ErrRecordAlreadyClosed
	}

	// Obtener el folio anterior cerrado del paciente para mantener la cadena de bloques
	lastClosed, err := s.recordRepo.GetLastClosedRecordByPatient(ctx, record.PatientID)
	previousHash := GenesisHash
	if err == nil && lastClosed != nil && lastClosed.HashSHA256 != nil && *lastClosed.HashSHA256 != "" {
		previousHash = *lastClosed.HashSHA256
	}

	now := time.Now().UTC()
	closedAtStr := now.Format(time.RFC3339)

	hashCalculated := crypto.CalculateChainedRecordHash(
		previousHash,
		record.PatientID,
		doctorID,
		record.Anamnesis,
		record.PhysicalExam,
		record.CIE11Code,
		record.DiagnosisDescription,
		record.TreatmentPlan,
		closedAtStr,
	)

	if err := s.recordRepo.CloseRecord(ctx, record.ID, signatureToken, previousHash, hashCalculated, now); err != nil {
		return nil, err
	}

	record.IsClosed = true
	record.SignatureToken = &signatureToken
	record.PreviousHash = &previousHash
	record.HashSHA256 = &hashCalculated
	record.ClosedAt = &now

	return record, nil
}

func (s *clinicalRecordService) AddClarification(ctx context.Context, recordID, doctorID, note string) error {
	if note == "" {
		return domain.ErrEmptyClarificationNote
	}

	record, err := s.recordRepo.GetByID(ctx, recordID)
	if err != nil {
		return err
	}

	if !record.IsClosed {
		return domain.ErrRecordNotFound
	}

	clarification := &domain.ClinicalRecordClarification{
		ClinicalRecordID: record.ID,
		DoctorID:         doctorID,
		Note:             note,
		CreatedAt:        time.Now().UTC(),
	}

	return s.recordRepo.AddClarification(ctx, clarification)
}

func (s *clinicalRecordService) GetPatientHistory(ctx context.Context, patientID string) ([]domain.ClinicalRecord, error) {
	return s.recordRepo.ListByPatient(ctx, patientID)
}

func (s *clinicalRecordService) GetRecordByID(ctx context.Context, recordID string) (*domain.ClinicalRecord, error) {
	return s.recordRepo.GetByID(ctx, recordID)
}

func (s *clinicalRecordService) VerifyIntegrity(ctx context.Context, recordID string) (bool, error) {
	record, err := s.recordRepo.GetByID(ctx, recordID)
	if err != nil {
		return false, err
	}

	if !record.IsClosed || record.HashSHA256 == nil || record.ClosedAt == nil {
		return false, nil
	}

	prevHash := GenesisHash
	if record.PreviousHash != nil && *record.PreviousHash != "" {
		prevHash = *record.PreviousHash
	}

	recalculated := crypto.CalculateChainedRecordHash(
		prevHash,
		record.PatientID,
		record.DoctorID,
		record.Anamnesis,
		record.PhysicalExam,
		record.CIE11Code,
		record.DiagnosisDescription,
		record.TreatmentPlan,
		record.ClosedAt.Format(time.RFC3339),
	)

	return recalculated == *record.HashSHA256, nil
}
