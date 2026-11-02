package backend_test

import (
	"context"
	"errors"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// TestDEF05PrescripcionRechazaPacienteDistintoAlFolio garantiza que el cruce de alergias se haga
// contra el paciente del folio y no contra el patient_id enviado por el cliente.
func TestDEF05PrescripcionRechazaPacienteDistintoAlFolio(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	patientRepo := memory.NewPatientMemoryRepo(ds)
	sembrarPacienteYFolio(t, ds, "p-def05-alergico", "cr-def05", medicoSemillaID)
	_ = patientRepo.Create(ctx, newPatientFixture("p-def05-sano", "DOC-SANO"))
	_ = patientRepo.AddPatientAllergy(ctx, &domain.PatientAllergy{PatientID: "p-def05-alergico", ActiveIngredient: "AMOXICILINA", Severity: domain.SeveritySevere})
	ds.SeedMedication(&domain.MedicationCatalog{ID: 501, CommercialName: "Amoxicilina 500 mg", ActiveIngredient: "AMOXICILINA", StockQuantity: 100})

	svc := services.NewPrescriptionService(memory.NewPrescriptionMemoryRepo(ds), memory.NewClinicalRecordMemoryRepo(ds), patientRepo)
	_, err := svc.IssuePrescription(ctx, &domain.Prescription{
		ClinicalRecordID: "cr-def05",
		PatientID:        "p-def05-sano",
		DoctorID:         medicoSemillaID,
		Items:            []domain.PrescriptionItem{{MedicationID: 501, TotalQuantity: 1}},
	})
	if !errors.Is(err, domain.ErrPrescriptionPatientMismatch) {
		t.Fatalf("Se esperaba ErrPrescriptionPatientMismatch al prescribir con un paciente ajeno al folio; se obtuvo %v", err)
	}

	_, err = svc.IssuePrescription(ctx, &domain.Prescription{
		ClinicalRecordID: "cr-def05",
		PatientID:        "p-def05-alergico",
		DoctorID:         medicoSemillaID,
		Items:            []domain.PrescriptionItem{{MedicationID: 501, TotalQuantity: 1}},
	})
	var conflicto *domain.AllergyConflictError
	if !errors.As(err, &conflicto) {
		t.Fatalf("Con el paciente correcto se esperaba bloqueo por alergia; se obtuvo %v", err)
	}
}
