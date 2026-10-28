package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

type PrescriptionHandler struct {
	prescService ports.PrescriptionService
}

func NewPrescriptionHandler(prescService ports.PrescriptionService) *PrescriptionHandler {
	return &PrescriptionHandler{prescService: prescService}
}

type PrescriptionItemDTO struct {
	MedicationID    int     `json:"medication_id"`
	Dosage          string  `json:"dosage"`
	FrequencyHours  int     `json:"frequency_hours"`
	DurationDays    int     `json:"duration_days"`
	TotalQuantity   int     `json:"total_quantity"`
	IndicationNotes *string `json:"indication_notes"`
}

type CreatePrescriptionRequest struct {
	ClinicalRecordID string                `json:"clinical_record_id"`
	PatientID        string                `json:"patient_id"`
	Observations     *string               `json:"observations"`
	Items            []PrescriptionItemDTO `json:"items"`
}

func (h *PrescriptionHandler) Create(c *fiber.Ctx) error {
	doctorID, ok := c.Locals("user_id").(string)
	if !ok || doctorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Medico no identificado"})
	}

	var req CreatePrescriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Parametros de prescripcion medica invalidos",
		})
	}

	if req.ClinicalRecordID == "" || req.PatientID == "" || len(req.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "clinical_record_id, patient_id y al menos un item farmacologico son requeridos",
		})
	}

	items := make([]domain.PrescriptionItem, len(req.Items))
	for i, it := range req.Items {
		items[i] = domain.PrescriptionItem{
			MedicationID:    it.MedicationID,
			Dosage:          it.Dosage,
			FrequencyHours:  it.FrequencyHours,
			DurationDays:    it.DurationDays,
			TotalQuantity:   it.TotalQuantity,
			IndicationNotes: it.IndicationNotes,
		}
	}

	presc := &domain.Prescription{
		ClinicalRecordID: req.ClinicalRecordID,
		PatientID:        req.PatientID,
		DoctorID:         doctorID,
		Observations:     req.Observations,
		Items:            items,
	}

	created, err := h.prescService.IssuePrescription(c.Context(), presc)
	if err != nil {
		var allergyErr *domain.AllergyConflictError
		if errors.As(err, &allergyErr) {
			return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
				"error":             allergyErr.Error(),
				"allergy_conflict":  true,
				"active_ingredient": allergyErr.ActiveIngredient,
				"severity":          allergyErr.Severity,
				"medication":        allergyErr.MedicationName,
			})
		}
		if errors.Is(err, domain.ErrInsufficientMedicationStock) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if errors.Is(err, domain.ErrRecordNotFound) || errors.Is(err, domain.ErrMedicationNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error interno al emitir la prescripcion",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *PrescriptionHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	presc, err := h.prescService.GetPrescriptionByID(c.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrPrescriptionNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al consultar prescripcion"})
	}
	return c.JSON(presc)
}

func (h *PrescriptionHandler) GetByClinicalRecord(c *fiber.Ctx) error {
	recordID := c.Params("record_id")
	presc, err := h.prescService.GetByClinicalRecord(c.Context(), recordID)
	if err != nil {
		if errors.Is(err, domain.ErrPrescriptionNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al consultar prescripcion"})
	}
	return c.JSON(presc)
}

