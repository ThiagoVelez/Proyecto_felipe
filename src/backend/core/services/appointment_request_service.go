package services

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"net/mail"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/logger"
)

// AvailabilityWindow es el horizonte con el que se mide la carga de cada medico al asignar una solicitud.
const AvailabilityWindow = 14 * 24 * time.Hour

// requestMailer es lo unico que este servicio necesita del adaptador de correo.
type requestMailer interface {
	SendWithPDFAttachment(to, subject, body, pdfFilename string, pdfData []byte) error
}

type appointmentRequestService struct {
	requests     ports.AppointmentRequestRepository
	users        ports.UserRepository
	appointments ports.AppointmentRepository
	patients     ports.PatientService
	scheduler    ports.AppointmentService
	mailer       requestMailer
	log          *logger.Logger
	// mu serializa la asignacion y la atencion de solicitudes para que dos clics no agenden dos veces
	mu sync.Mutex
}

// NewAppointmentRequestService construye el servicio de solicitudes de primera cita del portal del paciente.
func NewAppointmentRequestService(requests ports.AppointmentRequestRepository, users ports.UserRepository,
	appointments ports.AppointmentRepository, patients ports.PatientService, scheduler ports.AppointmentService,
	mailer requestMailer, log *logger.Logger) ports.AppointmentRequestService {
	return &appointmentRequestService{requests: requests, users: users, appointments: appointments,
		patients: patients, scheduler: scheduler, mailer: mailer, log: log}
}

var phonePattern = regexp.MustCompile(`^[0-9+\s()-]{7,20}$`)

func runeLen(s string) int { return utf8.RuneCountInString(s) }

// validateRequest normaliza y valida los datos que el paciente escribe en el portal.
func validateRequest(req *domain.AppointmentRequest, consent bool) error {
	req.DocumentNumber = strings.TrimSpace(req.DocumentNumber)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.EPSName = strings.TrimSpace(req.EPSName)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Address = strings.TrimSpace(req.Address)
	req.Observations = strings.TrimSpace(req.Observations)

	if !consent {
		return domain.ErrConsentRequired
	}
	if _, ok := domain.PublicBranchByName(req.Branch); !ok {
		return domain.ErrUnknownBranch
	}
	now := time.Now().UTC()
	addr, mailErr := mail.ParseAddress(req.Email)
	switch {
	case !validDocumentTypes[req.DocumentType],
		req.DocumentNumber == "" || runeLen(req.DocumentNumber) > 25,
		req.FirstName == "" || runeLen(req.FirstName) > 80,
		req.LastName == "" || runeLen(req.LastName) > 80,
		req.EPSName == "" || runeLen(req.EPSName) > 100,
		!validGenders[req.Gender],
		!validBloodTypes[req.BloodType],
		req.BirthDate.IsZero() || req.BirthDate.After(now) || req.BirthDate.Before(now.AddDate(-120, 0, 0)),
		!phonePattern.MatchString(req.Phone),
		mailErr != nil || addr.Address != req.Email || runeLen(req.Email) > 100,
		runeLen(req.Address) > 200,
		runeLen(req.Observations) < 5 || runeLen(req.Observations) > 1000:
		return domain.ErrInvalidAppointmentRequest
	}
	return nil
}

// newRequestCode genera un codigo corto y legible para que el paciente identifique su solicitud.
func newRequestCode() string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			b[i] = alphabet[i]
			continue
		}
		b[i] = alphabet[n.Int64()]
	}
	return "SOL-" + string(b)
}

// pickDoctor elige al medico activo de la sede con menos carga: citas en los proximos 14 dias mas solicitudes
// pendientes. Ante empate, el de menos solicitudes pendientes y luego el orden alfabetico.
func (s *appointmentRequestService) pickDoctor(ctx context.Context, branch string) (*domain.User, error) {
	medico, active := 2, true
	doctors, err := s.users.List(ctx, &medico, &active)
	if err != nil {
		return nil, err
	}
	type candidate struct {
		user    *domain.User
		load    int
		pending int
	}
	now := time.Now().UTC()
	var candidates []candidate
	for _, d := range doctors {
		if !domain.BranchMatches(d.Branch, branch) {
			continue
		}
		upcoming, err := s.appointments.GetByDateRange(ctx, d.ID, now, now.Add(AvailabilityWindow))
		if err != nil {
			return nil, err
		}
		pending, err := s.requests.CountPendingByDoctor(ctx, d.ID)
		if err != nil {
			return nil, err
		}
		scheduled := 0
		for _, a := range upcoming {
			if a.Status != domain.AppointmentCancelled {
				scheduled++
			}
		}
		candidates = append(candidates, candidate{user: d, load: scheduled + pending, pending: pending})
	}
	if len(candidates) == 0 {
		return nil, domain.ErrNoDoctorAvailable
	}
	sort.Slice(candidates, func(i, j int) bool {
		a, b := candidates[i], candidates[j]
		if a.load != b.load {
			return a.load < b.load
		}
		if a.pending != b.pending {
			return a.pending < b.pending
		}
		return a.user.FullName < b.user.FullName
	})
	return candidates[0].user, nil
}

func (s *appointmentRequestService) Submit(ctx context.Context, req *domain.AppointmentRequest, consent bool) (*domain.AppointmentRequest, error) {
	if err := validateRequest(req, consent); err != nil {
		return nil, err
	}
	branch, _ := domain.PublicBranchByName(req.Branch)
	req.Branch = branch.Name

	s.mu.Lock()
	defer s.mu.Unlock()

	doctor, err := s.pickDoctor(ctx, req.Branch)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	req.ID = uuid.New().String()
	req.Code = newRequestCode()
	req.DoctorID = doctor.ID
	req.DoctorName = doctor.FullName
	req.Status = domain.RequestPending
	req.ConsentAt = now
	req.CreatedAt = now
	req.UpdatedAt = now
	req.ResponseNote, req.AppointmentID, req.PatientID = "", "", ""
	if err := s.requests.Create(ctx, req); err != nil {
		return nil, err
	}
	return req, nil
}

func (s *appointmentRequestService) ListForDoctor(ctx context.Context, doctorID string, status domain.AppointmentRequestStatus) ([]domain.AppointmentRequest, error) {
	return s.requests.ListByDoctor(ctx, doctorID, status)
}

func (s *appointmentRequestService) PendingCount(ctx context.Context, doctorID string) (int, error) {
	return s.requests.CountPendingByDoctor(ctx, doctorID)
}

// claim carga la solicitud y comprueba que sea del medico y siga pendiente.
func (s *appointmentRequestService) claim(ctx context.Context, doctorID, requestID string) (*domain.AppointmentRequest, error) {
	req, err := s.requests.GetByID(ctx, requestID)
	if err != nil {
		return nil, err
	}
	if req.DoctorID != doctorID {
		return nil, domain.ErrRequestNotAssigned
	}
	if req.Status != domain.RequestPending {
		return nil, domain.ErrRequestNotPending
	}
	return req, nil
}

// patientFor asocia la solicitud al paciente con el mismo documento o lo registra con los datos del portal.
// Si el paciente ya existia sin correo, se completa con el de la solicitud para poder enviarle la cita.
func (s *appointmentRequestService) patientFor(ctx context.Context, req *domain.AppointmentRequest) (*domain.Patient, error) {
	existing, err := s.patients.FindByDocument(ctx, req.DocumentType, req.DocumentNumber)
	if err == nil && existing != nil {
		if strings.TrimSpace(existing.Email) == "" {
			phone := req.Phone
			if existing.Phone != nil && *existing.Phone != "" {
				phone = *existing.Phone
			}
			address := existing.Address
			if address == "" {
				address = req.Address
			}
			if updated, err := s.patients.UpdateContact(ctx, existing.ID, req.Email, address, phone); err == nil && updated != nil {
				return updated, nil
			}
		}
		return existing, nil
	}
	if err != nil && !errors.Is(err, domain.ErrPatientNotFound) {
		return nil, err
	}
	phone := req.Phone
	return s.patients.RegisterPatient(ctx, &domain.Patient{
		DocumentType:      req.DocumentType,
		DocumentNumber:    req.DocumentNumber,
		FirstName:         req.FirstName,
		LastName:          req.LastName,
		BirthDate:         req.BirthDate,
		Gender:            req.Gender,
		BloodType:         req.BloodType,
		EPSName:           req.EPSName,
		AffiliationStatus: domain.AffiliationActive,
		Phone:             &phone,
		Email:             req.Email,
		Address:           req.Address,
	})
}

func (s *appointmentRequestService) Schedule(ctx context.Context, doctorID, requestID string, date time.Time, note string) (*domain.AppointmentRequest, *domain.Appointment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	req, err := s.claim(ctx, doctorID, requestID)
	if err != nil {
		return nil, nil, err
	}
	patient, err := s.patientFor(ctx, req)
	if err != nil {
		return nil, nil, err
	}
	note = strings.TrimSpace(note)
	observations := "Primera cita solicitada desde el portal del paciente. Motivo: " + req.Observations
	if note != "" {
		observations += "\nIndicaciones del médico: " + note
	}
	app, err := s.scheduler.ScheduleAppointment(ctx, &domain.Appointment{
		DoctorID:        doctorID,
		PatientID:       patient.ID,
		AppointmentDate: date,
		Observations:    observations,
	})
	if err != nil {
		return nil, nil, err
	}
	req.Status = domain.RequestScheduled
	req.AppointmentID = app.ID
	req.PatientID = patient.ID
	req.ResponseNote = note
	req.UpdatedAt = time.Now().UTC()
	if err := s.requests.Update(ctx, req); err != nil {
		return nil, nil, err
	}
	return req, app, nil
}

func (s *appointmentRequestService) Reject(ctx context.Context, doctorID, requestID, note string) (*domain.AppointmentRequest, error) {
	note = strings.TrimSpace(note)
	if note == "" || runeLen(note) > 500 {
		return nil, domain.ErrInvalidAppointmentRequest
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	req, err := s.claim(ctx, doctorID, requestID)
	if err != nil {
		return nil, err
	}
	req.Status = domain.RequestRejected
	req.ResponseNote = note
	req.UpdatedAt = time.Now().UTC()
	if err := s.requests.Update(ctx, req); err != nil {
		return nil, err
	}

	// Aviso al paciente en segundo plano: un fallo de correo no deshace la decision del medico
	if s.mailer != nil {
		go func(r domain.AppointmentRequest) {
			subject := fmt.Sprintf("Solicitud de cita %s - SaludConecta IPS", r.Code)
			body := fmt.Sprintf("Estimado(a) %s,\n\nSu solicitud de primera cita %s en %s no pudo ser agendada.\n\nMotivo: %s\n\nPuede enviar una nueva solicitud desde el portal del paciente o comunicarse con la sede.",
				r.FullName(), r.Code, r.Branch, r.ResponseNote)
			if err := s.mailer.SendWithPDFAttachment(r.Email, subject, body, "", nil); err != nil && s.log != nil {
				s.log.Warn("No se pudo avisar al paciente el rechazo de su solicitud", map[string]interface{}{"solicitud": r.Code})
			}
		}(*req)
	}
	return req, nil
}
