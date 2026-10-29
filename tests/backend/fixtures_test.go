package backend_test

import (
	"fmt"
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
		FullName:         "Dr. Santiago Vélez",
		Email:            fmt.Sprintf("doctor-%s@saludconecta.ips.gov.co", id),
		PasswordHash:     "$2a$12$e8x...",
		ProfessionalCard: license,
		Specialty:        "Medicina de Urgencias",
		Branch:           "Sede Cartago - Hospital Central (Nivel II)",
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
