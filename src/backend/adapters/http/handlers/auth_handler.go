package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
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

	token, user, err := h.authService.Login(c.Context(), req.Email, req.Password, req.TOTPCode)
	if err != nil {
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

	return c.JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
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
		},
	})
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

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Parametros de registro invalidos",
		})
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" || req.RoleID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Los campos role_id, full_name, email y password son obligatorios",
		})
	}

	if req.DocumentType == "" {
		req.DocumentType = "CC"
	}

	user := &domain.User{
		ID:               uuid.New().String(),
		RoleID:           req.RoleID,
		FullName:         req.FullName,
		DocumentType:     req.DocumentType,
		DocumentNumber:   req.DocumentNumber,
		Email:            req.Email,
		Phone:            req.Phone,
		ProfessionalCard: req.ProfessionalCard,
		Specialty:        req.Specialty,
		Branch:           req.Branch,
		IsActive:         true,
	}

	if err := h.authService.Register(c.Context(), user, req.Password); err != nil {
		if errors.Is(err, domain.ErrEmailAlreadyRegistered) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error interno registrando usuario",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Usuario registrado exitosamente",
		"user_id": user.ID,
	})
}

// RegisterStaff gestiona el registro publico de personal asistencial con validacion ReTHUS y estado inactivo
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

	if (req.RoleID == 2 || req.RoleID == 3) && req.ProfessionalCard == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "La tarjeta profesional / registro ReTHUS es obligatorio para médicos y enfermeros",
		})
	}

	if req.DocumentType == "" {
		req.DocumentType = "CC"
	}

	user := &domain.User{
		ID:               uuid.New().String(),
		RoleID:           req.RoleID,
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
			"error": "Error interno procesando autorregistro asistencial",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":   "Registro de personal asistencial exitoso. Su cuenta ha sido creada en estado PENDIENTE DE APROBACIÓN y será habilitada tras la verificación ReTHUS por un Administrador.",
		"user_id":   user.ID,
		"is_active": false,
	})
}

func (h *AuthHandler) SetupMFA(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado"})
	}

	secret, err := h.authService.SetupMFA(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al inicializar configuracion MFA",
		})
	}

	return c.JSON(fiber.Map{
		"secret": secret,
	})
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Codigo TOTP incorrecto",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Autenticacion de doble factor habilitada correctamente",
	})
}
