package mysql

import (
	"database/sql"
	"fmt"

	"saludconecta-backend/adapters/storage/catalog"
)

// ensureUsersColumns verifica y crea de forma dinamica e idempotente las columnas requeridas en MySQL
func ensureUsersColumns(db *sql.DB) error {
	columns := []struct {
		name string
		dtyp string
	}{
		{"document_type", "VARCHAR(10) DEFAULT 'CC'"},
		{"document_number", "VARCHAR(25) DEFAULT ''"},
		{"phone", "VARCHAR(25) DEFAULT ''"},
		{"specialty", "VARCHAR(100) DEFAULT ''"},
		{"branch", "VARCHAR(100) DEFAULT ''"},
	}

	for _, col := range columns {
		var exists int
		checkQuery := `
			SELECT COUNT(*)
			FROM information_schema.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?
		`
		if err := db.QueryRow(checkQuery, col.name).Scan(&exists); err != nil {
			return err
		}
		if exists == 0 {
			alterQuery := fmt.Sprintf("ALTER TABLE users ADD COLUMN %s %s", col.name, col.dtyp)
			if _, err := db.Exec(alterQuery); err != nil {
				return fmt.Errorf("error agregando columna %s a users: %w", col.name, err)
			}
		}
	}
	return nil
}

// ensureRoles verifica que existan los roles basicos en el catalogo RBAC
func ensureRoles(db *sql.DB) error {
	roles := []struct {
		id   int
		name string
		desc string
	}{
		{1, "ADMIN", "Administrador del Sistema y Gobernanza ReTHUS"},
		{2, "MEDICO", "Médico Especialista o General Asistencial"},
		{3, "ENFERMERO", "Personal de Enfermería y Triaje"},
		{4, "ADMISION", "Admisiones y Facturación"},
		{5, "AUDITOR", "Auditoría Médica y Forense"},
		{6, "FARMACIA", "Personal de Farmacia, Inventario y Dispensación"},
	}

	for _, r := range roles {
		query := `INSERT IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)`
		if _, err := db.Exec(query, r.id, r.name, r.desc); err != nil {
			return err
		}
	}
	return nil
}

// ensureChainIndex crea el indice unico que impide bifurcar la cadena SHA-256: un paciente no puede tener dos
// folios cerrados que consuman el mismo hash previo. Los borradores (previous_hash NULL) no participan.
func ensureChainIndex(db *sql.DB) error {
	var exists int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clinical_records' AND INDEX_NAME = ?`, chainIndexName).Scan(&exists)
	if err != nil {
		return err
	}
	if exists > 0 {
		return nil
	}
	if _, err := db.Exec(fmt.Sprintf("ALTER TABLE clinical_records ADD UNIQUE KEY %s (patient_id, previous_hash)", chainIndexName)); err != nil {
		return fmt.Errorf("no fue posible crear el indice unico de la cadena SHA-256 (verifique bifurcaciones previas): %w", err)
	}
	return nil
}

// ensureTriggers instala los disparadores de inmutabilidad en bases creadas antes de que existieran.
func ensureTriggers(db *sql.DB) error {
	triggers := []struct {
		name string
		stmt string
	}{
		{
			"trg_prevent_update_closed_record",
			`CREATE TRIGGER trg_prevent_update_closed_record BEFORE UPDATE ON clinical_records FOR EACH ROW
			BEGIN
				IF OLD.is_closed = TRUE THEN
					SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Operacion denegada: La Historia Clinica se encuentra cerrada y es inmutable segun Resolucion 1995 de MinSalud.';
				END IF;
			END`,
		},
		{
			"trg_prevent_delete_clinical_record",
			`CREATE TRIGGER trg_prevent_delete_clinical_record BEFORE DELETE ON clinical_records FOR EACH ROW
			BEGIN
				SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Operacion denegada: Queda prohibida la eliminacion de registros de Historias Clinicas (Custodia Legal).';
			END`,
		},
		{
			"trg_prevent_update_clarification",
			`CREATE TRIGGER trg_prevent_update_clarification BEFORE UPDATE ON clinical_record_clarifications FOR EACH ROW
			BEGIN
				SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Operacion denegada: Las notas aclaratorias son inmutables y no pueden modificarse ni eliminarse.';
			END`,
		},
		{
			"trg_prevent_delete_clarification",
			`CREATE TRIGGER trg_prevent_delete_clarification BEFORE DELETE ON clinical_record_clarifications FOR EACH ROW
			BEGIN
				SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Operacion denegada: Las notas aclaratorias son inmutables y no pueden modificarse ni eliminarse.';
			END`,
		},
	}

	for _, trg := range triggers {
		var exists int
		err := db.QueryRow(`
			SELECT COUNT(*) FROM information_schema.TRIGGERS
			WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?`, trg.name).Scan(&exists)
		if err != nil {
			return err
		}
		if exists > 0 {
			continue
		}
		if _, err := db.Exec(trg.stmt); err != nil {
			return fmt.Errorf("error creando el disparador %s: %w", trg.name, err)
		}
	}
	return nil
}

// ensureMedicationCatalog carga el catalogo farmacologico inicial de forma idempotente (por codigo CUM).
func ensureMedicationCatalog(db *sql.DB) error {
	for _, med := range catalog.DemoMedications() {
		_, err := db.Exec(`
			INSERT IGNORE INTO medications_catalog (cum_code, commercial_name, generic_name, active_ingredient, concentration, pharmaceutical_form, stock_quantity)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			med.CUMCode, med.CommercialName, med.GenericName, med.ActiveIngredient,
			med.Concentration, med.PharmaceuticalForm, med.StockQuantity,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// ensureV2TablesAndColumns asegura las tablas y columnas necesarias para agendamiento, seguimiento y farmacia PDF417
func ensureV2TablesAndColumns(db *sql.DB) error {
	// 1. Columnas en patients
	var exists int
	_ = db.QueryRow(`SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'affiliation_type'`).Scan(&exists)
	if exists == 0 {
		_, _ = db.Exec(`ALTER TABLE patients ADD COLUMN affiliation_type ENUM('CONTRIBUTIVO', 'SUBSIDIADO', 'VINCULADO', 'PARTICULAR') NOT NULL DEFAULT 'CONTRIBUTIVO'`)
	}

	// 2. Columnas en appointments
	appCols := []struct {
		name string
		dtyp string
	}{
		{"observations", "TEXT NULL"},
		{"pdf_path", "VARCHAR(255) NULL"},
		{"email_sent", "BOOLEAN DEFAULT FALSE"},
	}
	for _, col := range appCols {
		var colEx int
		_ = db.QueryRow(`SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = ?`, col.name).Scan(&colEx)
		if colEx == 0 {
			_, _ = db.Exec(fmt.Sprintf("ALTER TABLE appointments ADD COLUMN %s %s", col.name, col.dtyp))
		}
	}

	// 3. Tabla inventory_items
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS inventory_items (
			id VARCHAR(36) PRIMARY KEY,
			code_cum VARCHAR(50) NOT NULL UNIQUE,
			generic_name VARCHAR(150) NOT NULL,
			brand_name VARCHAR(150) NULL,
			dosage VARCHAR(50) NOT NULL,
			presentation VARCHAR(100) NOT NULL,
			unit_price DECIMAL(10, 2) NOT NULL,
			stock_quantity INT NOT NULL DEFAULT 0,
			min_stock INT NOT NULL DEFAULT 10,
			batch_number VARCHAR(50) NOT NULL,
			expiry_date DATE NOT NULL,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			INDEX idx_med_dosage (generic_name, dosage)
		) ENGINE=InnoDB;
	`)
	if err != nil {
		return err
	}

	// 4. Semilla de inventory_items
	seedItems := []struct {
		id, code, gen, brand, dosage, pres string
		price                              float64
		stock, minStock                    int
		batch, expiry                      string
	}{
		{"inv-amox-250", "CUM-199214-1", "Amoxicilina", "Amoxal 250mg", "250 mg", "Tableta", 850.00, 150, 20, "LOT-AMX-2026A", "2027-12-31"},
		{"inv-amox-500", "CUM-199214-2", "Amoxicilina", "Amoxal 500mg", "500 mg", "Tableta", 1200.00, 200, 30, "LOT-AMX-2026B", "2027-12-31"},
		{"inv-risp-1", "CUM-204112-1", "Risperidona", "Risperdal 1mg", "1 mg", "Tableta", 3200.00, 80, 15, "LOT-RSP-2026A", "2028-06-30"},
		{"inv-risp-3", "CUM-204112-2", "Risperidona", "Risperdal 3mg", "3 mg", "Tableta", 5800.00, 95, 15, "LOT-RSP-2026B", "2028-06-30"},
		{"inv-ibup-400", "CUM-192834-1", "Ibuprofeno", "Motrin 400mg", "400 mg", "Tableta", 650.00, 300, 40, "LOT-IBU-2026A", "2027-08-31"},
		{"inv-ibup-800", "CUM-192834-2", "Ibuprofeno", "Motrin 800mg", "800 mg", "Tableta", 1100.00, 180, 25, "LOT-IBU-2026B", "2027-08-31"},
		{"inv-aceta-500", "CUM-180021-1", "Acetaminofen", "Dolex 500mg", "500 mg", "Tableta", 350.00, 500, 50, "LOT-ACT-2026A", "2028-01-31"},
		{"inv-aceta-1000", "CUM-180021-2", "Acetaminofen", "Dolex Forte 1g", "1000 mg", "Tableta", 700.00, 220, 30, "LOT-ACT-2026B", "2028-01-31"},
		{"inv-losar-50", "CUM-210987-1", "Losartan Potasico", "Cozaar 50mg", "50 mg", "Tableta", 1450.00, 250, 35, "LOT-LOS-2026A", "2027-11-30"},
		{"inv-losar-100", "CUM-210987-2", "Losartan Potasico", "Cozaar 100mg", "100 mg", "Tableta", 2300.00, 140, 20, "LOT-LOS-2026B", "2027-11-30"},
	}

	for _, it := range seedItems {
		_, _ = db.Exec(`
			INSERT IGNORE INTO inventory_items (id, code_cum, generic_name, brand_name, dosage, presentation, unit_price, stock_quantity, min_stock, batch_number, expiry_date, is_active)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
		`, it.id, it.code, it.gen, it.brand, it.dosage, it.pres, it.price, it.stock, it.minStock, it.batch, it.expiry)
	}

	return nil
}

// Migrate prepara de forma idempotente roles, columnas, indice de cadena, disparadores y catalogo inicial.
// No crea cuentas: el administrador inicial lo define el operador por variables de entorno
// (ver services.BootstrapAdmin) y nunca se siembran usuarios con credenciales conocidas.
//
// Los fallos de endurecimiento (indice de cadena y disparadores, que pueden requerir privilegios elevados o
// depurar datos previos) se devuelven como advertencias para que el operador los corrija sin impedir el arranque.
func Migrate(db *sql.DB) (warnings []string, err error) {
	if db == nil {
		return nil, nil
	}
	if err := ensureRoles(db); err != nil {
		return nil, fmt.Errorf("fallo inicializando roles base: %w", err)
	}
	if err := ensureUsersColumns(db); err != nil {
		return nil, fmt.Errorf("fallo verificando columnas de usuarios: %w", err)
	}
	if err := ensureChainIndex(db); err != nil {
		warnings = append(warnings, err.Error())
	}
	if err := ensureTriggers(db); err != nil {
		warnings = append(warnings, err.Error())
	}
	if err := ensureMedicationCatalog(db); err != nil {
		return warnings, fmt.Errorf("fallo sembrando el catalogo farmacologico: %w", err)
	}
	if err := ensureV2TablesAndColumns(db); err != nil {
		return warnings, fmt.Errorf("fallo preparando tablas v2: %w", err)
	}
	return warnings, nil
}
