package backend_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"saludconecta-backend/adapters/http/middlewares"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/pkg/logger"
)

// auditoriaRetenida retiene cada entrada para leerla despues de que la peticion HTTP ya termino,
// que es exactamente lo que ocurre con la goroutine asincrona del middleware en produccion.
type auditoriaRetenida struct {
	entradas chan *domain.AuditLog
}

func (a *auditoriaRetenida) CreateLog(_ context.Context, entry *domain.AuditLog) error {
	a.entradas <- entry
	return nil
}
func (a *auditoriaRetenida) ListLogs(context.Context, int) ([]*domain.AuditLog, error) {
	return nil, nil
}
func (a *auditoriaRetenida) SaveRIPSTransaction(context.Context, *domain.RIPSTransaction) error {
	return nil
}
func (a *auditoriaRetenida) GetRIPSTransactionByID(context.Context, string) (*domain.RIPSTransaction, error) {
	return nil, nil
}

func newAppAuditoria(repo *auditoriaRetenida) *fiber.App {
	app := fiber.New()
	app.Use(middlewares.CorrelationIDMiddleware())
	app.Use(middlewares.AuditMiddleware(logger.New(), repo))
	app.Post("/*", func(c *fiber.Ctx) error { return c.SendStatus(http.StatusCreated) })
	return app
}

// TestDEF28AuditoriaConservaDatosTrasFinalizarPeticion comprueba que la entrada encolada para la
// goroutine no cambie cuando fasthttp reutiliza los buferes en peticiones posteriores.
func TestDEF28AuditoriaConservaDatosTrasFinalizarPeticion(t *testing.T) {
	repo := &auditoriaRetenida{entradas: make(chan *domain.AuditLog, 64)}
	app := newAppAuditoria(repo)

	type esperado struct{ ruta, correlacion string }
	var enviados []esperado
	var recibidos []*domain.AuditLog
	for i := 0; i < 20; i++ {
		ruta := fmt.Sprintf("/api/v1/recurso-%04d", i)
		correlacion := uuid.NewString()
		req := httptest.NewRequest(http.MethodPost, ruta, nil)
		req.Header.Set("X-Correlation-ID", correlacion)
		if _, err := app.Test(req, -1); err != nil {
			t.Fatal(err)
		}
		select {
		case e := <-repo.entradas:
			recibidos = append(recibidos, e)
		case <-time.After(2 * time.Second):
			t.Fatal("La goroutine de auditoria no entrego la entrada")
		}
		enviados = append(enviados, esperado{ruta, correlacion})
	}

	for i, e := range recibidos {
		if e.Resource != enviados[i].ruta || e.CorrelationID != enviados[i].correlacion {
			t.Errorf("Entrada %d alterada tras finalizar la peticion: resource=%q correlation=%q; se esperaba %q / %q",
				i, e.Resource, e.CorrelationID, enviados[i].ruta, enviados[i].correlacion)
		}
	}
}
