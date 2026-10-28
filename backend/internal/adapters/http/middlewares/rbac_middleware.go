package middlewares

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// RequireRoles restringe el acceso a los roles autorizados definidos en los parametros.
func RequireRoles(allowedRoles ...string) fiber.Handler {
	allowedMap := make(map[string]bool)
	for _, role := range allowedRoles {
		allowedMap[strings.ToUpper(strings.TrimSpace(role))] = true
	}

	return func(c *fiber.Ctx) error {
		roleVal := c.Locals("role")
		if roleVal == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":          "Perfil de usuario no identificado para verificacion de permisos",
				"correlation_id": c.Locals("correlation_id"),
			})
		}

		userRole, ok := roleVal.(string)
		if !ok || !allowedMap[strings.ToUpper(strings.TrimSpace(userRole))] {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":          "Acceso denegado: su rol asistencial no tiene autorizacion para esta operacion",
				"correlation_id": c.Locals("correlation_id"),
			})
		}

		return c.Next()
	}
}

