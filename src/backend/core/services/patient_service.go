package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type patientService struct {
	patientRepo ports.PatientRepository
}

// NewPatientService construye el servicio de admision de pacientes y registro de antecedentes alergicos.
func NewPatientService(patientRepo ports.PatientRepository) ports.PatientService {
	return &patientService{patientRepo: patientRepo}
}

var (
	validDocumentTypes = map[domain.DocumentType]bool{
		domain.DocCC: true, domain.DocTI: true, domain.DocRC: true,
		domain.DocCE: true, domain.DocPA: true, domain.DocMS: true,
	}
	validGenders = map[domain.Gender]bool{
		domain.GenderMale: true, domain.GenderFemale: true, domain.GenderOther: true,
	}
	validBloodTypes = map[domain.BloodType]bool{
		"A+": true, "A-": true, "B+": true, "B-": true, "AB+": true, "AB-": true, "O+": true, "O-": true,
	}
	validAffiliations = map[domain.AffiliationStatus]bool{
		domain.AffiliationActive: true, domain.AffiliationInactive: true, domain.AffiliationSuspended: true,
	}
	validSeverities = map[domain.AllergySeverity]bool{
		domain.SeverityMild: true, domain.SeverityModerate: true, domain.SeveritySevere: true,
	}
)

func trimPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func (s *patientService) RegisterPatient(ctx context.Context, patient *domain.Patient) (*domain.Patient, error) {
	patient.DocumentNumber = strings.TrimSpace(patient.DocumentNumber)
	patient.FirstName = strings.TrimSpace(patient.FirstName)
	patient.LastName = strings.TrimSpace(patient.LastName)
	patient.EPSName = strings.TrimSpace(patient.EPSName)
	patient.SecondName = trimPtr(patient.SecondName)
	patient.SecondLastName = trimPtr(patient.SecondLastName)
	patient.Phone = trimPtr(patient.Phone)
	if patient.AffiliationStatus == "" {
		patient.AffiliationStatus = domain.AffiliationActive
	}

	if !validDocumentTypes[patient.DocumentType] {
		return nil, domain.ErrInvalidDocumentType
	}
	if patient.DocumentNumber == "" || len(patient.DocumentNumber) > 25 ||
		patient.FirstName == "" || patient.LastName == "" || patient.EPSName == "" ||
		!validGenders[patient.Gender] || !validBloodTypes[patient.BloodType] ||
		!validAffiliations[patient.AffiliationStatus] ||
		patient.BirthDate.IsZero() || patient.BirthDate.After(time.Now()) {
		return nil, domain.ErrInvalidPatientData
	}

	if existing, err := s.patientRepo.GetByDocument(ctx, patient.DocumentType, patient.DocumentNumber); err == nil && existing != nil {
		return nil, domain.ErrPatientAlreadyExists
	} else if err != nil && !errors.Is(err, domain.ErrPatientNotFound) {
		return nil, err
	}

	now := time.Now().UTC()
	patient.ID = uuid.New().String()
	patient.CreatedAt = now
	patient.UpdatedAt = now
	patient.Allergies = nil

	if err := s.patientRepo.Create(ctx, patient); err != nil {
		return nil, err
	}
	return patient, nil
}

func (s *patientService) GetPatient(ctx context.Context, id string) (*domain.Patient, error) {
	return s.patientRepo.GetByID(ctx, id)
}

func (s *patientService) FindByDocument(ctx context.Context, docType domain.DocumentType, docNumber string) (*domain.Patient, error) {
	if !validDocumentTypes[docType] {
		return nil, domain.ErrInvalidDocumentType
	}
	return s.patientRepo.GetByDocument(ctx, docType, strings.TrimSpace(docNumber))
}

func (s *patientService) ListPatients(ctx context.Context, limit, offset int) ([]domain.Patient, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	return s.patientRepo.List(ctx, limit, offset)
}

func (s *patientService) AddAllergy(ctx context.Context, allergy *domain.PatientAllergy) (*domain.PatientAllergy, error) {
	allergy.ActiveIngredient = strings.TrimSpace(allergy.ActiveIngredient)
	allergy.Notes = strings.TrimSpace(allergy.Notes)
	if allergy.ActiveIngredient == "" || len(allergy.ActiveIngredient) > 100 ||
		domain.NormalizeIngredient(allergy.ActiveIngredient) == "" || !validSeverities[allergy.Severity] {
		return nil, domain.ErrInvalidAllergyData
	}

	if _, err := s.patientRepo.GetByID(ctx, allergy.PatientID); err != nil {
		return nil, domain.ErrPatientNotFound
	}

	allergy.CreatedAt = time.Now().UTC()
	if err := s.patientRepo.AddPatientAllergy(ctx, allergy); err != nil {
		return nil, err
	}
	return allergy, nil
}

func (s *patientService) GetAllergies(ctx context.Context, patientID string) ([]domain.PatientAllergy, error) {
	if _, err := s.patientRepo.GetByID(ctx, patientID); err != nil {
		return nil, domain.ErrPatientNotFound
	}
	allergies, err := s.patientRepo.GetPatientAllergies(ctx, patientID)
	if err != nil {
		return nil, err
	}
	if allergies == nil {
		allergies = []domain.PatientAllergy{}
	}
	return allergies, nil
}
