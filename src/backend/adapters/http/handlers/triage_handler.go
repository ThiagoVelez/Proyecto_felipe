package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type TriageHandler struct {
	triageService ports.TriageService
}

func NewTriageHandler(triageService ports.TriageService) *TriageHandler {
	return &TriageHandler{triageService: triageService}
}

type CreateTriageRequest struct {
	PatientID             string                 `json:"patient_id"`
	SystolicBP            int                    `json:"systolic_bp"`
	DiastolicBP           int                    `json:"diastolic_bp"`
	HeartRate             int                    `json:"heart_rate"`
	RespiratoryRate       int                    `json:"respiratory_rate"`
	OxygenSaturation      int                    `json:"oxygen_saturation"`
	BodyTemperature       float64                `json:"body_temperature"`
	GlasgowScore          int                    `json:"glasgow_score"`
	ManchesterLevel       domain.ManchesterLevel `json:"manchester_level"`
	ReasonForConsultation string                 `json:"reason_for_consultation"`
}

func (h *TriageHandler) Create(c *fiber.Ctx) error {
	evaluatorID, ok := c.Locals("user_id").(string)
	if !ok || evaluatorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Usuario no identificado"})
	}

	var req CreateTriageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Parametros de valoracion de triaje invalidos",
		})
	}

	record := &domain.TriageRecord{
		PatientID:             req.PatientID,
		EvaluatedBy:           evaluatorID,
		SystolicBP:            req.SystolicBP,
		DiastolicBP:           req.DiastolicBP,
		HeartRate:             req.HeartRate,
		RespiratoryRate:       req.RespiratoryRate,
		OxygenSaturation:      req.OxygenSaturation,
		BodyTemperature:       req.BodyTemperature,
		GlasgowScore:          req.GlasgowScore,
		ManchesterLevel:       req.ManchesterLevel,
		ReasonForConsultation: req.ReasonForConsultation,
	}

	created, err := h.triageService.RegisterTriage(c.Context(), record)
	if err != nil {
		if errors.Is(err, domain.ErrInvalidGlasgowScore) || errors.Is(err, domain.ErrInvalidOxygenSaturation) || errors.Is(err, domain.ErrInvalidVitals) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if errors.Is(err, domain.ErrPatientNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error interno al registrar triaje",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *TriageHandler) GetQueue(c *fiber.Ctx) error {
	queue, err := h.triageService.GetTriageQueue(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error consultando cola priorizada de triaje",
		})
	}
	return c.JSON(queue)
}

func (h *TriageHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	record, err := h.triageService.GetTriageByID(c.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrTriageNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al consultar triaje"})
	}
	return c.JSON(record)
}

type UpdateStatusRequest struct {
	Status domain.TriageStatus `json:"status"`
}

func (h *TriageHandler) UpdateStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Estado de triaje requerido",
		})
	}

	if err := h.triageService.UpdateTriageStatus(c.Context(), id, req.Status); err != nil {
		if errors.Is(err, domain.ErrTriageAlreadyProcessed) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, domain.ErrTriageNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al actualizar estado"})
	}

	return c.JSON(fiber.Map{"message": "Estado de triaje actualizado exitosamente"})
}

