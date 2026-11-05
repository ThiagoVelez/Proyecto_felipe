package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

// TreatmentHandler expone los endpoints para el seguimiento clinico y emision tripartita de recetas
type TreatmentHandler struct {
	svc ports.TreatmentService
}

// NewTreatmentHandler inicializa el controlador de tratamiento
func NewTreatmentHandler(svc ports.TreatmentService) *TreatmentHandler {
	return &TreatmentHandler{svc: svc}
}

// Dispatch recibe la formulacion del medico, genera el folio y notifica a farmacia y al paciente
func (h *TreatmentHandler) Dispatch(c *fiber.Ctx) error {
	doctorID := c.Locals("user_id")
	if doctorID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "sesión médica requerida"})
	}

	var presc domain.PrescriptionV2
	if err := c.BodyParser(&presc); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cuerpo de orden médica inválido"})
	}

	presc.DoctorID = doctorID.(string)

	if presc.PatientID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "el identificador del paciente es obligatorio"})
	}
	if len(presc.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "la orden debe incluir al menos un medicamento formulado"})
	}

	dispatched, err := h.svc.DispatchTreatment(c.Context(), &presc)
	if err != nil {
		if errors.Is(err, domain.ErrEmptyPrescriptionItems) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":      "Prescripción tripartita emitida con éxito. Notificada al buzón de farmacia y enviada por correo en formato PDF.",
		"unique_code":  dispatched.UniqueCode,
		"prescription": dispatched,
	})
}

// GetByID consulta una prescripción por su ID
func (h *TreatmentHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	presc, err := h.svc.GetPrescriptionByID(c.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrPrescriptionNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "prescripción no encontrada"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(presc)
}

