package services

import (
	"context"
	"time"

	"saludconecta-backend/internal/core/domain"
	"saludconecta-backend/internal/core/ports"
	"saludconecta-backend/pkg/crypto"
)

type authService struct {
	userRepo  ports.UserRepository
	jwtSecret string
	jwtTTL    time.Duration
}

// NewAuthService construye la instancia del servicio de autenticacion y control de acceso.
func NewAuthService(userRepo ports.UserRepository, jwtSecret string, jwtTTL time.Duration) ports.AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
		jwtTTL:    jwtTTL,
	}
}

func (s *authService) Login(ctx context.Context, email, password, totpCode string) (string, *domain.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return "", nil, domain.ErrInvalidCredentials
	}

	if !user.IsActive {
		return "", nil, domain.ErrUserInactive
	}

	if !crypto.CheckPassword(password, user.PasswordHash) {
		return "", nil, domain.ErrInvalidCredentials
	}

	if user.MFAEnabled {
		if totpCode == "" {
			return "", nil, domain.ErrMFARequired
		}
		if user.MFASecret == nil || !crypto.VerifyTOTP(*user.MFASecret, totpCode) {
			return "", nil, domain.ErrMFAValidationFailed
		}
	}

	token, err := crypto.GenerateJWT(user.ID, user.RoleName, user.Email, s.jwtSecret, s.jwtTTL)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

func (s *authService) Register(ctx context.Context, user *domain.User, plainPassword string) error {
	existing, _ := s.userRepo.GetByEmail(ctx, user.Email)
	if existing != nil {
		return domain.ErrEmailAlreadyRegistered
	}

	hash, err := crypto.HashPassword(plainPassword)
	if err != nil {
		return err
	}
	user.PasswordHash = hash

	return s.userRepo.Create(ctx, user)
}

func (s *authService) SetupMFA(ctx context.Context, userID string) (string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", err
	}

	secret, err := crypto.GenerateMFASecret()
	if err != nil {
		return "", err
	}

	if err := s.userRepo.UpdateMFA(ctx, user.ID, secret, false); err != nil {
		return "", err
	}

	return secret, nil
}

func (s *authService) EnableMFA(ctx context.Context, userID, totpCode string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.MFASecret == nil || *user.MFASecret == "" {
		return domain.ErrMFAValidationFailed
	}

	if !crypto.VerifyTOTP(*user.MFASecret, totpCode) {
		return domain.ErrMFAValidationFailed
	}

	return s.userRepo.UpdateMFA(ctx, user.ID, *user.MFASecret, true)
}
