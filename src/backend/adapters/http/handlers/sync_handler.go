package handlers

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type SyncHandler struct {
	syncService ports.SyncService
}

func NewSyncHandler(syncService ports.SyncService) *SyncHandler {
	return &SyncHandler{syncService: syncService}
}

// SyncRecordDTO es el folio capturado en campo. No incluye autor ni hashes: los define el servidor.
type SyncRecordDTO struct {
	ID                   string     `json:"id"`
	PatientID            string     `json:"patient_id"`
	TriageID             *string    `json:"triage_id"`
	Anamnesis            string     `json:"anamnesis"`
	PhysicalExam         string     `json:"physical_exam"`
	CIE11Code            string     `json:"cie11_code"`
	DiagnosisDescription string     `json:"diagnosis_description"`
	TreatmentPlan        string     `json:"treatment_plan"`
	IsClosed             bool       `json:"is_closed"`
	SignatureToken       *string    `json:"signature_token"`
	ClosedAt             *time.Time `json:"closed_at"`
	CreatedAt            time.Time  `json:"created_at"`
}

type SyncBatchRequest struct {
	BatchID string          `json:"batch_id"`
	Records []SyncRecordDTO `json:"records"`
}

func (h *SyncHandler) ProcessBatch(c *fiber.Ctx) error {
	doctorID, ok := c.Locals("user_id").(string)
	if !ok || doctorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Medico no identificado"})
	}

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

	records := make([]domain.ClinicalRecord, len(req.Records))
	for i, dto := range req.Records {
		records[i] = domain.ClinicalRecord{
			ID:                   dto.ID,
			PatientID:            dto.PatientID,
			TriageID:             dto.TriageID,
			Anamnesis:            dto.Anamnesis,
			PhysicalExam:         dto.PhysicalExam,
			CIE11Code:            dto.CIE11Code,
			DiagnosisDescription: dto.DiagnosisDescription,
			TreatmentPlan:        dto.TreatmentPlan,
			IsClosed:             dto.IsClosed,
			SignatureToken:       dto.SignatureToken,
			ClosedAt:             dto.ClosedAt,
			CreatedAt:            dto.CreatedAt,
		}
	}

	syncedCount, err := h.syncService.ProcessOfflineBatch(c.Context(), doctorID, req.BatchID, records)
	if err != nil {
		if errors.Is(err, domain.ErrChainConflict) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
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
