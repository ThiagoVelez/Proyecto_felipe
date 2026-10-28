package middlewares

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimitMiddleware configura la limitacion de tasa de solicitudes por direccion IP para mitigar DDoS y fuerza bruta.
func RateLimitMiddleware(maxRequests int, window time.Duration) fiber.Handler {
	if maxRequests <= 0 {
		maxRequests = 120
	}
	if window <= 0 {
		window = 1 * time.Minute
	}

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

