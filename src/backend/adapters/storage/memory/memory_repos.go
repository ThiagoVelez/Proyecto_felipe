package memory

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"saludconecta-backend/adapters/storage/catalog"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

// maxMedicationResults acota el listado devuelto por la busqueda de catalogo.
const maxMedicationResults = 50

// DataStore almacena la informacion en memoria de manera centralizada y sincronizada.
// Es un adaptador no persistente destinado a pruebas y desarrollo local: todo repositorio retorna copias
// para que ningun llamador lea o modifique el estado interno sin tomar el candado.
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
	appointments    map[string]*domain.Appointment
	inventoryItems  map[string]*domain.InventoryItem
	prescriptionsV2 map[string]*domain.PrescriptionV2
}

// NewDataStore crea el almacen en memoria. No siembra cuentas: el administrador inicial se crea con las
// credenciales definidas por el operador en el arranque, nunca con valores publicados en el codigo.
func NewDataStore() *DataStore {
	ds := &DataStore{
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
		appointments:    make(map[string]*domain.Appointment),
		inventoryItems:  make(map[string]*domain.InventoryItem),
		prescriptionsV2: make(map[string]*domain.PrescriptionV2),
	}

	// Semilla de inventario diferenciado por concentracion
	seedItems := []*domain.InventoryItem{
		{ID: "inv-amox-250", CodeCUM: "CUM-199214-1", GenericName: "Amoxicilina", BrandName: "Amoxal 250mg", Dosage: "250 mg", Presentation: "Tableta", UnitPrice: 850.00, StockQuantity: 150, MinStock: 20, BatchNumber: "LOT-AMX-2026A", IsActive: true},
		{ID: "inv-amox-500", CodeCUM: "CUM-199214-2", GenericName: "Amoxicilina", BrandName: "Amoxal 500mg", Dosage: "500 mg", Presentation: "Tableta", UnitPrice: 1200.00, StockQuantity: 200, MinStock: 30, BatchNumber: "LOT-AMX-2026B", IsActive: true},
		{ID: "inv-risp-1", CodeCUM: "CUM-204112-1", GenericName: "Risperidona", BrandName: "Risperdal 1mg", Dosage: "1 mg", Presentation: "Tableta", UnitPrice: 3200.00, StockQuantity: 80, MinStock: 15, BatchNumber: "LOT-RSP-2026A", IsActive: true},
		{ID: "inv-risp-3", CodeCUM: "CUM-204112-2", GenericName: "Risperidona", BrandName: "Risperdal 3mg", Dosage: "3 mg", Presentation: "Tableta", UnitPrice: 5800.00, StockQuantity: 95, MinStock: 15, BatchNumber: "LOT-RSP-2026B", IsActive: true},
		{ID: "inv-ibup-400", CodeCUM: "CUM-192834-1", GenericName: "Ibuprofeno", BrandName: "Motrin 400mg", Dosage: "400 mg", Presentation: "Tableta", UnitPrice: 650.00, StockQuantity: 300, MinStock: 40, BatchNumber: "LOT-IBU-2026A", IsActive: true},
		{ID: "inv-ibup-800", CodeCUM: "CUM-192834-2", GenericName: "Ibuprofeno", BrandName: "Motrin 800mg", Dosage: "800 mg", Presentation: "Tableta", UnitPrice: 1100.00, StockQuantity: 180, MinStock: 25, BatchNumber: "LOT-IBU-2026B", IsActive: true},
		{ID: "inv-aceta-500", CodeCUM: "CUM-180021-1", GenericName: "Acetaminofen", BrandName: "Dolex 500mg", Dosage: "500 mg", Presentation: "Tableta", UnitPrice: 350.00, StockQuantity: 500, MinStock: 50, BatchNumber: "LOT-ACT-2026A", IsActive: true},
		{ID: "inv-aceta-1000", CodeCUM: "CUM-180021-2", GenericName: "Acetaminofen", BrandName: "Dolex Forte 1g", Dosage: "1000 mg", Presentation: "Tableta", UnitPrice: 700.00, StockQuantity: 220, MinStock: 30, BatchNumber: "LOT-ACT-2026B", IsActive: true},
		{ID: "inv-losar-50", CodeCUM: "CUM-210987-1", GenericName: "Losartan Potasico", BrandName: "Cozaar 50mg", Dosage: "50 mg", Presentation: "Tableta", UnitPrice: 1450.00, StockQuantity: 250, MinStock: 35, BatchNumber: "LOT-LOS-2026A", IsActive: true},
		{ID: "inv-losar-100", CodeCUM: "CUM-210987-2", GenericName: "Losartan Potasico", BrandName: "Cozaar 100mg", Dosage: "100 mg", Presentation: "Tableta", UnitPrice: 2300.00, StockQuantity: 140, MinStock: 20, BatchNumber: "LOT-LOS-2026B", IsActive: true},
	}
	for _, it := range seedItems {
		itemCopy := *it
		ds.inventoryItems[itemCopy.ID] = &itemCopy
	}

	for i, med := range catalog.DemoMedications() {
		med.ID = i + 1
		medCopy := med
		ds.medications[medCopy.ID] = &medCopy
	}

	return ds
}

// SeedMedication registra o actualiza un medicamento en el catalogo en memoria (util para tests y demos).
func (ds *DataStore) SeedMedication(med *domain.MedicationCatalog) {
	ds.mu.Lock()
	defer ds.mu.Unlock()
	medCopy := *med
	ds.medications[medCopy.ID] = &medCopy
}

func copyAllergies(src []domain.PatientAllergy) []domain.PatientAllergy {
	if src == nil {
		return nil
	}
	dst := make([]domain.PatientAllergy, len(src))
	copy(dst, src)
	return dst
}

func copyPatient(p *domain.Patient, allergies []domain.PatientAllergy) *domain.Patient {
	out := *p
	out.Allergies = copyAllergies(allergies)
	return &out
}

func copyRecord(rec *domain.ClinicalRecord, clarifications []domain.ClinicalRecordClarification) *domain.ClinicalRecord {
	out := *rec
	if clarifications != nil {
		out.Clarifications = make([]domain.ClinicalRecordClarification, len(clarifications))
		copy(out.Clarifications, clarifications)
	} else {
		out.Clarifications = nil
	}
	return &out
}

func copyPrescription(p *domain.Prescription) *domain.Prescription {
	out := *p
	out.Items = make([]domain.PrescriptionItem, len(p.Items))
	for i, item := range p.Items {
		out.Items[i] = item
		if item.Medication != nil {
			medCopy := *item.Medication
			out.Items[i].Medication = &medCopy
		}
	}
	return &out
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
	out := *u
	return &out, nil
}

func (r *UserMemoryRepo) GetByEmail(_ context.Context, email string) (*domain.User, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	u, ok := r.ds.usersByEmail[strings.ToLower(strings.TrimSpace(email))]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	out := *u
	return &out, nil
}

func (r *UserMemoryRepo) Create(_ context.Context, user *domain.User) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	emailKey := strings.ToLower(strings.TrimSpace(user.Email))
	if _, exists := r.ds.usersByEmail[emailKey]; exists {
		return domain.ErrEmailAlreadyRegistered
	}
	stored := *user
	r.ds.users[stored.ID] = &stored
	r.ds.usersByEmail[emailKey] = &stored
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

func (r *UserMemoryRepo) List(_ context.Context, roleID *int, isActive *bool) ([]*domain.User, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var list []*domain.User
	for _, u := range r.ds.users {
		if roleID != nil && u.RoleID != *roleID {
			continue
		}
		if isActive != nil && u.IsActive != *isActive {
			continue
		}
		userCopy := *u
		list = append(list, &userCopy)
	}
	sort.Slice(list, func(i, j int) bool {
		if !list[i].CreatedAt.Equal(list[j].CreatedAt) {
			return list[i].CreatedAt.After(list[j].CreatedAt)
		}
		return list[i].ID < list[j].ID
	})
	return list, nil
}

func (r *UserMemoryRepo) UpdateStatus(_ context.Context, userID string, isActive bool) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	u, ok := r.ds.users[userID]
	if !ok {
		return domain.ErrUserNotFound
	}
	u.IsActive = isActive
	u.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *UserMemoryRepo) CountAdmins(_ context.Context) (int, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	count := 0
	for _, u := range r.ds.users {
		if u.RoleID == 1 {
			count++
		}
	}
	return count, nil
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
	return copyPatient(p, r.ds.allergies[id]), nil
}

func (r *PatientMemoryRepo) GetByDocument(_ context.Context, docType domain.DocumentType, docNumber string) (*domain.Patient, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	key := string(docType) + "_" + docNumber
	p, ok := r.ds.patientsByDoc[key]
	if !ok {
		return nil, domain.ErrPatientNotFound
	}
	return copyPatient(p, r.ds.allergies[p.ID]), nil
}

func (r *PatientMemoryRepo) Create(_ context.Context, patient *domain.Patient) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	key := string(patient.DocumentType) + "_" + patient.DocumentNumber
	if _, exists := r.ds.patientsByDoc[key]; exists {
		return domain.ErrPatientAlreadyExists
	}
	stored := *patient
	stored.Allergies = nil
	r.ds.patients[stored.ID] = &stored
	r.ds.patientsByDoc[key] = &stored
	return nil
}

func (r *PatientMemoryRepo) List(_ context.Context, limit, offset int) ([]domain.Patient, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	all := make([]domain.Patient, 0, len(r.ds.patients))
	for _, p := range r.ds.patients {
		all = append(all, *copyPatient(p, nil))
	}
	sort.Slice(all, func(i, j int) bool {
		if !all[i].CreatedAt.Equal(all[j].CreatedAt) {
			return all[i].CreatedAt.After(all[j].CreatedAt)
		}
		return all[i].ID < all[j].ID
	})
	if offset < 0 {
		offset = 0
	}
	if offset >= len(all) {
		return []domain.Patient{}, nil
	}
	end := len(all)
	if limit > 0 && offset+limit < end {
		end = offset + limit
	}
	return all[offset:end], nil
}

func (r *PatientMemoryRepo) GetPatientAllergies(_ context.Context, patientID string) ([]domain.PatientAllergy, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	return copyAllergies(r.ds.allergies[patientID]), nil
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
	stored := *record
	r.ds.triages[stored.ID] = &stored
	return nil
}

func (r *TriageMemoryRepo) GetByID(_ context.Context, id string) (*domain.TriageRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	t, ok := r.ds.triages[id]
	if !ok {
		return nil, domain.ErrTriageNotFound
	}
	out := *t
	return &out, nil
}

func (r *TriageMemoryRepo) ListPending(_ context.Context) ([]domain.TriageRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	list := []domain.TriageRecord{}
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
	if existing, ok := r.ds.clinicalRecords[record.ID]; ok && existing.IsClosed {
		return domain.ErrRecordAlreadyClosed
	}
	r.ds.clinicalRecords[record.ID] = copyRecord(record, nil)
	return nil
}

func (r *ClinicalRecordMemoryRepo) GetByID(_ context.Context, id string) (*domain.ClinicalRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	rec, ok := r.ds.clinicalRecords[id]
	if !ok {
		return nil, domain.ErrRecordNotFound
	}
	return copyRecord(rec, r.ds.clarifications[id]), nil
}

// chainHeadLocked retorna el ultimo eslabon cerrado del paciente: el folio cuyo hash ningun otro folio usa como hash previo.
// Requiere el candado del almacen tomado por el llamador.
func (ds *DataStore) chainHeadLocked(patientID string) *domain.ClinicalRecord {
	referenced := make(map[string]bool)
	var closed []*domain.ClinicalRecord
	for _, rec := range ds.clinicalRecords {
		if rec.PatientID != patientID || !rec.IsClosed {
			continue
		}
		closed = append(closed, rec)
		if rec.PreviousHash != nil {
			referenced[*rec.PreviousHash] = true
		}
	}

	var head *domain.ClinicalRecord
	for _, rec := range closed {
		if rec.HashSHA256 != nil && referenced[*rec.HashSHA256] {
			continue
		}
		if head == nil || laterClosed(rec, head) {
			head = rec
		}
	}
	return head
}

func laterClosed(a, b *domain.ClinicalRecord) bool {
	switch {
	case a.ClosedAt != nil && b.ClosedAt != nil && !a.ClosedAt.Equal(*b.ClosedAt):
		return a.ClosedAt.After(*b.ClosedAt)
	default:
		return a.CreatedAt.After(b.CreatedAt)
	}
}

// chainLinkTakenLocked indica si el patient ya tiene un folio cerrado que consume ese hash previo.
func (ds *DataStore) chainLinkTakenLocked(patientID, previousHash, exceptID string) bool {
	for _, rec := range ds.clinicalRecords {
		if rec.ID == exceptID || rec.PatientID != patientID || !rec.IsClosed {
			continue
		}
		if rec.PreviousHash != nil && *rec.PreviousHash == previousHash {
			return true
		}
	}
	return false
}

func (r *ClinicalRecordMemoryRepo) GetLastClosedRecordByPatient(_ context.Context, patientID string) (*domain.ClinicalRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	head := r.ds.chainHeadLocked(patientID)
	if head == nil {
		return nil, nil
	}
	return copyRecord(head, nil), nil
}

func (r *ClinicalRecordMemoryRepo) ListByPatient(_ context.Context, patientID string) ([]domain.ClinicalRecord, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	list := []domain.ClinicalRecord{}
	for _, rec := range r.ds.clinicalRecords {
		if rec.PatientID == patientID {
			list = append(list, *copyRecord(rec, r.ds.clarifications[rec.ID]))
		}
	}
	sort.Slice(list, func(i, j int) bool {
		if !list[i].CreatedAt.Equal(list[j].CreatedAt) {
			return list[i].CreatedAt.After(list[j].CreatedAt)
		}
		return list[i].ID < list[j].ID
	})
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
	if r.ds.chainLinkTakenLocked(rec.PatientID, previousHash, id) {
		return domain.ErrChainConflict
	}
	closed := closedAt
	rec.IsClosed = true
	rec.SignatureToken = &signatureToken
	rec.PreviousHash = &previousHash
	rec.HashSHA256 = &hashSHA256
	rec.ClosedAt = &closed
	return nil
}

func (r *ClinicalRecordMemoryRepo) AddClarification(_ context.Context, clarification *domain.ClinicalRecordClarification) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	clarification.ID = len(r.ds.clarifications[clarification.ClinicalRecordID]) + 1
	r.ds.clarifications[clarification.ClinicalRecordID] = append(r.ds.clarifications[clarification.ClinicalRecordID], *clarification)
	return nil
}

// SaveBatch consolida folios sincronizados sin modificar nunca un folio ya cerrado y sin permitir que dos
// folios cerrados del mismo paciente compartan eslabon previo. La operacion es atomica: o se aplica todo o nada.
func (r *ClinicalRecordMemoryRepo) SaveBatch(_ context.Context, records []domain.ClinicalRecord) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()

	type pendingLink struct{ patientID, previousHash string }
	claimed := make(map[pendingLink]bool)
	toStore := make([]*domain.ClinicalRecord, 0, len(records))

	for i := range records {
		rec := records[i]
		if existing, ok := r.ds.clinicalRecords[rec.ID]; ok && existing.IsClosed {
			continue
		}
		if rec.IsClosed && rec.PreviousHash != nil {
			link := pendingLink{rec.PatientID, *rec.PreviousHash}
			if claimed[link] || r.ds.chainLinkTakenLocked(rec.PatientID, *rec.PreviousHash, rec.ID) {
				return domain.ErrChainConflict
			}
			claimed[link] = true
		}
		toStore = append(toStore, copyRecord(&rec, nil))
	}

	for _, rec := range toStore {
		r.ds.clinicalRecords[rec.ID] = rec
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
	r.ds.prescriptions[prescription.ID] = copyPrescription(prescription)
	return nil
}

func (r *PrescriptionMemoryRepo) GetByID(_ context.Context, id string) (*domain.Prescription, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	p, ok := r.ds.prescriptions[id]
	if !ok {
		return nil, domain.ErrPrescriptionNotFound
	}
	return copyPrescription(p), nil
}

func (r *PrescriptionMemoryRepo) GetByClinicalRecordID(_ context.Context, recordID string) (*domain.Prescription, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	for _, p := range r.ds.prescriptions {
		if p.ClinicalRecordID == recordID {
			return copyPrescription(p), nil
		}
	}
	return nil, domain.ErrPrescriptionNotFound
}

// GetMedicationByID retorna una copia: el stock interno solo cambia bajo candado en DeductStock.
func (r *PrescriptionMemoryRepo) GetMedicationByID(_ context.Context, id int) (*domain.MedicationCatalog, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	med, ok := r.ds.medications[id]
	if !ok {
		return nil, domain.ErrMedicationNotFound
	}
	out := *med
	return &out, nil
}

func (r *PrescriptionMemoryRepo) SearchMedications(_ context.Context, query string) ([]domain.MedicationCatalog, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	result := []domain.MedicationCatalog{}
	q := strings.ToLower(query)
	for _, med := range r.ds.medications {
		if strings.Contains(strings.ToLower(med.CommercialName), q) ||
			strings.Contains(strings.ToLower(med.GenericName), q) ||
			strings.Contains(strings.ToLower(med.ActiveIngredient), q) {
			result = append(result, *med)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].CommercialName < result[j].CommercialName })
	if len(result) > maxMedicationResults {
		result = result[:maxMedicationResults]
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
	stored := *log
	stored.ID = int64(len(r.ds.auditLogs) + 1)
	log.ID = stored.ID
	r.ds.auditLogs = append(r.ds.auditLogs, &stored)
	return nil
}

func (r *AuditMemoryRepo) ListLogs(_ context.Context, limit int) ([]*domain.AuditLog, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	if limit <= 0 || limit > len(r.ds.auditLogs) {
		limit = len(r.ds.auditLogs)
	}
	logs := []*domain.AuditLog{}
	for i := len(r.ds.auditLogs) - 1; i >= 0 && len(logs) < limit; i-- {
		logCopy := *r.ds.auditLogs[i]
		logs = append(logs, &logCopy)
	}
	return logs, nil
}

func (r *AuditMemoryRepo) SaveRIPSTransaction(_ context.Context, tx *domain.RIPSTransaction) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	stored := *tx
	r.ds.rips[stored.ID] = &stored
	return nil
}

func (r *AuditMemoryRepo) GetRIPSTransactionByID(_ context.Context, id string) (*domain.RIPSTransaction, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	tx, ok := r.ds.rips[id]
	if !ok {
		return nil, domain.ErrRecordNotFound
	}
	out := *tx
	return &out, nil
}

// -----------------------------------------------------------------------------
// ADAPTADOR EN MEMORIA: CITAS MEDICAS Y CALENDARIO
// -----------------------------------------------------------------------------

type AppointmentMemoryRepo struct {
	ds *DataStore
}

func NewAppointmentMemoryRepo(ds *DataStore) ports.AppointmentRepository {
	return &AppointmentMemoryRepo{ds: ds}
}

func (r *AppointmentMemoryRepo) Create(_ context.Context, app *domain.Appointment) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	stored := *app
	if stored.CreatedAt.IsZero() {
		stored.CreatedAt = time.Now().UTC()
	}
	r.ds.appointments[stored.ID] = &stored
	return nil
}

func (r *AppointmentMemoryRepo) GetByID(_ context.Context, id string) (*domain.Appointment, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	app, ok := r.ds.appointments[id]
	if !ok {
		return nil, domain.ErrAppointmentNotFound
	}
	out := *app
	return &out, nil
}

func (r *AppointmentMemoryRepo) GetByDoctorID(_ context.Context, doctorID string) ([]domain.Appointment, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var list []domain.Appointment
	for _, app := range r.ds.appointments {
		if app.DoctorID == doctorID {
			list = append(list, *app)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].AppointmentDate.Before(list[j].AppointmentDate)
	})
	return list, nil
}

func (r *AppointmentMemoryRepo) GetByDateRange(_ context.Context, doctorID string, start, end time.Time) ([]domain.Appointment, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var list []domain.Appointment
	for _, app := range r.ds.appointments {
		if app.DoctorID == doctorID && (app.AppointmentDate.Equal(start) || app.AppointmentDate.After(start)) && (app.AppointmentDate.Equal(end) || app.AppointmentDate.Before(end)) {
			list = append(list, *app)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].AppointmentDate.Before(list[j].AppointmentDate)
	})
	return list, nil
}

func (r *AppointmentMemoryRepo) HasOverlap(_ context.Context, doctorID string, date time.Time) (bool, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	start := date.Add(-20 * time.Minute)
	end := date.Add(20 * time.Minute)
	for _, app := range r.ds.appointments {
		if app.DoctorID == doctorID && app.Status != domain.AppointmentCancelled && app.AppointmentDate.After(start) && app.AppointmentDate.Before(end) {
			return true, nil
		}
	}
	return false, nil
}

func (r *AppointmentMemoryRepo) UpdatePDFAndEmailStatus(_ context.Context, id, pdfPath string, emailSent bool) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	app, ok := r.ds.appointments[id]
	if !ok {
		return domain.ErrAppointmentNotFound
	}
	app.PDFPath = pdfPath
	app.EmailSent = emailSent
	return nil
}

// -----------------------------------------------------------------------------
// ADAPTADOR EN MEMORIA: INVENTARIO POR CONCENTRACION Y PRECIO
// -----------------------------------------------------------------------------

type InventoryMemoryRepo struct {
	ds *DataStore
}

func NewInventoryMemoryRepo(ds *DataStore) ports.InventoryRepository {
	return &InventoryMemoryRepo{ds: ds}
}

func (r *InventoryMemoryRepo) GetAll(_ context.Context) ([]domain.InventoryItem, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var list []domain.InventoryItem
	for _, item := range r.ds.inventoryItems {
		if item.IsActive {
			list = append(list, *item)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].GenericName == list[j].GenericName {
			return list[i].Dosage < list[j].Dosage
		}
		return list[i].GenericName < list[j].GenericName
	})
	return list, nil
}

func (r *InventoryMemoryRepo) GetByID(_ context.Context, id string) (*domain.InventoryItem, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	it, ok := r.ds.inventoryItems[id]
	if !ok {
		return nil, domain.ErrInventoryItemNotFound
	}
	out := *it
	return &out, nil
}

func (r *InventoryMemoryRepo) Create(_ context.Context, item *domain.InventoryItem) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	stored := *item
	stored.CreatedAt = time.Now().UTC()
	stored.UpdatedAt = stored.CreatedAt
	r.ds.inventoryItems[stored.ID] = &stored
	return nil
}

func (r *InventoryMemoryRepo) UpdateStock(_ context.Context, id string, quantityChange int) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	it, ok := r.ds.inventoryItems[id]
	if !ok {
		return domain.ErrInventoryItemNotFound
	}
	it.StockQuantity += quantityChange
	it.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *InventoryMemoryRepo) AdjustStock(_ context.Context, id string, newStock int, batch string) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	it, ok := r.ds.inventoryItems[id]
	if !ok {
		return domain.ErrInventoryItemNotFound
	}
	it.StockQuantity = newStock
	if batch != "" {
		it.BatchNumber = batch
	}
	it.UpdatedAt = time.Now().UTC()
	return nil
}

// -----------------------------------------------------------------------------
// ADAPTADOR EN MEMORIA: BUZON Y DISPENSACION ATOMICA CON ESCANER PDF417
// -----------------------------------------------------------------------------

type PrescriptionV2MemoryRepo struct {
	ds *DataStore
}

func NewPrescriptionV2MemoryRepo(ds *DataStore) ports.PrescriptionV2Repository {
	return &PrescriptionV2MemoryRepo{ds: ds}
}

func (r *PrescriptionV2MemoryRepo) CreateWithItemsTx(_ context.Context, presc *domain.PrescriptionV2) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()
	stored := *presc
	if stored.CreatedAt.IsZero() {
		stored.CreatedAt = time.Now().UTC()
	}
	itemsCopy := make([]domain.PrescriptionItemV2, len(presc.Items))
	copy(itemsCopy, presc.Items)
	stored.Items = itemsCopy
	r.ds.prescriptionsV2[stored.ID] = &stored
	return nil
}

func (r *PrescriptionV2MemoryRepo) GetPendingInbox(ctx context.Context) ([]domain.PrescriptionV2, error) {
	pending := domain.PrescriptionStatusPending
	return r.GetAllInbox(ctx, &pending, "")
}

func (r *PrescriptionV2MemoryRepo) GetAllInbox(_ context.Context, statusFilter *domain.PrescriptionStatusV2, queryTerm string) ([]domain.PrescriptionV2, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	var list []domain.PrescriptionV2
	for _, p := range r.ds.prescriptionsV2 {
		if statusFilter != nil && *statusFilter != "" && p.Status != *statusFilter {
			continue
		}
		if queryTerm != "" {
			term := strings.ToLower(queryTerm)
			if !strings.Contains(strings.ToLower(p.UniqueCode), term) &&
				!strings.Contains(strings.ToLower(p.PatientDocument), term) &&
				!strings.Contains(strings.ToLower(p.PatientName), term) {
				continue
			}
		}
		pCopy := *p
		items := make([]domain.PrescriptionItemV2, len(p.Items))
		copy(items, p.Items)
		pCopy.Items = items
		list = append(list, pCopy)
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.After(list[j].CreatedAt)
	})
	return list, nil
}

func (r *PrescriptionV2MemoryRepo) GetByID(_ context.Context, id string) (*domain.PrescriptionV2, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	p, ok := r.ds.prescriptionsV2[id]
	if !ok {
		return nil, domain.ErrPrescriptionNotFound
	}
	pCopy := *p
	items := make([]domain.PrescriptionItemV2, len(p.Items))
	copy(items, p.Items)
	pCopy.Items = items
	return &pCopy, nil
}

func (r *PrescriptionV2MemoryRepo) GetByUniqueCodeOrDocument(ctx context.Context, term string) (*domain.PrescriptionV2, error) {
	r.ds.mu.RLock()
	defer r.ds.mu.RUnlock()
	for _, p := range r.ds.prescriptionsV2 {
		if p.UniqueCode == term || p.PatientDocument == term {
			pCopy := *p
			items := make([]domain.PrescriptionItemV2, len(p.Items))
			copy(items, p.Items)
			pCopy.Items = items
			return &pCopy, nil
		}
	}
	return nil, domain.ErrPrescriptionNotFound
}

func (r *PrescriptionV2MemoryRepo) MarkAsDispensedTx(_ context.Context, req domain.DispenseRequestDTO, items []domain.PrescriptionItemV2) error {
	r.ds.mu.Lock()
	defer r.ds.mu.Unlock()

	p, ok := r.ds.prescriptionsV2[req.PrescriptionID]
	if !ok {
		return domain.ErrPrescriptionNotFound
	}
	if p.Status == domain.PrescriptionStatusDispensed {
		return domain.ErrAlreadyDispensed
	}
	if req.PatientDocument != "" && req.PatientDocument != p.PatientDocument {
		return domain.ErrDocumentMismatch
	}

	// Verificar y descontar stock
	for _, it := range items {
		inv, ok := r.ds.inventoryItems[it.InventoryItemID]
		if !ok {
			return domain.ErrInventoryItemNotFound
		}
		if inv.StockQuantity < it.QuantityPrescribed {
			return domain.ErrInsufficientStock
		}
	}
	for _, it := range items {
		inv := r.ds.inventoryItems[it.InventoryItemID]
		inv.StockQuantity -= it.QuantityPrescribed
	}

	now := time.Now().UTC()
	p.Status = domain.PrescriptionStatusDispensed
	p.DispensedAt = &now
	if req.DispensedByID != "" {
		p.DispensedBy = &req.DispensedByID
	}
	if req.CoverageType != "" {
		p.CoverageType = domain.CoverageType(req.CoverageType)
	}
	if req.PaymentMethod != "" {
		p.PaymentMethod = domain.PaymentMethod(req.PaymentMethod)
	}

	return nil
}
