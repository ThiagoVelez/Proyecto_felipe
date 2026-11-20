package handlers

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

func sessionUser(c *fiber.Ctx) (string, string, bool) {
	id, _ := c.Locals("user_id").(string)
	role, _ := c.Locals("role").(string)
	return id, strings.ToUpper(role), id != ""
}

func unauthorized(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "sesión requerida"})
}

// ---------------------------------------------------------------------------------------------
// Laboratorio
// ---------------------------------------------------------------------------------------------

type LabOrderHandler struct{ svc ports.LabOrderService }

func NewLabOrderHandler(svc ports.LabOrderService) *LabOrderHandler {
	return &LabOrderHandler{svc: svc}
}

func labError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domain.ErrLabOrderNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Orden de laboratorio no encontrada"})
	case errors.Is(err, domain.ErrPatientNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Paciente no encontrado"})
	case errors.Is(err, domain.ErrLabOrderSealed):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "El resultado ya fue validado y sellado; no puede modificarse"})
	case errors.Is(err, domain.ErrLabOrderNotSealed):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Solo se pueden enviar resultados validados y sellados"})
	case errors.Is(err, domain.ErrLabResultsRequired):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Debe ingresar los parámetros analíticos antes de sellar el resultado"})
	case errors.Is(err, domain.ErrInvalidLabOrder):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Revise los datos de la orden: hay campos obligatorios vacíos o inválidos"})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible procesar la orden de laboratorio"})
	}
}

func (h *LabOrderHandler) List(c *fiber.Ctx) error {
	id, role, ok := sessionUser(c)
	if !ok {
		return unauthorized(c)
	}
	status := domain.LabOrderStatus(strings.ToUpper(strings.TrimSpace(c.Query("status"))))
	list, err := h.svc.List(c.Context(), id, role, status)
	if err != nil {
		return labError(c, err)
	}
	return c.JSON(fiber.Map{"orders": list, "count": len(list)})
}

func (h *LabOrderHandler) Create(c *fiber.Ctx) error {
	id, _, ok := sessionUser(c)
	if !ok {
		return unauthorized(c)
	}
	var in ports.LabOrderInput
	if err := c.BodyParser(&in); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	o, err := h.svc.Create(c.Context(), id, in)
	if err != nil {
		return labError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(o)
}

type labResultsDTO struct {
	Results     string `json:"results"`
	MethodNotes string `json:"method_notes"`
}

func (h *LabOrderHandler) SaveProgress(c *fiber.Ctx) error {
	id, _, ok := sessionUser(c)
	if !ok {
		return unauthorized(c)
	}
	var dto labResultsDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	o, err := h.svc.SaveProgress(c.Context(), id, c.Params("id"), dto.Results, dto.MethodNotes)
	if err != nil {
		return labError(c, err)
	}
	return c.JSON(o)
}

func (h *LabOrderHandler) Seal(c *fiber.Ctx) error {
	id, _, ok := sessionUser(c)
	if !ok {
		return unauthorized(c)
	}
	var dto labResultsDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	o, err := h.svc.Seal(c.Context(), id, c.Params("id"), dto.Results, dto.MethodNotes)
	if err != nil {
		return labError(c, err)
	}
	return c.JSON(o)
}

type labDispatchDTO struct {
	Email      string `json:"email"`
	CopyDoctor bool   `json:"copy_doctor"`
}

func (h *LabOrderHandler) Dispatch(c *fiber.Ctx) error {
	id, role, ok := sessionUser(c)
	if !ok {
		return unauthorized(c)
	}
	var dto labDispatchDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	o, err := h.svc.Dispatch(c.Context(), id, role, c.Params("id"), dto.Email, dto.CopyDoctor)
	if err != nil {
		if errors.Is(err, domain.ErrInvalidLabOrder) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El correo del paciente no es válido"})
		}
		return labError(c, err)
	}
	return c.JSON(o)
}

// ---------------------------------------------------------------------------------------------
// Enfermeria
// ---------------------------------------------------------------------------------------------

type NursingHandler struct{ svc ports.NursingService }

func NewNursingHandler(svc ports.NursingService) *NursingHandler { return &NursingHandler{svc: svc} }

func nursingError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domain.ErrPatientNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Paciente no encontrado"})
	case errors.Is(err, domain.ErrInvalidNursingData):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Los datos de enfermería son incompletos o inválidos"})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible procesar el registro de enfermería"})
	}
}

func (h *NursingHandler) List(c *fiber.Ctx) error {
	list, err := h.svc.List(c.Context())
	if err != nil {
		return nursingError(c, err)
	}
	return c.JSON(fiber.Map{"records": list, "count": len(list)})
}

func (h *NursingHandler) Get(c *fiber.Ctx) error {
	care, err := h.svc.Get(c.Context(), c.Params("patientId"))
	if err != nil {
		return nursingError(c, err)
	}
	return c.JSON(care)
}

type nursingOrderDTO struct {
	Order       json.RawMessage      `json:"order"`
	Medications []domain.NursingDuty `json:"medications"`
}

func (h *NursingHandler) AssignOrder(c *fiber.Ctx) error {
	id, _, ok := sessionUser(c)
	if !ok {
		return unauthorized(c)
	}
	var dto nursingOrderDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	care, err := h.svc.AssignOrder(c.Context(), id, c.Params("patientId"), dto.Order, dto.Medications)
	if err != nil {
		return nursingError(c, err)
	}
	return c.JSON(care)
}

type nursingDutiesDTO struct {
	Duties []domain.NursingDuty `json:"duties"`
}

func (h *NursingHandler) SaveDuties(c *fiber.Ctx) error {
	id, _, ok := sessionUser(c)
	if !ok {
		return unauthorized(c)
	}
	var dto nursingDutiesDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	care, err := h.svc.SaveDuties(c.Context(), id, c.Params("patientId"), dto.Duties)
	if err != nil {
		return nursingError(c, err)
	}
	return c.JSON(care)
}

type nursingNoteDTO struct {
	Content string `json:"content"`
}

func (h *NursingHandler) AddNote(c *fiber.Ctx) error {
	id, _, ok := sessionUser(c)
	if !ok {
		return unauthorized(c)
	}
	var dto nursingNoteDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	care, err := h.svc.AddNote(c.Context(), id, c.Params("patientId"), dto.Content)
	if err != nil {
		return nursingError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(care)
}

// ---------------------------------------------------------------------------------------------
// Sedes
// ---------------------------------------------------------------------------------------------

type BranchHandler struct{ svc ports.BranchService }

func NewBranchHandler(svc ports.BranchService) *BranchHandler { return &BranchHandler{svc: svc} }

func branchError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domain.ErrBranchNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Sede no encontrada"})
	case errors.Is(err, domain.ErrBranchNameTaken):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Ya existe una sede con ese nombre"})
	case errors.Is(err, domain.ErrBranchHasPersonnel):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "La sede tiene personal asignado; reasígnelo antes de eliminarla o cambiarle el nombre"})
	case errors.Is(err, domain.ErrInvalidBranch):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Revise los datos de la sede: el nombre es obligatorio y las coordenadas deben ir completas"})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible procesar la sede"})
	}
}

// List es publico: el login y el portal del paciente muestran las sedes.
func (h *BranchHandler) List(c *fiber.Ctx) error {
	list, err := h.svc.List(c.Context())
	if err != nil {
		return branchError(c, err)
	}
	return c.JSON(fiber.Map{"branches": list, "count": len(list)})
}

func (h *BranchHandler) Create(c *fiber.Ctx) error {
	var b domain.Branch
	if err := c.BodyParser(&b); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	created, err := h.svc.Create(c.Context(), &b)
	if err != nil {
		return branchError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *BranchHandler) Update(c *fiber.Ctx) error {
	var b domain.Branch
	if err := c.BodyParser(&b); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	b.ID = c.Params("id")
	updated, err := h.svc.Update(c.Context(), &b)
	if err != nil {
		return branchError(c, err)
	}
	return c.JSON(updated)
}

func (h *BranchHandler) Delete(c *fiber.Ctx) error {
	if err := h.svc.Delete(c.Context(), c.Params("id")); err != nil {
		return branchError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
