package handlers

import (
	"errors"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type PatientHandler struct {
	patientService ports.PatientService
}

func NewPatientHandler(patientService ports.PatientService) *PatientHandler {
	return &PatientHandler{patientService: patientService}
}

type CreatePatientRequest struct {
	DocumentType      string  `json:"document_type"`
	DocumentNumber    string  `json:"document_number"`
	FirstName         string  `json:"first_name"`
	SecondName        *string `json:"second_name"`
	LastName          string  `json:"last_name"`
	SecondLastName    *string `json:"second_last_name"`
	BirthDate         string  `json:"birth_date"`
	Gender            string  `json:"gender"`
	BloodType         string  `json:"blood_type"`
	EPSName           string  `json:"eps_name"`
	AffiliationStatus string  `json:"affiliation_status"`
	Phone             *string `json:"phone"`
	IsRuralZone       bool    `json:"is_rural_zone"`
}

func patientErrorResponse(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domain.ErrPatientNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, domain.ErrPatientAlreadyExists):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, domain.ErrInvalidDocumentType),
		errors.Is(err, domain.ErrInvalidPatientData),
		errors.Is(err, domain.ErrInvalidAllergyData):
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": err.Error()})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error interno procesando la solicitud de pacientes"})
	}
}

// Create admite un paciente nuevo en la IPS.
func (h *PatientHandler) Create(c *fiber.Ctx) error {
	var req CreatePatientRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Parametros de admision de paciente invalidos"})
	}

	birthDate, err := time.Parse("2006-01-02", req.BirthDate)
	if err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "birth_date debe tener el formato AAAA-MM-DD"})
	}

	patient := &domain.Patient{
		DocumentType:      domain.DocumentType(req.DocumentType),
		DocumentNumber:    req.DocumentNumber,
		FirstName:         req.FirstName,
		SecondName:        req.SecondName,
		LastName:          req.LastName,
		SecondLastName:    req.SecondLastName,
		BirthDate:         birthDate,
		Gender:            domain.Gender(req.Gender),
		BloodType:         domain.BloodType(req.BloodType),
		EPSName:           req.EPSName,
		AffiliationStatus: domain.AffiliationStatus(req.AffiliationStatus),
		Phone:             req.Phone,
		IsRuralZone:       req.IsRuralZone,
	}

	created, err := h.patientService.RegisterPatient(c.Context(), patient)
	if err != nil {
		return patientErrorResponse(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(patientView(created))
}

// List retorna los pacientes admitidos, los mas recientes primero.
func (h *PatientHandler) List(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	patients, err := h.patientService.ListPatients(c.Context(), limit, offset)
	if err != nil {
		return patientErrorResponse(c, err)
	}

	views := make([]fiber.Map, len(patients))
	for i := range patients {
		views[i] = patientView(&patients[i])
	}
	return c.JSON(fiber.Map{"patients": views, "count": len(views)})
}

// Lookup busca un paciente por tipo y numero de documento.
func (h *PatientHandler) Lookup(c *fiber.Ctx) error {
	docType := c.Query("document_type")
	docNumber := c.Query("document_number")
	if docType == "" || docNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "document_type y document_number son requeridos"})
	}

	patient, err := h.patientService.FindByDocument(c.Context(), domain.DocumentType(docType), docNumber)
	if err != nil {
		return patientErrorResponse(c, err)
	}
	return c.JSON(patientView(patient))
}

// GetByID retorna el paciente con sus antecedentes alergicos.
func (h *PatientHandler) GetByID(c *fiber.Ctx) error {
	patient, err := h.patientService.GetPatient(c.Context(), c.Params("id"))
	if err != nil {
		return patientErrorResponse(c, err)
	}
	return c.JSON(patientView(patient))
}

type AddAllergyRequest struct {
	ActiveIngredient string `json:"active_ingredient"`
	Severity         string `json:"severity"`
	Notes            string `json:"notes"`
}

// AddAllergy registra un antecedente alergico que el interceptor farmacologico usara en cada prescripcion.
func (h *PatientHandler) AddAllergy(c *fiber.Ctx) error {
	var req AddAllergyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Parametros de alergia invalidos"})
	}

	allergy := &domain.PatientAllergy{
		PatientID:        c.Params("id"),
		ActiveIngredient: req.ActiveIngredient,
		Severity:         domain.AllergySeverity(req.Severity),
		Notes:            req.Notes,
	}

	created, err := h.patientService.AddAllergy(c.Context(), allergy)
	if err != nil {
		return patientErrorResponse(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

// GetAllergies lista los antecedentes alergicos del paciente.
func (h *PatientHandler) GetAllergies(c *fiber.Ctx) error {
	allergies, err := h.patientService.GetAllergies(c.Context(), c.Params("id"))
	if err != nil {
		return patientErrorResponse(c, err)
	}
	return c.JSON(fiber.Map{"allergies": allergies})
}

type UpdatePatientContactRequest struct {
	Email   string `json:"email"`
	Address string `json:"address"`
	Phone   string `json:"phone"`
}

// UpdateContact actualiza los datos de contacto y residencia del paciente (Habeas Data).
func (h *PatientHandler) UpdateContact(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdatePatientContactRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Parametros de actualizacion invalidos"})
	}
	updated, err := h.patientService.UpdateContact(c.Context(), id, req.Email, req.Address, req.Phone)
	if err != nil {
		return patientErrorResponse(c, err)
	}
	return c.JSON(patientView(updated))
}

// Delete retira un paciente y limpia de forma transaccional sus registros dependientes.
func (h *PatientHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.patientService.DeletePatient(c.Context(), id); err != nil {
		return patientErrorResponse(c, err)
	}
	return c.JSON(fiber.Map{"message": "Paciente eliminado correctamente"})
}

// patientView arma la respuesta publica del paciente con fecha de nacimiento AAAA-MM-DD y nombre completo.
func patientView(p *domain.Patient) fiber.Map {
	allergies := p.Allergies
	if allergies == nil {
		allergies = []domain.PatientAllergy{}
	}
	return fiber.Map{
		"id":                 p.ID,
		"document_type":      p.DocumentType,
		"document_number":    p.DocumentNumber,
		"first_name":         p.FirstName,
		"second_name":        p.SecondName,
		"last_name":          p.LastName,
		"second_last_name":   p.SecondLastName,
		"full_name":          p.FullName(),
		"birth_date":         p.BirthDate.Format("2006-01-02"),
		"gender":             p.Gender,
		"blood_type":         p.BloodType,
		"eps_name":           p.EPSName,
		"affiliation_status": p.AffiliationStatus,
		"phone":              p.Phone,
		"email":              p.Email,
		"address":            p.Address,
		"is_rural_zone":      p.IsRuralZone,
		"created_at":         p.CreatedAt,
		"updated_at":         p.UpdatedAt,
		"allergies":          allergies,
	}
}
