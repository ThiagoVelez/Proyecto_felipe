package handlers

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

// PharmacyHandler expone los endpoints HTTP para farmacia, inventario valorizado y dispensacion PDF417
type PharmacyHandler struct {
	svc ports.PharmacyService
}

// NewPharmacyHandler crea el controlador de farmacia
func NewPharmacyHandler(svc ports.PharmacyService) *PharmacyHandler {
	return &PharmacyHandler{svc: svc}
}

// GetInbox lista las recetas en el buzón con filtros por estado o búsqueda rápida
func (h *PharmacyHandler) GetInbox(c *fiber.Ctx) error {
	statusQuery := c.Query("status")
	queryTerm := c.Query("q")

	var statusFilter *domain.PrescriptionStatusV2
	if statusQuery != "" {
		st := domain.PrescriptionStatusV2(statusQuery)
		statusFilter = &st
	}

	inbox, err := h.svc.GetInbox(c.Context(), statusFilter, queryTerm)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(inbox)
}

// GetInventory entrega el listado completo de medicamentos diferenciados por concentracion
func (h *PharmacyHandler) GetInventory(c *fiber.Ctx) error {
	items, err := h.svc.GetInventory(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(items)
}

// AddInventoryItem registra un nuevo medicamento o variante por dosis
func (h *PharmacyHandler) AddInventoryItem(c *fiber.Ctx) error {
	var item domain.InventoryItem
	if err := c.BodyParser(&item); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cuerpo de ítem inválido"})
	}

	created, err := h.svc.AddInventoryItem(c.Context(), &item)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

type AdjustStockDTO struct {
	StockQuantity int    `json:"stock_quantity"`
	BatchNumber   string `json:"batch_number"`
}

// AdjustStock actualiza el stock físico de un ítem
func (h *PharmacyHandler) AdjustStock(c *fiber.Ctx) error {
	id := c.Params("id")
	var dto AdjustStockDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "datos de stock inválidos"})
	}

	if err := h.svc.AdjustStock(c.Context(), id, dto.StockQuantity, dto.BatchNumber); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Stock actualizado correctamente"})
}

// UpdateInventoryItem actualiza todos los parámetros de un medicamento en inventario
func (h *PharmacyHandler) UpdateInventoryItem(c *fiber.Ctx) error {
	id := c.Params("id")
	var item domain.InventoryItem
	if err := c.BodyParser(&item); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cuerpo de ítem inválido"})
	}
	item.ID = id
	updated, err := h.svc.UpdateInventoryItem(c.Context(), &item)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(updated)
}

// DeleteInventoryItem elimina un medicamento de inventario
func (h *PharmacyHandler) DeleteInventoryItem(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.DeleteInventoryItem(c.Context(), id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Medicamento eliminado de inventario exitosamente"})
}

// LookupPrescription busca una receta pendiente por código único o documento de cédula decodificado
func (h *PharmacyHandler) LookupPrescription(c *fiber.Ctx) error {
	term := c.Query("term")
	if term == "" {
		term = c.Query("document")
	}
	if term == "" {
		term = c.Query("code")
	}
	if term == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "se requiere parámetro de búsqueda (term, document o code)"})
	}

	presc, err := h.svc.GetPrescriptionByCodeOrDocument(c.Context(), term)
	if err != nil {
		if errors.Is(err, domain.ErrPrescriptionNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no se encontró ninguna receta pendiente para el criterio indicado"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(presc)
}

// Dispense procesa la entrega atómica tras la lectura del código de cédula PDF417
func (h *PharmacyHandler) Dispense(c *fiber.Ctx) error {
	dispenserID := c.Locals("user_id")
	var req domain.DispenseRequestDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cuerpo de dispensación inválido"})
	}

	if req.PrescriptionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "el identificador de la prescripción es obligatorio"})
	}
	if dispenserID != nil {
		req.DispensedByID = dispenserID.(string)
	}

	dispensed, err := h.svc.DispensePrescription(c.Context(), req)
	if err != nil {
		if errors.Is(err, domain.ErrAlreadyDispensed) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "La receta médica ya fue dispensada previamente (409 Conflict).",
			})
		}
		if errors.Is(err, domain.ErrDocumentMismatch) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
				"error": "El documento escaneado no coincide con el paciente titular de la receta.",
			})
		}
		if strings.Contains(err.Error(), "stock insuficiente") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, domain.ErrPrescriptionNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "prescripción no encontrada"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":      "Dispensación completada con éxito. Inventario descontado de forma atómica.",
		"prescription": dispensed,
	})
}

