package handlers

import (
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

// AppointmentRequestHandler atiende el portal publico del paciente y la bandeja de solicitudes del medico.
type AppointmentRequestHandler struct {
	svc ports.AppointmentRequestService
}

func NewAppointmentRequestHandler(svc ports.AppointmentRequestService) *AppointmentRequestHandler {
	return &AppointmentRequestHandler{svc: svc}
}

// PublicBranches lista las sedes con ubicacion que reciben solicitudes de primera cita.
func (h *AppointmentRequestHandler) PublicBranches(c *fiber.Ctx) error {
	branches, err := h.svc.PublicBranches(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible consultar las sedes"})
	}
	return c.JSON(fiber.Map{"branches": branches})
}

type submitRequestDTO struct {
	Branch         string `json:"branch"`
	DocumentType   string `json:"document_type"`
	DocumentNumber string `json:"document_number"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	BirthDate      string `json:"birth_date"`
	Gender         string `json:"gender"`
	BloodType      string `json:"blood_type"`
	EPSName        string `json:"eps_name"`
	Phone          string `json:"phone"`
	Email          string `json:"email"`
	Address        string `json:"address"`
	Observations   string `json:"observations"`
	Consent        bool   `json:"consent"`
}

// Submit recibe la solicitud de primera cita del portal publico (sin sesion).
func (h *AppointmentRequestHandler) Submit(c *fiber.Ctx) error {
	var dto submitRequestDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Solicitud inválida"})
	}
	birth, err := time.Parse("2006-01-02", strings.TrimSpace(dto.BirthDate))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La fecha de nacimiento no es válida"})
	}
	req := &domain.AppointmentRequest{
		Branch:         dto.Branch,
		DocumentType:   domain.DocumentType(strings.ToUpper(strings.TrimSpace(dto.DocumentType))),
		DocumentNumber: dto.DocumentNumber,
		FirstName:      dto.FirstName,
		LastName:       dto.LastName,
		BirthDate:      birth,
		Gender:         domain.Gender(strings.ToUpper(strings.TrimSpace(dto.Gender))),
		BloodType:      domain.BloodType(strings.ToUpper(strings.TrimSpace(dto.BloodType))),
		EPSName:        dto.EPSName,
		Phone:          dto.Phone,
		Email:          dto.Email,
		Address:        dto.Address,
		Observations:   dto.Observations,
	}
	created, err := h.svc.Submit(c.Context(), req, dto.Consent)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrConsentRequired):
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Debe aceptar el tratamiento de sus datos personales (Ley 1581 de 2012)"})
		case errors.Is(err, domain.ErrUnknownBranch):
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La sede elegida no recibe solicitudes en línea"})
		case errors.Is(err, domain.ErrInvalidAppointmentRequest):
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Revise los datos: hay campos incompletos o con formato inválido"})
		case errors.Is(err, domain.ErrNoDoctorAvailable):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "En este momento la sede no tiene médicos disponibles para recibir solicitudes. Elija otra sede o intente más tarde"})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible registrar la solicitud"})
		}
	}
	// Al paciente solo se le confirma la recepcion: no se revela el medico asignado ni si su documento ya existia
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"code":    created.Code,
		"branch":  created.Branch,
		"message": "Solicitud recibida. Un médico de la sede revisará su agenda y le enviará la cita a su correo.",
	})
}

func doctorFromCtx(c *fiber.Ctx) (string, bool) {
	id, ok := c.Locals("user_id").(string)
	return id, ok && id != ""
}

// List retorna la bandeja de solicitudes del medico autenticado, opcionalmente filtrada por estado.
func (h *AppointmentRequestHandler) List(c *fiber.Ctx) error {
	doctorID, ok := doctorFromCtx(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "sesión requerida"})
	}
	status := domain.AppointmentRequestStatus(strings.ToUpper(strings.TrimSpace(c.Query("status"))))
	list, err := h.svc.ListForDoctor(c.Context(), doctorID, status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible consultar la bandeja de solicitudes"})
	}
	return c.JSON(fiber.Map{"requests": list, "count": len(list)})
}

// PendingCount retorna cuantas solicitudes pendientes tiene el medico (para el contador del menu).
func (h *AppointmentRequestHandler) PendingCount(c *fiber.Ctx) error {
	doctorID, ok := doctorFromCtx(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "sesión requerida"})
	}
	n, err := h.svc.PendingCount(c.Context(), doctorID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible consultar las solicitudes"})
	}
	return c.JSON(fiber.Map{"pending": n})
}

func requestError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domain.ErrAppointmentRequestNotFound), errors.Is(err, domain.ErrRequestNotAssigned):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Solicitud no encontrada en su bandeja"})
	case errors.Is(err, domain.ErrRequestNotPending):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "La solicitud ya fue atendida"})
	case errors.Is(err, domain.ErrAppointmentInPast):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No se puede agendar en una fecha u hora pasada"})
	case errors.Is(err, domain.ErrDoctorScheduleOverlap):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Ya tiene una cita en ese horario. Elija otra hora"})
	case errors.Is(err, domain.ErrInvalidAppointmentRequest):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Indique el motivo del rechazo (máximo 500 caracteres)"})
	case errors.Is(err, domain.ErrInvalidPatientData), errors.Is(err, domain.ErrInvalidDocumentType):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Los datos del paciente no permiten registrarlo; rechace la solicitud indicando el motivo"})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No fue posible atender la solicitud"})
	}
}

type scheduleRequestDTO struct {
	AppointmentDate string `json:"appointment_date"`
	Note            string `json:"note"`
}

// Schedule agenda la cita de una solicitud; el sistema de citas envia el comprobante PDF al correo del paciente.
func (h *AppointmentRequestHandler) Schedule(c *fiber.Ctx) error {
	doctorID, ok := doctorFromCtx(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "sesión requerida"})
	}
	var dto scheduleRequestDTO
	if err := c.BodyParser(&dto); err != nil || strings.TrimSpace(dto.AppointmentDate) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La fecha y hora de la cita son obligatorias"})
	}
	date, err := time.Parse(time.RFC3339, strings.TrimSpace(dto.AppointmentDate))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Formato de fecha inválido"})
	}
	req, app, err := h.svc.Schedule(c.Context(), doctorID, c.Params("id"), date.UTC(), dto.Note)
	if err != nil {
		return requestError(c, err)
	}
	return c.JSON(fiber.Map{"request": req, "appointment": app})
}

type rejectRequestDTO struct {
	Note string `json:"note"`
}

// Reject rechaza la solicitud con un motivo que se envia al correo del paciente.
func (h *AppointmentRequestHandler) Reject(c *fiber.Ctx) error {
	doctorID, ok := doctorFromCtx(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "sesión requerida"})
	}
	var dto rejectRequestDTO
	_ = c.BodyParser(&dto)
	req, err := h.svc.Reject(c.Context(), doctorID, c.Params("id"), dto.Note)
	if err != nil {
		return requestError(c, err)
	}
	return c.JSON(fiber.Map{"request": req})
}
