package backend_test

import (
	"errors"
	"testing"

	"saludconecta-backend/core/domain"
)

func signosBase() domain.TriageRecord {
	return domain.TriageRecord{SystolicBP: 120, DiastolicBP: 80, HeartRate: 75, RespiratoryRate: 16, OxygenSaturation: 98, BodyTemperature: 36.8, GlasgowScore: 15}
}

// TestH23LimitesGlasgowNoCubiertos completa los limites 2/3/15 que triage_test.go no evalua (ya cubre 16).
func TestH23LimitesGlasgowNoCubiertos(t *testing.T) {
	casos := []struct {
		glasgow  int
		esperado error
	}{
		{2, domain.ErrInvalidGlasgowScore},
		{3, nil},
		{15, nil},
	}
	for _, c := range casos {
		tr := signosBase()
		tr.GlasgowScore = c.glasgow
		if err := tr.Validate(); !errors.Is(err, c.esperado) {
			t.Errorf("Glasgow=%d: se esperaba %v y se obtuvo %v", c.glasgow, c.esperado, err)
		}
	}
}

// TestDEF27FrecuenciaCardiacaLimiteSuperior cubre los limites 300/301 que RF02 declara y la suite existente no evalua.
func TestDEF27FrecuenciaCardiacaLimiteSuperior(t *testing.T) {
	casos := []struct {
		fc       int
		esperado error
	}{
		{1, nil},
		{300, nil},
		{301, domain.ErrInvalidVitals},
		{1000, domain.ErrInvalidVitals},
	}
	for _, c := range casos {
		tr := signosBase()
		tr.HeartRate = c.fc
		if err := tr.Validate(); !errors.Is(err, c.esperado) {
			t.Errorf("FC=%d: se esperaba %v y se obtuvo %v", c.fc, c.esperado, err)
		}
	}
}
