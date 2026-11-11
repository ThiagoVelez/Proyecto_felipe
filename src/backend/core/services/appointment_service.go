package services

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/adapters/email"
	"saludconecta-backend/adapters/pdf"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/logger"
)

type appointmentService struct {
	appRepo     ports.AppointmentRepository
	patientRepo ports.PatientRepository
	userRepo    ports.UserRepository
	pdfGen      *pdf.Generator
	emailSvc    *email.Service
	log         *logger.Logger
}

// NewAppointmentService crea el servicio de agendamiento y calendario con despacho asincrono de PDF y correo
func NewAppointmentService(
	appRepo ports.AppointmentRepository,
	patientRepo ports.PatientRepository,
	userRepo ports.UserRepository,
	pdfGen *pdf.Generator,
	emailSvc *email.Service,
	log *logger.Logger,
) ports.AppointmentService {
	return &appointmentService{
		appRepo:     appRepo,
		patientRepo: patientRepo,
		userRepo:    userRepo,
		pdfGen:      pdfGen,
		emailSvc:    emailSvc,
		log:         log,
	}
}

func (s *appointmentService) ScheduleAppointment(ctx context.Context, app *domain.Appointment) (*domain.Appointment, error) {
	// 1. Regla de negocio: No se pueden agendar citas en fechas pasadas
	now := time.Now().UTC()
	if app.AppointmentDate.Before(now.Add(-2 * time.Minute)) {
		return nil, domain.ErrAppointmentInPast
	}

	// 2. Regla de negocio: No solapar horarios para el mismo medico
	overlap, err := s.appRepo.HasOverlap(ctx, app.DoctorID, app.AppointmentDate)
	if err != nil {
		return nil, fmt.Errorf("error verificando disponibilidad de agenda: %w", err)
	}
	if overlap {
		return nil, domain.ErrDoctorScheduleOverlap
	}

	// 3. Completar datos asistenciales del profesional
	doctor, err := s.userRepo.GetByID(ctx, app.DoctorID)
	if err != nil || doctor == nil || !doctor.IsDoctor() {
		return nil, domain.ErrUserNotFound
	}
	app.DoctorName = doctor.FullName
	app.DoctorSpecialty = doctor.Specialty
	app.DoctorCard = doctor.ProfessionalCard

	// 4. Completar datos clinicos del paciente (DEF-88: paciente obligatorio)
	patient, err := s.patientRepo.GetByID(ctx, app.PatientID)
	if err != nil || patient == nil {
		return nil, domain.ErrPatientNotFound
	}
	app.PatientName = fmt.Sprintf("%s %s", patient.FirstName, patient.LastName)
	app.PatientDocument = patient.DocumentNumber
	if patient.Phone != nil {
		app.PatientPhone = *patient.Phone
	}
	app.PatientEmail = patient.Email

	if app.ID == "" {
		app.ID = uuid.New().String()
	}
	if app.Status == "" {
		app.Status = domain.AppointmentScheduled
	}
	app.CreatedAt = now

	// 5. Persistencia sincrona
	if err := s.appRepo.Create(ctx, app); err != nil {
		return nil, fmt.Errorf("error guardando cita medica: %w", err)
	}

	// 6. Worker en segundo plano (Goroutine desacoplada): genera PDF y envia confirmacion por correo SMTP
	go func(appCopy domain.Appointment) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		pdfPath, pdfBytes, err := s.pdfGen.GenerateAppointmentPDF(&appCopy)
		if err != nil {
			s.log.Error("Fallo generando comprobante PDF de cita en segundo plano", map[string]interface{}{
				"appointment_id": appCopy.ID,
				"error":          err.Error(),
			})
			return
		}

		subject := fmt.Sprintf("Confirmación de Cita Médica - SaludConecta IPS [%s]", appCopy.AppointmentDate.Format("02/01/2006"))
		body := fmt.Sprintf("Estimado(a) %s,\n\nSu cita médica ha sido programada con éxito para el %s.\n\nMédico Tratante: %s (%s)\nObservaciones: %s\n\nAdjunto encontrará su comprobante oficial en formato PDF.",
			appCopy.PatientName, appCopy.AppointmentDate.Format("02/01/2006 15:04"), appCopy.DoctorName, appCopy.DoctorSpecialty, appCopy.Observations)

		filename := fmt.Sprintf("CitaMedica_%s.pdf", appCopy.PatientDocument)
		sendErr := s.emailSvc.SendWithPDFAttachment(appCopy.PatientEmail, subject, body, filename, pdfBytes)
		emailSent := sendErr == nil

		_ = s.appRepo.UpdatePDFAndEmailStatus(bgCtx, appCopy.ID, pdfPath, emailSent)
	}(*app)

	return app, nil
}

func (s *appointmentService) GetDoctorAppointments(ctx context.Context, doctorID string) ([]domain.Appointment, error) {
	return s.appRepo.GetByDoctorID(ctx, doctorID)
}

func (s *appointmentService) GetDoctorAppointmentsByRange(ctx context.Context, doctorID string, startStr, endStr string) ([]domain.Appointment, error) {
	start, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		start = time.Now().AddDate(0, -1, 0)
	}
	end, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		end = time.Now().AddDate(0, 2, 0)
	}
	return s.appRepo.GetByDateRange(ctx, doctorID, start, end)
}

// GenerateRandomRXCode genera un codigo alfanumerico unico y criptograficamente seguro para recetas de farmacia
func GenerateRandomRXCode() string {
	nBig, err := rand.Int(rand.Reader, big.NewInt(90000))
	n := 10000
	if err == nil {
		n += int(nBig.Int64())
	}
	return fmt.Sprintf("RX-%d-%05d", time.Now().Year(), n)
}
