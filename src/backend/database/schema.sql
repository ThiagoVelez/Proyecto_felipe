-- =============================================================================
-- SISTEMA HOSPITALARIO SALUDCONECTA IPS v2.4
-- Esquema de Base de Datos compatible con MySQL 8.0+
-- Normas: ISO/IEC 25010, Res. MinSalud 2275 (RIPS), Res. 1995 (HCE)
-- Sin datos de semilla ni informacion quemada (Estructura DDL y Triggers Puros)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS saludconecta_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saludconecta_db;

-- -----------------------------------------------------------------------------
-- 1. SEGURIDAD, USUARIOS Y ROLES (RBAC + MFA)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY, -- UUID v4
    role_id INT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    professional_card VARCHAR(50) NULL, -- Registro medico / tarjeta profesional
    mfa_secret VARCHAR(64) NULL,        -- Semilla TOTP
    mfa_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. PACIENTES Y ANTECEDENTES ALERGICOS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY, -- UUID v4
    document_type ENUM('CC', 'TI', 'RC', 'CE', 'PA', 'MS') NOT NULL,
    document_number VARCHAR(25) NOT NULL UNIQUE,
    first_name VARCHAR(60) NOT NULL,
    second_name VARCHAR(60) NULL,
    last_name VARCHAR(60) NOT NULL,
    second_last_name VARCHAR(60) NULL,
    birth_date DATE NOT NULL,
    gender ENUM('M', 'F', 'OTRO') NOT NULL,
    blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    eps_name VARCHAR(100) NOT NULL,
    affiliation_status ENUM('ACTIVO', 'INACTIVO', 'SUSPENDIDO') DEFAULT 'ACTIVO',
    phone VARCHAR(20),
    is_rural_zone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patient_lookup (document_type, document_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS patient_allergies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    active_ingredient VARCHAR(100) NOT NULL, -- Ej: BETALACTAMICOS, PENICILINA
    severity ENUM('LEVE', 'MODERADA', 'SEVERA') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_allergies_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient_allergies (patient_id, active_ingredient)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 3. MODULO 1: AGENDAMIENTO Y ADMISION
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    appointment_date DATETIME NOT NULL,
    specialty VARCHAR(80) NOT NULL DEFAULT 'MEDICINA_GENERAL',
    status ENUM('AGENDADA', 'CONFIRMADA', 'EN_SALA', 'ATENDIDA', 'CANCELADA') DEFAULT 'AGENDADA',
    copayment_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_app_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
    INDEX idx_app_schedule (doctor_id, appointment_date, status)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4. MODULO 2: TRIAJE MANCHESTER Y CONSTANTES VITALES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS triage_records (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    evaluated_by VARCHAR(36) NOT NULL, -- Enfermero o Medico
    systolic_bp INT NOT NULL,          -- mmHg (ej: 120)
    diastolic_bp INT NOT NULL,         -- mmHg (ej: 80)
    heart_rate INT NOT NULL,           -- lpm (ej: 75)
    respiratory_rate INT NOT NULL,     -- rpm (ej: 18)
    oxygen_saturation INT NOT NULL,    -- % (ej: 98)
    body_temperature DECIMAL(4,1) NOT NULL, -- °C (ej: 36.5)
    glasgow_score INT NOT NULL,        -- 3 a 15
    manchester_level ENUM('NIVEL_I', 'NIVEL_II', 'NIVEL_III', 'NIVEL_IV', 'NIVEL_V') NOT NULL,
    reason_for_consultation TEXT NOT NULL,
    status ENUM('PENDIENTE', 'EN_ATENCION', 'FINALIZADO') DEFAULT 'PENDIENTE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_triage_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_triage_evaluator FOREIGN KEY (evaluated_by) REFERENCES users(id),
    INDEX idx_triage_priority (manchester_level, status, created_at)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. MODULO 3: HISTORIA CLINICA ELECTRONICA (HCE) E INMUTABILIDAD
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clinical_records (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    triage_id VARCHAR(36) NULL,
    anamnesis TEXT NOT NULL,
    physical_exam TEXT NOT NULL,
    cie11_code VARCHAR(20) NOT NULL,    -- Codigo CIE-11 oficial
    diagnosis_description VARCHAR(255) NOT NULL,
    treatment_plan TEXT NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,    -- Una vez firmado/cerrado no permite edicion
    signature_token VARCHAR(255) NULL,  -- Firma digital o token de sesion
    previous_hash VARCHAR(64) NULL,     -- Hash SHA-256 del folio anterior (cadena inmutable)
    hash_sha256 VARCHAR(64) NULL,       -- Hash SHA-256 propio del registro
    is_offline_sync BOOLEAN DEFAULT FALSE,
    sync_batch_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    CONSTRAINT fk_cr_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_cr_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
    CONSTRAINT fk_cr_triage FOREIGN KEY (triage_id) REFERENCES triage_records(id),
    INDEX idx_cr_patient_history (patient_id, created_at DESC)
) ENGINE=InnoDB;

-- Notas aclaratorias (la unica forma legal de adicionar info a un folio cerrado)
CREATE TABLE IF NOT EXISTS clinical_record_clarifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinical_record_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_clarification_hce FOREIGN KEY (clinical_record_id) REFERENCES clinical_records(id),
    CONSTRAINT fk_clarification_doctor FOREIGN KEY (doctor_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 6. MODULO 4: MEDICAMENTOS Y PRESCRIPCION
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS medications_catalog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cum_code VARCHAR(30) NOT NULL UNIQUE, -- Codigo Unico de Medicamentos MinSalud
    commercial_name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150) NOT NULL,
    active_ingredient VARCHAR(100) NOT NULL, -- Clave para cruce de alergias
    concentration VARCHAR(60) NOT NULL,
    pharmaceutical_form VARCHAR(60) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    INDEX idx_med_ingredient (active_ingredient)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prescriptions (
    id VARCHAR(36) PRIMARY KEY,
    clinical_record_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_presc_cr FOREIGN KEY (clinical_record_id) REFERENCES clinical_records(id),
    CONSTRAINT fk_presc_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_presc_doctor FOREIGN KEY (doctor_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prescription_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id VARCHAR(36) NOT NULL,
    medication_id INT NOT NULL,
    dosage VARCHAR(100) NOT NULL,        -- Ej: 500 mg
    frequency_hours INT NOT NULL,        -- Ej: Cada 8 horas
    duration_days INT NOT NULL,          -- Ej: 7 dias
    total_quantity INT NOT NULL,         -- Ej: 21 capsulas
    indication_notes VARCHAR(255),
    CONSTRAINT fk_item_presc FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_med FOREIGN KEY (medication_id) REFERENCES medications_catalog(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 7. AUDITORIA FORENSE E INTEROPERABILIDAD RIPS (RES. 2275)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    role VARCHAR(50) NULL,
    action VARCHAR(50) NOT NULL,         -- READ, CREATE, UPDATE, UNMUTABLE_REJECT, LOGIN
    resource VARCHAR(150) NOT NULL,      -- /api/v2/clinical-records/88412
    ip_address VARCHAR(45) NOT NULL,
    correlation_id VARCHAR(64) NOT NULL, -- Trazabilidad transversal
    details JSON NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_trace (correlation_id),
    INDEX idx_audit_user (user_id, timestamp)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rips_transactions (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    package_type ENUM('CONSULTAS', 'PROCEDIMIENTOS', 'URGENCIAS', 'MEDICAMENTOS') NOT NULL,
    payload_json JSON NOT NULL,
    validation_status ENUM('PENDIENTE', 'EXITOSO', 'GLOSADO') DEFAULT 'PENDIENTE',
    sent_to_minsalud_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 8. TRIGGERS DE SEGURIDAD (INMUTABILIDAD A NIVEL DE BD - RES. 1995/1999)
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_prevent_update_closed_record;
DROP TRIGGER IF EXISTS trg_prevent_delete_clinical_record;

DELIMITER $$

-- Disparador que bloquea cualquier modificacion sobre una historia clinica cerrada
CREATE TRIGGER trg_prevent_update_closed_record
BEFORE UPDATE ON clinical_records
FOR EACH ROW
BEGIN
    -- Si el registro ya estaba cerrado, se aborta la actualizacion
    IF OLD.is_closed = TRUE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Operacion denegada: La Historia Clinica se encuentra cerrada y es inmutable segun Resolucion 1995 de MinSalud.';
    END IF;
END$$

-- Disparador que bloquea el borrado fisico de cualquier folio clinico
CREATE TRIGGER trg_prevent_delete_clinical_record
BEFORE DELETE ON clinical_records
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Operacion denegada: Queda prohibida la eliminacion de registros de Historias Clinicas (Custodia Legal).';
END$$

DELIMITER ;

