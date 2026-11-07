package backend_test

// Pruebas que documentan defectos ABIERTOS registrados en docs/calidad/04-bitacora-defectos.md.
// Cada prueba afirma el comportamiento correcto; por eso falla mientras el defecto exista.
// Se omiten por defecto y se ejecutan con CALIDAD_DEFECTOS_ABIERTOS=1 (ver requireDefectoAbierto).

import (
	"context"
	"strings"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/crypto"
)

const medicoSemillaID = "usr-med-0002"

// Desde la v2 la sincronizacion descarta folios cuyo ID no es un UUID, por eso estos folios usan UUID fijos.
const (
	folioDEF07 = "0b7e2f43-0007-4c1a-9a00-000000000007"
	folioDEF18 = "0b7e2f43-0018-4c1a-9a00-000000000018"
	folioDEF30 = "0b7e2f43-0030-4c1a-9a00-000000000030"
)

func sembrarPacienteYFolio(t *testing.T, ds *memory.DataStore, patientID, recordID, doctorID string) {
	t.Helper()
	ctx := context.Background()
	sembrarMedicoSemilla(t, memory.NewUserMemoryRepo(ds))
	if err := memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture(patientID, "DOC-"+patientID)); err != nil {
		t.Fatalf("No se pudo crear el paciente: %v", err)
	}
	record := &domain.ClinicalRecord{
		ID: recordID, PatientID: patientID, DoctorID: doctorID,
		Anamnesis: "Anamnesis original", PhysicalExam: "Examen", CIE11Code: "CA02",
		DiagnosisDescription: "Diagnostico", TreatmentPlan: "Plan", CreatedAt: time.Now().UTC(),
	}
	if err := memory.NewClinicalRecordMemoryRepo(ds).Create(ctx, record); err != nil {
		t.Fatalf("No se pudo crear el folio: %v", err)
	}
}

// DEF-29: el separador '|' no se escapa, por lo que entradas distintas producen el mismo hash.
func TestDEF29HashSinColisionPorDelimitador(t *testing.T) {
	requireDefectoAbierto(t, "DEF-29")
	h1 := crypto.CalculateChainedRecordHash("prev", "pac", "doc", "dolor|toracico", "normal", "BA00", "dx", "plan", "2026-01-01T00:00:00Z")
	h2 := crypto.CalculateChainedRecordHash("prev", "pac", "doc", "dolor", "toracico|normal", "BA00", "dx", "plan", "2026-01-01T00:00:00Z")
	if h1 == h2 {
		defectoReproducido(t, "DEF-29", "Dos folios con anamnesis y examen fisico distintos producen el mismo hash: %s", h1)
	}
}

// DEF-30: VerifyIntegrity recalcula con el previous_hash almacenado sin comprobar que exista en la cadena.
// v2: la sincronizacion ya no acepta el hash previo del cliente, pero la verificacion sigue sin validar el
// enlace. Se simula un folio alterado en el almacenamiento (acceso directo a la base de datos o adaptador
// defectuoso) cuyo previous_hash no corresponde a ningun folio anterior del paciente.
func TestDEF30VerificacionValidaEnlaceConFolioAnterior(t *testing.T) {
	requireDefectoAbierto(t, "DEF-30")
	ctx := context.Background()
	ds := memory.NewDataStore()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-def30", "DOC-30"))
	sembrarMedicoSemilla(t, memory.NewUserMemoryRepo(ds))
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	cerrado := time.Now().UTC().Truncate(time.Second)
	inventado := strings.Repeat("f", 64)
	firma := "firma"
	rec := &domain.ClinicalRecord{
		ID: folioDEF30, PatientID: "p-def30", DoctorID: medicoSemillaID, Anamnesis: "x", PhysicalExam: "y",
		CIE11Code: "CA02", DiagnosisDescription: "dx", TreatmentPlan: "plan", CreatedAt: cerrado,
	}
	hash := crypto.CalculateChainedRecordHash(inventado, rec.PatientID, rec.DoctorID, rec.Anamnesis, rec.PhysicalExam,
		rec.CIE11Code, rec.DiagnosisDescription, rec.TreatmentPlan, cerrado.Format(time.RFC3339))
	rec.IsClosed, rec.ClosedAt, rec.PreviousHash, rec.HashSHA256, rec.SignatureToken = true, &cerrado, &inventado, &hash, &firma
	if err := recordRepo.Create(ctx, rec); err != nil {
		t.Fatalf("No se pudo preparar el folio alterado: %v", err)
	}

	svc := services.NewClinicalRecordService(recordRepo, memory.NewPatientMemoryRepo(ds), memory.NewUserMemoryRepo(ds))
	if ok, _ := svc.VerifyIntegrity(ctx, folioDEF30); ok {
		defectoReproducido(t, "DEF-30", "Un folio cuyo previous_hash no corresponde a ningun folio anterior se reporta como integro")
	}
}
