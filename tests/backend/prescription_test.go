package backend_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// TestPrescriptionAllergyInterceptor evalua la intercepcion en tiempo real ante contraindicaciones farmacologicas.
func TestPrescriptionAllergyInterceptor(t *testing.T) {
	ctx := context.Background()

	// 1. Datos del paciente con antecedente severo de choque anafilactico a Betalactamicos
	patient := newPatientFixture("p-allergy-01", "98765432")

	allergy := &domain.PatientAllergy{
		PatientID:        patient.ID,
		ActiveIngredient: "BETALACTAMICOS",
		Severity:         domain.SeveritySevere,
		Notes:            "Antecedente de choque anafilactico en atencion previa",
		CreatedAt:        time.Now().UTC(),
	}

	// 2. Folio clinico activo
	record := &domain.ClinicalRecord{
		ID:                   "cr-test-01",
		PatientID:            patient.ID,
		DoctorID:             "doc-01",
		Anamnesis:            "Paciente con amigdalitis bacteriana aguda",
		PhysicalExam:         "Exudado purulento faringeo",
		CIE11Code:            "CA02",
		DiagnosisDescription: "Faringoamigdalitis estreptococica",
		TreatmentPlan:        "Iniciar antibioterapia sistemica",
		CreatedAt:            time.Now().UTC(),
	}

	// 3. Medicamentos en el catalogo institucional CUM
	amoxicilina := &domain.MedicationCatalog{
		ID:                 101,
		CUMCode:            "19934201-01",
		CommercialName:     "Amoxil 500mg",
		GenericName:        "Amoxicilina",
		ActiveIngredient:   "BETALACTAMICOS",
		Concentration:      "500 mg",
		PharmaceuticalForm: "Capsula",
		StockQuantity:      500,
	}
	acetaminofen := &domain.MedicationCatalog{
		ID:                 102,
		CUMCode:            "20011234-01",
		CommercialName:     "Acetaminofen Genfar 500mg",
		GenericName:        "Acetaminofen",
		ActiveIngredient:   "PARACETAMOL",
		Concentration:      "500 mg",
		PharmaceuticalForm: "Tableta",
		StockQuantity:      2000,
	}

	t.Run("Intercepcion Inmediata de Alergia a Betalactamicos (< 150 ms)", func(t *testing.T) {
		mockStore := memory.NewDataStore()
		pRepo := memory.NewPrescriptionMemoryRepo(mockStore)
		ptRepo := memory.NewPatientMemoryRepo(mockStore)
		crRepo := memory.NewClinicalRecordMemoryRepo(mockStore)

		_ = ptRepo.Create(ctx, patient)
		_ = ptRepo.AddPatientAllergy(ctx, allergy)
		_ = crRepo.Create(ctx, record)

		startMedInjection(mockStore, amoxicilina, acetaminofen)

		pService := services.NewPrescriptionService(pRepo, crRepo, ptRepo)

		prescConflict := &domain.Prescription{
			ClinicalRecordID: record.ID,
			PatientID:        patient.ID,
			DoctorID:         "doc-01",
			Items: []domain.PrescriptionItem{
				{
					MedicationID:   101, // Amoxicilina -> Alergia Betalactamicos
					Dosage:         "500 mg",
					FrequencyHours: 8,
					DurationDays:   7,
					TotalQuantity:  21,
				},
			},
		}

		start := time.Now()
		_, err := pService.IssuePrescription(ctx, prescConflict)
		elapsed := time.Since(start)

		if err == nil {
			t.Fatal("Fallo de seguridad critico: el interceptor no bloqueo la prescripcion de Amoxicilina para un paciente alergico a Betalactamicos")
		}

		var allergyErr *domain.AllergyConflictError
		if !errors.As(err, &allergyErr) {
			t.Fatalf("Se esperaba error de tipo *domain.AllergyConflictError, pero se obtuvo: %v", err)
		}

		if allergyErr.ActiveIngredient != "BETALACTAMICOS" {
			t.Fatalf("Discrepancia en principio activo bloqueado: esperado BETALACTAMICOS, obtenido %s", allergyErr.ActiveIngredient)
		}

		if elapsed > 150*time.Millisecond {
			t.Fatalf("La latencia del motor interceptor supero el umbral no funcional de 150 ms: %v", elapsed)
		}
	})

	t.Run("Prescripcion Exitosa con Farmaco No Contraindicado (Paracetamol)", func(t *testing.T) {
		mockStore := memory.NewDataStore()
		pRepo := memory.NewPrescriptionMemoryRepo(mockStore)
		ptRepo := memory.NewPatientMemoryRepo(mockStore)
		crRepo := memory.NewClinicalRecordMemoryRepo(mockStore)

		_ = ptRepo.Create(ctx, patient)
		_ = ptRepo.AddPatientAllergy(ctx, allergy)
		_ = crRepo.Create(ctx, record)
		startMedInjection(mockStore, amoxicilina, acetaminofen)

		pService := services.NewPrescriptionService(pRepo, crRepo, ptRepo)

		prescSafe := &domain.Prescription{
			ClinicalRecordID: record.ID,
			PatientID:        patient.ID,
			DoctorID:         "doc-01",
			Items: []domain.PrescriptionItem{
				{
					MedicationID:   102, // Acetaminofen -> Seguro
					Dosage:         "500 mg",
					FrequencyHours: 6,
					DurationDays:   3,
					TotalQuantity:  12,
				},
			},
		}

		saved, err := pService.IssuePrescription(ctx, prescSafe)
		if err != nil {
			t.Fatalf("Fallo inesperado prescribiendo medicamento seguro: %v", err)
		}

		if saved.ID == "" {
			t.Fatal("La prescripcion emitida debe contar con un identificador unico UUID")
		}

		// Validar deduccion de inventario
		medUpdated, _ := pRepo.GetMedicationByID(ctx, 102)
		if medUpdated.StockQuantity != 2000-12 {
			t.Fatalf("El stock no fue descontado adecuadamente: esperado 1988, obtenido %d", medUpdated.StockQuantity)
		}
	})
}
