package storage

import (
	"context"
	"fmt"
	"strings"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/adapters/storage/mysql"
	"saludconecta-backend/adapters/storage/postgres"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/logger"
)

// RepositoryBundle agrupa exclusivamente los contratos de interfaz (Puertos) requeridos por el dominio.
type RepositoryBundle struct {
	User               ports.UserRepository
	Patient            ports.PatientRepository
	Triage             ports.TriageRepository
	ClinicalRecord     ports.ClinicalRecordRepository
	Prescription       ports.PrescriptionRepository
	Audit              ports.AuditRepository
	Appointment        ports.AppointmentRepository
	Inventory          ports.InventoryRepository
	PrescriptionV2     ports.PrescriptionV2Repository
	HealthEducation    ports.HealthEducationRepository
	PharmacyReport     ports.PharmacyReportRepository
	AppointmentRequest ports.AppointmentRequestRepository
	LabOrder           ports.LabOrderRepository
	Nursing            ports.NursingRepository
	Branch             ports.BranchRepository
	Close              func() error
	// Ping comprueba que el motor de persistencia responde (DEF-32: /health/ready). Nil en memoria.
	Ping func(ctx context.Context) error
	// Mode describe la persistencia efectiva: "persistente", "memoria" o "mixta".
	Mode string
	// MemoryModules lista los modulos que se guardan en memoria con un motor real (DEF-10).
	MemoryModules []string
}

// Modos de persistencia expuestos en /health/ready.
const (
	ModePersistent = "persistente"
	ModeMemory     = "memoria"
	ModeMixed      = "mixta"
)

// postgresMemoryModules son los modulos v2 que aun no tienen adaptador PostgreSQL.
var postgresMemoryModules = []string{"citas", "inventario", "recetas_v2", "educacion_en_salud", "reportes_farmacia",
	"solicitudes_de_cita", "laboratorio", "enfermeria", "sedes"}

// Config encapsula la parametrizacion del motor de persistencia.
type Config struct {
	Driver          string // "mysql", "memory", "postgres"
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
	// AllowPostgresMemoryModules autoriza arrancar con PostgreSQL aunque los modulos v2 queden en memoria (DEF-10).
	AllowPostgresMemoryModules bool
}

// NewRepositoryBundle fabrica la instancia del adaptador secundario correspondiente.
// Garantiza que el dominio permanezca 100% agnostico al motor de base de datos utilizado.
func NewRepositoryBundle(cfg Config, log *logger.Logger) (*RepositoryBundle, error) {
	driver := strings.ToLower(strings.TrimSpace(cfg.Driver))
	if driver == "" {
		driver = "mysql"
	}

	switch driver {
	case "memory":
		log.Info("Activando Adaptador de Persistencia en Memoria (In-Memory Mock con Gobernanza ReTHUS)")
		ds := memory.NewDataStore()
		return &RepositoryBundle{
			User:               memory.NewUserMemoryRepo(ds),
			Patient:            memory.NewPatientMemoryRepo(ds),
			Triage:             memory.NewTriageMemoryRepo(ds),
			ClinicalRecord:     memory.NewClinicalRecordMemoryRepo(ds),
			Prescription:       memory.NewPrescriptionMemoryRepo(ds),
			Audit:              memory.NewAuditMemoryRepo(ds),
			Appointment:        memory.NewAppointmentMemoryRepo(ds),
			Inventory:          memory.NewInventoryMemoryRepo(ds),
			PrescriptionV2:     memory.NewPrescriptionV2MemoryRepo(ds),
			HealthEducation:    memory.NewHealthEducationMemoryRepo(ds),
			PharmacyReport:     memory.NewPharmacyReportMemoryRepo(ds),
			AppointmentRequest: memory.NewAppointmentRequestMemoryRepo(ds),
			LabOrder:           memory.NewLabOrderMemoryRepo(ds),
			Nursing:            memory.NewNursingMemoryRepo(ds),
			Branch:             memory.NewBranchMemoryRepo(ds),
			Mode:               ModeMemory,
			Close: func() error {
				return nil
			},
		}, nil

	case "mysql":
		log.Info("Activando Adaptador de Persistencia MySQL 8.0+", map[string]interface{}{
			"host": cfg.Host,
			"port": cfg.Port,
			"db":   cfg.DBName,
		})

		dbCfg := mysql.Config{
			Host:            cfg.Host,
			Port:            cfg.Port,
			User:            cfg.User,
			Password:        cfg.Password,
			DBName:          cfg.DBName,
			MaxOpenConns:    cfg.MaxOpenConns,
			MaxIdleConns:    cfg.MaxIdleConns,
			ConnMaxLifetime: cfg.ConnMaxLifetime,
			ConnMaxIdleTime: cfg.ConnMaxIdleTime,
		}

		db, err := mysql.NewConnection(dbCfg)
		if err != nil {
			return nil, fmt.Errorf("fallo conexion al adaptador mysql: %w", err)
		}

		// Migracion idempotente: roles, indice de cadena SHA-256, disparadores de inmutabilidad y catalogo inicial
		warnings, err := mysql.Migrate(db)
		if err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("fallo la migracion de esquema mysql: %w", err)
		}
		for _, warning := range warnings {
			log.Warn("Endurecimiento de esquema MySQL pendiente", map[string]interface{}{"detalle": warning})
		}

		return &RepositoryBundle{
			User:               mysql.NewUserRepository(db),
			Patient:            mysql.NewPatientRepository(db),
			Triage:             mysql.NewTriageRepository(db),
			ClinicalRecord:     mysql.NewClinicalRecordRepository(db),
			Prescription:       mysql.NewPrescriptionRepository(db),
			Audit:              mysql.NewAuditRepository(db),
			Appointment:        mysql.NewAppointmentRepository(db),
			Inventory:          mysql.NewInventoryRepository(db),
			PrescriptionV2:     mysql.NewPrescriptionV2Repository(db),
			HealthEducation:    mysql.NewHealthEducationRepository(db),
			PharmacyReport:     mysql.NewPharmacyReportRepository(db),
			AppointmentRequest: mysql.NewAppointmentRequestRepository(db),
			LabOrder:           mysql.NewLabOrderRepository(db),
			Nursing:            mysql.NewNursingRepository(db),
			Branch:             mysql.NewBranchRepository(db),
			Mode:               ModePersistent,
			Ping:               db.PingContext,
			Close: func() error {
				return db.Close()
			},
		}, nil

	case "postgres":
		// DEF-10: con PostgreSQL los modulos v2 se guardan en memoria y se pierden al reiniciar. No se arranca en ese
		// modo sin una autorizacion explicita del operador.
		if !cfg.AllowPostgresMemoryModules {
			return nil, fmt.Errorf("con DB_DRIVER=postgres los modulos %s se guardarian en memoria y se perderian al reiniciar; "+
				"use DB_DRIVER=mysql o defina ALLOW_POSTGRES_MEMORY_MODULES=true para aceptarlo de forma explicita", strings.Join(postgresMemoryModules, ", "))
		}
		log.Warn("PostgreSQL en modo MIXTO: estos modulos se guardan en memoria y se pierden al reiniciar", map[string]interface{}{
			"modulos": strings.Join(postgresMemoryModules, ", "),
		})
		log.Info("Activando Adaptador de Persistencia PostgreSQL", map[string]interface{}{
			"host": cfg.Host,
			"port": cfg.Port,
			"db":   cfg.DBName,
		})

		pgCfg := postgres.Config{
			Host:            cfg.Host,
			Port:            cfg.Port,
			User:            cfg.User,
			Password:        cfg.Password,
			DBName:          cfg.DBName,
			SSLMode:         "disable",
			MaxOpenConns:    cfg.MaxOpenConns,
			MaxIdleConns:    cfg.MaxIdleConns,
			ConnMaxLifetime: cfg.ConnMaxLifetime,
			ConnMaxIdleTime: cfg.ConnMaxIdleTime,
		}

		db, err := postgres.NewConnection(pgCfg)
		if err != nil {
			return nil, fmt.Errorf("fallo conexion al adaptador postgresql: %w", err)
		}

		if err := postgres.Migrate(db); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("fallo la migracion de esquema postgresql: %w", err)
		}

		ds := memory.NewDataStore()
		return &RepositoryBundle{
			User:               postgres.NewUserRepository(db),
			Patient:            postgres.NewPatientRepository(db),
			Triage:             postgres.NewTriageRepository(db),
			ClinicalRecord:     postgres.NewClinicalRecordRepository(db),
			Prescription:       postgres.NewPrescriptionRepository(db),
			Audit:              postgres.NewAuditRepository(db),
			Appointment:        memory.NewAppointmentMemoryRepo(ds),
			Inventory:          memory.NewInventoryMemoryRepo(ds),
			PrescriptionV2:     memory.NewPrescriptionV2MemoryRepo(ds),
			HealthEducation:    memory.NewHealthEducationMemoryRepo(ds),
			PharmacyReport:     memory.NewPharmacyReportMemoryRepo(ds),
			AppointmentRequest: memory.NewAppointmentRequestMemoryRepo(ds),
			LabOrder:           memory.NewLabOrderMemoryRepo(ds),
			Nursing:            memory.NewNursingMemoryRepo(ds),
			Branch:             memory.NewBranchMemoryRepo(ds),
			Mode:               ModeMixed,
			MemoryModules:      postgresMemoryModules,
			Ping:               db.PingContext,
			Close: func() error {
				return db.Close()
			},
		}, nil

	default:
		return nil, fmt.Errorf("motor de persistencia no soportado: %s", driver)
	}
}
