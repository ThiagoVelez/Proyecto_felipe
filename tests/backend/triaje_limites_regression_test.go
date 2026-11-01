package backend_test

import (
	"errors"
	"testing"

	"saludconecta-backend/core/domain"
)

func signosBase() domain.TriageRecord {
	return domain.TriageRecord{SystolicBP: 120, DiastolicBP: 80, HeartRate: 75, RespiratoryRate: 16, OxygenSaturation: 98, BodyTemperature: 36.8, GlasgowScore: 15}
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
