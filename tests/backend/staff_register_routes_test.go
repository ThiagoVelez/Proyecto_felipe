package backend_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	httpadapter "saludconecta-backend/adapters/http"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/crypto"
)

const staffPayload = `{"role_id":3,"full_name":"Enfermera Ruta","email":"ruta@example.com","password":"ClaveSegura2026*","professional_card":"ENF-1"}`

// TestStaffRegisterRequiresAdmin garantiza que crear cuentas no este disponible sin sesion ni para otros roles.
func TestStaffRegisterRequiresAdmin(t *testing.T) {
	const secret = "test-jwt-secret"
	ds := memory.NewDataStore()
	userRepo := memory.NewUserMemoryRepo(ds)
	auditRepo := memory.NewAuditMemoryRepo(ds)

	app := fiber.New()
	httpadapter.SetupRoutes(app, httpadapter.RouterConfig{
		AuthHandler:  handlers.NewAuthHandler(services.NewAuthService(userRepo, secret, time.Hour)),
		AdminHandler: handlers.NewAdminHandler(services.NewAdminService(userRepo, auditRepo)),
		JWTSecret:    secret,
	})

	tokenFor := func(role string) string {
		token, err := crypto.GenerateJWT("usr-prueba", role, "prueba@example.com", secret, time.Hour)
		if err != nil {
			t.Fatalf("No se pudo generar el token: %v", err)
		}
		return token
	}

	cases := []struct {
		name   string
		path   string
		token  string
		status int
	}{
		{"ruta publica retirada", "/api/v1/auth/register", "", http.StatusUnauthorized},
		{"ruta publica de personal retirada", "/api/v1/auth/register-staff", "", http.StatusUnauthorized},
		{"ruta retirada con sesion", "/api/v1/auth/register", tokenFor("ADMIN"), http.StatusNotFound},
		{"admin sin sesion", "/api/v1/admin/users", "", http.StatusUnauthorized},
		{"admin con rol medico", "/api/v1/admin/users", tokenFor("MEDICO"), http.StatusForbidden},
		{"admin con rol admin", "/api/v1/admin/users", tokenFor("ADMIN"), http.StatusCreated},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, tc.path, strings.NewReader(staffPayload))
			req.Header.Set("Content-Type", "application/json")
			if tc.token != "" {
				req.Header.Set("Authorization", "Bearer "+tc.token)
			}

			res, err := app.Test(req)
			if err != nil {
				t.Fatalf("Fallo ejecutando la solicitud: %v", err)
			}
			if res.StatusCode != tc.status {
				t.Fatalf("Se esperaba estado %d y se obtuvo %d", tc.status, res.StatusCode)
			}
		})
	}

	created, err := userRepo.GetByEmail(context.Background(), "ruta@example.com")
	if err != nil || created == nil {
		t.Fatalf("El registro del administrador no creo la cuenta: %v", err)
	}
	if created.IsActive {
		t.Fatal("La cuenta registrada debe quedar inactiva hasta la verificacion ReTHUS")
	}
}
