package backend_test

import (
	"context"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// TestTriageEquivalencePartitioningAndBoundaryValues evalua particiones validas, invalidas y limites fisiologicos.
func TestTriageEquivalencePartitioningAndBoundaryValues(t *testing.T) {
	ds := memory.NewDataStore()
	triageRepo := memory.NewTriageMemoryRepo(ds)
	patientRepo := memory.NewPatientMemoryRepo(ds)
	triageService := services.NewTriageService(triageRepo, patientRepo)

	ctx := context.Background()

	// Registrar paciente base para asociar valoracion de triaje
	patient := newPatientFixture("p-triage-01", "10111222")
	_ = patientRepo.Create(ctx, patient)

	t.Run("Particion Invalida: Glasgow fuera de rango superior (Limite 16)", func(t *testing.T) {
		record := &domain.TriageRecord{
			PatientID:             patient.ID,
			EvaluatedBy:           "u-nurse-01",
			SystolicBP:            120,
			DiastolicBP:           80,
			HeartRate:             75,
			RespiratoryRate:       18,
			OxygenSaturation:      98,
			BodyTemperature:       36.5,
			GlasgowScore:          16, // Valor invalido > 15
			ReasonForConsultation: "Cefalea leve",
		}

		_, err := triageService.RegisterTriage(ctx, record)
		if err == nil || err != domain.ErrInvalidGlasgowScore {
			t.Fatalf("Se esperaba error domain.ErrInvalidGlasgowScore para Glasgow=16, pero se obtuvo: %v", err)
		}
	})

	t.Run("Particion Invalida: Frecuencia Cardiaca imposible (FC = 0)", func(t *testing.T) {
		record := &domain.TriageRecord{
			PatientID:             patient.ID,
			EvaluatedBy:           "u-nurse-01",
			SystolicBP:            120,
			DiastolicBP:           80,
			HeartRate:             0, // Valor imposible fisiologico
			RespiratoryRate:       18,
			OxygenSaturation:      98,
			BodyTemperature:       36.5,
			GlasgowScore:          15,
			ReasonForConsultation: "Consulta general",
		}

		_, err := triageService.RegisterTriage(ctx, record)
		if err == nil || err != domain.ErrInvalidVitals {
			t.Fatalf("Se esperaba error domain.ErrInvalidVitals para FC=0, pero se obtuvo: %v", err)
		}
	})

	t.Run("Particion Valida Limite: Nivel I (Emergencia Extrema / Glasgow = 7)", func(t *testing.T) {
		record := &domain.TriageRecord{
			PatientID:             patient.ID,
			EvaluatedBy:           "u-nurse-01",
			SystolicBP:            75,
			DiastolicBP:           45,
			HeartRate:             145,
			RespiratoryRate:       32,
			OxygenSaturation:      82, // Hipoxemia severa
			BodyTemperature:       35.2,
			GlasgowScore:          7, // Coma profundo (< 8)
			ReasonForConsultation: "Trauma craneoencefalico con perdida de conciencia",
		}

		saved, err := triageService.RegisterTriage(ctx, record)
		if err != nil {
			t.Fatalf("Fallo inesperado registrando triaje critico: %v", err)
		}

		if saved.ManchesterLevel != domain.ManchesterLevelI {
			t.Fatalf("Se esperaba clasificacion Manchester NIVEL_I, pero se obtuvo: %s", saved.ManchesterLevel)
		}
	})

	t.Run("Particion Valida: Nivel V (No Urgente / Parametros Fisiologicos Estables)", func(t *testing.T) {
		record := &domain.TriageRecord{
			PatientID:             patient.ID,
			EvaluatedBy:           "u-nurse-01",
			SystolicBP:            118,
			DiastolicBP:           76,
			HeartRate:             72,
			RespiratoryRate:       16,
			OxygenSaturation:      99,
			BodyTemperature:       36.6,
			GlasgowScore:          15,
			ReasonForConsultation: "Curacion menor y retiro de puntos",
		}

		saved, err := triageService.RegisterTriage(ctx, record)
		if err != nil {
			t.Fatalf("Fallo inesperado registrando triaje no urgente: %v", err)
		}

		if saved.ManchesterLevel != domain.ManchesterLevelV {
			t.Fatalf("Se esperaba clasificacion Manchester NIVEL_V, pero se obtuvo: %s", saved.ManchesterLevel)
		}
	})
}
