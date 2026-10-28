package handlers

import (
	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

type SyncHandler struct {
	syncService ports.SyncService
}

func NewSyncHandler(syncService ports.SyncService) *SyncHandler {
	return &SyncHandler{syncService: syncService}
}

type SyncBatchRequest struct {
	BatchID string                  `json:"batch_id"`
	Records []domain.ClinicalRecord `json:"records"`
}

func (h *SyncHandler) ProcessBatch(c *fiber.Ctx) error {
	var req SyncBatchRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Estructura de lote de sincronizacion invalida",
		})
	}

	if len(req.Records) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El lote no contiene registros clinicos para sincronizar",
		})
	}

	syncedCount, err := h.syncService.ProcessOfflineBatch(c.Context(), req.BatchID, req.Records)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error durante el procesamiento del lote de sincronizacion",
		})
	}

	return c.JSON(fiber.Map{
		"message":      "Lote de sincronizacion procesado satisfactoriamente",
		"batch_id":     req.BatchID,
		"synced_count": syncedCount,
	})
}
