package handlers

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/crypto"
)

type AuthHandler struct {
	authService ports.AuthService
}

func NewAuthHandler(authService ports.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	TOTPCode string `json:"totp_code"`
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cuerpo de solicitud invalido",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El correo institucional y la contrasena son requeridos",
		})
	}

	c.Locals("audit_action", string(domain.ActionLogin))

	pair, user, err := h.authService.LoginWithTokens(c.Context(), req.Email, req.Password, req.TOTPCode)
	if err != nil {
		if errors.Is(err, domain.ErrTooManyAttempts) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Demasiados intentos fallidos; la cuenta queda bloqueada temporalmente. Intente nuevamente en unos minutos.",
			})
		}
		if errors.Is(err, domain.ErrInvalidCredentials) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Credenciales invalidas",
			})
		}
		if errors.Is(err, domain.ErrUserInactive) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Cuenta inactiva o pendiente de validacion ReTHUS por parte del Administrador",
			})
		}
		if errors.Is(err, domain.ErrMFARequired) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":        "MFA requerido",
				"mfa_required": true,
			})
		}
		if errors.Is(err, domain.ErrMFAValidationFailed) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Codigo de segundo factor (TOTP) invalido o expirado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error interno procesando autenticacion",
		})
	}

	// La bitacora atribuye el inicio de sesion exitoso al usuario autenticado
	c.Locals("user_id", user.ID)
	c.Locals("role", user.RoleName)

	return c.JSON(fiber.Map{
		"token":         pair.AccessToken,
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
		"token_type":    pair.TokenType,
		"expires_in":    pair.ExpiresIn,
		"user":          userView(user),
	})
}


// RefreshTokenRequest estructura el cuerpo para la renovacion del token de acceso.
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// RefreshToken renueva el Access Token y entrega un nuevo Refresh Token rotado.
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var req RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.RefreshToken) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El token de renovacion (refresh_token) es obligatorio",
		})
	}

	pair, user, err := h.authService.RefreshToken(c.Context(), strings.TrimSpace(req.RefreshToken))
	if err != nil {
		if errors.Is(err, domain.ErrSessionCompromised) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Posible compromiso de sesion por reutilizacion de token. Todas las sesiones activas han sido revocadas. Inicie sesion nuevamente.",
				"code":  "SESSION_COMPROMISED",
			})
		}
		if errors.Is(err, domain.ErrUserInactive) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Cuenta inactiva o deshabilitada por administracion",
				"code":  "ACCOUNT_DISABLED",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Token de renovacion invalido o expirado",
			"code":  "TOKEN_EXPIRED",
		})
	}

	return c.JSON(fiber.Map{
		"token":         pair.AccessToken,
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
		"token_type":    pair.TokenType,
		"expires_in":    pair.ExpiresIn,
		"user":          userView(user),
	})
}

// Logout invalida el refresh token del usuario de manera explicita.
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var req RefreshTokenRequest
	_ = c.BodyParser(&req)
	if token := strings.TrimSpace(req.RefreshToken); token != "" {
		_ = h.authService.RevokeToken(c.Context(), token)
	}
	return c.JSON(fiber.Map{
		"message": "Sesion cerrada exitosamente",
	})
}
// userView arma la representacion publica de la cuenta autenticada.
func userView(user *domain.User) fiber.Map {
	return fiber.Map{
		"id":                user.ID,
		"full_name":         user.FullName,
		"document_type":     user.DocumentType,
		"document_number":   user.DocumentNumber,
		"email":             user.Email,
		"phone":             user.Phone,
		"role":              user.RoleName,
		"role_id":           user.RoleID,
		"professional_card": user.ProfessionalCard,
		"specialty":         user.Specialty,
		"branch":            user.Branch,
		"is_active":         user.IsActive,
		"mfa_enabled":       user.MFAEnabled,
	}
}

// Me retorna el estado vigente de la cuenta del token (sirve para revalidar la sesion al recargar).
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado"})
	}

	user, err := h.authService.ValidateSession(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "La sesion ya no es valida"})
	}
	return c.JSON(fiber.Map{"user": userView(user)})
}

type RegisterRequest struct {
	RoleID           int    `json:"role_id"`
	FullName         string `json:"full_name"`
	DocumentType     string `json:"document_type"`
	DocumentNumber   string `json:"document_number"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	Phone            string `json:"phone"`
	ProfessionalCard string `json:"professional_card"`
	Specialty        string `json:"specialty"`
	Branch           string `json:"branch"`
}

// RegisterStaff gestiona el registro de personal asistencial por un administrador con validacion ReTHUS y estado inactivo
func (h *AuthHandler) RegisterStaff(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cuerpo de solicitud invalido",
		})
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" || req.RoleID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Los campos role_id, full_name, email y password son obligatorios",
		})
	}

	if (req.RoleID == 2 || req.RoleID == 3 || req.RoleID == 6) && req.ProfessionalCard == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "La tarjeta profesional / registro ReTHUS es obligatorio para médicos y enfermeros",
		})
	}

	if domain.RoleNameByID(req.RoleID) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "role_id no pertenece al catalogo de roles",
		})
	}

	if req.DocumentType == "" {
		req.DocumentType = "CC"
	}

	user := &domain.User{
		ID:               uuid.New().String(),
		RoleID:           req.RoleID,
		RoleName:         domain.RoleNameByID(req.RoleID),
		FullName:         req.FullName,
		DocumentType:     req.DocumentType,
		DocumentNumber:   req.DocumentNumber,
		Email:            req.Email,
		Phone:            req.Phone,
		ProfessionalCard: req.ProfessionalCard,
		Specialty:        req.Specialty,
		Branch:           req.Branch,
		IsActive:         false,
	}

	if err := h.authService.RegisterStaff(c.Context(), user, req.Password); err != nil {
		if errors.Is(err, domain.ErrEmailAlreadyRegistered) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if errors.Is(err, domain.ErrMissingProfessionalCard) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error interno procesando registro asistencial",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":   "Registro de personal asistencial exitoso. La cuenta ha sido creada en estado PENDIENTE DE APROBACIÓN y será habilitada tras la verificación ReTHUS por un Administrador.",
		"user_id":   user.ID,
		"is_active": false,
	})
}

// RegisterAdminRequest reune los datos requeridos para registrar un Administrador de Centro de Salud
type RegisterAdminRequest struct {
	FullName         string `json:"full_name"`
	DocumentType     string `json:"document_type"`
	DocumentNumber   string `json:"document_number"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	Phone            string `json:"phone"`
	Branch           string `json:"branch"`
	ProfessionalCard string `json:"professional_card"`
}

// RegisterAdmin permite a cualquier centro de salud registrar su propio Administrador (role_id = 1)
func (h *AuthHandler) RegisterAdmin(c *fiber.Ctx) error {
	var req RegisterAdminRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cuerpo de solicitud invalido",
		})
	}

	fullName := strings.TrimSpace(req.FullName)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := req.Password

	if fullName == "" || email == "" || password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Los campos full_name, email y password son obligatorios",
		})
	}

	if len(password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "La contraseña debe tener al menos 8 caracteres",
		})
	}

	docType := req.DocumentType
	if docType == "" {
		docType = "CC"
	}

	branch := strings.TrimSpace(req.Branch)
	if branch == "" {
		branch = "Sede Cartago - Hospital Central"
	}

	card := strings.TrimSpace(req.ProfessionalCard)
	if card == "" {
		card = "TI-ADMIN-" + uuid.New().String()[:8]
	}

	user := &domain.User{
		ID:               uuid.New().String(),
		RoleID:           1,
		RoleName:         "ADMIN",
		FullName:         fullName,
		DocumentType:     docType,
		DocumentNumber:   strings.TrimSpace(req.DocumentNumber),
		Email:            email,
		Phone:            strings.TrimSpace(req.Phone),
		ProfessionalCard: card,
		Specialty:        "Seguridad y Gobernanza Hospitalaria",
		Branch:           branch,
		IsActive:         true,
		MFAEnabled:       true,
	}

	if err := h.authService.RegisterAdmin(c.Context(), user, password); err != nil {
		if errors.Is(err, domain.ErrEmailAlreadyRegistered) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "El correo institucional ya se encuentra registrado",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No fue posible registrar al administrador institucional",
		})
	}

	secret := ""
	if user.MFASecret != nil {
		secret = *user.MFASecret
	}
	otpauthURI := crypto.BuildOTPAuthURI(secret, user.Email, "SaludConecta IPS")

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":     "Administrador del centro de salud registrado exitosamente.",
		"user":        userView(user),
		"mfa_secret":  secret,
		"otpauth_uri": otpauthURI,
	})
}

// GetMFASeed retorna el secreto TOTP único y la URI otpauth para el correo consultado en el login
func (h *AuthHandler) GetMFASeed(c *fiber.Ctx) error {
	email := c.Query("email")
	secret, uri, err := h.authService.GetMFASeed(c.Context(), email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No fue posible generar la semilla TOTP",
		})
	}
	return c.JSON(fiber.Map{
		"email":       email,
		"secret":      secret,
		"otpauth_uri": uri,
	})
}

func (h *AuthHandler) SetupMFA(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado"})
	}

	var req SetupMFARequest
	// El cuerpo es opcional: solo se necesita cuando la cuenta ya tiene un segundo factor activo
	_ = c.BodyParser(&req)

	secret, err := h.authService.SetupMFA(c.Context(), userID, req.CurrentCode)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrTooManyAttempts):
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Demasiados intentos fallidos; intente nuevamente en unos minutos"})
		case errors.Is(err, domain.ErrCurrentCodeRequired):
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		case errors.Is(err, domain.ErrMFAValidationFailed):
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Codigo TOTP vigente incorrecto"})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Error al inicializar configuracion MFA",
			})
		}
	}

	email, _ := c.Locals("email").(string)
	return c.JSON(fiber.Map{
		"secret":      secret,
		"otpauth_uri": crypto.BuildOTPAuthURI(secret, email, "SaludConecta IPS"),
	})
}

type SetupMFARequest struct {
	CurrentCode string `json:"current_code"`
}

type EnableMFARequest struct {
	Code string `json:"code"`
}

func (h *AuthHandler) EnableMFA(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado"})
	}

	var req EnableMFARequest
	if err := c.BodyParser(&req); err != nil || req.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Codigo de confirmacion requerido",
		})
	}

	if err := h.authService.EnableMFA(c.Context(), userID, req.Code); err != nil {
		if errors.Is(err, domain.ErrTooManyAttempts) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Demasiados intentos fallidos; intente nuevamente en unos minutos"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Codigo TOTP incorrecto",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Autenticacion de doble factor habilitada correctamente",
	})
}
