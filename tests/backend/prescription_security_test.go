package backend_test

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
)

type prescriptionEnv struct {
	ctx      context.Context
	store    *memory.DataStore
	patients ports.PatientRepository
	records  ports.ClinicalRecordRepository
	presc    ports.PrescriptionRepository
	service  ports.PrescriptionService
}

func newPrescriptionEnv(t *testing.T) *prescriptionEnv {
	t.Helper()
	store := memory.NewDataStore()
	env := &prescriptionEnv{
		ctx:      context.Background(),
		store:    store,
		patients: memory.NewPatientMemoryRepo(store),
		records:  memory.NewClinicalRecordMemoryRepo(store),
		presc:    memory.NewPrescriptionMemoryRepo(store),
	}
	env.service = services.NewPrescriptionService(env.presc, env.records, env.patients)
	return env
}

func (e *prescriptionEnv) patientWithAllergy(t *testing.T, id, doc, ingredient string) *domain.Patient {
	t.Helper()
	patient := newPatientFixture(id, doc)
	if err := e.patients.Create(e.ctx, patient); err != nil {
		t.Fatalf("no se pudo crear el paciente: %v", err)
	}
	if ingredient != "" {
		allergy := &domain.PatientAllergy{PatientID: id, ActiveIngredient: ingredient, Severity: domain.SeveritySevere}
		if err := e.patients.AddPatientAllergy(e.ctx, allergy); err != nil {
			t.Fatalf("no se pudo registrar la alergia: %v", err)
		}
	}
	return patient
}

func (e *prescriptionEnv) record(t *testing.T, id, patientID, doctorID string) {
	t.Helper()
	rec := &domain.ClinicalRecord{
		ID: id, PatientID: patientID, DoctorID: doctorID,
		Anamnesis: "a", PhysicalExam: "e", CIE11Code: "CA02", DiagnosisDescription: "d", TreatmentPlan: "t",
		CreatedAt: time.Now().UTC(),
	}
	if err := e.records.Create(e.ctx, rec); err != nil {
		t.Fatalf("no se pudo crear el folio: %v", err)
	}
}

func (e *prescriptionEnv) issue(medicationID int, recordID, patientID, doctorID string) error {
	_, err := e.service.IssuePrescription(e.ctx, &domain.Prescription{
		ClinicalRecordID: recordID,
		PatientID:        patientID,
		DoctorID:         doctorID,
		Items:            []domain.PrescriptionItem{{MedicationID: medicationID, Dosage: "1", FrequencyHours: 8, DurationDays: 3, TotalQuantity: 3}},
	})
	return err
}

// El cruce de alergias debe usar el paciente del folio, no el que declare el cliente.
func TestAllergyCrossCheckUsesRecordPatient(t *testing.T) {
	env := newPrescriptionEnv(t)
	allergic := env.patientWithAllergy(t, "p-alergico", "111", "PENICILINA")
	clean := env.patientWithAllergy(t, "p-sano", "222", "")
	env.record(t, "cr-1", allergic.ID, "doc-1")
	startMedInjection(env.store, &domain.MedicationCatalog{ID: 201, GenericName: "Amoxicilina", ActiveIngredient: "AMOXICILINA", StockQuantity: 100, CommercialName: "Amoxil"})

	t.Run("paciente ajeno en la solicitud no evade el cruce", func(t *testing.T) {
		err := env.issue(201, "cr-1", clean.ID, "doc-1")
		if !errors.Is(err, domain.ErrPatientMismatch) {
			t.Fatalf("se esperaba ErrPatientMismatch y se obtuvo: %v", err)
		}
	})

	t.Run("paciente omitido se resuelve desde el folio y se bloquea", func(t *testing.T) {
		err := env.issue(201, "cr-1", "", "doc-1")
		var conflict *domain.AllergyConflictError
		if !errors.As(err, &conflict) {
			t.Fatalf("se esperaba conflicto de alergia y se obtuvo: %v", err)
		}
		if conflict.PatientID != allergic.ID {
			t.Fatalf("el conflicto debe referirse al paciente del folio, obtuvo %s", conflict.PatientID)
		}
	})
}

// Alergia a una familia o con distinta ortografia debe bloquear al medicamento.
func TestAllergyFamilyAndAccentMatching(t *testing.T) {
	cases := []struct {
		name       string
		allergy    string
		ingredient string
		generic    string
		blocked    bool
	}{
		{"penicilina bloquea amoxicilina", "PENICILINA", "AMOXICILINA", "Amoxicilina", true},
		{"penicilinas en plural", "Penicilinas", "AMOXICILINA", "Amoxicilina", true},
		{"betalactamicos bloquea cefalexina", "BETALACTAMICOS", "CEFALEXINA", "Cefalexina", true},
		{"alergia a amoxicilina bloquea la asociacion", "Amoxicilina", "AMOXICILINA + ACIDO CLAVULANICO", "Amoxicilina + Acido clavulanico", true},
		{"acido con tilde frente a sin tilde", "ÁCIDO ACETILSALICÍLICO", "ACIDO ACETILSALICILICO", "Aspirina", true},
		{"sin tilde frente a con tilde", "acido acetilsalicilico", "ÁCIDO ACETILSALICÍLICO", "Aspirina", true},
		{"aine bloquea ibuprofeno", "AINEs", "IBUPROFENO", "Ibuprofeno", true},
		{"principio activo generico via nombre generico", "BETALACTAMICOS", "BETALACTAMICOS", "Amoxicilina", true},
		{"penicilina no bloquea paracetamol", "PENICILINA", "PARACETAMOL", "Acetaminofen", false},
		{"cefalosporina no bloquea losartan", "CEFALOSPORINA", "LOSARTAN", "Losartan", false},
	}

	for i, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			env := newPrescriptionEnv(t)
			patient := env.patientWithAllergy(t, "p-fam", "999", tc.allergy)
			env.record(t, "cr-fam", patient.ID, "doc-1")
			medID := 300 + i
			startMedInjection(env.store, &domain.MedicationCatalog{
				ID: medID, CommercialName: tc.generic, GenericName: tc.generic, ActiveIngredient: tc.ingredient, StockQuantity: 50,
			})

			err := env.issue(medID, "cr-fam", patient.ID, "doc-1")
			var conflict *domain.AllergyConflictError
			if got := errors.As(err, &conflict); got != tc.blocked {
				t.Fatalf("bloqueo=%v, esperado=%v (err=%v)", got, tc.blocked, err)
			}
			if !tc.blocked && err != nil {
				t.Fatalf("la prescripcion segura no debia fallar: %v", err)
			}
		})
	}
}

// Solo el medico autor del folio puede prescribir sobre el.
func TestPrescriptionRequiresRecordAuthor(t *testing.T) {
	env := newPrescriptionEnv(t)
	patient := env.patientWithAllergy(t, "p-aut", "333", "")
	env.record(t, "cr-aut", patient.ID, "doc-autor")
	startMedInjection(env.store, &domain.MedicationCatalog{ID: 401, GenericName: "Paracetamol", ActiveIngredient: "PARACETAMOL", StockQuantity: 10})

	if err := env.issue(401, "cr-aut", patient.ID, "doc-otro"); !errors.Is(err, domain.ErrNotRecordOwner) {
		t.Fatalf("se esperaba ErrNotRecordOwner y se obtuvo: %v", err)
	}
	if err := env.issue(401, "cr-aut", patient.ID, "doc-autor"); err != nil {
		t.Fatalf("el autor debia poder prescribir: %v", err)
	}
}

// Prescripciones concurrentes no deben provocar condiciones de carrera sobre el stock (ejecutar con -race).
func TestConcurrentPrescriptionsDoNotRaceOnStock(t *testing.T) {
	env := newPrescriptionEnv(t)
	patient := env.patientWithAllergy(t, "p-race", "444", "")
	env.record(t, "cr-race", patient.ID, "doc-1")
	startMedInjection(env.store, &domain.MedicationCatalog{ID: 501, GenericName: "Paracetamol", ActiveIngredient: "PARACETAMOL", StockQuantity: 1000})

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = env.issue(501, "cr-race", patient.ID, "doc-1")
			if _, err := env.presc.GetMedicationByID(env.ctx, 501); err != nil {
				t.Errorf("lectura de medicamento fallo: %v", err)
			}
		}()
	}
	wg.Wait()

	med, _ := env.presc.GetMedicationByID(env.ctx, 501)
	if med.StockQuantity != 1000-20*3 {
		t.Fatalf("stock inconsistente: %d", med.StockQuantity)
	}
}

// GetMedicationByID debe devolver una copia: mutarla no altera el catalogo.
func TestGetMedicationReturnsCopy(t *testing.T) {
	env := newPrescriptionEnv(t)
	startMedInjection(env.store, &domain.MedicationCatalog{ID: 601, GenericName: "X", ActiveIngredient: "X", StockQuantity: 5})

	med, _ := env.presc.GetMedicationByID(env.ctx, 601)
	med.StockQuantity = 9999

	again, _ := env.presc.GetMedicationByID(env.ctx, 601)
	if again.StockQuantity != 5 {
		t.Fatalf("el catalogo interno fue modificado a traves del puntero devuelto: %d", again.StockQuantity)
	}
}
