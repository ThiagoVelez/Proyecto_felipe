package middlewares

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/pkg/crypto"
)

// AuthMiddleware valida la presencia y autenticidad del token JWT en la cabecera Authorization.
func AuthMiddleware(jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":          "Cabecera de autorizacion ausente",
				"correlation_id": c.Locals("correlation_id"),
			})
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":          "Formato de cabecera invalido; se requiere 'Bearer <token>'",
				"correlation_id": c.Locals("correlation_id"),
			})
		}

		claims, err := crypto.ValidateJWT(parts[1], jwtSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":          "Token de acceso invalido o expirado",
				"correlation_id": c.Locals("correlation_id"),
			})
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("role", claims.Role)
		c.Locals("email", claims.Email)

		return c.Next()
	}
}
