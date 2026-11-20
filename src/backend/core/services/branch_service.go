package services

import (
	"context"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

// loadBranches lee las sedes del repositorio; sin repositorio (pruebas antiguas) usa las sedes iniciales.
func loadBranches(ctx context.Context, repo ports.BranchRepository) ([]domain.Branch, error) {
	if repo == nil {
		return domain.InitialBranches(), nil
	}
	return repo.List(ctx)
}

type branchService struct {
	branches ports.BranchRepository
	users    ports.UserRepository
}

// NewBranchService construye la gestion de sedes del administrador.
func NewBranchService(branches ports.BranchRepository, users ports.UserRepository) ports.BranchService {
	return &branchService{branches: branches, users: users}
}

func (s *branchService) List(ctx context.Context) ([]domain.Branch, error) {
	return s.branches.List(ctx)
}

func validateBranch(b *domain.Branch) error {
	b.Name = strings.TrimSpace(b.Name)
	b.Level = strings.TrimSpace(b.Level)
	b.Municipality = strings.TrimSpace(b.Municipality)
	b.Status = strings.TrimSpace(b.Status)
	b.Description = strings.TrimSpace(b.Description)
	if b.Status == "" {
		b.Status = "Operativo"
	}
	switch {
	case b.Name == "" || utf8.RuneCountInString(b.Name) > 120,
		utf8.RuneCountInString(b.Level) > 100, utf8.RuneCountInString(b.Municipality) > 120,
		utf8.RuneCountInString(b.Status) > 30, utf8.RuneCountInString(b.Description) > 1000,
		(b.Latitude == nil) != (b.Longitude == nil),
		b.Latitude != nil && (*b.Latitude < -90 || *b.Latitude > 90),
		b.Longitude != nil && (*b.Longitude < -180 || *b.Longitude > 180):
		return domain.ErrInvalidBranch
	}
	return nil
}

func (s *branchService) Create(ctx context.Context, b *domain.Branch) (*domain.Branch, error) {
	if err := validateBranch(b); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	b.ID = "br-" + uuid.New().String()[:8]
	b.CreatedAt, b.UpdatedAt = now, now
	if err := s.branches.Create(ctx, b); err != nil {
		return nil, err
	}
	return b, nil
}

func (s *branchService) Update(ctx context.Context, b *domain.Branch) (*domain.Branch, error) {
	existing, err := s.branches.GetByID(ctx, b.ID)
	if err != nil {
		return nil, err
	}
	if err := validateBranch(b); err != nil {
		return nil, err
	}
	// Cambiar el nombre de una sede con personal dejaria cuentas apuntando a una sede inexistente
	if !strings.EqualFold(existing.Name, b.Name) {
		if busy, err := s.hasPersonnel(ctx, existing.Name); err != nil {
			return nil, err
		} else if busy {
			return nil, domain.ErrBranchHasPersonnel
		}
	}
	b.CreatedAt = existing.CreatedAt
	b.UpdatedAt = time.Now().UTC()
	if err := s.branches.Update(ctx, b); err != nil {
		return nil, err
	}
	return b, nil
}

func (s *branchService) hasPersonnel(ctx context.Context, name string) (bool, error) {
	users, err := s.users.List(ctx, nil, nil)
	if err != nil {
		return false, err
	}
	for _, u := range users {
		if domain.BranchMatches(u.Branch, name) {
			return true, nil
		}
	}
	return false, nil
}

func (s *branchService) Delete(ctx context.Context, id string) error {
	existing, err := s.branches.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if busy, err := s.hasPersonnel(ctx, existing.Name); err != nil {
		return err
	} else if busy {
		return domain.ErrBranchHasPersonnel
	}
	return s.branches.Delete(ctx, id)
}
