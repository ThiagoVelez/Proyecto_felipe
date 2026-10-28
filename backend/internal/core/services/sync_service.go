package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
	"saludconecta-backend/pkg/crypto"
)

type syncService struct {
	recordRepo  ports.ClinicalRecordRepository
	patientRepo ports.PatientRepository
}

// NewSyncService crea la instancia para consolidacion de atencion medica en zonas rurales desconectadas.
func NewSyncService(recordRepo ports.ClinicalRecordRepository, patientRepo ports.PatientRepository) ports.SyncService {
	return &syncService{
		recordRepo:  recordRepo,
		patientRepo: patientRepo,
	}
}

func (s *syncService) ProcessOfflineBatch(ctx context.Context, batchID string, records []domain.ClinicalRecord) (int, error) {
	if batchID == "" {
		batchID = uuid.New().String()
	}

	validRecords := make([]domain.ClinicalRecord, 0, len(records))

	for i := range records {
		rec := records[i]
		if rec.ID == "" {
			rec.ID = uuid.New().String()
		}

		// Validar que el paciente exista
		if _, err := s.patientRepo.GetByID(ctx, rec.PatientID); err != nil {
			continue // Omitir o registrar discrepancia si no existe
		}

		rec.IsOfflineSync = true
		rec.SyncBatchID = &batchID
		if rec.CreatedAt.IsZero() {
			rec.CreatedAt = time.Now().UTC()
		}

		// Si el folio fue cerrado en el dispositivo de campo, garantizar la firma e integridad
		if rec.IsClosed && rec.ClosedAt != nil {
			prevHash := GenesisHash
			if rec.PreviousHash != nil && *rec.PreviousHash != "" {
				prevHash = *rec.PreviousHash
			}

			computedHash := crypto.CalculateChainedRecordHash(
				prevHash,
				rec.PatientID,
				rec.DoctorID,
				rec.Anamnesis,
				rec.PhysicalExam,
				rec.CIE11Code,
				rec.DiagnosisDescription,
				rec.TreatmentPlan,
				rec.ClosedAt.Format(time.RFC3339),
			)
			rec.HashSHA256 = &computedHash
		}

		validRecords = append(validRecords, rec)
	}

	if len(validRecords) > 0 {
		if err := s.recordRepo.SaveBatch(ctx, validRecords); err != nil {
			return 0, err
		}
	}

	return len(validRecords), nil
}

