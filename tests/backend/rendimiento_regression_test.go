package backend_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
)

// TestRNF01LatenciaBajoConcurrencia mide p50/p95/p99 de la pila HTTP completa (middlewares, RBAC,
// handlers, servicios) sobre el adaptador en memoria. No incluye red ni MySQL: es una cota inferior
// de la latencia real y no sustituye una prueba de carga contra el despliegue.
func TestRNF01LatenciaBajoConcurrencia(t *testing.T) {
	if testing.Short() {
		t.Skip("medicion omitida en modo -short")
	}
	env := newCalidadEnv(t)
	ctx := context.Background()
	sembrarPacienteYFolio(t, env.ds, "p-rnf01", "cr-rnf01", medicoSemillaID)
	_ = memory.NewPatientMemoryRepo(env.ds).AddPatientAllergy(ctx, &domain.PatientAllergy{PatientID: "p-rnf01", ActiveIngredient: "AMOXICILINA", Severity: domain.SeveritySevere})
	env.ds.SeedMedication(&domain.MedicationCatalog{ID: 901, CommercialName: "Acetaminofen 500 mg", ActiveIngredient: "ACETAMINOFEN", StockQuantity: 1_000_000})
	env.ds.SeedMedication(&domain.MedicationCatalog{ID: 902, CommercialName: "Amoxicilina 500 mg", ActiveIngredient: "AMOXICILINA", StockQuantity: 1_000_000})
	token := calidadToken(t, medicoSemillaID, "MEDICO")

	const concurrencia, porTrabajador = 20, 50
	escenarios := []struct {
		nombre, metodo, ruta, cuerpo string
		estado                       int
	}{
		{"emision de prescripcion", http.MethodPost, "/api/v1/prescriptions/", `{"clinical_record_id":"cr-rnf01","patient_id":"p-rnf01","items":[{"medication_id":901,"total_quantity":1}]}`, http.StatusCreated},
		{"intercepcion de alergia", http.MethodPost, "/api/v1/prescriptions/", `{"clinical_record_id":"cr-rnf01","patient_id":"p-rnf01","items":[{"medication_id":902,"total_quantity":1}]}`, http.StatusUnprocessableEntity},
		{"lectura de historia clinica", http.MethodGet, "/api/v1/clinical-records/patient/p-rnf01", "", http.StatusOK},
	}

	var informe strings.Builder
	fmt.Fprintf(&informe, "Concurrencia=%d, peticiones por escenario=%d\n", concurrencia, concurrencia*porTrabajador)
	informe.WriteString("| Escenario | p50 (ms) | p95 (ms) | p99 (ms) | max (ms) |\n|---|---|---|---|---|\n")

	for _, esc := range escenarios {
		var mu sync.Mutex
		var muestras []time.Duration
		var wg sync.WaitGroup
		for w := 0; w < concurrencia; w++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for i := 0; i < porTrabajador; i++ {
					req := httptest.NewRequest(esc.metodo, esc.ruta, strings.NewReader(esc.cuerpo))
					req.Header.Set("Content-Type", "application/json")
					req.Header.Set("Authorization", "Bearer "+token)
					inicio := time.Now()
					res, err := env.app.Test(req, -1)
					d := time.Since(inicio)
					if err != nil || res.StatusCode != esc.estado {
						t.Errorf("%s: estado inesperado %v (err=%v)", esc.nombre, res.StatusCode, err)
						return
					}
					_ = res.Body.Close()
					mu.Lock()
					muestras = append(muestras, d)
					mu.Unlock()
				}
			}()
		}
		wg.Wait()
		if len(muestras) == 0 {
			t.Fatalf("%s: ninguna peticion respondio con el estado esperado", esc.nombre)
		}

		sort.Slice(muestras, func(i, j int) bool { return muestras[i] < muestras[j] })
		p := func(q float64) float64 {
			return float64(muestras[int(q*float64(len(muestras)-1))].Microseconds()) / 1000
		}
		fmt.Fprintf(&informe, "| %s | %.2f | %.2f | %.2f | %.2f |\n", esc.nombre, p(0.50), p(0.95), p(0.99), p(1))
		if p95 := p(0.95); p95 >= 400 {
			t.Errorf("%s: p95=%.2f ms incumple RNF01 (< 400 ms)", esc.nombre, p95)
		}
	}

	t.Log("\n" + informe.String())
	if salida := os.Getenv("CALIDAD_RENDIMIENTO_SALIDA"); salida != "" {
		if err := os.WriteFile(salida, []byte(informe.String()), 0o600); err != nil {
			t.Fatal(err)
		}
	}
}
