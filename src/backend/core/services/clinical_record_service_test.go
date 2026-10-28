package services_test

import (
	"testing"
	"time"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/pkg/crypto"
)

// TestChainedSHA256Integrity valida la inmutabilidad y deteccion de alteraciones criptograficas.
func TestChainedSHA256Integrity(t *testing.T) {
	prevHash := "GENESIS_SALUDCONECTA_000000000000000000000000000000000000000000000000"
	patientID := "p0000001-0000-0000-0000-000000000001"
	doctorID := "d0000001-0000-0000-0000-000000000001"
	anamnesis := "Paciente consulta por cefalea intensa"
	physicalExam := "Signos vitales estables, sin focalizacion neurologica"
	cie11 := "8A80"
	diagnosis := "Migrana sin aura"
	plan := "Reposo, analgesicos orales"
	closedAt := time.Now().UTC().Format(time.RFC3339)

	hash1 := crypto.CalculateChainedRecordHash(
		prevHash, patientID, doctorID, anamnesis, physicalExam, cie11, diagnosis, plan, closedAt,
	)

	if hash1 == "" {
		t.Fatal("El hash SHA-256 generado no puede ser vacio")
	}

	// Mismos datos deben producir exactamente el mismo hash determinista
	hash2 := crypto.CalculateChainedRecordHash(
		prevHash, patientID, doctorID, anamnesis, physicalExam, cie11, diagnosis, plan, closedAt,
	)

	if hash1 != hash2 {
		t.Fatalf("Fallo de determinismo criptografico: %s != %s", hash1, hash2)
	}

	// Cualquier modificacion minima a la anamnesis debe alterar completamente el hash resultante
	tamperedHash := crypto.CalculateChainedRecordHash(
		prevHash, patientID, doctorID, anamnesis+" (modificado ilegalmente)", physicalExam, cie11, diagnosis, plan, closedAt,
	)

	if hash1 == tamperedHash {
		t.Fatal("Fallo de integridad: la alteracion del registro no produjo un cambio en el hash SHA-256")
	}
}

// TestManchesterPriorityCalculation verifica la correcta clasificacion de triage segun constantes vitales.
func TestManchesterPriorityCalculation(t *testing.T) {
	// Paciente critico con Glasgow = 7 debe ser clasificado en Nivel I (Rojo / Inmediato)
	criticalTriage := domain.TriageRecord{
		GlasgowScore:     7,
		OxygenSaturation: 82,
		HeartRate:        140,
		SystolicBP:       80,
		DiastolicBP:      50,
	}

	priority := criticalTriage.SuggestManchesterPriority()
	if priority != domain.ManchesterLevelI {
		t.Fatalf("Esperado %s, obtenido %s", domain.ManchesterLevelI, priority)
	}

	// Paciente estable con fiebre moderada debe ser clasificado en Nivel IV o III
	mildTriage := domain.TriageRecord{
		GlasgowScore:     15,
		OxygenSaturation: 97,
		HeartRate:        80,
		SystolicBP:       120,
		DiastolicBP:      80,
		BodyTemperature:  37.6,
	}

	mildPriority := mildTriage.SuggestManchesterPriority()
	if mildPriority != domain.ManchesterLevelIV {
		t.Fatalf("Esperado %s, obtenido %s", domain.ManchesterLevelIV, mildPriority)
	}
}

