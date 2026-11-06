package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
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
	PatientID             string  `json:"patient_id"`
	TriageID              *string `json:"triage_id"`
	Anamnesis             string  `json:"anamnesis"`
	PhysicalExam          string  `json:"physical_exam"`
	CIE11Code             string  `json:"cie11_code"`
	DiagnosisDescription  string  `json:"diagnosis_description"`
	TreatmentPlan         string  `json:"treatment_plan"`
	PainScaleScore        int     `json:"pain_scale_score"`
	PainScaleObservations *string `json:"pain_scale_observations"`
	AnatomicalMapping     *string `json:"anatomical_mapping"`
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
		PatientID:             req.PatientID,
		DoctorID:              doctorID,
		TriageID:              req.TriageID,
		Anamnesis:             req.Anamnesis,
		PhysicalExam:          req.PhysicalExam,
		CIE11Code:             req.CIE11Code,
		DiagnosisDescription:  req.DiagnosisDescription,
		TreatmentPlan:         req.TreatmentPlan,
		PainScaleScore:        req.PainScaleScore,
		PainScaleObservations: req.PainScaleObservations,
		AnatomicalMapping:     req.AnatomicalMapping,
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
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, domain.ErrChainConflict) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, domain.ErrNotRecordOwner) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
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
		if errors.Is(err, domain.ErrNotRecordOwner) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, domain.ErrRecordNotClosed) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
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
	if errors.Is(err, domain.ErrRecordNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
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

// CreateAnatomicalNoteRequest define el payload para registrar una nota clinica georreferenciada.
type CreateAnatomicalNoteRequest struct {
	ClinicalRecordID  *string `json:"clinical_record_id,omitempty"`
	PatientID         string  `json:"patient_id"`
	StructureKey      string  `json:"structure_key"`
	StructureName     string  `json:"structure_name"`
	Layer             string  `json:"layer"`
	ViewOrientation   string  `json:"view_orientation"`
	CoordinatesX      int     `json:"coordinates_x"`
	CoordinatesY      int     `json:"coordinates_y"`
	PainLevel         int     `json:"pain_level"`
	DoctorObservation string  `json:"doctor_observation"`
	PreliminaryCIE11  string  `json:"preliminary_cie11,omitempty"`
}

func (h *ClinicalRecordHandler) CreateAnatomicalNote(c *fiber.Ctx) error {
	doctorID, ok := c.Locals("user_id").(string)
	if !ok || doctorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Usuario no autenticado"})
	}

	var req CreateAnatomicalNoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload invalido"})
	}

	recIDParam := c.Params("id")
	if recIDParam != "" && (req.ClinicalRecordID == nil || *req.ClinicalRecordID == "") {
		req.ClinicalRecordID = &recIDParam
	}

	if req.PatientID == "" && c.Params("patient_id") != "" {
		req.PatientID = c.Params("patient_id")
	}

	if req.PatientID == "" || req.StructureKey == "" || req.DoctorObservation == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Los campos patient_id, structure_key y doctor_observation son obligatorios",
		})
	}

	layer := domain.LayerOrgan
	switch req.Layer {
	case "BONE":
		layer = domain.LayerBone
	case "MUSCLE":
		layer = domain.LayerMuscle
	case "VASCULAR":
		layer = domain.LayerVascular
	default:
		layer = domain.LayerOrgan
	}

	view := domain.OrientationAnterior
	if req.ViewOrientation == "POSTERIOR" {
		view = domain.OrientationPosterior
	}

	note := &domain.ClinicalAnatomicalNote{
		ClinicalRecordID:  req.ClinicalRecordID,
		PatientID:         req.PatientID,
		DoctorID:          doctorID,
		StructureKey:      req.StructureKey,
		StructureName:     req.StructureName,
		Layer:             layer,
		ViewOrientation:   view,
		CoordinatesX:      req.CoordinatesX,
		CoordinatesY:      req.CoordinatesY,
		PainLevel:         req.PainLevel,
		DoctorObservation: req.DoctorObservation,
		PreliminaryCIE11:  req.PreliminaryCIE11,
	}

	created, err := h.recordService.AddAnatomicalNote(c.Context(), note)
	if err != nil {
		if errors.Is(err, domain.ErrPatientNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Paciente no encontrado"})
		}
		if errors.Is(err, domain.ErrRecordAlreadyClosed) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "El folio clinico ya esta cerrado y sus notas anatomicas son inmutables"})
		}
		if errors.Is(err, domain.ErrUnauthorizedRole) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Solo personal medico habilitado puede redactar observaciones anatomicas"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *ClinicalRecordHandler) GetRecordAnatomicalNotes(c *fiber.Ctx) error {
	recordID := c.Params("id")
	notes, err := h.recordService.GetAnatomicalNotesByRecord(c.Context(), recordID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if notes == nil {
		notes = []domain.ClinicalAnatomicalNote{}
	}
	return c.JSON(notes)
}

func (h *ClinicalRecordHandler) GetPatientAnatomicalNotes(c *fiber.Ctx) error {
	patientID := c.Params("id")
	notes, err := h.recordService.GetAnatomicalNotesByPatient(c.Context(), patientID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if notes == nil {
		notes = []domain.ClinicalAnatomicalNote{}
	}
	return c.JSON(notes)
}

type UpdateAnatomicalNoteRequest struct {
	PainLevel         int    `json:"pain_level"`
	DoctorObservation string `json:"doctor_observation"`
	PreliminaryCIE11  string `json:"preliminary_cie11"`
}

func (h *ClinicalRecordHandler) UpdateAnatomicalNote(c *fiber.Ctx) error {
	doctorID, ok := c.Locals("user_id").(string)
	if !ok || doctorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Usuario no autenticado"})
	}

	noteID := c.Params("note_id")
	if noteID == "" {
		noteID = c.Params("id")
	}

	var req UpdateAnatomicalNoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload invalido"})
	}

	note := &domain.ClinicalAnatomicalNote{
		ID:                noteID,
		DoctorID:          doctorID,
		PainLevel:         req.PainLevel,
		DoctorObservation: req.DoctorObservation,
		PreliminaryCIE11:  req.PreliminaryCIE11,
	}

	updated, err := h.recordService.UpdateAnatomicalNote(c.Context(), note)
	if err != nil {
		if errors.Is(err, domain.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Nota anatomica no encontrada"})
		}
		if errors.Is(err, domain.ErrNotRecordOwner) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Solo el medico autor puede modificar su observacion anatomica"})
		}
		if errors.Is(err, domain.ErrRecordAlreadyClosed) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "El folio clinico esta cerrado y no permite modificaciones"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(updated)
}

func (h *ClinicalRecordHandler) DeleteAnatomicalNote(c *fiber.Ctx) error {
	doctorID, ok := c.Locals("user_id").(string)
	if !ok || doctorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Usuario no autenticado"})
	}

	noteID := c.Params("note_id")
	if noteID == "" {
		noteID = c.Params("id")
	}

	err := h.recordService.DeleteAnatomicalNote(c.Context(), noteID, doctorID)
	if err != nil {
		if errors.Is(err, domain.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Nota anatomica no encontrada"})
		}
		if errors.Is(err, domain.ErrNotRecordOwner) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Solo el medico autor puede eliminar su observacion anatomica"})
		}
		if errors.Is(err, domain.ErrRecordAlreadyClosed) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "El folio clinico esta cerrado y no permite eliminacion"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Nota anatomica eliminada exitosamente"})
}

type UpdatePainMappingRequest struct {
	PainScaleScore        int     `json:"pain_scale_score"`
	PainScaleObservations *string `json:"pain_scale_observations"`
	AnatomicalMapping     *string `json:"anatomical_mapping"`
}

func (h *ClinicalRecordHandler) UpdatePainAndMapping(c *fiber.Ctx) error {
	doctorID, ok := c.Locals("user_id").(string)
	if !ok || doctorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Usuario no autenticado"})
	}

	recordID := c.Params("id")
	var req UpdatePainMappingRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Payload invalido"})
	}

	err := h.recordService.UpdatePainAndMapping(c.Context(), recordID, doctorID, req.PainScaleScore, req.PainScaleObservations, req.AnatomicalMapping)
	if err != nil {
		if errors.Is(err, domain.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Folio clinico no encontrado"})
		}
		if errors.Is(err, domain.ErrNotRecordOwner) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Solo el medico autor puede actualizar el folio"})
		}
		if errors.Is(err, domain.ErrRecordAlreadyClosed) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "El folio clinico ya se encuentra cerrado"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Escala de dolor y mapeo anatomico actualizados exitosamente"})
}
