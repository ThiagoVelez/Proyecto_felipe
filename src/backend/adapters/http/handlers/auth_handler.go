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
				"error": "Cuenta inactiva o pendiente de aprobacion (el personal asistencial lo aprueba el Administrador de la sede; los administradores, el Encargado de TI)",
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
	// SetupCode es el codigo de instalacion (TI_SETUP_CODE) que exige el registro del Encargado de TI
	SetupCode string `json:"setup_code"`
}

// buildPrivilegedUser valida el formulario comun de registro (TI y administradores) y arma la cuenta.
// Retorna el usuario, la contrasena y un mensaje de error de validacion (vacio si es valido).
func buildPrivilegedUser(req RegisterAdminRequest, defaultCardPrefix, specialty string) (*domain.User, string, string) {
	fullName := strings.TrimSpace(req.FullName)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := req.Password

	if fullName == "" || email == "" || password == "" {
		return nil, "", "Los campos full_name, email y password son obligatorios"
	}
	if len(password) < 8 {
		return nil, "", "La contraseña debe tener al menos 8 caracteres"
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
		card = defaultCardPrefix + uuid.New().String()[:8]
	}

	return &domain.User{
		ID:               uuid.New().String(),
		FullName:         fullName,
		DocumentType:     docType,
		DocumentNumber:   strings.TrimSpace(req.DocumentNumber),
		Email:            email,
		Phone:            strings.TrimSpace(req.Phone),
		ProfessionalCard: card,
		Specialty:        specialty,
		Branch:           branch,
	}, password, ""
}

// privilegedCreated responde el alta de una cuenta con su semilla TOTP para vincular el autenticador.
func privilegedCreated(c *fiber.Ctx, user *domain.User, message string) error {
	secret := ""
	if user.MFASecret != nil {
		secret = *user.MFASecret
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":     message,
		"user":        userView(user),
		"mfa_secret":  secret,
		"otpauth_uri": crypto.BuildOTPAuthURI(secret, user.Email, "SaludConecta IPS"),
	})
}

// registrationError traduce los errores de registro a respuestas HTTP.
func registrationError(c *fiber.Ctx, err error, fallback string) error {
	switch {
	case errors.Is(err, domain.ErrEmailAlreadyRegistered):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "El correo institucional ya se encuentra registrado"})
	case errors.Is(err, domain.ErrTIAlreadyRegistered):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Ya existe un Encargado de TI registrado"})
	case errors.Is(err, domain.ErrBranchHasAdmin):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "La sede ya tiene un administrador. Solicite al Encargado de TI el registro de administradores adicionales"})
	case errors.Is(err, domain.ErrTISetupDisabled):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "El registro del Encargado de TI desde el inicio de sesión no está habilitado en este servidor. Solicite a quien instaló el sistema que configure el código de instalación"})
	case errors.Is(err, domain.ErrInvalidSetupCode):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "El código de instalación no es válido"})
	case errors.Is(err, domain.ErrUnknownBranch):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La sede indicada no pertenece al catálogo institucional"})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fallback})
	}
}

// RegisterAdmin permite al Encargado de TI registrar administradores adicionales (role_id = 1).
// La ruta exige sesion valida y rol TI; el primer administrador de cada sede se registra desde el login
// (RegisterBranchAdmin) o con BootstrapAdmin al arrancar.
func (h *AuthHandler) RegisterAdmin(c *fiber.Ctx) error {
	var req RegisterAdminRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo de solicitud invalido"})
	}
	user, password, msg := buildPrivilegedUser(req, "TI-ADMIN-", "Seguridad y Gobernanza Hospitalaria")
	if msg != "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": msg})
	}
	if err := h.authService.RegisterAdmin(c.Context(), user, password); err != nil {
		return registrationError(c, err, "No fue posible registrar al administrador institucional")
	}
	return privilegedCreated(c, user, "Administrador del centro de salud registrado exitosamente.")
}

// SetupStatus informa al login si puede ofrecer el registro del Encargado de TI y que sedes no tienen administrador.
func (h *AuthHandler) SetupStatus(c *fiber.Ctx) error {
	status, err := h.authService.SetupStatus(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible consultar el estado de configuracion"})
	}
	return c.JSON(status)
}

// RegisterTI registra al Encargado de TI desde el login. Solo funciona mientras no exista ninguno.
func (h *AuthHandler) RegisterTI(c *fiber.Ctx) error {
	var req RegisterAdminRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo de solicitud invalido"})
	}
	user, password, msg := buildPrivilegedUser(req, "TI-", "Tecnologías de la Información")
	if msg != "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": msg})
	}
	if err := h.authService.RegisterTI(c.Context(), user, password, req.SetupCode); err != nil {
		return registrationError(c, err, "No fue posible registrar al Encargado de TI")
	}
	return privilegedCreated(c, user, "Encargado de TI registrado exitosamente.")
}

// RegisterBranchAdmin registra desde el login una solicitud de administrador para una sede sin administrador
// aprobado. La cuenta queda pendiente hasta que el Encargado de TI la apruebe.
func (h *AuthHandler) RegisterBranchAdmin(c *fiber.Ctx) error {
	var req RegisterAdminRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo de solicitud invalido"})
	}
	if strings.TrimSpace(req.Branch) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Debe indicar la sede del administrador"})
	}
	user, password, msg := buildPrivilegedUser(req, "TI-ADMIN-", "Seguridad y Gobernanza Hospitalaria")
	if msg != "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": msg})
	}
	if err := h.authService.RegisterBranchAdmin(c.Context(), user, password); err != nil {
		return registrationError(c, err, "No fue posible registrar al administrador de la sede")
	}
	return privilegedCreated(c, user, "Solicitud registrada. La cuenta quedará habilitada cuando el Encargado de TI la apruebe.")
}

// GetMFASeed retorna el secreto TOTP único y la URI otpauth exigiendo autenticacion previa
func (h *AuthHandler) GetMFASeed(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Autenticacion requerida para consultar secretos MFA",
		})
	}
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
