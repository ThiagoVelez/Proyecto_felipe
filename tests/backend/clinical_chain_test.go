package backend_test

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
)

type chainEnv struct {
	ctx      context.Context
	patients ports.PatientRepository
	users    ports.UserRepository
	records  ports.ClinicalRecordRepository
	clinical ports.ClinicalRecordService
	sync     ports.SyncService
}

func newChainEnv(t *testing.T) *chainEnv {
	t.Helper()
	store := memory.NewDataStore()
	env := &chainEnv{
		ctx:      context.Background(),
		patients: memory.NewPatientMemoryRepo(store),
		users:    memory.NewUserMemoryRepo(store),
		records:  memory.NewClinicalRecordMemoryRepo(store),
	}
	env.clinical = services.NewClinicalRecordService(env.records, env.patients, env.users)
	env.sync = services.NewSyncService(env.records, env.patients)
	return env
}

func (e *chainEnv) seed(t *testing.T, patientID, doc string, doctorIDs ...string) {
	t.Helper()
	if err := e.patients.Create(e.ctx, newPatientFixture(patientID, doc)); err != nil {
		t.Fatalf("paciente: %v", err)
	}
	for _, id := range doctorIDs {
		if err := e.users.Create(e.ctx, newDoctorFixture(id, "RM-"+id)); err != nil {
			t.Fatalf("medico: %v", err)
		}
	}
}

func (e *chainEnv) draft(t *testing.T, patientID, doctorID string) *domain.ClinicalRecord {
	t.Helper()
	rec, err := e.clinical.CreateDraft(e.ctx, &domain.ClinicalRecord{
		PatientID: patientID, DoctorID: doctorID,
		Anamnesis: "dolor", PhysicalExam: "estable", CIE11Code: "BA41", DiagnosisDescription: "dx", TreatmentPlan: "plan",
	})
	if err != nil {
		t.Fatalf("borrador: %v", err)
	}
	return rec
}

// Un medico no puede cerrar ni anexar notas al folio de otro; el folio del autor sigue verificando.
func TestRecordObjectLevelAccess(t *testing.T) {
	env := newChainEnv(t)
	env.seed(t, "p-obj", "7001", "doc-autor", "doc-otro")
	rec := env.draft(t, "p-obj", "doc-autor")

	if _, err := env.clinical.CloseAndSign(env.ctx, rec.ID, "doc-otro", "firma"); !errors.Is(err, domain.ErrNotRecordOwner) {
		t.Fatalf("el cierre por otro medico debia rechazarse: %v", err)
	}
	stored, _ := env.records.GetByID(env.ctx, rec.ID)
	if stored.IsClosed {
		t.Fatal("el folio no debe cerrarse por un medico ajeno")
	}

	if _, err := env.clinical.CloseAndSign(env.ctx, rec.ID, "doc-autor", "firma"); err != nil {
		t.Fatalf("el autor debia poder cerrar: %v", err)
	}
	if ok, err := env.clinical.VerifyIntegrity(env.ctx, rec.ID); err != nil || !ok {
		t.Fatalf("la integridad debia verificar: ok=%v err=%v", ok, err)
	}
	if err := env.clinical.AddClarification(env.ctx, rec.ID, "doc-otro", "nota"); !errors.Is(err, domain.ErrNotRecordOwner) {
		t.Fatalf("la nota de otro medico debia rechazarse: %v", err)
	}
}

// El sello temporal se trunca a segundos para que lo firmado coincida con lo que persiste TIMESTAMP(0).
func TestClosedAtIsSealedToSeconds(t *testing.T) {
	env := newChainEnv(t)
	env.seed(t, "p-time", "7002", "doc-1")
	rec := env.draft(t, "p-time", "doc-1")

	closed, err := env.clinical.CloseAndSign(env.ctx, rec.ID, "doc-1", "firma")
	if err != nil {
		t.Fatal(err)
	}
	if closed.ClosedAt.Nanosecond() != 0 {
		t.Fatalf("closed_at conserva fracciones de segundo: %v", closed.ClosedAt)
	}
}

// Cierres concurrentes del mismo paciente deben formar una cadena lineal, sin eslabones repetidos.
func TestConcurrentClosesKeepChainLinear(t *testing.T) {
	env := newChainEnv(t)
	env.seed(t, "p-chain", "7003", "doc-1")

	const total = 12
	ids := make([]string, total)
	for i := range ids {
		ids[i] = env.draft(t, "p-chain", "doc-1").ID
	}

	var wg sync.WaitGroup
	errs := make(chan error, total)
	for _, id := range ids {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			_, err := env.clinical.CloseAndSign(env.ctx, id, "doc-1", "firma")
			errs <- err
		}(id)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatalf("cierre concurrente fallo: %v", err)
		}
	}

	history, _ := env.clinical.GetPatientHistory(env.ctx, "p-chain")
	seen := map[string]bool{}
	for _, rec := range history {
		if rec.PreviousHash == nil || seen[*rec.PreviousHash] {
			t.Fatalf("la cadena se bifurco: hash previo repetido %v", rec.PreviousHash)
		}
		seen[*rec.PreviousHash] = true
		if ok, _ := env.clinical.VerifyIntegrity(env.ctx, rec.ID); !ok {
			t.Fatalf("el folio %s no verifica", rec.ID)
		}
	}
	if len(seen) != total {
		t.Fatalf("se esperaban %d eslabones y hay %d", total, len(seen))
	}
}

// La capa de repositorio rechaza un segundo cierre sobre el mismo eslabon previo.
func TestRepositoryRejectsForkedChainLink(t *testing.T) {
	env := newChainEnv(t)
	env.seed(t, "p-fork", "7004", "doc-1")
	a := env.draft(t, "p-fork", "doc-1")
	b := env.draft(t, "p-fork", "doc-1")

	now := time.Now().UTC().Truncate(time.Second)
	if err := env.records.CloseRecord(env.ctx, a.ID, "f", services.GenesisHash, "hash-a", now); err != nil {
		t.Fatal(err)
	}
	err := env.records.CloseRecord(env.ctx, b.ID, "f", services.GenesisHash, "hash-b", now)
	if !errors.Is(err, domain.ErrChainConflict) {
		t.Fatalf("se esperaba ErrChainConflict y se obtuvo: %v", err)
	}
}

// Reenviar un folio cerrado con otro contenido no lo modifica ni lo reabre; la autoria y los hashes no se aceptan del cliente.
func TestSyncNeverRewritesClosedRecordsNorTrustsClient(t *testing.T) {
	env := newChainEnv(t)
	env.seed(t, "p-sync", "7005", "doc-real")

	recordID := uuid.New().String()
	forgedPrev := "hash-previo-falso"
	forgedHash := "hash-falso"
	signature := "firma-campo"
	closedAt := time.Now().UTC().Add(-time.Hour)

	original := domain.ClinicalRecord{
		ID: recordID, PatientID: "p-sync", DoctorID: "doc-suplantado",
		Anamnesis: "original", PhysicalExam: "e", CIE11Code: "1D01", DiagnosisDescription: "d", TreatmentPlan: "t",
		IsClosed: true, SignatureToken: &signature, ClosedAt: &closedAt,
		PreviousHash: &forgedPrev, HashSHA256: &forgedHash,
	}

	if _, err := env.sync.ProcessOfflineBatch(env.ctx, "doc-real", "batch-1", []domain.ClinicalRecord{original}); err != nil {
		t.Fatal(err)
	}

	stored, _ := env.records.GetByID(env.ctx, recordID)
	if stored.DoctorID != "doc-real" {
		t.Fatalf("la autoria debe ser el medico autenticado, obtuvo %s", stored.DoctorID)
	}
	if stored.PreviousHash == nil || *stored.PreviousHash != services.GenesisHash {
		t.Fatalf("el hash previo lo calcula el servidor, obtuvo %v", stored.PreviousHash)
	}
	if stored.HashSHA256 == nil || *stored.HashSHA256 == forgedHash {
		t.Fatal("el hash enviado por el cliente no debe aceptarse")
	}
	if ok, _ := env.clinical.VerifyIntegrity(env.ctx, recordID); !ok {
		t.Fatal("el folio sincronizado debe verificar su integridad")
	}

	tampered := original
	tampered.Anamnesis = "contenido alterado"
	tampered.IsClosed = false
	tampered.ClosedAt = nil
	if _, err := env.sync.ProcessOfflineBatch(env.ctx, "doc-real", "batch-2", []domain.ClinicalRecord{tampered}); err != nil {
		t.Fatalf("el reenvio debe ser idempotente: %v", err)
	}

	after, _ := env.records.GetByID(env.ctx, recordID)
	if !after.IsClosed || after.Anamnesis != "original" {
		t.Fatalf("un folio cerrado fue reabierto o reemplazado: closed=%v anamnesis=%q", after.IsClosed, after.Anamnesis)
	}
}

// Los folios cerrados en campo se encadenan al historial del servidor y entre si.
func TestSyncChainsAfterServerRecords(t *testing.T) {
	env := newChainEnv(t)
	env.seed(t, "p-enc", "7006", "doc-1")

	serverRec := env.draft(t, "p-enc", "doc-1")
	closed, err := env.clinical.CloseAndSign(env.ctx, serverRec.ID, "doc-1", "firma")
	if err != nil {
		t.Fatal(err)
	}

	signature := "firma-campo"
	t1 := time.Now().UTC().Add(-2 * time.Minute)
	t2 := time.Now().UTC().Add(-1 * time.Minute)
	batch := []domain.ClinicalRecord{
		{ID: uuid.New().String(), PatientID: "p-enc", Anamnesis: "b", PhysicalExam: "e", CIE11Code: "1", DiagnosisDescription: "d", TreatmentPlan: "t", IsClosed: true, SignatureToken: &signature, ClosedAt: &t2},
		{ID: uuid.New().String(), PatientID: "p-enc", Anamnesis: "a", PhysicalExam: "e", CIE11Code: "1", DiagnosisDescription: "d", TreatmentPlan: "t", IsClosed: true, SignatureToken: &signature, ClosedAt: &t1},
	}
	count, err := env.sync.ProcessOfflineBatch(env.ctx, "doc-1", "batch-enc", batch)
	if err != nil || count != 2 {
		t.Fatalf("count=%d err=%v", count, err)
	}

	history, _ := env.clinical.GetPatientHistory(env.ctx, "p-enc")
	prevs := map[string]bool{}
	for _, rec := range history {
		if !rec.IsClosed {
			continue
		}
		if prevs[*rec.PreviousHash] {
			t.Fatalf("eslabon previo repetido: %s", *rec.PreviousHash)
		}
		prevs[*rec.PreviousHash] = true
		if ok, _ := env.clinical.VerifyIntegrity(env.ctx, rec.ID); !ok {
			t.Fatalf("folio %s no verifica", rec.ID)
		}
	}
	if !prevs[*closed.HashSHA256] {
		t.Fatal("el primer folio de campo debe encadenarse al ultimo folio del servidor")
	}
}
