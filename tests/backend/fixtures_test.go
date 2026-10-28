package backend_test

import (
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
)

func newPatientFixture(id, docNumber string) *domain.Patient {
	phone := "3001234567"
	return &domain.Patient{
		ID:                id,
		DocumentType:      domain.DocCC,
		DocumentNumber:    docNumber,
		FirstName:         "Carlos",
		LastName:          "Ramirez",
		BirthDate:         time.Date(1990, 5, 20, 0, 0, 0, 0, time.UTC),
		Gender:            domain.GenderMale,
		BloodType:         "O+",
		EPSName:           "Sura EPS",
		AffiliationStatus: domain.AffiliationActive,
		Phone:             &phone,
		IsRuralZone:       false,
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
}

func newDoctorFixture(id, license string) *domain.User {
	return &domain.User{
		ID:               id,
		RoleID:           2,
		RoleName:         "MEDICO",
		FullName:         "Dra. Maria Fernandez",
		Email:            "mfernandez@saludconecta.com",
		PasswordHash:     "$2a$12$e8x...",
		ProfessionalCard: &license,
		IsActive:         true,
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}
}

func startMedInjection(ds *memory.DataStore, meds ...*domain.MedicationCatalog) {
	for _, m := range meds {
		ds.SeedMedication(m)
	}
}
