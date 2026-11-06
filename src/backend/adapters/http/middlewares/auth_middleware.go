package middlewares

import (
	"context"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/pkg/crypto"
)

// SessionValidator verifica contra el almacen de usuarios que la cuenta del token siga activa.
type SessionValidator interface {
	ValidateSession(ctx context.Context, userID string) (*domain.User, error)
}

// AuthMiddleware valida la autenticidad del token JWT y, en cada solicitud, que la cuenta siga activa:
// suspender a un usuario revoca su acceso de inmediato aunque el token no haya expirado.
// Sin validador de sesion el middleware rechaza todo (falla cerrado).
func AuthMiddleware(jwtSecret string, sessions SessionValidator) fiber.Handler {
	unauthorized := func(c *fiber.Ctx, message string) error {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":          message,
			"correlation_id": c.Locals("correlation_id"),
		})
	}

	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return unauthorized(c, "Cabecera de autorizacion ausente")
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return unauthorized(c, "Formato de cabecera invalido; se requiere 'Bearer <token>'")
		}

		claims, err := crypto.ValidateAccessToken(parts[1], jwtSecret)
		if err != nil {
			return unauthorized(c, "Token de acceso invalido o expirado")
		}

		if sessions == nil {
			return unauthorized(c, "No fue posible validar la sesion")
		}

		user, err := sessions.ValidateSession(c.Context(), claims.UserID)
		if err != nil {
			if errors.Is(err, domain.ErrUserInactive) || errors.Is(err, domain.ErrUserNotFound) {
				return unauthorized(c, "La cuenta se encuentra desactivada o ya no existe; inicie sesion nuevamente")
			}
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error":          "No fue posible validar la sesion en este momento",
				"correlation_id": c.Locals("correlation_id"),
			})
		}

		role := user.RoleName
		if role == "" {
			role = domain.RoleNameByID(user.RoleID)
		}

		c.Locals("user_id", user.ID)
		c.Locals("role", role)
		c.Locals("email", user.Email)
		c.Locals("user", user)

		return c.Next()
	}
}
