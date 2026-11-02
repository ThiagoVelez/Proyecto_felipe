package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/crypto"
)

const GenesisHash = "GENESIS_SALUDCONECTA_000000000000000000000000000000000000000000000000"

// maxChainAttempts acota los reintentos cuando dos cierres del mismo paciente compiten por el mismo eslabon.
const maxChainAttempts = 5

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

// sealTime fija la precision de segundos en UTC: es la misma que persiste la columna TIMESTAMP(0) y la que
// entra al hash, de modo que lo almacenado y lo firmado nunca difieren.
func sealTime(t time.Time) time.Time {
	return t.UTC().Truncate(time.Second)
}

// chainPreviousHash retorna el hash del ultimo eslabon cerrado del paciente o el hash genesis si no existe.
func chainPreviousHash(ctx context.Context, repo ports.ClinicalRecordRepository, patientID string) (string, error) {
	lastClosed, err := repo.GetLastClosedRecordByPatient(ctx, patientID)
	if err != nil {
		return "", err
	}
	if lastClosed != nil && lastClosed.HashSHA256 != nil && *lastClosed.HashSHA256 != "" {
		return *lastClosed.HashSHA256, nil
	}
	return GenesisHash, nil
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

	if !record.CanModify() {
		return nil, domain.ErrRecordAlreadyClosed
	}

	// Control a nivel de objeto: solo el autor firma su folio, de lo contrario el hash (que usa al autor) no verificaria
	if record.DoctorID != doctorID {
		return nil, domain.ErrNotRecordOwner
	}

	defer lockPatientChain(record.PatientID)()

	for attempt := 0; attempt < maxChainAttempts; attempt++ {
		previousHash, err := chainPreviousHash(ctx, s.recordRepo, record.PatientID)
		if err != nil {
			return nil, err
		}

		now := sealTime(time.Now())
		hashCalculated := crypto.CalculateChainedRecordHash(
			previousHash,
			record.PatientID,
			record.DoctorID,
			record.Anamnesis,
			record.PhysicalExam,
			record.CIE11Code,
			record.DiagnosisDescription,
			record.TreatmentPlan,
			now.Format(time.RFC3339),
		)

		err = s.recordRepo.CloseRecord(ctx, record.ID, signatureToken, previousHash, hashCalculated, now)
		if errors.Is(err, domain.ErrChainConflict) {
			// Otro cierre del mismo paciente tomo este eslabon; se recalcula sobre la nueva cabeza de la cadena
			continue
		}
		if err != nil {
			return nil, err
		}

		record.IsClosed = true
		record.SignatureToken = &signatureToken
		record.PreviousHash = &previousHash
		record.HashSHA256 = &hashCalculated
		record.ClosedAt = &now
		return record, nil
	}

	return nil, domain.ErrChainConflict
}

func (s *clinicalRecordService) AddClarification(ctx context.Context, recordID, doctorID, note string) error {
	if note == "" {
		return domain.ErrEmptyClarificationNote
	}

	record, err := s.recordRepo.GetByID(ctx, recordID)
	if err != nil {
		return err
	}

	if record.DoctorID != doctorID {
		return domain.ErrNotRecordOwner
	}

	if record.CanModify() {
		return domain.ErrRecordNotClosed
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
		record.ClosedAt.UTC().Format(time.RFC3339),
	)

	return recalculated == *record.HashSHA256, nil
}
