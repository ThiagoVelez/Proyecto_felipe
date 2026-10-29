package handlers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type AdminHandler struct {
	adminService ports.AdminService
}

func NewAdminHandler(adminService ports.AdminService) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
	}
}

// ListUsers lista el personal asistencial y administrativo registrado con filtros opcionales
func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	var roleIDPtr *int
	if roleStr := c.Query("role_id"); roleStr != "" {
		if r, err := strconv.Atoi(roleStr); err == nil {
			roleIDPtr = &r
		}
	}

	var isActivePtr *bool
	if activeStr := c.Query("is_active"); activeStr != "" {
		val := activeStr == "true" || activeStr == "1"
		isActivePtr = &val
	}

	users, err := h.adminService.ListUsers(c.Context(), roleIDPtr, isActivePtr)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error consultando el listado de usuarios",
		})
	}

	return c.JSON(fiber.Map{
		"users": users,
		"count": len(users),
	})
}

type UpdateUserStatusRequest struct {
	IsActive bool `json:"is_active"`
}

// UpdateUserStatus activa o suspende la cuenta de un usuario asistencial verificando ReTHUS
func (h *AdminHandler) UpdateUserStatus(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de usuario requerido",
		})
	}

	var req UpdateUserStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cuerpo de solicitud invalido",
		})
	}

	var err error
	if req.IsActive {
		err = h.adminService.ActivateUser(c.Context(), userID)
	} else {
		err = h.adminService.DeactivateUser(c.Context(), userID)
	}

	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Usuario no encontrado",
			})
		}
		if errors.Is(err, domain.ErrMissingProfessionalCard) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "No es posible habilitar al usuario: no cuenta con tarjeta profesional ReTHUS registrada",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error actualizando estado del usuario",
		})
	}

	actionStr := "suspendido"
	if req.IsActive {
		actionStr = "habilitado y verificado ante ReTHUS"
	}

	return c.JSON(fiber.Map{
		"message":   "Usuario " + actionStr + " exitosamente",
		"user_id":   userID,
		"is_active": req.IsActive,
	})
}

// GetAuditLogs retorna la bitacora de auditoria forense institucional
func (h *AdminHandler) GetAuditLogs(c *fiber.Ctx) error {
	limit := 100
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	logs, err := h.adminService.GetAuditLogs(c.Context(), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error consultando bitacora forense",
		})
	}

	return c.JSON(fiber.Map{
		"audit_logs": logs,
		"count":      len(logs),
	})
}
