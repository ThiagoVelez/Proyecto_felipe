package services

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
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

	// Validar folio clinico
	if _, err := s.recordRepo.GetByID(ctx, prescription.ClinicalRecordID); err != nil {
		return nil, domain.ErrRecordNotFound
	}

	// Obtener historial alergico del paciente
	allergies, err := s.patientRepo.GetPatientAllergies(ctx, prescription.PatientID)
	if err != nil {
		return nil, err
	}

	allergyMap := make(map[string]domain.PatientAllergy)
	for _, a := range allergies {
		allergyMap[strings.ToUpper(strings.TrimSpace(a.ActiveIngredient))] = a
	}

	// Validar cada medicamento contra alergias y disponibilidad de inventario
	for i := range prescription.Items {
		item := &prescription.Items[i]
		med, err := s.prescRepo.GetMedicationByID(ctx, item.MedicationID)
		if err != nil {
			return nil, domain.ErrMedicationNotFound
		}
		item.Medication = med

		normalizedIngredient := strings.ToUpper(strings.TrimSpace(med.ActiveIngredient))
		if allergy, exists := allergyMap[normalizedIngredient]; exists {
			return nil, &domain.AllergyConflictError{
				PatientID:        prescription.PatientID,
				ActiveIngredient: allergy.ActiveIngredient,
				Severity:         allergy.Severity,
				MedicationName:   med.CommercialName,
			}
		}

		if med.StockQuantity < item.TotalQuantity {
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

	for _, item := range prescription.Items {
		_ = s.prescRepo.DeductStock(ctx, item.MedicationID, item.TotalQuantity)
	}

	return prescription, nil
}

func (s *prescriptionService) GetPrescriptionByID(ctx context.Context, id string) (*domain.Prescription, error) {
	return s.prescRepo.GetByID(ctx, id)
}

func (s *prescriptionService) GetByClinicalRecord(ctx context.Context, recordID string) (*domain.Prescription, error) {
	return s.prescRepo.GetByClinicalRecordID(ctx, recordID)
}
