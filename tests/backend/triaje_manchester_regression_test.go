package backend_test

import (
	"context"
	"errors"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// TestDEF08NivelManchesterFueraDelCatalogo verifica que el servicio rechace niveles inexistentes enviados por el cliente.
func TestDEF08NivelManchesterFueraDelCatalogo(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	patientRepo := memory.NewPatientMemoryRepo(ds)
	_ = patientRepo.Create(ctx, newPatientFixture("p-def08", "DOC-08"))
	svc := services.NewTriageService(memory.NewTriageMemoryRepo(ds), patientRepo)

	for _, nivel := range []domain.ManchesterLevel{"NIVEL_VI", "rojo", "NIVEL_I "} {
		tr := signosBase()
		tr.PatientID = "p-def08"
		tr.ManchesterLevel = nivel
		if _, err := svc.RegisterTriage(ctx, &tr); !errors.Is(err, domain.ErrInvalidManchesterLevel) {
			t.Errorf("Nivel %q: se esperaba ErrInvalidManchesterLevel y se obtuvo %v", nivel, err)
		}
	}

	tr := signosBase()
	tr.PatientID = "p-def08"
	tr.ManchesterLevel = domain.ManchesterLevelII
	if _, err := svc.RegisterTriage(ctx, &tr); err != nil {
		t.Errorf("Un nivel valido del catalogo debe aceptarse; se obtuvo %v", err)
	}
}
