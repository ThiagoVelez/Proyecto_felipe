package handlers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

// TIHandler expone el panel del Encargado de TI: monitoreo del sistema y gestion de administradores.
type TIHandler struct {
	tiService ports.TIService
}

func NewTIHandler(tiService ports.TIService) *TIHandler {
	return &TIHandler{tiService: tiService}
}

// Overview retorna el tablero de monitoreo: servidor, cuentas por rol, administradores por sede y actividad reciente.
func (h *TIHandler) Overview(c *fiber.Ctx) error {
	overview, err := h.tiService.Overview(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible consultar el estado del sistema"})
	}
	return c.JSON(overview)
}

// ListUsers retorna todas las cuentas del sistema (solo lectura).
func (h *TIHandler) ListUsers(c *fiber.Ctx) error {
	users, err := h.tiService.ListUsers(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error consultando el listado de usuarios"})
	}
	if users == nil {
		users = []*domain.User{}
	}
	return c.JSON(fiber.Map{"users": users, "count": len(users)})
}

// SetAdminStatus activa o suspende una cuenta de administrador de sede.
func (h *TIHandler) SetAdminStatus(c *fiber.Ctx) error {
	userID := c.Params("id")
	var req UpdateUserStatusRequest
	if err := c.BodyParser(&req); err != nil || userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud invalida"})
	}
	if err := h.tiService.SetAdminStatus(c.Context(), userID, req.IsActive); err != nil {
		switch {
		case errors.Is(err, domain.ErrUserNotFound):
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Usuario no encontrado"})
		case errors.Is(err, domain.ErrNotAdminAccount):
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solo se pueden gestionar cuentas de administrador desde este panel"})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error actualizando estado del administrador"})
		}
	}
	action := "suspendido"
	if req.IsActive {
		action = "habilitado"
	}
	return c.JSON(fiber.Map{"message": "Administrador " + action + " exitosamente", "user_id": userID, "is_active": req.IsActive})
}

// GetAuditLogs retorna la bitacora de auditoria forense.
func (h *TIHandler) GetAuditLogs(c *fiber.Ctx) error {
	limit := 100
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 {
		limit = l
	}
	logs, err := h.tiService.GetAuditLogs(c.Context(), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error consultando bitacora forense"})
	}
	if logs == nil {
		logs = []*domain.AuditLog{}
	}
	return c.JSON(fiber.Map{"audit_logs": logs, "count": len(logs)})
}
