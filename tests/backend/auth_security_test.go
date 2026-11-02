package backend_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	httpadapter "saludconecta-backend/adapters/http"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/config"
	"saludconecta-backend/pkg/crypto"
)

const jwtTestSecret = "secreto-de-prueba-con-mas-de-treinta-y-dos-caracteres"

type authEnv struct {
	ctx   context.Context
	users ports.UserRepository
	auth  ports.AuthService
	app   *fiber.App
}

func newAuthEnv(t *testing.T) *authEnv {
	t.Helper()
	store := memory.NewDataStore()
	users := memory.NewUserMemoryRepo(store)
	auditRepo := memory.NewAuditMemoryRepo(store)
	patients := memory.NewPatientMemoryRepo(store)
	auth := services.NewAuthService(users, jwtTestSecret, time.Hour)

	app := fiber.New()
	httpadapter.SetupRoutes(app, httpadapter.RouterConfig{
		AuthHandler:    handlers.NewAuthHandler(auth),
		AdminHandler:   handlers.NewAdminHandler(services.NewAdminService(users, auditRepo)),
		PatientHandler: handlers.NewPatientHandler(services.NewPatientService(patients)),
		Sessions:       auth,
		JWTSecret:      jwtTestSecret,
	})
	return &authEnv{ctx: context.Background(), users: users, auth: auth, app: app}
}

func (e *authEnv) addUser(t *testing.T, id string, roleID int, email, password string, active bool) {
	t.Helper()
	hash, err := crypto.HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	user := &domain.User{
		ID: id, RoleID: roleID, RoleName: domain.RoleNameByID(roleID), FullName: id, Email: email,
		PasswordHash: hash, ProfessionalCard: "RM-1", IsActive: active,
	}
	if err := e.users.Create(e.ctx, user); err != nil {
		t.Fatal(err)
	}
}

func (e *authEnv) call(t *testing.T, method, path, token string, body interface{}) (int, map[string]interface{}) {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		reader = bytes.NewReader(raw)
	} else {
		reader = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := e.app.Test(req, 30000)
	if err != nil {
		t.Fatalf("solicitud fallida: %v", err)
	}
	var payload map[string]interface{}
	_ = json.NewDecoder(res.Body).Decode(&payload)
	return res.StatusCode, payload
}

// totpNow calcula el codigo vigente para un secreto, igual que una app autenticadora.
func totpNow(t *testing.T, secret string) string {
	t.Helper()
	code, err := crypto.GenerateTOTP(secret, time.Now())
	if err != nil {
		t.Fatalf("no se pudo calcular el TOTP: %v", err)
	}
	return code
}

// Desactivar una cuenta invalida de inmediato los tokens ya emitidos.
func TestDeactivatedUserLosesAccessImmediately(t *testing.T) {
	env := newAuthEnv(t)
	env.addUser(t, "adm", 1, "adm@example.com", "ClaveAdmin2026*", true)
	env.addUser(t, "med", 2, "med@example.com", "ClaveMedico2026*", true)

	medToken, _, err := env.auth.Login(env.ctx, "med@example.com", "ClaveMedico2026*", "")
	if err != nil {
		t.Fatal(err)
	}
	admToken, _, _ := env.auth.Login(env.ctx, "adm@example.com", "ClaveAdmin2026*", "")

	if status, _ := env.call(t, http.MethodGet, "/api/v1/auth/me", medToken, nil); status != http.StatusOK {
		t.Fatalf("la sesion activa debia ser valida, status=%d", status)
	}

	if status, _ := env.call(t, http.MethodPatch, "/api/v1/admin/users/med/status", admToken, map[string]bool{"is_active": false}); status != http.StatusOK {
		t.Fatalf("la suspension debia aplicarse, status=%d", status)
	}

	if status, _ := env.call(t, http.MethodGet, "/api/v1/auth/me", medToken, nil); status != http.StatusUnauthorized {
		t.Fatalf("el token de una cuenta suspendida debe dejar de funcionar, status=%d", status)
	}
}

// El rol efectivo es el almacenado, no el que declare el token.
func TestRoleComesFromStoreNotToken(t *testing.T) {
	env := newAuthEnv(t)
	env.addUser(t, "med", 2, "med@example.com", "ClaveMedico2026*", true)

	forged, _ := crypto.GenerateJWT("med", "ADMIN", "med@example.com", jwtTestSecret, time.Hour)
	if status, _ := env.call(t, http.MethodGet, "/api/v1/admin/users", forged, nil); status != http.StatusForbidden {
		t.Fatalf("un token con rol ADMIN falso no debe abrir el panel, status=%d", status)
	}
}

// Reemplazar o retirar un segundo factor activo exige el TOTP vigente.
func TestMFASetupRequiresCurrentCode(t *testing.T) {
	env := newAuthEnv(t)
	env.addUser(t, "med", 2, "med@example.com", "ClaveMedico2026*", true)
	token, _, _ := env.auth.Login(env.ctx, "med@example.com", "ClaveMedico2026*", "")

	status, payload := env.call(t, http.MethodPost, "/api/v1/auth/mfa/setup", token, nil)
	if status != http.StatusOK {
		t.Fatalf("la primera configuracion no exige codigo, status=%d", status)
	}
	secret, _ := payload["secret"].(string)
	if uri, _ := payload["otpauth_uri"].(string); !strings.HasPrefix(uri, "otpauth://totp/") {
		t.Fatalf("falta la URI otpauth: %v", payload)
	}
	if status, _ := env.call(t, http.MethodPost, "/api/v1/auth/mfa/enable", token, map[string]string{"code": totpNow(t, secret)}); status != http.StatusOK {
		t.Fatalf("la activacion con el codigo vigente debia funcionar, status=%d", status)
	}

	// Con el factor activo, un token robado no puede reemplazarlo ni desactivarlo
	if status, _ := env.call(t, http.MethodPost, "/api/v1/auth/mfa/setup", token, nil); status != http.StatusBadRequest {
		t.Fatalf("sin codigo vigente debe rechazarse, status=%d", status)
	}
	if status, _ := env.call(t, http.MethodPost, "/api/v1/auth/mfa/setup", token, map[string]string{"current_code": "000000"}); status != http.StatusUnauthorized {
		t.Fatalf("con codigo incorrecto debe rechazarse, status=%d", status)
	}
	user, _ := env.users.GetByID(env.ctx, "med")
	if !user.MFAEnabled || *user.MFASecret != secret {
		t.Fatal("el segundo factor no debio alterarse con intentos invalidos")
	}
	if status, _ := env.call(t, http.MethodPost, "/api/v1/auth/mfa/setup", token, map[string]string{"current_code": totpNow(t, secret)}); status != http.StatusOK {
		t.Fatalf("con el codigo vigente el reemplazo debia permitirse, status=%d", status)
	}
}

// Tras repetidos fallos la cuenta se bloquea, incluso con la contrasena correcta.
func TestLoginBruteForceLockout(t *testing.T) {
	env := newAuthEnv(t)
	env.addUser(t, "med", 2, "med@example.com", "ClaveMedico2026*", true)

	for i := 0; i < 5; i++ {
		_, _, err := env.auth.Login(env.ctx, "med@example.com", "incorrecta", "")
		if !errors.Is(err, domain.ErrInvalidCredentials) {
			t.Fatalf("intento %d: %v", i, err)
		}
	}
	if _, _, err := env.auth.Login(env.ctx, "med@example.com", "ClaveMedico2026*", ""); !errors.Is(err, domain.ErrTooManyAttempts) {
		t.Fatalf("la cuenta debia estar bloqueada: %v", err)
	}

	status, _ := env.call(t, http.MethodPost, "/api/v1/auth/login", "", map[string]string{"email": "med@example.com", "password": "ClaveMedico2026*"})
	if status != http.StatusTooManyRequests {
		t.Fatalf("el endpoint debe responder 429, status=%d", status)
	}
}

// Los intentos de TOTP incorrectos en login tambien cuentan para el bloqueo.
func TestTOTPBruteForceLockout(t *testing.T) {
	env := newAuthEnv(t)
	env.addUser(t, "med", 2, "med@example.com", "ClaveMedico2026*", true)
	token, _, _ := env.auth.Login(env.ctx, "med@example.com", "ClaveMedico2026*", "")
	secret, _ := env.auth.SetupMFA(env.ctx, "med", "")
	if err := env.auth.EnableMFA(env.ctx, "med", totpNow(t, secret)); err != nil {
		t.Fatal(err)
	}
	_ = token

	for i := 0; i < 5; i++ {
		_, _, err := env.auth.Login(env.ctx, "med@example.com", "ClaveMedico2026*", "000000")
		if !errors.Is(err, domain.ErrMFAValidationFailed) {
			t.Fatalf("intento %d: %v", i, err)
		}
	}
	if _, _, err := env.auth.Login(env.ctx, "med@example.com", "ClaveMedico2026*", totpNow(t, secret)); !errors.Is(err, domain.ErrTooManyAttempts) {
		t.Fatalf("el bloqueo debe cubrir tambien el codigo valido: %v", err)
	}
}

// Sin credenciales definidas por el operador no se crea ninguna cuenta; con ellas, un unico administrador.
func TestBootstrapAdminNeverUsesDefaults(t *testing.T) {
	ctx := context.Background()
	users := memory.NewUserMemoryRepo(memory.NewDataStore())

	if created, err := services.BootstrapAdmin(ctx, users, "", ""); created || !errors.Is(err, services.ErrBootstrapCredentialsMissing) {
		t.Fatalf("sin variables no debe crearse cuenta: created=%v err=%v", created, err)
	}
	if count, _ := users.CountAdmins(ctx); count != 0 {
		t.Fatal("no debe existir ningun administrador sin credenciales explicitas")
	}
	if _, err := services.BootstrapAdmin(ctx, users, "admin@ips.test", "corta"); !errors.Is(err, services.ErrBootstrapPasswordWeak) {
		t.Fatalf("la contrasena corta debe rechazarse: %v", err)
	}
	if created, err := services.BootstrapAdmin(ctx, users, "admin@ips.test", "UnaClaveLargaYPrivada1*"); !created || err != nil {
		t.Fatalf("created=%v err=%v", created, err)
	}
	if created, _ := services.BootstrapAdmin(ctx, users, "otro@ips.test", "UnaClaveLargaYPrivada1*"); created {
		t.Fatal("no debe crearse un segundo administrador")
	}
}

func TestMemoryStoreHasNoPublishedAccounts(t *testing.T) {
	users, _ := memory.NewUserMemoryRepo(memory.NewDataStore()).List(context.Background(), nil, nil)
	if len(users) != 0 {
		t.Fatalf("el almacen no debe sembrar cuentas con credenciales conocidas, hay %d", len(users))
	}
}

func TestJWTSecretValidation(t *testing.T) {
	env := func(values map[string]string) func(string) string {
		return func(key string) string { return values[key] }
	}
	cases := map[string]string{
		"vacio":                  "",
		"corto":                  "abc123",
		"publicado en el codigo": "super-secret-key-saludconecta-ips-v24-2026",
		"publicado en compose":   "clave_secreta_jwt_saludconecta_ips_v24_iso25010_2026",
	}
	for name, secret := range cases {
		if _, err := config.LoadFrom(env(map[string]string{"JWT_SECRET": secret})); err == nil {
			t.Errorf("%s: el secreto debia rechazarse", name)
		}
	}
	cfg, err := config.LoadFrom(env(map[string]string{"JWT_SECRET": jwtTestSecret}))
	if err != nil || cfg.JWTSecret != jwtTestSecret {
		t.Fatalf("un secreto robusto debia aceptarse: %v", err)
	}
}

// Detras del proxy el limite de tasa se aplica por cliente real, no por la IP del proxy.
func TestRateLimitUsesRealClientIPBehindProxy(t *testing.T) {
	server := httpadapter.NewServer(httpadapter.ServerConfig{
		RateLimitMax:   1,
		RateLimitTime:  time.Minute,
		JWTSecret:      jwtTestSecret,
		TrustedProxies: []string{"0.0.0.0/0"},
		RouterConfig:   httpadapter.RouterConfig{AuthHandler: handlers.NewAuthHandler(nil), JWTSecret: jwtTestSecret},
	})

	hit := func(clientIP string) int {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		req.Header.Set("X-Real-IP", clientIP)
		res, err := server.App().Test(req)
		if err != nil {
			t.Fatal(err)
		}
		return res.StatusCode
	}

	if hit("203.0.113.10") != http.StatusOK {
		t.Fatal("la primera solicitud debia pasar")
	}
	if hit("203.0.113.10") != http.StatusTooManyRequests {
		t.Fatal("la segunda del mismo cliente debia limitarse")
	}
	if hit("203.0.113.99") != http.StatusOK {
		t.Fatal("otro cliente no debe compartir el limite con el primero")
	}
}
