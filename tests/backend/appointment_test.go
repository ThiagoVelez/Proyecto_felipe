package backend_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"saludconecta-backend/adapters/email"
	"saludconecta-backend/adapters/pdf"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/logger"
)

func TestAppointment_RejectsPastDates(t *testing.T) {
	ds := memory.NewDataStore()
	appRepo := memory.NewAppointmentMemoryRepo(ds)
	patientRepo := memory.NewPatientMemoryRepo(ds)
	userRepo := memory.NewUserMemoryRepo(ds)
	log := logger.New()

	pdfGen := pdf.NewGenerator(t.TempDir())
	emailSvc := email.NewService(email.Config{}, log)

	svc := services.NewAppointmentService(appRepo, patientRepo, userRepo, pdfGen, emailSvc, log)

	// Cita en fecha pasada (ayer)
	pastApp := &domain.Appointment{
		DoctorID:        "doc-01",
		PatientID:       "pat-01",
		AppointmentDate: time.Now().Add(-24 * time.Hour),
		Observations:    "Control general",
	}

	_, err := svc.ScheduleAppointment(context.Background(), pastApp)
	if err == nil {
		t.Fatalf("se esperaba error al agendar cita en el pasado, se obtuvo nil")
	}
	if !errors.Is(err, domain.ErrAppointmentInPast) {
		t.Errorf("error esperado %v, obtenido %v", domain.ErrAppointmentInPast, err)
	}
}

func TestAppointment_RejectsScheduleOverlap(t *testing.T) {
	ds := memory.NewDataStore()
	appRepo := memory.NewAppointmentMemoryRepo(ds)
	patientRepo := memory.NewPatientMemoryRepo(ds)
	userRepo := memory.NewUserMemoryRepo(ds)
	log := logger.New()

	pdfGen := pdf.NewGenerator(t.TempDir())
	emailSvc := email.NewService(email.Config{}, log)

	svc := services.NewAppointmentService(appRepo, patientRepo, userRepo, pdfGen, emailSvc, log)

	futureTime := time.Now().Add(48 * time.Hour)

	// Primera cita exitosa
	firstApp := &domain.Appointment{
		DoctorID:        "doc-01",
		PatientID:       "pat-01",
		AppointmentDate: futureTime,
		Observations:    "Consulta inicial de cardiología",
	}
	created, err := svc.ScheduleAppointment(context.Background(), firstApp)
	if err != nil {
		t.Fatalf("fallo al crear primera cita valida: %v", err)
	}
	if created.Status != domain.AppointmentScheduled {
		t.Errorf("estado esperado SCHEDULED, obtenido %s", created.Status)
	}

	// Segunda cita para el mismo médico 5 minutos después (dentro del rango de solapamiento de 20 min)
	overlapApp := &domain.Appointment{
		DoctorID:        "doc-01",
		PatientID:       "pat-02",
		AppointmentDate: futureTime.Add(5 * time.Minute),
		Observations:    "Intento de agendamiento solapado",
	}
	_, err = svc.ScheduleAppointment(context.Background(), overlapApp)
	if err == nil {
		t.Fatalf("se esperaba error de solapamiento de agenda, se obtuvo nil")
	}
	if !errors.Is(err, domain.ErrDoctorScheduleOverlap) {
		t.Errorf("error esperado %v, obtenido %v", domain.ErrDoctorScheduleOverlap, err)
	}
}

func TestAppointment_ScheduleSuccessAndRetrieve(t *testing.T) {
	ds := memory.NewDataStore()
	appRepo := memory.NewAppointmentMemoryRepo(ds)
	patientRepo := memory.NewPatientMemoryRepo(ds)
	userRepo := memory.NewUserMemoryRepo(ds)
	log := logger.New()

	// Sembrar paciente y doctor
	pat := newPatientFixture("pat-ok", "111222333")
	pat.Email = "paciente.test@saludconecta.local"
	_ = patientRepo.Create(context.Background(), pat)

	doc := newDoctorFixture("doc-ok", "RM-99412")
	_ = userRepo.Create(context.Background(), doc)

	pdfGen := pdf.NewGenerator(t.TempDir())
	emailSvc := email.NewService(email.Config{}, log)

	svc := services.NewAppointmentService(appRepo, patientRepo, userRepo, pdfGen, emailSvc, log)

	targetDate := time.Now().Add(72 * time.Hour)
	app := &domain.Appointment{
		DoctorID:        doc.ID,
		PatientID:       pat.ID,
		AppointmentDate: targetDate,
		Observations:    "Revisión de paraclínicos y ajuste de dosis",
	}

	scheduled, err := svc.ScheduleAppointment(context.Background(), app)
	if err != nil {
		t.Fatalf("error agendando cita valida: %v", err)
	}
	if scheduled.ID == "" {
		t.Errorf("se esperaba que la cita recibiera un UUID asignado")
	}

	// Consultar citas del médico
	list, err := svc.GetDoctorAppointments(context.Background(), doc.ID)
	if err != nil {
		t.Fatalf("error listando citas: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("se esperaba 1 cita en el calendario del medico, encontradas %d", len(list))
	}
	if list[0].DoctorSpecialty != doc.Specialty {
		t.Errorf("especialidad esperada %s, obtenida %s", doc.Specialty, list[0].DoctorSpecialty)
	}
}

