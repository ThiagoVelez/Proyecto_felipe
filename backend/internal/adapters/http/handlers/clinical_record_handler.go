package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

type ClinicalRecordHandler struct {
	recordService ports.ClinicalRecordService
	patientRepo   ports.PatientRepository
	prescRepo     ports.PrescriptionRepository
	ripsGenerator ports.RIPSGeneratorPort
	fhirMapper    ports.FHIRMapperPort
}

func NewClinicalRecordHandler(
	recordService ports.ClinicalRecordService,
	patientRepo ports.PatientRepository,
	prescRepo ports.PrescriptionRepository,
	ripsGenerator ports.RIPSGeneratorPort,
	fhirMapper ports.FHIRMapperPort,
) *ClinicalRecordHandler {
	return &ClinicalRecordHandler{
		recordService: recordService,
		patientRepo:   patientRepo,
		prescRepo:     prescRepo,
		ripsGenerator: ripsGenerator,
		fhirMapper:    fhirMapper,
	}
}

type CreateRecordRequest struct {
	PatientID            string  `json:"patient_id"`
	TriageID             *string `json:"triage_id"`
	Anamnesis            string  `json:"anamnesis"`
	PhysicalExam         string  `json:"physical_exam"`
	CIE11Code            string  `json:"cie11_code"`
	DiagnosisDescription string  `json:"diagnosis_description"`
	TreatmentPlan        string  `json:"treatment_plan"`
}

func (h *ClinicalRecordHandler) CreateDraft(c *fiber.Ctx) error {
	doctorID, ok := c.Locals("user_id").(string)
	if !ok || doctorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Medico no identificado"})
	}

	var req CreateRecordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Parametros de historia clinica invalidos",
		})
	}

	if req.PatientID == "" || req.Anamnesis == "" || req.PhysicalExam == "" || req.CIE11Code == "" || req.TreatmentPlan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Los campos patient_id, anamnesis, physical_exam, cie11_code y treatment_plan son obligatorios",
		})
	}

	record := &domain.ClinicalRecord{
		PatientID:            req.PatientID,
		DoctorID:             doctorID,
		TriageID:             req.TriageID,
		Anamnesis:            req.Anamnesis,
		PhysicalExam:         req.PhysicalExam,
		CIE11Code:            req.CIE11Code,
		DiagnosisDescription: req.DiagnosisDescription,
		TreatmentPlan:        req.TreatmentPlan,
	}

	created, err := h.recordService.CreateDraft(c.Context(), record)
	if err != nil {
		if errors.Is(err, domain.ErrPatientNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, domain.ErrUnauthorizedRole) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "El usuario no cuenta con registro medico habilitado para abrir folios"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error interno al crear folio"})
	}

	return c.Status(fiber.StatusCreated).JSON(created)
}

type CloseRecordRequest struct {
	SignatureToken string `json:"signature_token"`
}

func (h *ClinicalRecordHandler) CloseAndSign(c *fiber.Ctx) error {
	doctorID, ok := c.Locals("user_id").(string)
	if !ok || doctorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Medico no identificado"})
	}

	recordID := c.Params("id")
	var req CloseRecordRequest
	if err := c.BodyParser(&req); err != nil || req.SignatureToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "La firma digital o signature_token es requerida para el cierre legal del folio",
		})
	}

	closed, err := h.recordService.CloseAndSign(c.Context(), recordID, doctorID, req.SignatureToken)
	if err != nil {
		if errors.Is(err, domain.ErrRecordAlreadyClosed) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, domain.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error interno durante la firma y sellado criptografico"})
	}

	return c.JSON(closed)
}

type ClarificationRequest struct {
	Note string `json:"note"`
}

func (h *ClinicalRecordHandler) AddClarification(c *fiber.Ctx) error {
	doctorID, ok := c.Locals("user_id").(string)
	if !ok || doctorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Medico no identificado"})
	}

	recordID := c.Params("id")
	var req ClarificationRequest
	if err := c.BodyParser(&req); err != nil || req.Note == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El campo note es requerido para registrar una aclaracion medica",
		})
	}

	if err := h.recordService.AddClarification(c.Context(), recordID, doctorID, req.Note); err != nil {
		if errors.Is(err, domain.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error interno al anexar nota aclaratoria"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Nota aclaratoria registrada legalmente"})
}

func (h *ClinicalRecordHandler) GetByID(c *fiber.Ctx) error {
	recordID := c.Params("id")
	record, err := h.recordService.GetRecordByID(c.Context(), recordID)
	if err != nil {
		if errors.Is(err, domain.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al consultar folio"})
	}
	return c.JSON(record)
}

func (h *ClinicalRecordHandler) GetPatientHistory(c *fiber.Ctx) error {
	patientID := c.Params("patient_id")
	history, err := h.recordService.GetPatientHistory(c.Context(), patientID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error consultando antecedentes clinicos"})
	}
	return c.JSON(history)
}

func (h *ClinicalRecordHandler) VerifyIntegrity(c *fiber.Ctx) error {
	recordID := c.Params("id")
	valid, err := h.recordService.VerifyIntegrity(c.Context(), recordID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error verificando cadena SHA-256"})
	}

	return c.JSON(fiber.Map{
		"record_id":        recordID,
		"integrity_valid":  valid,
		"cryptographic_ok": valid,
	})
}

func (h *ClinicalRecordHandler) ExportRIPS(c *fiber.Ctx) error {
	recordID := c.Params("id")
	invoiceNumber := c.Query("invoice_number", "FAC-0001")

	record, err := h.recordService.GetRecordByID(c.Context(), recordID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Folio clinico no encontrado"})
	}

	patient, err := h.patientRepo.GetByID(c.Context(), record.PatientID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Paciente asociado no encontrado"})
	}

	ripsJSON, err := h.ripsGenerator.GenerateRIPSJSON(c.Context(), invoiceNumber, domain.RIPSTypeConsultas, record, patient)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "application/json")
	return c.SendString(ripsJSON)
}

func (h *ClinicalRecordHandler) ExportFHIR(c *fiber.Ctx) error {
	recordID := c.Params("id")
	record, err := h.recordService.GetRecordByID(c.Context(), recordID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Folio clinico no encontrado"})
	}

	patient, err := h.patientRepo.GetByID(c.Context(), record.PatientID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Paciente asociado no encontrado"})
	}

	presc, _ := h.prescRepo.GetByClinicalRecordID(c.Context(), record.ID)

	bundle, err := h.fhirMapper.MapToFHIRBundle(c.Context(), record, patient, presc)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(bundle)
}
