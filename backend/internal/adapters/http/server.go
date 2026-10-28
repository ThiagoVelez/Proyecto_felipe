package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"saludconecta-backend/internal/adapters/http/middlewares"
	"saludconecta-backend/internal/core/ports"
	"saludconecta-backend/pkg/logger"
)

type ServerConfig struct {
	AllowedOrigins string
	RateLimitMax   int
	RateLimitTime  time.Duration
	JWTSecret      string
	RouterConfig   RouterConfig
	AuditRepo      ports.AuditRepository
	Logger         *logger.Logger
}

type Server struct {
	app *fiber.App
	cfg ServerConfig
}

// NewServer construye el servidor HTTP Fiber v2 bajo estandares de eficiencia y tolerancia a fallos.
func NewServer(cfg ServerConfig) *Server {
	app := fiber.New(fiber.Config{
		AppName:      "SaludConecta IPS v2.4",
		ServerHeader: "SaludConecta-API",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error":          err.Error(),
				"correlation_id": c.Locals("correlation_id"),
			})
		},
	})

	// 1. Manejo seguro de recuperacion ante panics no controlados
	app.Use(recover.New())

	// 2. Control de acceso cruzado CORS
	origins := cfg.AllowedOrigins
	if origins == "" {
		origins = "http://localhost:5173,http://localhost:3000"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Correlation-ID",
		AllowMethods:     "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
		AllowCredentials: true,
	}))

	// 3. Trazabilidad transversal mediante Correlation-ID
	app.Use(middlewares.CorrelationIDMiddleware())

	// 4. Auditoria forense estructurada
	if cfg.Logger != nil {
		app.Use(middlewares.AuditMiddleware(cfg.Logger, cfg.AuditRepo))
	}

	// 5. Mitigacion de ataques DoS y fuerza bruta
	app.Use(middlewares.RateLimitMiddleware(cfg.RateLimitMax, cfg.RateLimitTime))

	// 6. Registro de rutas de negocio
	SetupRoutes(app, cfg.RouterConfig)

	return &Server{
		app: app,
		cfg: cfg,
	}
}

// Listen inicia la escucha del servidor HTTP en la direccion y puerto especificados.
func (s *Server) Listen(address string) error {
	return s.app.Listen(address)
}

// Shutdown detiene de forma ordenada el servidor HTTP esperando conexiones activas.
func (s *Server) Shutdown() error {
	return s.app.Shutdown()
}
