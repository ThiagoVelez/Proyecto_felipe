package middlewares

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/utils"
	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/logger"
)

// CorrelationIDMiddleware asegura que cada solicitud cuente con un identificador de correlacion unico.
func CorrelationIDMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// DEF-41: el valor del cliente se escribe en bitacora y cabeceras; solo se acepta un UUID canonico.
		correlationID := c.Get("X-Correlation-ID")
		if parsed, err := uuid.Parse(correlationID); err != nil || parsed.String() != strings.ToLower(correlationID) {
			correlationID = uuid.New().String()
		} else {
			correlationID = parsed.String()
		}

		c.Locals("correlation_id", correlationID)
		c.Set("X-Correlation-ID", correlationID)

		return c.Next()
	}
}

// AuditMiddleware registra la bitacora de auditoria forense y telemetria transversal.
func AuditMiddleware(log *logger.Logger, auditRepo ports.AuditRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		correlationID, _ := c.Locals("correlation_id").(string)
		subLog := log.WithCorrelationID(correlationID)

		err := c.Next()

		latency := time.Since(start)
		statusCode := c.Response().StatusCode()

		subLog.Info("Solicitud HTTP procesada", map[string]interface{}{
			"method":      c.Method(),
			"path":        c.Path(),
			"ip":          c.IP(),
			"status":      statusCode,
			"latency_ms":  latency.Milliseconds(),
			"user_agent":  c.Get("User-Agent"),
		})

		// Si es una operacion que muta estado (POST, PUT, DELETE, PATCH), registrar en base de datos
		method := c.Method()
		if auditRepo != nil && (method == fiber.MethodPost || method == fiber.MethodPut || method == fiber.MethodPatch || method == fiber.MethodDelete) {
			// DEF-28: Fiber devuelve cadenas que apuntan a buferes de fasthttp reutilizados al terminar
			// la peticion; la goroutine las leeria ya sobrescritas, por eso se copian antes de despacharla.
			var userIDPtr *string
			if uID, ok := c.Locals("user_id").(string); ok && uID != "" {
				uID = utils.CopyString(uID)
				userIDPtr = &uID
			}
			var rolePtr *string
			if r, ok := c.Locals("role").(string); ok && r != "" {
				r = utils.CopyString(r)
				rolePtr = &r
			}

			action := domain.ActionUpdate
			if method == fiber.MethodPost {
				action = domain.ActionCreate
			}

			auditEntry := &domain.AuditLog{
				UserID:        userIDPtr,
				Role:          rolePtr,
				Action:        action,
				Resource:      utils.CopyString(c.Path()),
				IPAddress:     utils.CopyString(c.IP()),
				CorrelationID: utils.CopyString(correlationID),
				Details: map[string]interface{}{
					"status_code": statusCode,
					"method":      utils.CopyString(method),
					"latency_ms":  latency.Milliseconds(),
				},
				Timestamp: time.Now().UTC(),
			}

			go func(entry *domain.AuditLog) {
				_ = auditRepo.CreateLog(context.Background(), entry)
			}(auditEntry)
		}

		return err
	}
}

