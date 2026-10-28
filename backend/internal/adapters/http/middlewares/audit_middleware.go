package middlewares

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
	"saludconecta-backend/pkg/logger"
)

// CorrelationIDMiddleware asegura que cada solicitud cuente con un identificador de correlacion unico.
func CorrelationIDMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		correlationID := c.Get("X-Correlation-ID")
		if correlationID == "" {
			correlationID = uuid.New().String()
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
			var userIDPtr *string
			if uID, ok := c.Locals("user_id").(string); ok && uID != "" {
				userIDPtr = &uID
			}
			var rolePtr *string
			if r, ok := c.Locals("role").(string); ok && r != "" {
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
				Resource:      c.Path(),
				IPAddress:     c.IP(),
				CorrelationID: correlationID,
				Details: map[string]interface{}{
					"status_code": statusCode,
					"method":      method,
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
