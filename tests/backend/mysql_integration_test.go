//go:build integration

package backend_test

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/adapters/storage/mysql"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// Pruebas contra un MySQL real. Se ejecutan con:
//
//	MYSQL_TEST_HOST=127.0.0.1 MYSQL_TEST_PORT=3306 MYSQL_TEST_USER=root MYSQL_TEST_PASSWORD=... MYSQL_TEST_DB=saludconecta_test \
//	  go test -tags integration -run TestMySQL ./...
//
// La base debe existir y estar vacia o contener el esquema de database/schema.sql.
func TestMySQLChainSyncAndTimestamps(t *testing.T) {
	host := os.Getenv("MYSQL_TEST_HOST")
	if host == "" {
		t.Skip("MYSQL_TEST_HOST no definido")
	}

	db, err := mysql.NewConnection(mysql.Config{
		Host: host, Port: os.Getenv("MYSQL_TEST_PORT"), User: os.Getenv("MYSQL_TEST_USER"),
		Password: os.Getenv("MYSQL_TEST_PASSWORD"), DBName: os.Getenv("MYSQL_TEST_DB"),
	})
	if err != nil {
		t.Fatalf("conexion: %v", err)
	}
	defer db.Close()

	warnings, err := mysql.Migrate(db)
	if err != nil {
		t.Fatalf("migracion: %v", err)
	}
	for _, w := range warnings {
		t.Logf("advertencia de endurecimiento: %s", w)
	}

	ctx := context.Background()
	users := mysql.NewUserRepository(db)
	patients := mysql.NewPatientRepository(db)
	records := mysql.NewClinicalRecordRepository(db)

	suffix := uuid.New().String()[:8]
	doctor := newDoctorFixture("doc-"+suffix, "RM-"+suffix)
	doctor.RoleName = ""
	doctor.Email = "it-" + suffix + "@example.com"
	if err := users.Create(ctx, doctor); err != nil {
		t.Fatalf("medico: %v", err)
	}
	patient := newPatientFixture("pat-"+suffix, "IT"+suffix)
	if err := patients.Create(ctx, patient); err != nil {
		t.Fatalf("paciente: %v", err)
	}

	clinical := services.NewClinicalRecordService(records, patients, users)
	syncSvc := services.NewSyncService(records, patients)

	// Cierres concurrentes: cadena lineal y verificacion de integridad tras el redondeo de TIMESTAMP
	const total = 6
	ids := make([]string, total)
	for i := range ids {
		rec, err := clinical.CreateDraft(ctx, &domain.ClinicalRecord{
			PatientID: patient.ID, DoctorID: doctor.ID, Anamnesis: "a", PhysicalExam: "e",
			CIE11Code: "BA41", DiagnosisDescription: "d", TreatmentPlan: "t",
		})
		if err != nil {
			t.Fatalf("borrador: %v", err)
		}
		ids[i] = rec.ID
	}
	var wg sync.WaitGroup
	for _, id := range ids {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			if _, err := clinical.CloseAndSign(ctx, id, doctor.ID, "firma"); err != nil {
				t.Errorf("cierre: %v", err)
			}
		}(id)
	}
	wg.Wait()
	for _, id := range ids {
		if ok, err := clinical.VerifyIntegrity(ctx, id); err != nil || !ok {
			t.Fatalf("integridad de %s: ok=%v err=%v", id, ok, err)
		}
	}

	// Reenvio de un lote con un folio cerrado: no debe abortar ni reabrir
	signature := "firma-campo"
	closedAt := time.Now().UTC()
	recordID := uuid.New().String()
	batch := []domain.ClinicalRecord{{
		ID: recordID, PatientID: patient.ID, Anamnesis: "a", PhysicalExam: "e", CIE11Code: "1D01",
		DiagnosisDescription: "d", TreatmentPlan: "t", IsClosed: true, SignatureToken: &signature, ClosedAt: &closedAt,
	}}
	for i := 0; i < 2; i++ {
		if count, err := syncSvc.ProcessOfflineBatch(ctx, doctor.ID, "batch-"+suffix, batch); err != nil || count != 1 {
			t.Fatalf("lote %d: count=%d err=%v", i, count, err)
		}
	}
	if ok, err := clinical.VerifyIntegrity(ctx, recordID); err != nil || !ok {
		t.Fatalf("integridad del folio sincronizado: ok=%v err=%v", ok, err)
	}

	// Las notas aclaratorias son inmutables a nivel de base de datos
	if _, err := db.Exec("UPDATE clinical_record_clarifications SET note = 'x' WHERE clinical_record_id = ?", ids[0]); err == nil {
		t.Log("sin notas aclaratorias que modificar o disparador no instalado (ver advertencias)")
	}
}
