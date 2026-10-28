package storage

import (
	"fmt"
	"strings"
	"time"

	"saludconecta-backend/internal/adapters/storage/memory"
	"saludconecta-backend/internal/adapters/storage/mysql"
	"saludconecta-backend/internal/core/ports"
	"saludconecta-backend/pkg/logger"
)

// RepositoryBundle agrupa exclusivamente los contratos de interfaz (Puertos) requeridos por el dominio.
type RepositoryBundle struct {
	User           ports.UserRepository
	Patient        ports.PatientRepository
	Triage         ports.TriageRepository
	ClinicalRecord ports.ClinicalRecordRepository
	Prescription   ports.PrescriptionRepository
	Audit          ports.AuditRepository
	Close          func() error
}

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
		log.Info("Activando Adaptador de Persistencia en Memoria (In-Memory Mock)")
		ds := memory.NewDataStore()
		return &RepositoryBundle{
			User:           memory.NewUserMemoryRepo(ds),
			Patient:        memory.NewPatientMemoryRepo(ds),
			Triage:         memory.NewTriageMemoryRepo(ds),
			ClinicalRecord: memory.NewClinicalRecordMemoryRepo(ds),
			Prescription:   memory.NewPrescriptionMemoryRepo(ds),
			Audit:          memory.NewAuditMemoryRepo(ds),
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

		return &RepositoryBundle{
			User:           mysql.NewUserRepository(db),
			Patient:        mysql.NewPatientRepository(db),
			Triage:         mysql.NewTriageRepository(db),
			ClinicalRecord: mysql.NewClinicalRecordRepository(db),
			Prescription:   mysql.NewPrescriptionRepository(db),
			Audit:          mysql.NewAuditRepository(db),
			Close: func() error {
				return db.Close()
			},
		}, nil

	case "postgres":
		// Punto de extension para PostgreSQL:
		// Se crearia internal/adapters/storage/postgres y se retornaria con la misma firma de interfaces.
		return nil, fmt.Errorf("adaptador de postgres no compilado en esta version; agregue la carpeta internal/adapters/storage/postgres e instancie los repositorios")

	default:
		return nil, fmt.Errorf("motor de persistencia no soportado: %s", driver)
	}
}
