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
	return warnings, nil
}
