package services

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
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

// ProcessOfflineBatch consolida un lote enviado por un medico autenticado.
//   - El autor de cada folio es doctorID; los campos de autoria, hash previo y hash del cliente se descartan.
//   - Un folio ya cerrado en el servidor jamas se modifica: reenviarlo es una operacion idempotente.
//   - El hash previo y el hash de los folios cerrados en campo se calculan aqui, encadenados al historial del paciente.
//
// Retorna la cantidad de folios reconocidos (nuevos, actualizados o ya consolidados).
func (s *syncService) ProcessOfflineBatch(ctx context.Context, doctorID, batchID string, records []domain.ClinicalRecord) (int, error) {
	if batchID == "" {
		batchID = uuid.New().String()
	}

	for attempt := 0; attempt < maxChainAttempts; attempt++ {
		count, err := s.processOnce(ctx, doctorID, batchID, records)
		if errors.Is(err, domain.ErrChainConflict) {
			continue
		}
		return count, err
	}
	return 0, domain.ErrChainConflict
}

func (s *syncService) processOnce(ctx context.Context, doctorID, batchID string, records []domain.ClinicalRecord) (int, error) {
	// Los pacientes con folios cerrados en el lote se bloquean (en orden estable) mientras se calcula y guarda la cadena
	releaseAll := lockBatchPatients(records)
	defer releaseAll()

	ordered := make([]domain.ClinicalRecord, len(records))
	copy(ordered, records)
	// Los folios cerrados se encadenan en orden cronologico de cierre; los borradores van al final
	sort.SliceStable(ordered, func(i, j int) bool {
		a, b := ordered[i].ClosedAt, ordered[j].ClosedAt
		switch {
		case a == nil:
			return false
		case b == nil:
			return true
		default:
			return a.Before(*b)
		}
	})

	validRecords := make([]domain.ClinicalRecord, 0, len(ordered))
	chainHeads := make(map[string]string)
	seenIDs := make(map[string]bool, len(ordered))
	acknowledged := 0

	for i := range ordered {
		rec := ordered[i]

		if rec.ID == "" {
			rec.ID = uuid.New().String()
		} else if _, err := uuid.Parse(rec.ID); err != nil {
			continue
		}

		if seenIDs[rec.ID] {
			continue
		}
		seenIDs[rec.ID] = true

		existing, err := s.recordRepo.GetByID(ctx, rec.ID)
		switch {
		case err == nil && !existing.CanModify():
			// Folio ya consolidado e inmutable: se reconoce sin tocarlo
			acknowledged++
			continue
		case err == nil && existing.DoctorID != doctorID:
			continue
		case err != nil && !errors.Is(err, domain.ErrRecordNotFound):
			return 0, err
		}

		if _, err := s.patientRepo.GetByID(ctx, rec.PatientID); err != nil {
			continue
		}

		rec.DoctorID = doctorID
		rec.IsOfflineSync = true
		rec.SyncBatchID = &batchID
		rec.PreviousHash = nil
		rec.HashSHA256 = nil
		if rec.CreatedAt.IsZero() {
			rec.CreatedAt = time.Now().UTC()
		}

		if rec.IsClosed {
			if rec.SignatureToken == nil || strings.TrimSpace(*rec.SignatureToken) == "" {
				continue
			}

			closedAt := time.Now()
			if rec.ClosedAt != nil {
				closedAt = *rec.ClosedAt
			}
			sealed := sealTime(closedAt)
			rec.ClosedAt = &sealed

			previousHash, known := chainHeads[rec.PatientID]
			if !known {
				previousHash, err = chainPreviousHash(ctx, s.recordRepo, rec.PatientID)
				if err != nil {
					return 0, err
				}
			}

			computedHash := crypto.CalculateChainedRecordHash(
				previousHash,
				rec.PatientID,
				rec.DoctorID,
				rec.Anamnesis,
				rec.PhysicalExam,
				rec.CIE11Code,
				rec.DiagnosisDescription,
				rec.TreatmentPlan,
				sealed.Format(time.RFC3339),
			)
			rec.PreviousHash = &previousHash
			rec.HashSHA256 = &computedHash
			chainHeads[rec.PatientID] = computedHash
		} else {
			rec.ClosedAt = nil
			rec.SignatureToken = nil
		}

		validRecords = append(validRecords, rec)
	}

	if len(validRecords) > 0 {
		if err := s.recordRepo.SaveBatch(ctx, validRecords); err != nil {
			return 0, err
		}
	}

	return acknowledged + len(validRecords), nil
}

// lockBatchPatients toma en orden alfabetico el candado de cadena de cada paciente del lote para evitar interbloqueos.
func lockBatchPatients(records []domain.ClinicalRecord) func() {
	seen := make(map[string]bool)
	var ids []string
	for _, rec := range records {
		if rec.IsClosed && !seen[rec.PatientID] {
			seen[rec.PatientID] = true
			ids = append(ids, rec.PatientID)
		}
	}
	sort.Strings(ids)

	releases := make([]func(), 0, len(ids))
	for _, id := range ids {
		releases = append(releases, lockPatientChain(id))
	}
	return func() {
		for i := len(releases) - 1; i >= 0; i-- {
			releases[i]()
		}
	}
}
