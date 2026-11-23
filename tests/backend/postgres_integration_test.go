//go:build integration

package backend_test

// Pruebas contra PostgreSQL real (DEF-25, DEF-65). Se ejecutan con:
//
//	PG_TEST_HOST=127.0.0.1 PG_TEST_PORT=5432 PG_TEST_USER=... PG_TEST_PASSWORD=... PG_TEST_DB=... \
//	  go test -tags integration -run TestPostgres ./...

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"

	"saludconecta-backend/adapters/storage/postgres"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

func conexionPostgresPrueba(t *testing.T) *sql.DB {
	t.Helper()
	host := os.Getenv("PG_TEST_HOST")
	if host == "" {
		t.Skip("PG_TEST_HOST no definido")
	}
	db, err := postgres.NewConnection(postgres.Config{Host: host, Port: os.Getenv("PG_TEST_PORT"), User: os.Getenv("PG_TEST_USER"),
		Password: os.Getenv("PG_TEST_PASSWORD"), DBName: os.Getenv("PG_TEST_DB")})
	if err != nil {
		t.Fatalf("conexion: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	for i := 0; i < 2; i++ { // la migracion es idempotente
		if err := postgres.Migrate(db); err != nil {
			t.Fatalf("migracion %d: %v", i+1, err)
		}
	}
	return db
}

// DEF-65: con PostgreSQL el triaje guarda la escala de dolor y el paciente su correo y direccion.
// DEF-25: los disparadores impiden modificar o borrar un folio cerrado y sus notas aclaratorias.
func TestPostgresTriajeContactoEInmutabilidad(t *testing.T) {
	db := conexionPostgresPrueba(t)
	ctx := context.Background()
	users := postgres.NewUserRepository(db)
	patients := postgres.NewPatientRepository(db)

	medico := newDoctorFixture(uuid.New().String(), "RM-PG-"+uuid.New().String()[:6])
	medico.Email = "medico-" + medico.ID[:8] + "@ips.example"
	medico.PasswordHash = "$2a$12$abcdefghijklmnopqrstuuv0123456789abcdefghijklmnopqrstu"
	if err := users.Create(ctx, medico); err != nil {
		t.Fatalf("crear medico: %v", err)
	}
	paciente := newPatientFixture(uuid.New().String(), fmt.Sprintf("40%08d", time.Now().UnixNano()%100000000))
	if err := patients.Create(ctx, paciente); err != nil {
		t.Fatalf("crear paciente: %v", err)
	}
	if err := patients.UpdateContact(ctx, paciente.ID, "lucia@correo.example", "Calle 1 # 2-3", "3001234567"); err != nil {
		t.Fatalf("DEF-65 contacto del paciente: %v", err)
	}
	leido, err := patients.GetByID(ctx, paciente.ID)
	if err != nil || leido.Email != "lucia@correo.example" {
		t.Fatalf("correo del paciente: %+v (%v)", leido, err)
	}

	triage := services.NewTriageService(postgres.NewTriageRepository(db), patients)
	signos := stableVitals(paciente.ID)
	signos.EvaluatedBy = medico.ID
	signos.PainScaleScore = 6
	obs := "dolor lumbar"
	signos.PainScaleObservations = obs
	guardado, err := triage.RegisterTriage(ctx, signos)
	if err != nil {
		t.Fatalf("DEF-65 triaje con escala de dolor: %v", err)
	}
	if t2, err := triage.GetTriageByID(ctx, guardado.ID); err != nil || t2.PainScaleScore != 6 {
		t.Fatalf("triaje leido: %+v (%v)", t2, err)
	}

	records := postgres.NewClinicalRecordRepository(db)
	clinical := services.NewClinicalRecordService(records, patients, users)
	folio, err := clinical.CreateDraft(ctx, &domain.ClinicalRecord{PatientID: paciente.ID, DoctorID: medico.ID,
		Anamnesis: "a", PhysicalExam: "e", CIE11Code: "1D01", DiagnosisDescription: "d", TreatmentPlan: "t"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := clinical.CloseAndSign(ctx, folio.ID, medico.ID, "firma"); err != nil {
		t.Fatalf("cerrar folio: %v", err)
	}
	if err := clinical.AddClarification(ctx, folio.ID, medico.ID, "Aclaracion"); err != nil {
		t.Fatalf("aclaracion: %v", err)
	}
	for nombre, sentencia := range map[string]string{
		"modificar folio cerrado": "UPDATE clinical_records SET anamnesis = 'alterada' WHERE id = $1",
		"borrar folio":            "DELETE FROM clinical_records WHERE id = $1",
		"modificar aclaracion":    "UPDATE clinical_record_clarifications SET note = 'alterada' WHERE clinical_record_id = $1",
		"borrar aclaracion":       "DELETE FROM clinical_record_clarifications WHERE clinical_record_id = $1",
	} {
		if _, err := db.ExecContext(ctx, sentencia, folio.ID); err == nil {
			t.Errorf("DEF-25 %s: PostgreSQL lo permitio", nombre)
		}
	}
	if ok, err := clinical.VerifyIntegrity(ctx, folio.ID); err != nil || !ok {
		t.Fatalf("integridad: ok=%v err=%v", ok, err)
	}
}

// DEF-38: contra PostgreSQL, una receta que pide mas stock del disponible no queda guardada ni descuenta nada.
func TestPostgresRecetaSinStockSeRevierteCompleta(t *testing.T) {
	db := conexionPostgresPrueba(t)
	probarRecetaSinStockSeRevierte(t, db, postgres.NewUserRepository(db), postgres.NewPatientRepository(db),
		postgres.NewClinicalRecordRepository(db), postgres.NewPrescriptionRepository(db))
}
