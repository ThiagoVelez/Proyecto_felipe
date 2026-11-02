package middlewares

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimitMiddleware configura la limitacion de tasa de solicitudes por direccion IP para mitigar DDoS y fuerza bruta.
// La IP es la del cliente real: el servidor resuelve las cabeceras del proxy inverso confiable (ver ServerConfig).
func RateLimitMiddleware(maxRequests int, window time.Duration) fiber.Handler {
	if maxRequests <= 0 {
		maxRequests = 120
	}
	if window <= 0 {
		window = 1 * time.Minute
	}

	return newIPLimiter(maxRequests, window)
}

// AuthRateLimitMiddleware aplica un limite estricto por IP a las rutas que verifican credenciales o codigos TOTP.
// Complementa el bloqueo por cuenta del servicio de autenticacion.
func AuthRateLimitMiddleware(maxRequests int, window time.Duration) fiber.Handler {
	if maxRequests <= 0 {
		maxRequests = 10
	}
	if window <= 0 {
		window = 1 * time.Minute
	}

	return newIPLimiter(maxRequests, window)
}

func newIPLimiter(maxRequests int, window time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        maxRequests,
		Expiration: window,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":          "Limite de solicitudes excedido; intente nuevamente mas tarde",
				"correlation_id": c.Locals("correlation_id"),
			})
		},
	})
}
