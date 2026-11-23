package mysql

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	gomysql "github.com/go-sql-driver/mysql"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

func nullTime(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	return *t
}

func isDuplicate(err error) bool {
	var me *gomysql.MySQLError
	return errors.As(err, &me) && me.Number == 1062
}

// ---------------------------------------------------------------------------------------------
// Ordenes de laboratorio
// ---------------------------------------------------------------------------------------------

type labOrderRepository struct{ db *sql.DB }

// NewLabOrderRepository crea el adaptador MySQL de las ordenes de laboratorio.
func NewLabOrderRepository(db *sql.DB) ports.LabOrderRepository { return &labOrderRepository{db: db} }

const labColumns = `id, COALESCE(patient_id, ''), patient_name, patient_document, patient_document_type, patient_email,
	patient_phone, patient_eps, patient_age, patient_gender, test_type, sample_type, priority, status, observations,
	COALESCE(ordering_doctor_id, ''), ordering_doctor, doctor_license, doctor_specialty, doctor_email, results,
	method_notes, validated_at, validated_by, bacteriologist_license, email_dispatched_at, dispatched_to, created_at, updated_at`

func scanLabOrder(row rowScanner) (*domain.LabOrder, error) {
	var o domain.LabOrder
	var status string
	var validated, dispatched sql.NullTime
	err := row.Scan(&o.ID, &o.PatientID, &o.PatientName, &o.PatientDocument, &o.PatientDocumentType, &o.PatientEmail,
		&o.PatientPhone, &o.PatientEPS, &o.PatientAge, &o.PatientGender, &o.TestType, &o.SampleType, &o.Priority, &status,
		&o.Observations, &o.OrderingDoctorID, &o.OrderingDoctor, &o.DoctorLicense, &o.DoctorSpecialty, &o.DoctorEmail,
		&o.Results, &o.MethodNotes, &validated, &o.ValidatedBy, &o.BacteriologistLicense, &dispatched, &o.DispatchedTo,
		&o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}
	o.Status = domain.LabOrderStatus(status)
	if validated.Valid {
		o.ValidatedAt = &validated.Time
	}
	if dispatched.Valid {
		o.EmailDispatchedAt = &dispatched.Time
	}
	return &o, nil
}

func (r *labOrderRepository) CreateWithNextID(ctx context.Context, o *domain.LabOrder) error {
	prefix := fmt.Sprintf("LAB-%d-", o.CreatedAt.Year())
	// El indice primario garantiza la unicidad; ante una carrera se reintenta con el siguiente numero
	for intento := 0; intento < 5; intento++ {
		var maxSeq sql.NullInt64
		if err := r.db.QueryRowContext(ctx,
			`SELECT MAX(CAST(SUBSTRING(id, ?) AS UNSIGNED)) FROM lab_orders WHERE id LIKE ?`,
			len(prefix)+1, prefix+"%").Scan(&maxSeq); err != nil {
			return err
		}
		o.ID = fmt.Sprintf("%s%03d", prefix, maxSeq.Int64+1)
		_, err := r.db.ExecContext(ctx, `
			INSERT INTO lab_orders (id, patient_id, patient_name, patient_document, patient_document_type, patient_email,
				patient_phone, patient_eps, patient_age, patient_gender, test_type, sample_type, priority, status, observations,
				ordering_doctor_id, ordering_doctor, doctor_license, doctor_specialty, doctor_email, results, method_notes,
				validated_at, validated_by, bacteriologist_license, email_dispatched_at, dispatched_to, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			o.ID, nullable(o.PatientID), o.PatientName, o.PatientDocument, o.PatientDocumentType, o.PatientEmail,
			o.PatientPhone, o.PatientEPS, o.PatientAge, o.PatientGender, o.TestType, o.SampleType, o.Priority, string(o.Status),
			o.Observations, nullable(o.OrderingDoctorID), o.OrderingDoctor, o.DoctorLicense, o.DoctorSpecialty, o.DoctorEmail,
			o.Results, o.MethodNotes, nullTime(o.ValidatedAt), o.ValidatedBy, o.BacteriologistLicense,
			nullTime(o.EmailDispatchedAt), o.DispatchedTo, o.CreatedAt, o.UpdatedAt)
		if err == nil {
			return nil
		}
		if !isDuplicate(err) {
			return err
		}
	}
	return errors.New("no fue posible asignar un identificador unico a la orden de laboratorio")
}

func (r *labOrderRepository) GetByID(ctx context.Context, id string) (*domain.LabOrder, error) {
	o, err := scanLabOrder(r.db.QueryRowContext(ctx, `SELECT `+labColumns+` FROM lab_orders WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrLabOrderNotFound
	}
	return o, err
}

func (r *labOrderRepository) List(ctx context.Context, doctorID string, status domain.LabOrderStatus) ([]domain.LabOrder, error) {
	query := `SELECT ` + labColumns + ` FROM lab_orders WHERE 1 = 1`
	var args []interface{}
	if doctorID != "" {
		query += ` AND ordering_doctor_id = ?`
		args = append(args, doctorID)
	}
	if status != "" {
		query += ` AND status = ?`
		args = append(args, string(status))
	}
	query += ` ORDER BY created_at DESC LIMIT 1000`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []domain.LabOrder{}
	for rows.Next() {
		o, err := scanLabOrder(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *o)
	}
	return list, rows.Err()
}

func (r *labOrderRepository) Update(ctx context.Context, o *domain.LabOrder) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE lab_orders SET patient_name = ?, patient_email = ?, patient_phone = ?, status = ?, results = ?,
			method_notes = ?, validated_at = ?, validated_by = ?, bacteriologist_license = ?, email_dispatched_at = ?,
			dispatched_to = ?, updated_at = ?
		WHERE id = ?`,
		o.PatientName, o.PatientEmail, o.PatientPhone, string(o.Status), o.Results, o.MethodNotes, nullTime(o.ValidatedAt),
		o.ValidatedBy, o.BacteriologistLicense, nullTime(o.EmailDispatchedAt), o.DispatchedTo, o.UpdatedAt, o.ID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrLabOrderNotFound
	}
	return nil
}

// ---------------------------------------------------------------------------------------------
// Registro de enfermeria
// ---------------------------------------------------------------------------------------------

type nursingRepository struct{ db *sql.DB }

// NewNursingRepository crea el adaptador MySQL del registro de enfermeria.
func NewNursingRepository(db *sql.DB) ports.NursingRepository { return &nursingRepository{db: db} }

func scanCare(row rowScanner) (*domain.NursingCare, error) {
	var c domain.NursingCare
	var order sql.NullString
	var duties, notes string
	if err := row.Scan(&c.PatientID, &order, &duties, &notes, &c.UpdatedAt, &c.UpdatedBy); err != nil {
		return nil, err
	}
	if order.Valid && order.String != "" {
		c.Order = json.RawMessage(order.String)
	}
	if err := json.Unmarshal([]byte(duties), &c.Duties); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(notes), &c.Notes); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *nursingRepository) Get(ctx context.Context, patientID string) (*domain.NursingCare, error) {
	c, err := scanCare(r.db.QueryRowContext(ctx,
		`SELECT patient_id, order_json, duties_json, notes_json, updated_at, updated_by FROM nursing_care WHERE patient_id = ?`, patientID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNursingCareNotFound
	}
	return c, err
}

func (r *nursingRepository) List(ctx context.Context) ([]domain.NursingCare, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT patient_id, order_json, duties_json, notes_json, updated_at, updated_by FROM nursing_care ORDER BY updated_at DESC LIMIT 1000`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []domain.NursingCare{}
	for rows.Next() {
		c, err := scanCare(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *c)
	}
	return list, rows.Err()
}

func (r *nursingRepository) Save(ctx context.Context, c *domain.NursingCare) error {
	duties, err := json.Marshal(c.Duties)
	if err != nil {
		return err
	}
	notes, err := json.Marshal(c.Notes)
	if err != nil {
		return err
	}
	var order interface{}
	if len(c.Order) > 0 {
		order = string(c.Order)
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO nursing_care (patient_id, order_json, duties_json, notes_json, updated_at, updated_by)
		VALUES (?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE order_json = VALUES(order_json), duties_json = VALUES(duties_json),
			notes_json = VALUES(notes_json), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)`,
		c.PatientID, order, string(duties), string(notes), c.UpdatedAt, c.UpdatedBy)
	return err
}

// ---------------------------------------------------------------------------------------------
// Sedes
// ---------------------------------------------------------------------------------------------

type branchRepository struct{ db *sql.DB }

// NewBranchRepository crea el adaptador MySQL de las sedes.
func NewBranchRepository(db *sql.DB) ports.BranchRepository { return &branchRepository{db: db} }

const branchColumns = `id, name, level, municipality, status, description, latitude, longitude, created_at, updated_at`

func scanBranch(row rowScanner) (*domain.Branch, error) {
	var b domain.Branch
	var lat, lng sql.NullFloat64
	if err := row.Scan(&b.ID, &b.Name, &b.Level, &b.Municipality, &b.Status, &b.Description, &lat, &lng, &b.CreatedAt, &b.UpdatedAt); err != nil {
		return nil, err
	}
	if lat.Valid && lng.Valid {
		b.Latitude, b.Longitude = &lat.Float64, &lng.Float64
	}
	return &b, nil
}

func nullFloat(v *float64) interface{} {
	if v == nil {
		return nil
	}
	return *v
}

func (r *branchRepository) List(ctx context.Context) ([]domain.Branch, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+branchColumns+` FROM branches ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []domain.Branch{}
	for rows.Next() {
		b, err := scanBranch(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *b)
	}
	return list, rows.Err()
}

func (r *branchRepository) GetByID(ctx context.Context, id string) (*domain.Branch, error) {
	b, err := scanBranch(r.db.QueryRowContext(ctx, `SELECT `+branchColumns+` FROM branches WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrBranchNotFound
	}
	return b, err
}

func (r *branchRepository) Create(ctx context.Context, b *domain.Branch) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO branches (`+branchColumns+`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		b.ID, b.Name, b.Level, b.Municipality, b.Status, b.Description, nullFloat(b.Latitude), nullFloat(b.Longitude), b.CreatedAt, b.UpdatedAt)
	if isDuplicate(err) {
		return domain.ErrBranchNameTaken
	}
	return err
}

func (r *branchRepository) Update(ctx context.Context, b *domain.Branch) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE branches SET name = ?, level = ?, municipality = ?, status = ?, description = ?, latitude = ?, longitude = ?, updated_at = ?
		WHERE id = ?`,
		b.Name, b.Level, b.Municipality, b.Status, b.Description, nullFloat(b.Latitude), nullFloat(b.Longitude), b.UpdatedAt, b.ID)
	if isDuplicate(err) {
		return domain.ErrBranchNameTaken
	}
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		// MySQL informa 0 filas si los valores no cambiaron: se confirma que la sede exista
		if _, err := r.GetByID(ctx, b.ID); err != nil {
			return err
		}
	}
	return nil
}

func (r *branchRepository) Delete(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM branches WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrBranchNotFound
	}
	return nil
}

// ensureLabNursingBranchTables crea las tablas que antes vivian en el navegador y siembra las sedes iniciales.
func ensureLabNursingBranchTables(db *sql.DB) error {
	ctx := context.Background()
	stmts := []string{
		// DEF-56: la farmacia v2 usa tablas propias. Antes compartia el nombre "prescriptions" con las recetas de la
		// HCE, y la unica forma de que funcionara era una migracion que borraba las recetas v1.
		`CREATE TABLE IF NOT EXISTS pharmacy_prescriptions (
			id VARCHAR(36) PRIMARY KEY,
			hce_id VARCHAR(36) NOT NULL,
			doctor_id VARCHAR(36) NOT NULL,
			patient_id VARCHAR(36) NOT NULL,
			patient_document VARCHAR(20) NOT NULL,
			patient_name VARCHAR(150) NOT NULL,
			patient_eps VARCHAR(100) NOT NULL,
			unique_code VARCHAR(64) NOT NULL,
			treatment_notes TEXT,
			subtotal_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
			coverage_type ENUM('EPS_PBS_100', 'COPAY', 'PARTICULAR') NOT NULL DEFAULT 'EPS_PBS_100',
			patient_payable_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
			eps_coverage_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
			payment_method ENUM('EPS_DIRECT', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'EXEMPT') DEFAULT 'EPS_DIRECT',
			status ENUM('PENDING', 'DISPENSED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
			dispensed_at DATETIME NULL,
			dispensed_by VARCHAR(36) NULL,
			pdf_patient_path VARCHAR(255) NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE KEY uq_pharmacy_presc_code (unique_code),
			INDEX idx_pharmacy_inbox (patient_document, status),
			CONSTRAINT fk_pharm_presc_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
			CONSTRAINT fk_pharm_presc_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		`CREATE TABLE IF NOT EXISTS pharmacy_prescription_items (
			id VARCHAR(36) PRIMARY KEY,
			prescription_id VARCHAR(36) NOT NULL,
			inventory_item_id VARCHAR(36) NOT NULL,
			medication_name VARCHAR(150) NOT NULL,
			dosage VARCHAR(50) NOT NULL,
			quantity_prescribed INT NOT NULL,
			unit_price DECIMAL(10, 2) NOT NULL,
			total_item_price DECIMAL(10, 2) NOT NULL,
			instructions TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT fk_pharm_item_presc FOREIGN KEY (prescription_id) REFERENCES pharmacy_prescriptions(id) ON DELETE CASCADE,
			CONSTRAINT fk_pharm_item_inventory FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		`CREATE TABLE IF NOT EXISTS lab_orders (
			id VARCHAR(20) PRIMARY KEY,
			patient_id VARCHAR(36) NULL,
			patient_name VARCHAR(150) NOT NULL,
			patient_document VARCHAR(25) NOT NULL,
			patient_document_type VARCHAR(5) NOT NULL DEFAULT 'CC',
			patient_email VARCHAR(100) NOT NULL DEFAULT '',
			patient_phone VARCHAR(20) NOT NULL DEFAULT '',
			patient_eps VARCHAR(120) NOT NULL DEFAULT '',
			patient_age INT NOT NULL DEFAULT 0,
			patient_gender VARCHAR(20) NOT NULL DEFAULT '',
			test_type VARCHAR(200) NOT NULL,
			sample_type VARCHAR(150) NOT NULL DEFAULT '',
			priority VARCHAR(12) NOT NULL,
			status VARCHAR(12) NOT NULL DEFAULT 'PENDIENTE',
			observations TEXT NOT NULL,
			ordering_doctor_id VARCHAR(36) NULL,
			ordering_doctor VARCHAR(150) NOT NULL DEFAULT '',
			doctor_license VARCHAR(50) NOT NULL DEFAULT '',
			doctor_specialty VARCHAR(100) NOT NULL DEFAULT '',
			doctor_email VARCHAR(100) NOT NULL DEFAULT '',
			results TEXT NOT NULL,
			method_notes TEXT NOT NULL,
			validated_at DATETIME NULL,
			validated_by VARCHAR(150) NOT NULL DEFAULT '',
			bacteriologist_license VARCHAR(50) NOT NULL DEFAULT '',
			email_dispatched_at DATETIME NULL,
			dispatched_to VARCHAR(100) NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			INDEX idx_lab_doctor_status (ordering_doctor_id, status, created_at)
		) ENGINE=InnoDB`,
		`CREATE TABLE IF NOT EXISTS nursing_care (
			patient_id VARCHAR(36) PRIMARY KEY,
			order_json LONGTEXT NULL,
			duties_json LONGTEXT NOT NULL,
			notes_json LONGTEXT NOT NULL,
			updated_at DATETIME NOT NULL,
			updated_by VARCHAR(150) NOT NULL DEFAULT ''
		) ENGINE=InnoDB`,
		`CREATE TABLE IF NOT EXISTS branches (
			id VARCHAR(40) PRIMARY KEY,
			name VARCHAR(120) NOT NULL UNIQUE,
			level VARCHAR(100) NOT NULL DEFAULT '',
			municipality VARCHAR(120) NOT NULL DEFAULT '',
			status VARCHAR(30) NOT NULL DEFAULT 'Operativo',
			description TEXT NOT NULL,
			latitude DOUBLE NULL,
			longitude DOUBLE NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		) ENGINE=InnoDB`,
	}
	for _, stmt := range stmts {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	now := time.Now().UTC()
	for _, b := range domain.InitialBranches() {
		if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO branches (`+branchColumns+`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			b.ID, b.Name, b.Level, b.Municipality, b.Status, b.Description, nullFloat(b.Latitude), nullFloat(b.Longitude), now, now); err != nil {
			return fmt.Errorf("sembrando la sede %s: %w", strings.TrimSpace(b.Name), err)
		}
	}
	return nil
}
