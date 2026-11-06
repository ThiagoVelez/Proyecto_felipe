package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type healthEducationService struct {
	repo ports.HealthEducationRepository
}

// NewHealthEducationService construye el servicio para el muro de concientización y educación en salud.
func NewHealthEducationService(repo ports.HealthEducationRepository) ports.HealthEducationService {
	return &healthEducationService{repo: repo}
}

func (s *healthEducationService) CreatePost(ctx context.Context, requester *domain.User, post *domain.HealthEducationPost) (*domain.HealthEducationPost, error) {
	if requester == nil || !requester.IsDoctor() {
		return nil, domain.ErrUnauthorizedRole
	}
	if post == nil {
		return nil, domain.ErrInvalidPostTitle
	}

	post.ID = uuid.NewString()
	post.DoctorID = requester.ID
	post.AuthorName = requester.FullName
	if strings.TrimSpace(post.AuthorName) == "" {
		post.AuthorName = "Médico Especialista"
	}
	post.AuthorSpecialty = requester.Specialty
	if strings.TrimSpace(post.AuthorSpecialty) == "" {
		post.AuthorSpecialty = "Medicina Asistencial"
	}
	post.IsPublished = true
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()

	if err := post.Validate(); err != nil {
		return nil, err
	}

	if err := s.repo.Create(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

func (s *healthEducationService) ListPosts(ctx context.Context, category string) ([]domain.HealthEducationPost, error) {
	return s.repo.GetAll(ctx, category)
}

func (s *healthEducationService) GetPostByID(ctx context.Context, id string) (*domain.HealthEducationPost, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *healthEducationService) UpdatePost(ctx context.Context, requester *domain.User, id string, post *domain.HealthEducationPost) (*domain.HealthEducationPost, error) {
	if requester == nil || !requester.IsDoctor() {
		return nil, domain.ErrUnauthorizedRole
	}
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil || existing == nil {
		if errors.Is(err, domain.ErrPostNotFound) || existing == nil {
			// Si la publicación no existía previamente (ej: tarjeta semilla inicial), se crea de forma transparente
			newPost := &domain.HealthEducationPost{
				ID:               id,
				DoctorID:         requester.ID,
				AuthorName:       requester.FullName,
				AuthorSpecialty:  requester.Specialty,
				Title:            post.Title,
				Category:         post.Category,
				Summary:          post.Summary,
				Content:          post.Content,
				ImageURL:         post.ImageURL,
				YoutubeURL:       post.YoutubeURL,
				VideoURL:         post.VideoURL,
				VideoDurationSec: post.VideoDurationSec,
				IsPublished:      true,
				CreatedAt:        time.Now(),
				UpdatedAt:        time.Now(),
			}
			if newPost.AuthorName == "" {
				newPost.AuthorName = requester.Email
			}
			if err := newPost.Validate(); err != nil {
				return nil, err
			}
			if err := s.repo.Create(ctx, newPost); err != nil {
				return nil, err
			}
			return newPost, nil
		}
		return nil, err
	}

	existing.Title = post.Title
	existing.Category = post.Category
	existing.Summary = post.Summary
	existing.Content = post.Content
	existing.ImageURL = post.ImageURL
	existing.YoutubeURL = post.YoutubeURL
	existing.VideoURL = post.VideoURL
	existing.VideoDurationSec = post.VideoDurationSec
	existing.UpdatedAt = time.Now()

	if err := existing.Validate(); err != nil {
		return nil, err
	}

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *healthEducationService) DeletePost(ctx context.Context, requester *domain.User, id string) error {
	if requester == nil || !requester.IsDoctor() {
		return domain.ErrUnauthorizedRole
	}
	return s.repo.Delete(ctx, id)
}

