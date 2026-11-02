package services

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type prescriptionService struct {
	prescRepo   ports.PrescriptionRepository
	recordRepo  ports.ClinicalRecordRepository
	patientRepo ports.PatientRepository
}

// NewPrescriptionService crea la logica de control farmacologico con cruce de alergias en tiempo real.
func NewPrescriptionService(
	prescRepo ports.PrescriptionRepository,
	recordRepo ports.ClinicalRecordRepository,
	patientRepo ports.PatientRepository,
) ports.PrescriptionService {
	return &prescriptionService{
		prescRepo:   prescRepo,
		recordRepo:  recordRepo,
		patientRepo: patientRepo,
	}
}

func (s *prescriptionService) IssuePrescription(ctx context.Context, prescription *domain.Prescription) (*domain.Prescription, error) {
	if len(prescription.Items) == 0 {
		return nil, domain.ErrEmptyPrescriptionItems
	}

	record, err := s.recordRepo.GetByID(ctx, prescription.ClinicalRecordID)
	if err != nil {
		return nil, domain.ErrRecordNotFound
	}

	// El paciente es el del folio: el cliente no puede elegir contra que historial alergico se cruza la receta
	if prescription.PatientID != "" && prescription.PatientID != record.PatientID {
		return nil, domain.ErrPatientMismatch
	}
	if record.DoctorID != prescription.DoctorID {
		return nil, domain.ErrNotRecordOwner
	}
	prescription.PatientID = record.PatientID

	allergies, err := s.patientRepo.GetPatientAllergies(ctx, record.PatientID)
	if err != nil {
		return nil, err
	}

	// Cantidad acumulada por medicamento para detectar stock insuficiente cuando un mismo farmaco se repite
	requested := make(map[int]int)

	for i := range prescription.Items {
		item := &prescription.Items[i]
		if item.MedicationID <= 0 || item.TotalQuantity <= 0 {
			return nil, domain.ErrInvalidPrescriptionItem
		}

		med, err := s.prescRepo.GetMedicationByID(ctx, item.MedicationID)
		if err != nil {
			return nil, domain.ErrMedicationNotFound
		}
		item.Medication = med

		if allergy := domain.MatchAllergy(allergies, med.ActiveIngredient, med.GenericName); allergy != nil {
			return nil, &domain.AllergyConflictError{
				PatientID:        record.PatientID,
				ActiveIngredient: allergy.ActiveIngredient,
				Severity:         allergy.Severity,
				MedicationName:   med.CommercialName,
			}
		}

		requested[item.MedicationID] += item.TotalQuantity
		if med.StockQuantity < requested[item.MedicationID] {
			return nil, domain.ErrInsufficientMedicationStock
		}
	}

	if prescription.ID == "" {
		prescription.ID = uuid.New().String()
	}
	prescription.CreatedAt = time.Now().UTC()

	// Persistir la prescripcion y descontar inventario
	if err := s.prescRepo.Create(ctx, prescription); err != nil {
		return nil, err
	}

	for medicationID, quantity := range requested {
		if err := s.prescRepo.DeductStock(ctx, medicationID, quantity); err != nil {
			return nil, err
		}
	}

	return prescription, nil
}

func (s *prescriptionService) GetPrescriptionByID(ctx context.Context, id string) (*domain.Prescription, error) {
	return s.prescRepo.GetByID(ctx, id)
}

func (s *prescriptionService) GetByClinicalRecord(ctx context.Context, recordID string) (*domain.Prescription, error) {
	return s.prescRepo.GetByClinicalRecordID(ctx, recordID)
}

func (s *prescriptionService) SearchMedications(ctx context.Context, query string) ([]domain.MedicationCatalog, error) {
	return s.prescRepo.SearchMedications(ctx, strings.TrimSpace(query))
}
