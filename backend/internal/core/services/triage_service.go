package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

type triageService struct {
	triageRepo  ports.TriageRepository
	patientRepo ports.PatientRepository
}

// NewTriageService instancia el servicio de clasificacion de triaje segun el protocolo Manchester.
func NewTriageService(triageRepo ports.TriageRepository, patientRepo ports.PatientRepository) ports.TriageService {
	return &triageService{
		triageRepo:  triageRepo,
		patientRepo: patientRepo,
	}
}

func (s *triageService) RegisterTriage(ctx context.Context, record *domain.TriageRecord) (*domain.TriageRecord, error) {
	if err := record.Validate(); err != nil {
		return nil, err
	}

	// Verificar existencia del paciente
	if _, err := s.patientRepo.GetByID(ctx, record.PatientID); err != nil {
		return nil, domain.ErrPatientNotFound
	}

	if record.ID == "" {
		record.ID = uuid.New().String()
	}

	// Si no se asigno un nivel o se requiere recalculo, aplicar el discriminador de signos vitales
	if record.ManchesterLevel == "" {
		record.ManchesterLevel = record.SuggestManchesterPriority()
	}

	if record.Status == "" {
		record.Status = domain.TriageStatusPending
	}
	record.CreatedAt = time.Now().UTC()

	if err := s.triageRepo.Create(ctx, record); err != nil {
		return nil, err
	}

	return record, nil
}

func (s *triageService) GetTriageQueue(ctx context.Context) ([]domain.TriageRecord, error) {
	return s.triageRepo.ListPending(ctx)
}

func (s *triageService) GetTriageByID(ctx context.Context, id string) (*domain.TriageRecord, error) {
	return s.triageRepo.GetByID(ctx, id)
}

func (s *triageService) UpdateTriageStatus(ctx context.Context, id string, status domain.TriageStatus) error {
	record, err := s.triageRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if record.Status == domain.TriageStatusFinished {
		return domain.ErrTriageAlreadyProcessed
	}

	return s.triageRepo.UpdateStatus(ctx, id, status)
}
