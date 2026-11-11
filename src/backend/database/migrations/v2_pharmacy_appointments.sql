-- =============================================================================
-- MIGRACION SALUDCONECTA IPS v2.4: AGENDAMIENTO, SEGUIMIENTO Y FARMACIA PDF417
-- =============================================================================

USE saludconecta_db;

-- 1. Rol de Farmacia
INSERT IGNORE INTO roles (id, name, description) 
VALUES (6, 'FARMACIA', 'Personal de Farmacia, Inventario y Dispensación');

-- 2. Afiliacion y Cobertura de Pacientes
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'saludconecta_db' AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'affiliation_type';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE patients ADD COLUMN affiliation_type ENUM("CONTRIBUTIVO", "SUBSIDIADO", "VINCULADO", "PARTICULAR") NOT NULL DEFAULT "CONTRIBUTIVO"', 
    'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Ampliacion de Citas Medicas (Appointments)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'saludconecta_db' AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'observations';
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointments ADD COLUMN observations TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'saludconecta_db' AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'pdf_path';
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointments ADD COLUMN pdf_path VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'saludconecta_db' AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'email_sent';
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointments ADD COLUMN email_sent BOOLEAN DEFAULT FALSE', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Inventario de Farmacia (Diferenciado por Concentracion/Dosis y Precio Unitario)
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(36) PRIMARY KEY,
    code_cum VARCHAR(50) NOT NULL UNIQUE,
    generic_name VARCHAR(150) NOT NULL,
    brand_name VARCHAR(150) NULL,
    dosage VARCHAR(50) NOT NULL,            -- Ej: '250 mg', '500 mg', '1 mg', '3 mg'
    presentation VARCHAR(100) NOT NULL,      -- Ej: 'Tableta', 'Jarabe', 'Capsula'
    unit_price DECIMAL(10, 2) NOT NULL,      -- Valor unitario en COP
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 10,
    batch_number VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_med_dosage (generic_name, dosage)
) ENGINE=InnoDB;

-- 5. Prescripciones y Recetario para Farmacia (Migración no destructiva DEF-56)
CREATE TABLE IF NOT EXISTS prescriptions (
    id VARCHAR(36) PRIMARY KEY,
    hce_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    patient_document VARCHAR(20) NOT NULL,
    patient_name VARCHAR(150) NOT NULL,
    patient_eps VARCHAR(100) NOT NULL,
    unique_code VARCHAR(64) NOT NULL UNIQUE, -- Ej: RX-2026-89412
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
    CONSTRAINT fk_presc_hce FOREIGN KEY (hce_id) REFERENCES clinical_records(id),
    CONSTRAINT fk_presc_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
    CONSTRAINT fk_presc_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    INDEX idx_inbox_search (patient_document, status),
    INDEX idx_unique_code (unique_code)
) ENGINE=InnoDB;

-- 6. Items Formulados asociados a la Concentracion Exacta
CREATE TABLE IF NOT EXISTS prescription_items (
    id VARCHAR(36) PRIMARY KEY,
    prescription_id VARCHAR(36) NOT NULL,
    inventory_item_id VARCHAR(36) NOT NULL,
    medication_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(50) NOT NULL,             -- Concentracion prescrita
    quantity_prescribed INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_item_price DECIMAL(10, 2) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_inventory FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
) ENGINE=InnoDB;

-- 7. Semilla de Medicamentos e Insumos en Inventario con Variaciones por Dosis
INSERT INTO inventory_items (id, code_cum, generic_name, brand_name, dosage, presentation, unit_price, stock_quantity, min_stock, batch_number, expiry_date, is_active)
VALUES
('inv-amox-250', 'CUM-199214-1', 'Amoxicilina', 'Amoxal 250mg', '250 mg', 'Tableta', 850.00, 150, 20, 'LOT-AMX-2026A', '2027-12-31', 1),
('inv-amox-500', 'CUM-199214-2', 'Amoxicilina', 'Amoxal 500mg', '500 mg', 'Tableta', 1200.00, 200, 30, 'LOT-AMX-2026B', '2027-12-31', 1),
('inv-risp-1',   'CUM-204112-1', 'Risperidona', 'Risperdal 1mg', '1 mg', 'Tableta', 3200.00, 80, 15, 'LOT-RSP-2026A', '2028-06-30', 1),
('inv-risp-3',   'CUM-204112-2', 'Risperidona', 'Risperdal 3mg', '3 mg', 'Tableta', 5800.00, 95, 15, 'LOT-RSP-2026B', '2028-06-30', 1),
('inv-ibup-400', 'CUM-192834-1', 'Ibuprofeno', 'Motrin 400mg', '400 mg', 'Tableta', 650.00, 300, 40, 'LOT-IBU-2026A', '2027-08-31', 1),
('inv-ibup-800', 'CUM-192834-2', 'Ibuprofeno', 'Motrin 800mg', '800 mg', 'Tableta', 1100.00, 180, 25, 'LOT-IBU-2026B', '2027-08-31', 1),
('inv-aceta-500','CUM-180021-1', 'Acetaminofen', 'Dolex 500mg', '500 mg', 'Tableta', 350.00, 500, 50, 'LOT-ACT-2026A', '2028-01-31', 1),
('inv-aceta-1000','CUM-180021-2','Acetaminofen', 'Dolex Forte 1g', '1000 mg', 'Tableta', 700.00, 220, 30, 'LOT-ACT-2026B', '2028-01-31', 1),
('inv-losar-50', 'CUM-210987-1', 'Losartan Potasico', 'Cozaar 50mg', '50 mg', 'Tableta', 1450.00, 250, 35, 'LOT-LOS-2026A', '2027-11-30', 1),
('inv-losar-100','CUM-210987-2', 'Losartan Potasico', 'Cozaar 100mg', '100 mg', 'Tableta', 2300.00, 140, 20, 'LOT-LOS-2026B', '2027-11-30', 1)
ON DUPLICATE KEY UPDATE 
    generic_name = VALUES(generic_name),
    brand_name = VALUES(brand_name),
    dosage = VALUES(dosage),
    presentation = VALUES(presentation),
    unit_price = VALUES(unit_price),
    stock_quantity = VALUES(stock_quantity),
    min_stock = VALUES(min_stock),
    batch_number = VALUES(batch_number),
    expiry_date = VALUES(expiry_date);

