package backend_test

import (
	"context"
	"errors"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
)

func stableVitals(patientID string) *domain.TriageRecord {
	return &domain.TriageRecord{
		PatientID: patientID, EvaluatedBy: "u-nurse", SystolicBP: 118, DiastolicBP: 76, HeartRate: 72,
		RespiratoryRate: 16, OxygenSaturation: 99, BodyTemperature: 36.6, GlasgowScore: 15,
		ReasonForConsultation: "control",
	}
}

func newTriageService(t *testing.T) (ports.TriageService, string) {
	t.Helper()
	store := memory.NewDataStore()
	patients := memory.NewPatientMemoryRepo(store)
	patient := newPatientFixture("p-triage-sec", "8001")
	if err := patients.Create(context.Background(), patient); err != nil {
		t.Fatal(err)
	}
	return services.NewTriageService(memory.NewTriageMemoryRepo(store), patients), patient.ID
}

// Un nivel enviado por el cliente fuera del catalogo, o menos urgente que el clinico, se rechaza.
func TestTriageRejectsClientLevelOutsideCatalog(t *testing.T) {
	svc, patientID := newTriageService(t)
	ctx := context.Background()

	invalid := stableVitals(patientID)
	invalid.ManchesterLevel = "NIVEL_X"
	if _, err := svc.RegisterTriage(ctx, invalid); !errors.Is(err, domain.ErrInvalidManchesterLevel) {
		t.Fatalf("un nivel fuera del catalogo debia rechazarse: %v", err)
	}

	critical := stableVitals(patientID)
	critical.GlasgowScore = 6
	critical.ManchesterLevel = domain.ManchesterLevelV
	if _, err := svc.RegisterTriage(ctx, critical); !errors.Is(err, domain.ErrInvalidManchesterLevel) {
		t.Fatalf("no se puede rebajar a NIVEL_V a un paciente en coma: %v", err)
	}

	escalated := stableVitals(patientID)
	escalated.ManchesterLevel = domain.ManchesterLevelII
	saved, err := svc.RegisterTriage(ctx, escalated)
	if err != nil || saved.ManchesterLevel != domain.ManchesterLevelII {
		t.Fatalf("el escalamiento clinico a un nivel mas urgente debia aceptarse: %v / %v", saved, err)
	}

	forced := stableVitals(patientID)
	forced.Status = domain.TriageStatusFinished
	saved, err = svc.RegisterTriage(ctx, forced)
	if err != nil || saved.Status != domain.TriageStatusPending {
		t.Fatalf("el estado inicial debe ser PENDIENTE: %v / %v", saved, err)
	}
}

// Las alteraciones termicas aisladas no pueden clasificarse como no urgentes.
func TestTriageTemperatureDiscriminators(t *testing.T) {
	cases := []struct {
		temp float64
		want domain.ManchesterLevel
	}{
		{27.5, domain.ManchesterLevelI},
		{30.0, domain.ManchesterLevelII},
		{31.9, domain.ManchesterLevelII},
		{33.0, domain.ManchesterLevelIII},
		{34.9, domain.ManchesterLevelIII},
		{35.0, domain.ManchesterLevelV},
		{36.6, domain.ManchesterLevelV},
		{37.5, domain.ManchesterLevelIV},
		{38.5, domain.ManchesterLevelIII},
		{40.0, domain.ManchesterLevelII},
		{41.5, domain.ManchesterLevelI},
	}
	for _, tc := range cases {
		record := stableVitals("p")
		record.BodyTemperature = tc.temp
		if got := record.SuggestManchesterPriority(); got != tc.want {
			t.Errorf("temperatura %.1f: esperado %s, obtenido %s", tc.temp, tc.want, got)
		}
	}
}

// Los valores fisiologicamente imposibles se rechazan antes de clasificar.
func TestTriageRejectsImplausibleVitals(t *testing.T) {
	svc, patientID := newTriageService(t)
	for name, mutate := range map[string]func(*domain.TriageRecord){
		"temperatura 100": func(r *domain.TriageRecord) { r.BodyTemperature = 100 },
		"temperatura 10":  func(r *domain.TriageRecord) { r.BodyTemperature = 10 },
		"frecuencia 500":  func(r *domain.TriageRecord) { r.HeartRate = 500 },
		"presion 900":     func(r *domain.TriageRecord) { r.SystolicBP = 900 },
		"respiracion 200": func(r *domain.TriageRecord) { r.RespiratoryRate = 200 },
		"diastolica 400":  func(r *domain.TriageRecord) { r.DiastolicBP = 400 },
	} {
		record := stableVitals(patientID)
		mutate(record)
		if _, err := svc.RegisterTriage(context.Background(), record); !errors.Is(err, domain.ErrInvalidVitals) {
			t.Errorf("%s: se esperaba ErrInvalidVitals y se obtuvo %v", name, err)
		}
	}
}

func TestTriageQueueOrderedByPriority(t *testing.T) {
	svc, patientID := newTriageService(t)
	ctx := context.Background()

	low := stableVitals(patientID)
	high := stableVitals(patientID)
	high.OxygenSaturation = 80
	for _, record := range []*domain.TriageRecord{low, high} {
		if _, err := svc.RegisterTriage(ctx, record); err != nil {
			t.Fatal(err)
		}
	}

	queue, err := svc.GetTriageQueue(ctx)
	if err != nil || len(queue) != 2 {
		t.Fatalf("cola invalida: %v %v", queue, err)
	}
	if queue[0].ManchesterLevel != domain.ManchesterLevelI {
		t.Fatalf("la cola debe iniciar con el caso mas urgente, inicia con %s", queue[0].ManchesterLevel)
	}
}
