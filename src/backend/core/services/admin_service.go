package services

import (
	"context"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type adminService struct {
	userRepo  ports.UserRepository
	auditRepo ports.AuditRepository
}

// NewAdminService crea una nueva instancia del servicio de administracion hospitalaria y gobernanza ReTHUS.
func NewAdminService(userRepo ports.UserRepository, auditRepo ports.AuditRepository) ports.AdminService {
	return &adminService{
		userRepo:  userRepo,
		auditRepo: auditRepo,
	}
}

func (s *adminService) ListUsers(ctx context.Context, roleID *int, isActive *bool) ([]*domain.User, error) {
	return s.userRepo.List(ctx, roleID, isActive)
}

func (s *adminService) ActivateUser(ctx context.Context, userID string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	// Validacion no-repudio: Si es rol asistencial (MEDICO o ENFERMERO), debe tener tarjeta profesional
	if (user.RoleID == 2 || user.RoleID == 3) && user.ProfessionalCard == "" {
		return domain.ErrMissingProfessionalCard
	}

	return s.userRepo.UpdateStatus(ctx, userID, true)
}

func (s *adminService) DeactivateUser(ctx context.Context, userID string) error {
	return s.userRepo.UpdateStatus(ctx, userID, false)
}

func (s *adminService) GetAuditLogs(ctx context.Context, limit int) ([]*domain.AuditLog, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	return s.auditRepo.ListLogs(ctx, limit)
}

