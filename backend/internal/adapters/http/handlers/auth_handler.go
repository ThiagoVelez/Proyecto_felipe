package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

type AuthHandler struct {
	authService ports.AuthService
}

func NewAuthHandler(authService ports.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
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

	token, user, err := h.authService.Login(c.Context(), req.Email, req.Password, req.TOTPCode)
	if err != nil {
		if errors.Is(err, domain.ErrMFARequired) {
			return c.Status(fiber.StatusPreconditionRequired).JSON(fiber.Map{
				"error":        err.Error(),
				"mfa_required": true,
			})
		}
		if errors.Is(err, domain.ErrInvalidCredentials) || errors.Is(err, domain.ErrMFAValidationFailed) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if errors.Is(err, domain.ErrUserInactive) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
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
			"email":             user.Email,
			"role":              user.RoleName,
			"professional_card": user.ProfessionalCard,
			"mfa_enabled":       user.MFAEnabled,
		},
	})
}

type RegisterRequest struct {
	RoleID           int     `json:"role_id"`
	FullName         string  `json:"full_name"`
	Email            string  `json:"email"`
	Password         string  `json:"password"`
	ProfessionalCard *string `json:"professional_card"`
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

	user := &domain.User{
		ID:               uuid.New().String(),
		RoleID:           req.RoleID,
		FullName:         req.FullName,
		Email:            req.Email,
		ProfessionalCard: req.ProfessionalCard,
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
		"mfa_secret": secret,
		"message":    "Ingrese el codigo generado por su aplicacion TOTP para activar la proteccion",
	})
}

type EnableMFARequest struct {
	TOTPCode string `json:"totp_code"`
}

func (h *AuthHandler) EnableMFA(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado"})
	}

	var req EnableMFARequest
	if err := c.BodyParser(&req); err != nil || req.TOTPCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El codigo totp_code es requerido",
		})
	}

	if err := h.authService.EnableMFA(c.Context(), userID, req.TOTPCode); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Codigo TOTP incorrecto o no coincide con el secreto",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Autenticacion de dos factores habilitada con exito",
	})
}
