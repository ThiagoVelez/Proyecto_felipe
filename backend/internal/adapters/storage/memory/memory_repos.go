package memory

import (
	"context"
	"strings"
	"sync"
	"time"

	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

// DataStore almacena la informacion en memoria de manera centralizada y sincronizada.
type DataStore struct {
	mu              sync.RWMutex
	users           map[string]*domain.User
	usersByEmail    map[string]*domain.User
	patients        map[string]*domain.Patient
	patientsByDoc   map[string]*domain.Patient
	allergies       map[string][]domain.PatientAllergy
	triages         map[string]*domain.TriageRecord
	clinicalRecords map[string]*domain.ClinicalRecord
	clarifications  map[string][]domain.ClinicalRecordClarification
	medications     map[int]*domain.MedicationCatalog
	prescriptions   map[string]*domain.Prescription
	auditLogs       []*domain.AuditLog
	rips            map[string]*domain.RIPSTransaction
}

func NewDataStore() *DataStore {
	return &DataStore{
		users:           make(map[string]*domain.User),
		usersByEmail:    make(map[string]*domain.User),
		patients:        make(map[string]*domain.Patient),
		patientsByDoc:   make(map[string]*domain.Patient),
		allergies:       make(map[string][]domain.PatientAllergy),
		triages:         make(map[string]*domain.TriageRecord),
		clinicalRecords: make(map[string]*domain.ClinicalRecord),
		clarifications:  make(map[string][]domain.ClinicalRecordClarification),
		medications:     make(map[int]*domain.MedicationCatalog),
		prescriptions:   make(map[string]*domain.Prescription),
		auditLogs:       make([]*domain.AuditLog, 0),
		rips:            make(map[string]*domain.RIPSTransaction),
	}
}

// UserMemoryRepo implementa ports.UserRepository en memoria.
type UserMemoryRepo struct {
	ds *DataStore
}

func NewUserMemoryRepo(ds *DataStore) ports.UserRepository {
	return &UserMemoryRepo{ds: ds}
}

func (r *UserMemoryRepo) GetByID(_ context.Context, id string) (*domain.User, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	u, ok := r.ds.users[id]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (r *UserMemoryRepo) GetByEmail(_ context.Context, email string) (*domain.User, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	u, ok := r.ds.usersByEmail[strings.ToLower(strings.TrimSpace(email))]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (r *UserMemoryRepo) Create(_ context.Context, user *domain.User) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	emailKey := strings.ToLower(strings.TrimSpace(user.Email))
	if _, exists := r.ds.usersByEmail[emailKey]; exists {
		return domain.ErrEmailAlreadyRegistered
	}
	r.ds.users[user.ID] = user
	r.ds.usersByEmail[emailKey] = user
	return nil
}

func (r *UserMemoryRepo) UpdateMFA(_ context.Context, userID string, secret string, enabled bool) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	u, ok := r.ds.users[userID]
	if !ok {
		return domain.ErrUserNotFound
	}
	u.MFASecret = &secret
	u.MFAEnabled = enabled
	return nil
}

// PatientMemoryRepo implementa ports.PatientRepository en memoria.
type PatientMemoryRepo struct {
	ds *DataStore
}

func NewPatientMemoryRepo(ds *DataStore) ports.PatientRepository {
	return &PatientMemoryRepo{ds: ds}
}

func (r *PatientMemoryRepo) GetByID(_ context.Context, id string) (*domain.Patient, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	p, ok := r.ds.patients[id]
	if !ok {
		return nil, domain.ErrPatientNotFound
	}
	if al, has := r.ds.allergies[id]; has {
		p.Allergies = al
	}
	return p, nil
}

func (r *PatientMemoryRepo) GetByDocument(_ context.Context, docType domain.DocumentType, docNumber string) (*domain.Patient, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	key := string(docType) + "_" + docNumber
	p, ok := r.ds.patientsByDoc[key]
	if !ok {
		return nil, domain.ErrPatientNotFound
	}
	if al, has := r.ds.allergies[p.ID]; has {
		p.Allergies = al
	}
	return p, nil
}

func (r *PatientMemoryRepo) Create(_ context.Context, patient *domain.Patient) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	key := string(patient.DocumentType) + "_" + patient.DocumentNumber
	if _, exists := r.ds.patientsByDoc[key]; exists {
		return domain.ErrPatientAlreadyExists
	}
	r.ds.patients[patient.ID] = patient
	r.ds.patientsByDoc[key] = patient
	return nil
}

func (r *PatientMemoryRepo) List(_ context.Context, limit, offset int) ([]domain.Patient, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var list []domain.Patient
	idx := 0
	for _, p := range r.ds.patients {
		if idx >= offset && len(list) < limit {
			list = append(list, *p)
		}
		idx++
	}
	return list, nil
}

func (r *PatientMemoryRepo) GetPatientAllergies(_ context.Context, patientID string) ([]domain.PatientAllergy, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	return r.ds.allergies[patientID], nil
}

func (r *PatientMemoryRepo) AddPatientAllergy(_ context.Context, allergy *domain.PatientAllergy) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	allergy.ID = len(r.ds.allergies[allergy.PatientID]) + 1
	r.ds.allergies[allergy.PatientID] = append(r.ds.allergies[allergy.PatientID], *allergy)
	return nil
}

// TriageMemoryRepo implementa ports.TriageRepository en memoria.
type TriageMemoryRepo struct {
	ds *DataStore
}

func NewTriageMemoryRepo(ds *DataStore) ports.TriageRepository {
	return &TriageMemoryRepo{ds: ds}
}

func (r *TriageMemoryRepo) Create(_ context.Context, record *domain.TriageRecord) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	r.ds.triages[record.ID] = record
	return nil
}

func (r *TriageMemoryRepo) GetByID(_ context.Context, id string) (*domain.TriageRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	t, ok := r.ds.triages[id]
	if !ok {
		return nil, domain.ErrTriageNotFound
	}
	return t, nil
}

func (r *TriageMemoryRepo) ListPending(_ context.Context) ([]domain.TriageRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var list []domain.TriageRecord
	for _, t := range r.ds.triages {
		if t.Status == domain.TriageStatusPending || t.Status == domain.TriageStatusInProgress {
			list = append(list, *t)
		}
	}
	return list, nil
}

func (r *TriageMemoryRepo) UpdateStatus(_ context.Context, id string, status domain.TriageStatus) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	t, ok := r.ds.triages[id]
	if !ok {
		return domain.ErrTriageNotFound
	}
	t.Status = status
	return nil
}

// ClinicalRecordMemoryRepo implementa ports.ClinicalRecordRepository en memoria.
type ClinicalRecordMemoryRepo struct {
	ds *DataStore
}

func NewClinicalRecordMemoryRepo(ds *DataStore) ports.ClinicalRecordRepository {
	return &ClinicalRecordMemoryRepo{ds: ds}
}

func (r *ClinicalRecordMemoryRepo) Create(_ context.Context, record *domain.ClinicalRecord) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	r.ds.clinicalRecords[record.ID] = record
	return nil
}

func (r *ClinicalRecordMemoryRepo) GetByID(_ context.Context, id string) (*domain.ClinicalRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	rec, ok := r.ds.clinicalRecords[id]
	if !ok {
		return nil, domain.ErrRecordNotFound
	}
	if clar, has := r.ds.clarifications[id]; has {
		rec.Clarifications = clar
	}
	return rec, nil
}

func (r *ClinicalRecordMemoryRepo) GetLastClosedRecordByPatient(_ context.Context, patientID string) (*domain.ClinicalRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var lastClosed *domain.ClinicalRecord
	for _, rec := range r.ds.clinicalRecords {
		if rec.PatientID == patientID && rec.IsClosed {
			if lastClosed == nil || (rec.ClosedAt != nil && lastClosed.ClosedAt != nil && rec.ClosedAt.After(*lastClosed.ClosedAt)) {
				lastClosed = rec
			}
		}
	}
	return lastClosed, nil
}

func (r *ClinicalRecordMemoryRepo) ListByPatient(_ context.Context, patientID string) ([]domain.ClinicalRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var list []domain.ClinicalRecord
	for _, rec := range r.ds.clinicalRecords {
		if rec.PatientID == patientID {
			list = append(list, *rec)
		}
	}
	return list, nil
}

func (r *ClinicalRecordMemoryRepo) CloseRecord(_ context.Context, id string, signatureToken, previousHash, hashSHA256 string, closedAt time.Time) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	rec, ok := r.ds.clinicalRecords[id]
	if !ok {
		return domain.ErrRecordNotFound
	}
	if rec.IsClosed {
		return domain.ErrRecordAlreadyClosed
	}
	rec.IsClosed = true
	rec.SignatureToken = &signatureToken
	rec.PreviousHash = &previousHash
	rec.HashSHA256 = &hashSHA256
	rec.ClosedAt = &closedAt
	return nil
}

func (r *ClinicalRecordMemoryRepo) AddClarification(_ context.Context, clarification *domain.ClinicalRecordClarification) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	clarification.ID = len(r.ds.clarifications[clarification.ClinicalRecordID]) + 1
	r.ds.clarifications[clarification.ClinicalRecordID] = append(r.ds.clarifications[clarification.ClinicalRecordID], *clarification)
	return nil
}

func (r *ClinicalRecordMemoryRepo) SaveBatch(_ context.Context, records []domain.ClinicalRecord) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	for i := range records {
		r.ds.clinicalRecords[records[i].ID] = &records[i]
	}
	return nil
}

// PrescriptionMemoryRepo implementa ports.PrescriptionRepository en memoria.
type PrescriptionMemoryRepo struct {
	ds *DataStore
}

func NewPrescriptionMemoryRepo(ds *DataStore) ports.PrescriptionRepository {
	return &PrescriptionMemoryRepo{ds: ds}
}

func (r *PrescriptionMemoryRepo) Create(_ context.Context, prescription *domain.Prescription) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	r.ds.prescriptions[prescription.ID] = prescription
	return nil
}

func (r *PrescriptionMemoryRepo) GetByID(_ context.Context, id string) (*domain.Prescription, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	p, ok := r.ds.prescriptions[id]
	if !ok {
		return nil, domain.ErrPrescriptionNotFound
	}
	return p, nil
}

func (r *PrescriptionMemoryRepo) GetByClinicalRecordID(_ context.Context, recordID string) (*domain.Prescription, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	for _, p := range r.ds.prescriptions {
		if p.ClinicalRecordID == recordID {
			return p, nil
		}
	}
	return nil, domain.ErrPrescriptionNotFound
}

func (r *PrescriptionMemoryRepo) GetMedicationByID(_ context.Context, id int) (*domain.MedicationCatalog, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	med, ok := r.ds.medications[id]
	if !ok {
		return nil, domain.ErrMedicationNotFound
	}
	return med, nil
}

func (r *PrescriptionMemoryRepo) SearchMedications(_ context.Context, query string) ([]domain.MedicationCatalog, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var result []domain.MedicationCatalog
	q := strings.ToLower(query)
	for _, med := range r.ds.medications {
		if strings.Contains(strings.ToLower(med.CommercialName), q) ||
			strings.Contains(strings.ToLower(med.GenericName), q) ||
			strings.Contains(strings.ToLower(med.ActiveIngredient), q) {
			result = append(result, *med)
		}
	}
	return result, nil
}

func (r *PrescriptionMemoryRepo) DeductStock(_ context.Context, medicationID int, quantity int) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	med, ok := r.ds.medications[medicationID]
	if !ok {
		return domain.ErrMedicationNotFound
	}
	if med.StockQuantity < quantity {
		return domain.ErrInsufficientMedicationStock
	}
	med.StockQuantity -= quantity
	return nil
}

// AuditMemoryRepo implementa ports.AuditRepository en memoria.
type AuditMemoryRepo struct {
	ds *DataStore
}

func NewAuditMemoryRepo(ds *DataStore) ports.AuditRepository {
	return &AuditMemoryRepo{ds: ds}
}

func (r *AuditMemoryRepo) CreateLog(_ context.Context, log *domain.AuditLog) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	log.ID = int64(len(r.ds.auditLogs) + 1)
	r.ds.auditLogs = append(r.ds.auditLogs, log)
	return nil
}

func (r *AuditMemoryRepo) SaveRIPSTransaction(_ context.Context, tx *domain.RIPSTransaction) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	r.ds.rips[tx.ID] = tx
	return nil
}

func (r *AuditMemoryRepo) GetRIPSTransactionByID(_ context.Context, id string) (*domain.RIPSTransaction, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	tx, ok := r.ds.rips[id]
	if !ok {
		return nil, domain.ErrRecordNotFound
	}
	return tx, nil
}
