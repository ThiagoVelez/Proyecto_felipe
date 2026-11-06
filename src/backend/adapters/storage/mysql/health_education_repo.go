package mysql

import (
	"context"
	"database/sql"
	"strings"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type healthEducationRepo struct {
	db *sql.DB
}

// NewHealthEducationRepository crea el repositorio MySQL para el muro de concientización y salud.
func NewHealthEducationRepository(db *sql.DB) ports.HealthEducationRepository {
	return &healthEducationRepo{db: db}
}

func (r *healthEducationRepo) Create(ctx context.Context, post *domain.HealthEducationPost) error {
	query := `
		INSERT INTO health_education_posts (
			id, doctor_id, author_name, author_specialty, title, category, summary, content,
			image_url, youtube_url, video_url, video_duration_seconds, is_published, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.ExecContext(ctx, query,
		post.ID,
		post.DoctorID,
		post.AuthorName,
		post.AuthorSpecialty,
		post.Title,
		string(post.Category),
		post.Summary,
		post.Content,
		post.ImageURL,
		post.YoutubeURL,
		post.VideoURL,
		post.VideoDurationSec,
		post.IsPublished,
		post.CreatedAt,
		post.UpdatedAt,
	)
	return err
}

func (r *healthEducationRepo) GetAll(ctx context.Context, category string) ([]domain.HealthEducationPost, error) {
	var query string
	var args []interface{}

	cat := strings.ToUpper(strings.TrimSpace(category))
	if cat != "" && cat != "TODOS" {
		query = `
			SELECT id, doctor_id, author_name, author_specialty, title, category, summary, content,
			       image_url, youtube_url, video_url, video_duration_seconds, is_published, created_at, updated_at
			FROM health_education_posts
			WHERE category = ?
			ORDER BY created_at DESC
		`
		args = append(args, cat)
	} else {
		query = `
			SELECT id, doctor_id, author_name, author_specialty, title, category, summary, content,
			       image_url, youtube_url, video_url, video_duration_seconds, is_published, created_at, updated_at
			FROM health_education_posts
			ORDER BY created_at DESC
		`
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []domain.HealthEducationPost
	for rows.Next() {
		var p domain.HealthEducationPost
		var catStr string
		var imgURL, ytURL, vidURL, summary, spec sql.NullString
		err := rows.Scan(
			&p.ID,
			&p.DoctorID,
			&p.AuthorName,
			&spec,
			&p.Title,
			&catStr,
			&summary,
			&p.Content,
			&imgURL,
			&ytURL,
			&vidURL,
			&p.VideoDurationSec,
			&p.IsPublished,
			&p.CreatedAt,
			&p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		p.Category = domain.HealthPostCategory(catStr)
		if spec.Valid {
			p.AuthorSpecialty = spec.String
		}
		if summary.Valid {
			p.Summary = summary.String
		}
		if imgURL.Valid {
			p.ImageURL = imgURL.String
		}
		if ytURL.Valid {
			p.YoutubeURL = ytURL.String
		}
		if vidURL.Valid {
			p.VideoURL = vidURL.String
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

func (r *healthEducationRepo) GetByID(ctx context.Context, id string) (*domain.HealthEducationPost, error) {
	query := `
		SELECT id, doctor_id, author_name, author_specialty, title, category, summary, content,
		       image_url, youtube_url, video_url, video_duration_seconds, is_published, created_at, updated_at
		FROM health_education_posts
		WHERE id = ?
	`
	row := r.db.QueryRowContext(ctx, query, id)

	var p domain.HealthEducationPost
	var catStr string
	var imgURL, ytURL, vidURL, summary, spec sql.NullString
	err := row.Scan(
		&p.ID,
		&p.DoctorID,
		&p.AuthorName,
		&spec,
		&p.Title,
		&catStr,
		&summary,
		&p.Content,
		&imgURL,
		&ytURL,
		&vidURL,
		&p.VideoDurationSec,
		&p.IsPublished,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	p.Category = domain.HealthPostCategory(catStr)
	if spec.Valid {
		p.AuthorSpecialty = spec.String
	}
	if summary.Valid {
		p.Summary = summary.String
	}
	if imgURL.Valid {
		p.ImageURL = imgURL.String
	}
	if ytURL.Valid {
		p.YoutubeURL = ytURL.String
	}
	if vidURL.Valid {
		p.VideoURL = vidURL.String
	}
	return &p, nil
}

func (r *healthEducationRepo) Update(ctx context.Context, post *domain.HealthEducationPost) error {
	query := `
		UPDATE health_education_posts SET
			title = ?,
			category = ?,
			summary = ?,
			content = ?,
			image_url = ?,
			youtube_url = ?,
			video_url = ?,
			video_duration_seconds = ?,
			updated_at = ?
		WHERE id = ?
	`
	_, err := r.db.ExecContext(ctx, query,
		post.Title,
		string(post.Category),
		post.Summary,
		post.Content,
		post.ImageURL,
		post.YoutubeURL,
		post.VideoURL,
		post.VideoDurationSec,
		post.UpdatedAt,
		post.ID,
	)
	return err
}

func (r *healthEducationRepo) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM health_education_posts WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

