package mysql

import (
	"database/sql"
	"fmt"
	"os"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
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

// SeedInitialAdmin inicializa de forma automatica e idempotente las cuentas institucionales
// conforme a ISO/IEC 25010, Res. 1995/1999 y Ley 1581/2012.
func SeedInitialAdmin(db *sql.DB) error {
	if db == nil {
		return nil
	}

	// 1. Asegurar roles y esquema de columnas
	if err := ensureRoles(db); err != nil {
		return fmt.Errorf("fallo inicializando roles base: %w", err)
	}
	if err := ensureUsersColumns(db); err != nil {
		return fmt.Errorf("fallo verificando columnas de usuarios: %w", err)
	}

	// 2. Comprobar existencia de Administradores
	var adminCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM users WHERE role_id = 1").Scan(&adminCount); err != nil {
		return fmt.Errorf("fallo comprobando administradores existentes: %w", err)
	}

	adminEmail := os.Getenv("ADMIN_INITIAL_EMAIL")
	if adminEmail == "" {
		adminEmail = "admin@saludconecta.ips.gov.co"
	}
	adminPassword := os.Getenv("ADMIN_INITIAL_PASSWORD")
	if adminPassword == "" {
		adminPassword = "AdminSalud2026*"
	}

	if adminCount == 0 {
		hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("fallo cifrando contrasena de admin: %w", err)
		}

		adminID := uuid.New().String()
		insertAdmin := `
			INSERT INTO users (
				id, role_id, full_name, document_type, document_number, email, password_hash,
				phone, professional_card, specialty, branch, is_active, mfa_enabled
			)
			VALUES (?, 1, 'Administrador del Sistema', 'CC', '1000000001', ?, ?, '3100000001', 'TI-ADMIN-001', 'Seguridad y Gobernanza Hospitalaria', 'Sede Cartago - Hospital Central', TRUE, FALSE)
		`
		if _, err := db.Exec(insertAdmin, adminID, strings.ToLower(adminEmail), string(hash)); err != nil {
			return fmt.Errorf("fallo insertando administrador inicial: %w", err)
		}
		fmt.Printf("{\"timestamp\":\"%s\",\"level\":\"INFO\",\"message\":\"Administrador inicial sembrado con exito\",\"email\":\"%s\"}\n", "ISO25010", adminEmail)
	}

	// 3. Sembrar Dr. Santiago Vélez (Líder Asistencial ReTHUS) si no existe
	var doctorCount int
	_ = db.QueryRow("SELECT COUNT(*) FROM users WHERE email = 'svelez@saludconecta.ips.gov.co'").Scan(&doctorCount)
	if doctorCount == 0 {
		docHash, err := bcrypt.GenerateFromPassword([]byte("MedicoSalud2026*"), bcrypt.DefaultCost)
		if err == nil {
			docID := uuid.New().String()
			totpSecret := "JBSWY3DPEHPK3PXP"
			insertDoctor := `
				INSERT INTO users (
					id, role_id, full_name, document_type, document_number, email, password_hash,
					phone, professional_card, specialty, branch, is_active, mfa_enabled, mfa_secret
				)
				VALUES (?, 2, 'Dr. Santiago Vélez', 'CC', '1118234567', 'svelez@saludconecta.ips.gov.co', ?, '3123456789', 'RM-94821-VALLE', 'Medicina de Urgencias', 'Sede Cartago - Hospital Central (Nivel II)', TRUE, TRUE, ?)
			`
			_, _ = db.Exec(insertDoctor, docID, string(docHash), totpSecret)
		}
	}

	// 4. Sembrar registro de prueba de personal pendiente (Dra. Camila Yaima) para verificacion de gobernanza
	var pendingCount int
	_ = db.QueryRow("SELECT COUNT(*) FROM users WHERE email = 'cyaima@saludconecta.ips.gov.co'").Scan(&pendingCount)
	if pendingCount == 0 {
		pendingHash, err := bcrypt.GenerateFromPassword([]byte("MedicoSalud2026*"), bcrypt.DefaultCost)
		if err == nil {
			pendingID := uuid.New().String()
			insertPending := `
				INSERT INTO users (
					id, role_id, full_name, document_type, document_number, email, password_hash,
					phone, professional_card, specialty, branch, is_active, mfa_enabled
				)
				VALUES (?, 2, 'Dra. Camila Yaima', 'CC', '1117654321', 'cyaima@saludconecta.ips.gov.co', ?, '3159876543', 'RM-88310-VALLE', 'Pediatría', 'Sede La Unión (Urgencias)', FALSE, FALSE)
			`
			_, _ = db.Exec(insertPending, pendingID, string(pendingHash))
		}
	}

	return nil
}
