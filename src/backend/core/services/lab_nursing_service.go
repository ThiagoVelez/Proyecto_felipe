package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/mail"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

// LabOrderInput son los datos que envia el medico o la recepcion del laboratorio al crear una orden.
type LabOrderInput = ports.LabOrderInput

type labOrderService struct {
	orders   ports.LabOrderRepository
	users    ports.UserRepository
	patients ports.PatientRepository
	mailer   ports.Notifier
	log      ports.Logger
	mu       sync.Mutex
}

// NewLabOrderService construye el flujo de ordenes de laboratorio: emision, avance, sellado y despacho por correo.
func NewLabOrderService(orders ports.LabOrderRepository, users ports.UserRepository, patients ports.PatientRepository,
	mailer ports.Notifier, log ports.Logger) ports.LabOrderService {
	return &labOrderService{orders: orders, users: users, patients: patients, mailer: mailer, log: log}
}

func ageAt(birth time.Time, now time.Time) int {
	if birth.IsZero() {
		return 0
	}
	age := now.Year() - birth.Year()
	if now.YearDay() < birth.YearDay() {
		age--
	}
	return age
}

func genderLabel(g domain.Gender) string {
	switch g {
	case domain.GenderFemale:
		return "Femenino"
	case domain.GenderMale:
		return "Masculino"
	default:
		return "Otro"
	}
}

// fillPatient copia en la orden los datos vigentes del paciente registrado.
func fillPatient(o *domain.LabOrder, p *domain.Patient, now time.Time) {
	o.PatientID = p.ID
	o.PatientName = strings.TrimSpace(p.FullName())
	o.PatientDocument = p.DocumentNumber
	o.PatientDocumentType = string(p.DocumentType)
	o.PatientEmail = p.Email
	if p.Phone != nil {
		o.PatientPhone = *p.Phone
	}
	o.PatientEPS = p.EPSName
	if p.AffiliationType != "" {
		o.PatientEPS = fmt.Sprintf("%s (%s)", p.EPSName, p.AffiliationType)
	}
	o.PatientAge = ageAt(p.BirthDate, now)
	o.PatientGender = genderLabel(p.Gender)
}

func (s *labOrderService) actor(ctx context.Context, userID string) (*domain.User, error) {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *labOrderService) Create(ctx context.Context, actorID string, in ports.LabOrderInput) (*domain.LabOrder, error) {
	actor, err := s.actor(ctx, actorID)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	o := &domain.LabOrder{
		TestType:     strings.TrimSpace(in.TestType),
		SampleType:   strings.TrimSpace(in.SampleType),
		Priority:     strings.ToUpper(strings.TrimSpace(in.Priority)),
		Observations: strings.TrimSpace(in.Observations),
		Status:       domain.LabPending,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if o.Priority == "" {
		o.Priority = "RUTINA"
	}
	if o.SampleType == "" {
		o.SampleType = "Muestra biológica estándar"
	}
	if o.Observations == "" {
		o.Observations = "Sin observaciones clínicas adicionales."
	}
	if o.TestType == "" || runeLen(o.TestType) > 200 || runeLen(o.SampleType) > 150 || runeLen(o.Observations) > 1000 ||
		!domain.ValidLabPriorities[o.Priority] {
		return nil, domain.ErrInvalidLabOrder
	}

	// Paciente: el registrado si se indica; la recepcion del laboratorio puede registrar uno sin cuenta
	if strings.TrimSpace(in.PatientID) != "" {
		p, err := s.patients.GetByID(ctx, strings.TrimSpace(in.PatientID))
		if err != nil {
			return nil, err
		}
		fillPatient(o, p, now)
	} else {
		if actor.RoleName == "MEDICO" || actor.RoleID == 2 {
			return nil, domain.ErrInvalidLabOrder // el medico siempre ordena para un paciente registrado
		}
		o.PatientName = strings.TrimSpace(in.PatientName)
		o.PatientDocument = strings.TrimSpace(in.PatientDocument)
		o.PatientDocumentType = "CC"
		o.PatientEPS = strings.TrimSpace(in.PatientEPS)
		o.PatientEmail = strings.ToLower(strings.TrimSpace(in.PatientEmail))
		if o.PatientName == "" || o.PatientDocument == "" || runeLen(o.PatientName) > 150 || runeLen(o.PatientDocument) > 25 {
			return nil, domain.ErrInvalidLabOrder
		}
	}

	// Medico solicitante: el de la sesion; la recepcion del laboratorio indica el nombre del medico externo
	if actor.RoleID == 2 || actor.RoleName == "MEDICO" {
		o.OrderingDoctorID = actor.ID
		o.OrderingDoctor = actor.FullName
		o.DoctorLicense = actor.ProfessionalCard
		o.DoctorSpecialty = actor.Specialty
		o.DoctorEmail = actor.Email
	} else {
		o.OrderingDoctor = strings.TrimSpace(in.OrderingDoctor)
		if o.OrderingDoctor == "" {
			o.OrderingDoctor = "Orden emitida por recepción de laboratorio"
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.orders.CreateWithNextID(ctx, o); err != nil {
		return nil, err
	}
	return o, nil
}

func (s *labOrderService) List(ctx context.Context, actorID, role string, status domain.LabOrderStatus) ([]domain.LabOrder, error) {
	doctorFilter := ""
	if strings.EqualFold(role, "MEDICO") {
		doctorFilter = actorID // el medico ve las ordenes que emitio; el laboratorio ve todas
	}
	list, err := s.orders.List(ctx, doctorFilter, status)
	if err != nil {
		return nil, err
	}
	// Los datos de contacto se muestran siempre actualizados con la ficha vigente del paciente
	cache := map[string]*domain.Patient{}
	now := time.Now().UTC()
	for i := range list {
		id := list[i].PatientID
		if id == "" {
			continue
		}
		p, ok := cache[id]
		if !ok {
			p, _ = s.patients.GetByID(ctx, id)
			cache[id] = p
		}
		if p != nil {
			fillPatient(&list[i], p, now)
		}
	}
	return list, nil
}

func (s *labOrderService) editable(ctx context.Context, id string) (*domain.LabOrder, error) {
	o, err := s.orders.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if o.Status == domain.LabCompleted {
		return nil, domain.ErrLabOrderSealed
	}
	return o, nil
}

func (s *labOrderService) SaveProgress(ctx context.Context, actorID, id, results, methodNotes string) (*domain.LabOrder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	o, err := s.editable(ctx, id)
	if err != nil {
		return nil, err
	}
	if runeLen(results) > 20000 || runeLen(methodNotes) > 2000 {
		return nil, domain.ErrInvalidLabOrder
	}
	o.Status = domain.LabInProgress
	o.Results = results
	o.MethodNotes = methodNotes
	o.UpdatedAt = time.Now().UTC()
	if err := s.orders.Update(ctx, o); err != nil {
		return nil, err
	}
	return o, nil
}

func (s *labOrderService) Seal(ctx context.Context, actorID, id, results, methodNotes string) (*domain.LabOrder, error) {
	actor, err := s.actor(ctx, actorID)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(results) == "" {
		return nil, domain.ErrLabResultsRequired
	}
	if runeLen(results) > 20000 || runeLen(methodNotes) > 2000 {
		return nil, domain.ErrInvalidLabOrder
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	o, err := s.editable(ctx, id)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	o.Status = domain.LabCompleted
	o.Results = results
	o.MethodNotes = methodNotes
	o.ValidatedAt = &now
	o.ValidatedBy = actor.FullName
	o.BacteriologistLicense = actor.ProfessionalCard
	o.UpdatedAt = now
	if err := s.orders.Update(ctx, o); err != nil {
		return nil, err
	}
	return o, nil
}

func (s *labOrderService) Dispatch(ctx context.Context, actorID, role, id, email string, copyDoctor bool) (*domain.LabOrder, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if addr, err := mail.ParseAddress(email); err != nil || addr.Address != email {
		return nil, domain.ErrInvalidLabOrder
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	o, err := s.orders.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if strings.EqualFold(role, "MEDICO") && o.OrderingDoctorID != actorID {
		return nil, domain.ErrLabOrderNotFound // un medico solo ve y reenvia sus propias ordenes
	}
	if o.Status != domain.LabCompleted || o.ValidatedAt == nil {
		return nil, domain.ErrLabOrderNotSealed
	}
	subject := fmt.Sprintf("Resultado de laboratorio %s - SaludConecta IPS", o.ID)
	body := fmt.Sprintf("Estimado(a) %s,\n\nAdjuntamos el resultado oficial de su examen de laboratorio.\n\nOrden: %s\nExamen: %s\nMuestra: %s\nValidado por: %s (%s) el %s\n\nRESULTADOS\n%s\n\nNotas del método: %s\n\nEste resultado fue validado y sellado con registro ReTHUS. Consulte a su médico tratante para su interpretación.",
		o.PatientName, o.ID, o.TestType, o.SampleType, o.ValidatedBy, o.BacteriologistLicense,
		domain.FormatColombia(*o.ValidatedAt), o.Results, o.MethodNotes)
	if s.mailer != nil {
		if err := s.mailer.SendWithPDFAttachment(email, subject, body, "", nil); err != nil {
			return nil, fmt.Errorf("no fue posible enviar el correo: %w", err)
		}
		if copyDoctor && o.DoctorEmail != "" {
			if err := s.mailer.SendWithPDFAttachment(o.DoctorEmail, "[Copia médico] "+subject, body, "", nil); err != nil && s.log != nil {
				s.log.Warn("No se pudo enviar la copia del resultado al medico", map[string]interface{}{"orden": o.ID})
			}
		}
	}
	now := time.Now().UTC()
	o.EmailDispatchedAt = &now
	o.DispatchedTo = email
	o.UpdatedAt = now
	if err := s.orders.Update(ctx, o); err != nil {
		return nil, err
	}
	return o, nil
}

// ---------------------------------------------------------------------------------------------
// Enfermeria
// ---------------------------------------------------------------------------------------------

type nursingService struct {
	care     ports.NursingRepository
	users    ports.UserRepository
	patients ports.PatientRepository
	mu       sync.Mutex
}

// NewNursingService construye el registro de enfermeria del servidor (orden del medico, deberes y notas).
func NewNursingService(care ports.NursingRepository, users ports.UserRepository, patients ports.PatientRepository) ports.NursingService {
	return &nursingService{care: care, users: users, patients: patients}
}

func strPtr(s string) *string { return &s }

// defaultDuties es la lista inicial de deberes de enfermeria de un paciente (antes se generaba en el navegador).
func defaultDuties(allergyNote string, meds []domain.NursingDuty) []domain.NursingDuty {
	if allergyNote == "" {
		allergyNote = "Preguntar al paciente por reacciones adversas a medicamentos"
	}
	duties := []domain.NursingDuty{
		{ID: "id-verify", Category: "SEGURIDAD", Label: "Verificar identificación: brazalete, cédula y entidad de salud (EPS)",
			Instructions: "Comprobar datos cruzados con el paciente antes de cualquier procedimiento"},
		{ID: "allergy-check", Category: "SEGURIDAD", Label: "Revisión y confirmación de alergias farmacológicas conocidas",
			Instructions: allergyNote},
	}
	duties = append(duties, meds...)
	return append(duties,
		domain.NursingDuty{ID: "vital-signs", Category: "MONITOREO", Label: "Monitoreo horario de signos vitales (PA, FC, FR, SpO2, Temperatura)",
			Instructions: "Registrar en curva térmica asistencial"},
		domain.NursingDuty{ID: "iv-line", Category: "ACCESOS", Label: "Inspección de vía venosa periférica / permeabilidad de catéter",
			Instructions: "Descartar signos de flebitis, extravasación o dolor en sitio de punción"},
		domain.NursingDuty{ID: "diet-intake", Category: "NUTRICION", Label: "Control de tolerancia oral, ingesta de líquidos y dieta asistencial",
			Instructions: "Confirmar recepción y tolerancia de alimentación programada"},
		domain.NursingDuty{ID: "comfort-safety", Category: "CONFORT", Label: "Medidas de seguridad física: barandas elevadas y timbre al alcance",
			Instructions: "Prevención activa de caídas según protocolo institucional"},
	)
}

func (s *nursingService) allergyNote(ctx context.Context, patientID string) string {
	p, err := s.patients.GetByID(ctx, patientID)
	if err != nil || p == nil || len(p.Allergies) == 0 {
		return ""
	}
	names := make([]string, 0, len(p.Allergies))
	for _, a := range p.Allergies {
		names = append(names, a.ActiveIngredient)
	}
	return "Alerta reportada: " + strings.Join(names, ", ")
}

func (s *nursingService) current(ctx context.Context, patientID string) (*domain.NursingCare, error) {
	c, err := s.care.Get(ctx, patientID)
	if err == nil {
		c.Saved = true
		return c, nil
	}
	if err != domain.ErrNursingCareNotFound {
		return nil, err
	}
	if _, err := s.patients.GetByID(ctx, patientID); err != nil {
		return nil, err
	}
	return &domain.NursingCare{PatientID: patientID, Duties: defaultDuties(s.allergyNote(ctx, patientID), nil), Notes: []domain.NursingNote{}}, nil
}

func (s *nursingService) Get(ctx context.Context, patientID string) (*domain.NursingCare, error) {
	return s.current(ctx, patientID)
}

func (s *nursingService) List(ctx context.Context) ([]domain.NursingCare, error) {
	list, err := s.care.List(ctx)
	for i := range list {
		list[i].Saved = true
	}
	return list, err
}

func (s *nursingService) name(ctx context.Context, userID string) string {
	if u, err := s.users.GetByID(ctx, userID); err == nil && u != nil {
		return u.FullName
	}
	return "Personal asistencial"
}

func (s *nursingService) AssignOrder(ctx context.Context, actorID, patientID string, order json.RawMessage, meds []domain.NursingDuty) (*domain.NursingCare, error) {
	if len(order) == 0 || !json.Valid(order) || len(order) > 200000 {
		return nil, domain.ErrInvalidNursingData
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	c, err := s.current(ctx, patientID)
	if err != nil {
		return nil, err
	}
	medDuties := make([]domain.NursingDuty, 0, len(meds))
	for i, m := range meds {
		label := strings.TrimSpace(m.Label)
		if label == "" || runeLen(label) > 300 {
			return nil, domain.ErrInvalidNursingData
		}
		medDuties = append(medDuties, domain.NursingDuty{ID: fmt.Sprintf("med-%d-%s", i, uuid.New().String()[:8]),
			Category: "MEDICAMENTOS", Label: label, Instructions: strings.TrimSpace(m.Instructions)})
	}
	if !c.Saved {
		c.Duties = defaultDuties(s.allergyNote(ctx, patientID), medDuties)
	} else {
		// Se reemplazan los deberes de medicamentos por los de la nueva formula; el resto se conserva
		kept := make([]domain.NursingDuty, 0, len(c.Duties))
		for _, d := range c.Duties {
			if d.Category != "MEDICAMENTOS" {
				kept = append(kept, d)
			}
		}
		c.Duties = append(kept, medDuties...)
	}
	c.Order = order
	c.UpdatedAt = time.Now().UTC()
	c.UpdatedBy = s.name(ctx, actorID)
	if err := s.care.Save(ctx, c); err != nil {
		return nil, err
	}
	c.Saved = true
	return c, nil
}

func (s *nursingService) SaveDuties(ctx context.Context, actorID, patientID string, duties []domain.NursingDuty) (*domain.NursingCare, error) {
	if len(duties) > 200 {
		return nil, domain.ErrInvalidNursingData
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	c, err := s.current(ctx, patientID)
	if err != nil {
		return nil, err
	}
	previous := map[string]domain.NursingDuty{}
	for _, d := range c.Duties {
		previous[d.ID] = d
	}
	actor := s.name(ctx, actorID)
	hour := time.Now().In(domain.ColombiaLocation()).Format("15:04")
	out := make([]domain.NursingDuty, 0, len(duties))
	for _, d := range duties {
		d.ID = strings.TrimSpace(d.ID)
		d.Label = strings.TrimSpace(d.Label)
		if d.ID == "" || d.Label == "" || runeLen(d.Label) > 300 || runeLen(d.Instructions) > 500 || runeLen(d.Category) > 30 {
			return nil, domain.ErrInvalidNursingData
		}
		prev, existed := previous[d.ID]
		switch {
		case !d.Completed:
			d.CompletedAt, d.CompletedBy = nil, nil
		case existed && prev.Completed:
			d.CompletedAt, d.CompletedBy = prev.CompletedAt, prev.CompletedBy // se conserva quien lo completo
		default:
			// Quien completa el deber y a que hora lo registra el servidor, no el navegador
			d.CompletedAt, d.CompletedBy = strPtr(hour), strPtr(actor)
		}
		out = append(out, d)
	}
	c.Duties = out
	c.UpdatedAt = time.Now().UTC()
	c.UpdatedBy = actor
	if err := s.care.Save(ctx, c); err != nil {
		return nil, err
	}
	c.Saved = true
	return c, nil
}

func (s *nursingService) AddNote(ctx context.Context, actorID, patientID, content string) (*domain.NursingCare, error) {
	content = strings.TrimSpace(content)
	if content == "" || runeLen(content) > 3000 {
		return nil, domain.ErrInvalidNursingData
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	c, err := s.current(ctx, patientID)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	note := domain.NursingNote{
		ID:        "note-" + uuid.New().String()[:8],
		Timestamp: now.In(domain.ColombiaLocation()).Format("02/01/06, 15:04"),
		Author:    s.name(ctx, actorID),
		Content:   content,
		CreatedAt: now,
	}
	// Solo anexo: la nota nueva va primero y las anteriores no se modifican
	c.Notes = append([]domain.NursingNote{note}, c.Notes...)
	c.UpdatedAt = now
	c.UpdatedBy = note.Author
	if err := s.care.Save(ctx, c); err != nil {
		return nil, err
	}
	c.Saved = true
	return c, nil
}
