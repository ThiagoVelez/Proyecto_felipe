package backend_test

import (
	"context"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// BenchmarkTriageCalculation mide el rendimiento del algoritmo deterministico de categorizacion
// Manchester segun la resolucion clinica de triaje de urgencias ante multiples perfiles fisiologicos.
func BenchmarkTriageCalculation(b *testing.B) {
	records := []*domain.TriageRecord{
		{
			SystolicBP:       60,
			DiastolicBP:      40,
			HeartRate:        160,
			RespiratoryRate:  38,
			OxygenSaturation: 82,
			BodyTemperature:  42.0,
			GlasgowScore:     7,
		},
		{
			SystolicBP:       85,
			DiastolicBP:      55,
			HeartRate:        135,
			RespiratoryRate:  32,
			OxygenSaturation: 88,
			BodyTemperature:  40.5,
			GlasgowScore:     11,
		},
		{
			SystolicBP:       185,
			DiastolicBP:      115,
			HeartRate:        115,
			RespiratoryRate:  26,
			OxygenSaturation: 92,
			BodyTemperature:  39.0,
			GlasgowScore:     14,
		},
		{
			SystolicBP:       145,
			DiastolicBP:      92,
			HeartRate:        102,
			RespiratoryRate:  20,
			OxygenSaturation: 97,
			BodyTemperature:  37.6,
			GlasgowScore:     15,
		},
		{
			SystolicBP:       120,
			DiastolicBP:      80,
			HeartRate:        72,
			RespiratoryRate:  16,
			OxygenSaturation: 99,
			BodyTemperature:  36.6,
			GlasgowScore:     15,
		},
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		record := records[i%len(records)]
		level := record.SuggestManchesterPriority()
		if !level.IsValid() {
			b.Fatalf("nivel de triaje invalido obtenido: %s", level)
		}
	}
}

// BenchmarkAllergyInterception evalua la latencia del motor de intercepcion de contraindicaciones
// alergicas cruzadas (familias betalactamicos, AINEs y derivados con normalizacion ortografica).
func BenchmarkAllergyInterception(b *testing.B) {
	patientAllergies := []domain.PatientAllergy{
		{
			ID:               1,
			PatientID:        "pat-bench-1",
			ActiveIngredient: "PENICILINA",
			Severity:         domain.SeveritySevere,
			Notes:            "Shock anafilactico documentado",
		},
		{
			ID:               2,
			PatientID:        "pat-bench-1",
			ActiveIngredient: "AINES",
			Severity:         domain.SeverityModerate,
			Notes:            "Broncoespasmo y urticaria",
		},
		{
			ID:               3,
			PatientID:        "pat-bench-1",
			ActiveIngredient: "SULFONAMIDAS",
			Severity:         domain.SeverityMild,
			Notes:            "Erupcion cutanea leve",
		},
	}

	testCases := []struct {
		activeIngredient string
		genericName      string
	}{
		{activeIngredient: "Amoxicilina Trihidrato", genericName: "Amoxicilina"},
		{activeIngredient: "Ibuprofeno", genericName: "Ibuprofeno 400mg"},
		{activeIngredient: "Cefalexina Monohidrato", genericName: "Cefalexina"},
		{activeIngredient: "Paracetamol", genericName: "Acetaminofen"},
		{activeIngredient: "Dipirona Sodica", genericName: "Metamizol"},
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		tc := testCases[i%len(testCases)]
		_ = domain.MatchAllergy(patientAllergies, tc.activeIngredient, tc.genericName)
	}
}

// BenchmarkPrescriptionPipelineService mide la latencia completa de validacion clinica
// y deduccion de stock hospitalario a nivel del servicio de aplicacion en Arquitectura Hexagonal.
func BenchmarkPrescriptionPipelineService(b *testing.B) {
	ctx := context.Background()
	store := memory.NewDataStore()
	userRepo := memory.NewUserMemoryRepo(store)
	patientRepo := memory.NewPatientMemoryRepo(store)
	recordRepo := memory.NewClinicalRecordMemoryRepo(store)
	prescRepo := memory.NewPrescriptionMemoryRepo(store)

	doc := &domain.User{
		ID:               "doc-bench-1",
		FullName:         "Dra. Bench Marker",
		RoleID:           2,
		Email:            "bench@saludconecta.ips.gov.co",
		ProfessionalCard: "RM-BENCH-99",
		IsActive:         true,
	}
	_ = userRepo.Create(ctx, doc)

	pat := &domain.Patient{
		ID:             "pat-bench-service",
		DocumentType:   "CC",
		DocumentNumber: "99887766",
		FirstName:      "Paciente",
		LastName:       "Benchmark",
	}
	_ = patientRepo.Create(ctx, pat)

	medParacetamol := &domain.MedicationCatalog{
		ID:                 801,
		CUMCode:            "CUM-BENCH-801",
		CommercialName:     "Acetaminofen Hospitalario",
		GenericName:        "Paracetamol",
		ActiveIngredient:   "PARACETAMOL",
		StockQuantity:      1000000000,
	}
	startMedInjection(store, medParacetamol)

	rec := &domain.ClinicalRecord{
		ID:                   "rec-bench-1",
		PatientID:            pat.ID,
		DoctorID:             doc.ID,
		Anamnesis:            "Cefalea tensional",
		PhysicalExam:         "Estable",
		CIE11Code:            "R51",
		DiagnosisDescription: "Cefalea tensional primaria",
		TreatmentPlan:        "Analgesia oral",
		IsClosed:             false,
		CreatedAt:            time.Now().UTC(),
	}
	_ = recordRepo.Create(ctx, rec)

	prescSvc := services.NewPrescriptionService(prescRepo, recordRepo, patientRepo)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		presc := &domain.Prescription{
			ClinicalRecordID: rec.ID,
			DoctorID:         doc.ID,
			PatientID:        pat.ID,
			Items: []domain.PrescriptionItem{
				{
					MedicationID:   801,
					Dosage:         "500mg VO c/8h",
					FrequencyHours: 8,
					DurationDays:   3,
					TotalQuantity:  1,
				},
			},
		}
		_, err := prescSvc.IssuePrescription(ctx, presc)
		if err != nil {
			b.Fatalf("fallo la prescripcion en benchmark: %v", err)
		}
	}
}
