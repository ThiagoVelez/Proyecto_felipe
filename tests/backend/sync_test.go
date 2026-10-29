package backend_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

func TestRuralOfflineBatchSynchronization(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	patientRepo := memory.NewPatientMemoryRepo(ds)
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	syncService := services.NewSyncService(recordRepo, patientRepo)

	// Crear paciente fixture en zona rural
	patient := newPatientFixture("p-rural-01", "1098765432")
	patient.IsRuralZone = true
	if err := patientRepo.Create(ctx, patient); err != nil {
		t.Fatalf("Fallo creando paciente fixture: %v", err)
	}

	batchID := uuid.New().String()
	recordID := uuid.New().String()
	closedAt := time.Now().UTC()

	offlineRecords := []domain.ClinicalRecord{
		{
			ID:                   recordID,
			PatientID:            patient.ID,
			DoctorID:             "d-med-01",
			Anamnesis:            "Paciente en vereda rural con cuadro de fiebre y deshidratacion leve.",
			PhysicalExam:         "Mucosas secas, FC 88 lpm, afebril al momento del examen.",
			CIE11Code:            "1D01",
			DiagnosisDescription: "Gastroenteritis infecciosa no especificada",
			TreatmentPlan:        "Sales de rehidratacion oral y vigilancia clinica.",
			IsClosed:             true,
			ClosedAt:             &closedAt,
		},
	}

	// 1. Sincronizacion inicial del lote offline
	syncedCount, err := syncService.ProcessOfflineBatch(ctx, batchID, offlineRecords)
	if err != nil {
		t.Fatalf("Error procesando lote de sincronizacion offline: %v", err)
	}
	if syncedCount != 1 {
		t.Fatalf("Se esperaba 1 registro sincronizado, se obtuvieron: %d", syncedCount)
	}

	// Verificar registro almacenado con metadatos de sincronizacion y hash SHA-256
	storedRecord, err := recordRepo.GetByID(ctx, recordID)
	if err != nil {
		t.Fatalf("No se encontro el registro sincronizado en el repositorio: %v", err)
	}
	if !storedRecord.IsOfflineSync {
		t.Error("El registro deberia tener la bandera IsOfflineSync en true")
	}
	if storedRecord.SyncBatchID == nil || *storedRecord.SyncBatchID != batchID {
		t.Errorf("El SyncBatchID esperado es %s, obtenido: %v", batchID, storedRecord.SyncBatchID)
	}
	if storedRecord.HashSHA256 == nil || *storedRecord.HashSHA256 == "" {
		t.Error("El registro cerrado fuera de linea debe poseer su hash SHA-256 encadenado calculado")
	}

	// 2. Garantia de idempotencia: reenvio del mismo lote con el mismo UUID v4
	syncedCountReplay, err := syncService.ProcessOfflineBatch(ctx, batchID, offlineRecords)
	if err != nil {
		t.Fatalf("El reenvio del lote no deberia fallar por colision (debe ser idempotente): %v", err)
	}
	if syncedCountReplay != 1 {
		t.Fatalf("El reenvio idempotente debio procesar 1 registro, se obtuvieron: %d", syncedCountReplay)
	}

	// 3. Omision segura si el paciente no existe
	ghostRecords := []domain.ClinicalRecord{
		{
			ID:        uuid.New().String(),
			PatientID: "paciente-inexistente-uuid",
			DoctorID:  "d-med-01",
			Anamnesis: "Atencion en campo sin registro de paciente previo",
		},
	}
	syncedGhost, err := syncService.ProcessOfflineBatch(ctx, uuid.New().String(), ghostRecords)
	if err != nil {
		t.Fatalf("Error inesperado procesando lote con paciente inexistente: %v", err)
	}
	if syncedGhost != 0 {
		t.Fatalf("Los registros asociados a pacientes inexistentes deben ser filtrados, count: %d", syncedGhost)
	}
}
