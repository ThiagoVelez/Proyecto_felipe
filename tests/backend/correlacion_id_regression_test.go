package backend_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"saludconecta-backend/core/domain"
)

// TestDEF41CorrelationIDSoloAceptaUUID impide que valores arbitrarios del cliente lleguen a bitacora y cabeceras.
func TestDEF41CorrelationIDSoloAceptaUUID(t *testing.T) {
	repo := &auditoriaRetenida{entradas: make(chan *domain.AuditLog, 8)}
	app := newAppAuditoria(repo)

	valido := uuid.NewString()
	casos := []struct {
		entrada   string
		conservar bool
	}{
		{valido, true},
		{"no-es-un-uuid", false},
		{strings.Repeat("A", 1000), false},
		{`x","level":"ERROR","message":"falso`, false},
	}
	for _, c := range casos {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/correlacion", nil)
		req.Header.Set("X-Correlation-ID", c.entrada)
		res, err := app.Test(req, -1)
		if err != nil {
			t.Fatal(err)
		}
		e := <-repo.entradas
		devuelto := res.Header.Get("X-Correlation-ID")
		if _, err := uuid.Parse(devuelto); err != nil {
			t.Errorf("Entrada %.20q: la cabecera devuelta %.20q no es un UUID", c.entrada, devuelto)
		}
		if c.conservar && devuelto != c.entrada {
			t.Errorf("Un UUID valido debe conservarse; se recibio %q", devuelto)
		}
		if !c.conservar && (devuelto == c.entrada || e.CorrelationID == c.entrada) {
			t.Errorf("Entrada %.20q aceptada sin validar como identificador de correlacion", c.entrada)
		}
	}
}
