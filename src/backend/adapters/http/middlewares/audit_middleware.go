package middlewares

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/logger"
)

// CorrelationIDMiddleware asegura que cada solicitud cuente con un identificador de correlacion unico.
// Exige que cualquier valor entrante sea un UUID valido; si no lo es, genera uno nuevo para evitar inyeccion en logs.
func CorrelationIDMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		correlationID := strings.TrimSpace(c.Get("X-Correlation-ID"))
		if parsed, err := uuid.Parse(correlationID); err == nil {
			correlationID = parsed.String()
		} else {
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
			"method":     c.Method(),
			"path":       c.Path(),
			"ip":         c.IP(),
			"status":     statusCode,
			"latency_ms": latency.Milliseconds(),
			"user_agent": c.Get("User-Agent"),
		})

		// Se registran las operaciones que mutan estado y las lecturas de datos clinicos o de pacientes (Ley 1581)
		method := c.Method()
		isMutation := method == fiber.MethodPost || method == fiber.MethodPut || method == fiber.MethodPatch || method == fiber.MethodDelete
		isSensitiveRead := method == fiber.MethodGet && isSensitivePath(c.Path()) && statusCode < fiber.StatusBadRequest
		if auditRepo != nil && (isMutation || isSensitiveRead) {
			var userIDPtr *string
			if uID, ok := c.Locals("user_id").(string); ok && uID != "" {
				userIDPtr = &uID
			}
			var rolePtr *string
			if r, ok := c.Locals("role").(string); ok && r != "" {
				rolePtr = &r
			}

			action := domain.ActionUpdate
			switch {
			case method == fiber.MethodGet:
				action = domain.ActionRead
			case method == fiber.MethodPost:
				action = domain.ActionCreate
			}
			if override, ok := c.Locals("audit_action").(string); ok && override != "" {
				action = domain.AuditAction(override)
			}

			auditEntry := &domain.AuditLog{
				UserID:        userIDPtr,
				Role:          rolePtr,
				Action:        action,
				Resource:      strings.Clone(c.Path()),
				IPAddress:     strings.Clone(c.IP()),
				CorrelationID: strings.Clone(correlationID),
				Details: map[string]interface{}{
					"status_code": statusCode,
					"method":      strings.Clone(method),
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

// isSensitivePath identifica los recursos cuya lectura debe quedar en la bitacora forense.
func isSensitivePath(path string) bool {
	return strings.Contains(path, "/clinical-records") ||
		strings.Contains(path, "/patients") ||
		strings.Contains(path, "/prescriptions")
}
