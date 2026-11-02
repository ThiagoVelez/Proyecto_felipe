package services

import (
	"context"
	"sort"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
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

	// El nivel lo determinan los signos vitales; un nivel enviado por el cliente solo se acepta como
	// escalamiento clinico (igual o mas urgente que el calculado) y siempre dentro del catalogo cerrado.
	suggested := record.SuggestManchesterPriority()
	switch {
	case record.ManchesterLevel == "":
		record.ManchesterLevel = suggested
	case !record.ManchesterLevel.IsValid() || record.ManchesterLevel.Rank() > suggested.Rank():
		return nil, domain.ErrInvalidManchesterLevel
	}

	// El estado inicial siempre es pendiente: el cliente no puede registrar un triaje ya procesado
	record.Status = domain.TriageStatusPending
	record.CreatedAt = time.Now().UTC()

	if err := s.triageRepo.Create(ctx, record); err != nil {
		return nil, err
	}

	return record, nil
}

func (s *triageService) GetTriageQueue(ctx context.Context) ([]domain.TriageRecord, error) {
	queue, err := s.triageRepo.ListPending(ctx)
	if err != nil {
		return nil, err
	}
	sort.SliceStable(queue, func(i, j int) bool {
		ri, rj := queue[i].ManchesterLevel.Rank(), queue[j].ManchesterLevel.Rank()
		if ri != rj {
			return ri < rj
		}
		return queue[i].CreatedAt.Before(queue[j].CreatedAt)
	})
	return queue, nil
}

func (s *triageService) GetTriageByID(ctx context.Context, id string) (*domain.TriageRecord, error) {
	return s.triageRepo.GetByID(ctx, id)
}

func (s *triageService) UpdateTriageStatus(ctx context.Context, id string, status domain.TriageStatus) error {
	if !status.IsValid() {
		return domain.ErrInvalidTriageStatus
	}

	record, err := s.triageRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if record.Status == domain.TriageStatusFinished {
		return domain.ErrTriageAlreadyProcessed
	}

	return s.triageRepo.UpdateStatus(ctx, id, status)
}
