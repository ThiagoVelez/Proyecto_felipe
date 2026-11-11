-- =============================================================================
-- SALUDCONECTA IPS v2.4 - Esquema PostgreSQL idempotente (se aplica al arrancar el adaptador)
-- Equivalente funcional del esquema MySQL, incluidos los disparadores de inmutabilidad
-- (Res. 1995/1999) y el indice unico que impide bifurcar la cadena SHA-256 por paciente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (id, name, description) VALUES
    (1, 'ADMIN', 'Administrador del Sistema y Gobernanza ReTHUS'),
    (2, 'MEDICO', 'Medico Especialista o General Asistencial'),
    (3, 'ENFERMERO', 'Personal de Enfermeria y Triaje'),
    (4, 'ADMISION', 'Admisiones y Facturacion'),
    (5, 'AUDITOR', 'Auditoria Medica y Forense'),
    (6, 'FARMACIA', 'Personal de Farmacia, Inventario y Dispensación'),
    (7, 'LABORATORIO', 'Bacteriólogo / Laboratorio Clínico y Pruebas Diagnósticas')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(id),
    full_name VARCHAR(150) NOT NULL,
    document_type VARCHAR(10) DEFAULT 'CC',
    document_number VARCHAR(25) DEFAULT '',
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(25) DEFAULT '',
    professional_card VARCHAR(50) NULL,
    specialty VARCHAR(100) DEFAULT '',
    branch VARCHAR(100) DEFAULT '',
    mfa_secret VARCHAR(64) NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    document_type VARCHAR(5) NOT NULL CHECK (document_type IN ('CC', 'TI', 'RC', 'CE', 'PA', 'MS')),
    document_number VARCHAR(25) NOT NULL UNIQUE,
    first_name VARCHAR(60) NOT NULL,
    second_name VARCHAR(60) NULL,
    last_name VARCHAR(60) NOT NULL,
    second_last_name VARCHAR(60) NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(5) NOT NULL CHECK (gender IN ('M', 'F', 'OTRO')),
    blood_type VARCHAR(5) NOT NULL CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    eps_name VARCHAR(100) NOT NULL,
    affiliation_status VARCHAR(12) DEFAULT 'ACTIVO' CHECK (affiliation_status IN ('ACTIVO', 'INACTIVO', 'SUSPENDIDO')),
    email VARCHAR(120) NULL,
    address VARCHAR(200) NULL,
    phone VARCHAR(20),
    is_rural_zone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_allergies (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    active_ingredient VARCHAR(100) NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('LEVE', 'MODERADA', 'SEVERA')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patient_allergies ON patient_allergies (patient_id, active_ingredient);

CREATE TABLE IF NOT EXISTS triage_records (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    evaluated_by VARCHAR(36) NOT NULL REFERENCES users(id),
    systolic_bp INT NOT NULL,
    diastolic_bp INT NOT NULL,
    heart_rate INT NOT NULL,
    respiratory_rate INT NOT NULL,
    oxygen_saturation INT NOT NULL,
    body_temperature DECIMAL(4,1) NOT NULL,
    glasgow_score INT NOT NULL,
    manchester_level VARCHAR(10) NOT NULL CHECK (manchester_level IN ('NIVEL_I', 'NIVEL_II', 'NIVEL_III', 'NIVEL_IV', 'NIVEL_V')),
    reason_for_consultation TEXT NOT NULL,
    pain_scale_score INT NOT NULL DEFAULT 0,
    pain_scale_observations TEXT NULL,
    status VARCHAR(12) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_ATENCION', 'FINALIZADO')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_triage_priority ON triage_records (manchester_level, status, created_at);

CREATE TABLE IF NOT EXISTS clinical_records (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
    triage_id VARCHAR(36) NULL REFERENCES triage_records(id),
    anamnesis TEXT NOT NULL,
    physical_exam TEXT NOT NULL,
    cie11_code VARCHAR(20) NOT NULL,
    diagnosis_description VARCHAR(255) NOT NULL,
    treatment_plan TEXT NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    signature_token VARCHAR(255) NULL,
    previous_hash VARCHAR(64) NULL,
    hash_sha256 VARCHAR(64) NULL,
    is_offline_sync BOOLEAN DEFAULT FALSE,
    sync_batch_id VARCHAR(36) NULL,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP(0) NULL
);
CREATE INDEX IF NOT EXISTS idx_cr_patient_history ON clinical_records (patient_id, created_at DESC);

-- Un solo folio cerrado por eslabon previo y paciente: dos cierres concurrentes no pueden bifurcar la cadena
CREATE UNIQUE INDEX IF NOT EXISTS uq_cr_patient_chain ON clinical_records (patient_id, previous_hash) WHERE is_closed;

CREATE TABLE IF NOT EXISTS clinical_record_clarifications (
    id SERIAL PRIMARY KEY,
    clinical_record_id VARCHAR(36) NOT NULL REFERENCES clinical_records(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medications_catalog (
    id SERIAL PRIMARY KEY,
    cum_code VARCHAR(30) NOT NULL UNIQUE,
    commercial_name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150) NOT NULL,
    active_ingredient VARCHAR(100) NOT NULL,
    concentration VARCHAR(60) NOT NULL,
    pharmaceutical_form VARCHAR(60) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
);
CREATE INDEX IF NOT EXISTS idx_med_ingredient ON medications_catalog (active_ingredient);

CREATE TABLE IF NOT EXISTS prescriptions (
    id VARCHAR(36) PRIMARY KEY,
    clinical_record_id VARCHAR(36) NOT NULL REFERENCES clinical_records(id),
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescription_items (
    id SERIAL PRIMARY KEY,
    prescription_id VARCHAR(36) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_id INT NOT NULL REFERENCES medications_catalog(id),
    dosage VARCHAR(100) NOT NULL,
    frequency_hours INT NOT NULL,
    duration_days INT NOT NULL,
    total_quantity INT NOT NULL,
    indication_notes VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    role VARCHAR(50) NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(150) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    correlation_id VARCHAR(64) NOT NULL,
    details JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_trace ON audit_logs (correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id, created_at);

CREATE TABLE IF NOT EXISTS rips_transactions (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    package_type VARCHAR(20) NOT NULL CHECK (package_type IN ('CONSULTAS', 'PROCEDIMIENTOS', 'URGENCIAS', 'MEDICAMENTOS')),
    payload_json JSONB NOT NULL,
    validation_status VARCHAR(10) DEFAULT 'PENDIENTE' CHECK (validation_status IN ('PENDIENTE', 'EXITOSO', 'GLOSADO')),
    sent_to_minsalud_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- DISPARADORES DE INMUTABILIDAD (RES. 1995/1999)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_prevent_closed_record_mutation() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Operacion denegada: Queda prohibida la eliminacion de registros de Historias Clinicas (Custodia Legal).';
    END IF;
    IF OLD.is_closed THEN
        RAISE EXCEPTION 'Operacion denegada: La Historia Clinica se encuentra cerrada y es inmutable segun Resolucion 1995 de MinSalud.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_update_closed_record ON clinical_records;
CREATE TRIGGER trg_prevent_update_closed_record
    BEFORE UPDATE ON clinical_records
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_closed_record_mutation();

DROP TRIGGER IF EXISTS trg_prevent_delete_clinical_record ON clinical_records;
CREATE TRIGGER trg_prevent_delete_clinical_record
    BEFORE DELETE ON clinical_records
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_closed_record_mutation();

-- Las notas aclaratorias son append-only: ni se editan ni se eliminan
CREATE OR REPLACE FUNCTION fn_prevent_clarification_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Operacion denegada: Las notas aclaratorias son inmutables y no pueden modificarse ni eliminarse.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_update_clarification ON clinical_record_clarifications;
CREATE TRIGGER trg_prevent_update_clarification
    BEFORE UPDATE ON clinical_record_clarifications
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_clarification_mutation();

DROP TRIGGER IF EXISTS trg_prevent_delete_clarification ON clinical_record_clarifications;
CREATE TRIGGER trg_prevent_delete_clarification
    BEFORE DELETE ON clinical_record_clarifications
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_clarification_mutation();
