package handlers

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

// AppointmentHandler expone los endpoints HTTP para la gestion de citas y calendario medico
type AppointmentHandler struct {
	svc ports.AppointmentService
}

// NewAppointmentHandler crea el controlador HTTP para citas
func NewAppointmentHandler(svc ports.AppointmentService) *AppointmentHandler {
	return &AppointmentHandler{svc: svc}
}

// CreateRequestDTO define la carga útil para crear una cita médica
type CreateAppointmentDTO struct {
	PatientID       string `json:"patient_id"`
	AppointmentDate string `json:"appointment_date"` // Formato ISO8601 o "2006-01-02 15:04"
	Observations    string `json:"observations"`
}

// Create programa una nueva cita médica y despacha el comprobante en segundo plano
func (h *AppointmentHandler) Create(c *fiber.Ctx) error {
	doctorID := c.Locals("user_id")
	if doctorID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "sesión requerida"})
	}

	var dto CreateAppointmentDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cuerpo de petición inválido"})
	}

	if dto.PatientID == "" || dto.AppointmentDate == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "el paciente y la fecha/hora son obligatorios"})
	}

	loc, _ := time.LoadLocation("America/Bogota")
	if loc == nil {
		loc = time.FixedZone("COT", -5*3600)
	}

	parsedDate, err := time.Parse(time.RFC3339, dto.AppointmentDate)
	if err != nil {
		parsedDate, err = time.ParseInLocation("2006-01-02 15:04", dto.AppointmentDate, loc)
		if err != nil {
			parsedDate, err = time.ParseInLocation("2006-01-02T15:04", dto.AppointmentDate, loc)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "formato de fecha inválido, use YYYY-MM-DD HH:mm"})
			}
		}
	}
	parsedDate = parsedDate.UTC()

	app := &domain.Appointment{
		DoctorID:        doctorID.(string),
		PatientID:       dto.PatientID,
		AppointmentDate: parsedDate,
		Observations:    dto.Observations,
	}

	created, err := h.svc.ScheduleAppointment(c.Context(), app)
	if err != nil {
		if errors.Is(err, domain.ErrAppointmentInPast) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, domain.ErrDoctorScheduleOverlap) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":     "Cita programada con éxito. El comprobante en PDF ha sido enviado al correo del paciente.",
		"appointment": created,
	})
}

// GetByDoctor retorna todas las citas programadas para un médico determinado
func (h *AppointmentHandler) GetByDoctor(c *fiber.Ctx) error {
	doctorID := c.Params("id")
	if doctorID == "" {
		current := c.Locals("user_id")
		if current != nil {
			doctorID = current.(string)
		}
	}

	appointments, err := h.svc.GetDoctorAppointments(c.Context(), doctorID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(appointments)
}

// GetByRange filtra citas por rango de fechas para el calendario
func (h *AppointmentHandler) GetByRange(c *fiber.Ctx) error {
	doctorID := c.Query("doctor_id")
	if doctorID == "" {
		current := c.Locals("user_id")
		if current != nil {
			doctorID = current.(string)
		}
	}
	start := c.Query("start")
	end := c.Query("end")

	appointments, err := h.svc.GetDoctorAppointmentsByRange(c.Context(), doctorID, start, end)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(appointments)
}

