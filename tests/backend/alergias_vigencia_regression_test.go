package backend_test

import (
	"context"
	"errors"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// TestH21AlergiaRegistradaSeAplicaDeInmediato descarta que exista una cache de alergias obsoleta:
// una alergia registrada despues de una prescripcion debe bloquear la siguiente con el mismo servicio.
func TestH21AlergiaRegistradaSeAplicaDeInmediato(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	patientRepo := memory.NewPatientMemoryRepo(ds)
	sembrarPacienteYFolio(t, ds, "p-h21", "cr-h21", medicoSemillaID)
	ds.SeedMedication(&domain.MedicationCatalog{ID: 211, CommercialName: "Ibuprofeno 400 mg", ActiveIngredient: "IBUPROFENO", StockQuantity: 100})
	svc := services.NewPrescriptionService(memory.NewPrescriptionMemoryRepo(ds), memory.NewClinicalRecordMemoryRepo(ds), patientRepo)

	orden := func() *domain.Prescription {
		return &domain.Prescription{ClinicalRecordID: "cr-h21", PatientID: "p-h21", DoctorID: medicoSemillaID,
			Items: []domain.PrescriptionItem{{MedicationID: 211, TotalQuantity: 1}}}
	}
	if _, err := svc.IssuePrescription(ctx, orden()); err != nil {
		t.Fatalf("La primera prescripcion, sin alergias registradas, debia emitirse: %v", err)
	}

	_ = patientRepo.AddPatientAllergy(ctx, &domain.PatientAllergy{PatientID: "p-h21", ActiveIngredient: "IBUPROFENO", Severity: domain.SeveritySevere})

	_, err := svc.IssuePrescription(ctx, orden())
	var conflicto *domain.AllergyConflictError
	if !errors.As(err, &conflicto) {
		t.Fatalf("La alergia registrada despues no bloqueo la nueva prescripcion: %v", err)
	}
}
