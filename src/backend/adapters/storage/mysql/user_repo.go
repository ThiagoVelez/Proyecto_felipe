package mysql

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type userRepo struct {
	db *sql.DB
}

// NewUserRepository instancia el repositorio MySQL para la entidad User.
func NewUserRepository(db *sql.DB) ports.UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT u.id, u.role_id, COALESCE(r.name, ''), u.full_name,
		       COALESCE(u.document_type, 'CC'), COALESCE(u.document_number, ''),
		       u.email, u.password_hash, COALESCE(u.phone, ''),
		       COALESCE(u.professional_card, ''), COALESCE(u.specialty, ''), COALESCE(u.branch, ''),
		       u.mfa_secret, u.mfa_enabled, u.is_active, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN roles r ON u.role_id = r.id
		WHERE u.id = ?
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var u domain.User
	err := row.Scan(
		&u.ID, &u.RoleID, &u.RoleName, &u.FullName,
		&u.DocumentType, &u.DocumentNumber,
		&u.Email, &u.PasswordHash, &u.Phone,
		&u.ProfessionalCard, &u.Specialty, &u.Branch,
		&u.MFASecret, &u.MFAEnabled, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
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
		SELECT u.id, u.role_id, COALESCE(r.name, ''), u.full_name,
		       COALESCE(u.document_type, 'CC'), COALESCE(u.document_number, ''),
		       u.email, u.password_hash, COALESCE(u.phone, ''),
		       COALESCE(u.professional_card, ''), COALESCE(u.specialty, ''), COALESCE(u.branch, ''),
		       u.mfa_secret, u.mfa_enabled, u.is_active, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN roles r ON u.role_id = r.id
		WHERE u.email = ?
	`
	row := r.db.QueryRowContext(ctx, query, strings.ToLower(strings.TrimSpace(email)))

	var u domain.User
	err := row.Scan(
		&u.ID, &u.RoleID, &u.RoleName, &u.FullName,
		&u.DocumentType, &u.DocumentNumber,
		&u.Email, &u.PasswordHash, &u.Phone,
		&u.ProfessionalCard, &u.Specialty, &u.Branch,
		&u.MFASecret, &u.MFAEnabled, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
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
		INSERT INTO users (
			id, role_id, full_name, document_type, document_number, email, password_hash,
			phone, professional_card, specialty, branch, mfa_secret, mfa_enabled, is_active
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.RoleID,
		user.FullName,
		user.DocumentType,
		user.DocumentNumber,
		strings.ToLower(strings.TrimSpace(user.Email)),
		user.PasswordHash,
		user.Phone,
		user.ProfessionalCard,
		user.Specialty,
		user.Branch,
		user.MFASecret,
		user.MFAEnabled,
		user.IsActive,
	)
	return err
}

func (r *userRepo) UpdateMFA(ctx context.Context, userID string, secret string, enabled bool) error {
	query := `
		UPDATE users
		SET mfa_secret = ?, mfa_enabled = ?
		WHERE id = ?
	`
	_, err := r.db.ExecContext(ctx, query, secret, enabled, userID)
	return err
}

func (r *userRepo) List(ctx context.Context, roleID *int, isActive *bool) ([]*domain.User, error) {
	var conditions []string
	var args []interface{}

	if roleID != nil {
		conditions = append(conditions, "u.role_id = ?")
		args = append(args, *roleID)
	}
	if isActive != nil {
		conditions = append(conditions, "u.is_active = ?")
		args = append(args, *isActive)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT u.id, u.role_id, COALESCE(r.name, ''), u.full_name,
		       COALESCE(u.document_type, 'CC'), COALESCE(u.document_number, ''),
		       u.email, u.password_hash, COALESCE(u.phone, ''),
		       COALESCE(u.professional_card, ''), COALESCE(u.specialty, ''), COALESCE(u.branch, ''),
		       u.mfa_secret, u.mfa_enabled, u.is_active, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN roles r ON u.role_id = r.id
		%s
		ORDER BY u.created_at DESC
	`, whereClause)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(
			&u.ID, &u.RoleID, &u.RoleName, &u.FullName,
			&u.DocumentType, &u.DocumentNumber,
			&u.Email, &u.PasswordHash, &u.Phone,
			&u.ProfessionalCard, &u.Specialty, &u.Branch,
			&u.MFASecret, &u.MFAEnabled, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		users = append(users, &u)
	}

	return users, rows.Err()
}

func (r *userRepo) UpdateStatus(ctx context.Context, userID string, isActive bool) error {
	query := `UPDATE users SET is_active = ? WHERE id = ?`
	res, err := r.db.ExecContext(ctx, query, isActive, userID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

func (r *userRepo) CountAdmins(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM users WHERE role_id = 1`
	var count int
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}
