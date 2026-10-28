package postgres

import (
	"context"
	"database/sql"
	"errors"

	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
)

type userRepo struct {
	db *sql.DB
}

// NewUserRepository construye la implementacion PostgreSQL para ports.UserRepository.
func NewUserRepository(db *sql.DB) ports.UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT u.id, u.role_id, COALESCE(r.name, ''), u.full_name, u.email, u.password_hash,
		       u.professional_card, u.mfa_secret, u.mfa_enabled, u.is_active, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN roles r ON u.role_id = r.id
		WHERE u.id = $1
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var u domain.User
	err := row.Scan(
		&u.ID, &u.RoleID, &u.RoleName, &u.FullName, &u.Email, &u.PasswordHash,
		&u.ProfessionalCard, &u.MFASecret, &u.MFAEnabled, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT u.id, u.role_id, COALESCE(r.name, ''), u.full_name, u.email, u.password_hash,
		       u.professional_card, u.mfa_secret, u.mfa_enabled, u.is_active, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN roles r ON u.role_id = r.id
		WHERE LOWER(u.email) = LOWER($1)
	`
	row := r.db.QueryRowContext(ctx, query, email)

	var u domain.User
	err := row.Scan(
		&u.ID, &u.RoleID, &u.RoleName, &u.FullName, &u.Email, &u.PasswordHash,
		&u.ProfessionalCard, &u.MFASecret, &u.MFAEnabled, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepo) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, role_id, full_name, email, password_hash, professional_card, mfa_secret, mfa_enabled, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.RoleID,
		user.FullName,
		user.Email,
		user.PasswordHash,
		user.ProfessionalCard,
		user.MFASecret,
		user.MFAEnabled,
		user.IsActive,
	)
	return err
}

func (r *userRepo) UpdateMFA(ctx context.Context, userID string, secret string, enabled bool) error {
	query := `
		UPDATE users
		SET mfa_secret = $1, mfa_enabled = $2
		WHERE id = $3
	`
	_, err := r.db.ExecContext(ctx, query, secret, enabled, userID)
	return err
}

