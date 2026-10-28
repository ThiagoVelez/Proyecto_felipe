package postgres

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// Config define las credenciales y afinamiento del pool de conexiones para PostgreSQL.
type Config struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// NewConnection abre la conexion al motor PostgreSQL y configura el pool de alto rendimiento.
func NewConnection(cfg Config) (*sql.DB, error) {
	sslMode := cfg.SSLMode
	if sslMode == "" {
		sslMode = "disable"
	}

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		cfg.User,
		cfg.Password,
		cfg.Host,
		cfg.Port,
		cfg.DBName,
		sslMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("error abriendo conexion postgresql: %w", err)
	}

	maxOpen := cfg.MaxOpenConns
	if maxOpen <= 0 {
		maxOpen = 25
	}
	maxIdle := cfg.MaxIdleConns
	if maxIdle <= 0 {
		maxIdle = 10
	}
	lifetime := cfg.ConnMaxLifetime
	if lifetime <= 0 {
		lifetime = 5 * time.Minute
	}
	idleTime := cfg.ConnMaxIdleTime
	if idleTime <= 0 {
		idleTime = 2 * time.Minute
	}

	db.SetMaxOpenConns(maxOpen)
	db.SetMaxIdleConns(maxIdle)
	db.SetConnMaxLifetime(lifetime)
	db.SetConnMaxIdleTime(idleTime)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error al verificar ping a postgresql (%s:%s): %w", cfg.Host, cfg.Port, err)
	}

	return db, nil
}
