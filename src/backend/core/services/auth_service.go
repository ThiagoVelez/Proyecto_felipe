package services

import (
	"context"
	"strings"
	"sync"
	"time"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"github.com/google/uuid"
	"saludconecta-backend/pkg/crypto"
)

type authService struct {
	userRepo  ports.UserRepository
	jwtSecret string
	jwtTTL     time.Duration
	accessTTL  time.Duration
	refreshTTL time.Duration
	tokens     *refreshTokenTracker
	attempts  *attemptTracker
}

var (
	dummyHashOnce sync.Once
	dummyHash     string
)

// NewAuthService construye la instancia del servicio de autenticacion y control de acceso.
func NewAuthService(userRepo ports.UserRepository, jwtSecret string, jwtTTL time.Duration) ports.AuthService {
	return NewAuthServiceWithTTL(userRepo, jwtSecret, jwtTTL, 7*24*time.Hour)
}

// NewAuthServiceWithTTL construye la instancia del servicio con vigencias configurables para token de acceso y de renovacion.
func NewAuthServiceWithTTL(userRepo ports.UserRepository, jwtSecret string, accessTTL, refreshTTL time.Duration) ports.AuthService {
	if accessTTL <= 0 {
		accessTTL = 15 * time.Minute
	}
	if refreshTTL <= 0 {
		refreshTTL = 7 * 24 * time.Hour
	}
	return &authService{
		userRepo:   userRepo,
		jwtSecret:  jwtSecret,
		jwtTTL:     accessTTL,
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
		attempts:   newDefaultAttemptTracker(),
		tokens:     newRefreshTokenTracker(),
	}
}

// burnPasswordCheck iguala el costo de un login con correo inexistente al de uno existente para no revelar cuentas por tiempo.
func burnPasswordCheck(password string) {
	dummyHashOnce.Do(func() {
		dummyHash, _ = crypto.HashPassword("clave-inexistente-sin-uso")
	})
	crypto.CheckPassword(password, dummyHash)
}

func loginKey(email string) string {
	return "login:" + email
}

func mfaKey(userID string) string {
	return "mfa:" + userID
}

func (s *authService) Login(ctx context.Context, email, password, totpCode string) (string, *domain.User, error) {
	pair, user, err := s.LoginWithTokens(ctx, email, password, totpCode)
	if err != nil {
		return "", nil, err
	}
	return pair.AccessToken, user, nil
}

func (s *authService) LoginWithTokens(ctx context.Context, email, password, totpCode string) (*domain.TokenPair, *domain.User, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	key := loginKey(normalizedEmail)

	if s.attempts.Blocked(key) {
		return nil, nil, domain.ErrTooManyAttempts
	}

	user, err := s.userRepo.GetByEmail(ctx, normalizedEmail)
	if err != nil {
		burnPasswordCheck(password)
		s.attempts.Fail(key)
		return nil, nil, domain.ErrInvalidCredentials
	}

	if !crypto.CheckPassword(password, user.PasswordHash) {
		s.attempts.Fail(key)
		return nil, nil, domain.ErrInvalidCredentials
	}

	if !user.IsActive {
		return nil, nil, domain.ErrUserInactive
	}

	if user.MFAEnabled {
		if totpCode == "" {
			return nil, nil, domain.ErrMFARequired
		}
		if user.MFASecret == nil || !crypto.VerifyTOTP(*user.MFASecret, totpCode) {
			s.attempts.Fail(key)
			return nil, nil, domain.ErrMFAValidationFailed
		}
	}

	accessToken, err := crypto.GenerateAccessToken(user.ID, user.RoleName, user.Email, s.jwtSecret, s.accessTTL)
	if err != nil {
		return nil, nil, err
	}

	refreshJTI := uuid.New().String()
	refreshToken, err := crypto.GenerateRefreshToken(user.ID, refreshJTI, s.jwtSecret, s.refreshTTL)
	if err != nil {
		return nil, nil, err
	}

	s.tokens.Register(user.ID, refreshJTI, time.Now().Add(s.refreshTTL))
	s.attempts.Reset(key)

	pair := &domain.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.accessTTL.Seconds()),
	}
	return pair, user, nil
}

func (s *authService) RefreshToken(ctx context.Context, refreshTokenStr string) (*domain.TokenPair, *domain.User, error) {
	claims, err := crypto.ValidateRefreshToken(refreshTokenStr, s.jwtSecret)
	if err != nil {
		return nil, nil, domain.ErrInvalidRefreshToken
	}

	userID, valid, reuseDetected := s.tokens.ConsumeAndRotate(claims.ID)
	if reuseDetected {
		s.tokens.RevokeAllForUser(claims.UserID)
		return nil, nil, domain.ErrSessionCompromised
	}

	if !valid || userID == "" {
		return nil, nil, domain.ErrInvalidRefreshToken
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || user == nil {
		s.tokens.RevokeAllForUser(userID)
		return nil, nil, domain.ErrUserNotFound
	}

	if !user.IsActive {
		s.tokens.RevokeAllForUser(userID)
		return nil, nil, domain.ErrUserInactive
	}

	newAccessToken, err := crypto.GenerateAccessToken(user.ID, user.RoleName, user.Email, s.jwtSecret, s.accessTTL)
	if err != nil {
		return nil, nil, err
	}

	newRefreshJTI := uuid.New().String()
	newRefreshToken, err := crypto.GenerateRefreshToken(user.ID, newRefreshJTI, s.jwtSecret, s.refreshTTL)
	if err != nil {
		return nil, nil, err
	}

	s.tokens.Register(user.ID, newRefreshJTI, time.Now().Add(s.refreshTTL))

	pair := &domain.TokenPair{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.accessTTL.Seconds()),
	}
	return pair, user, nil
}

func (s *authService) RevokeToken(ctx context.Context, refreshTokenStr string) error {
	claims, err := crypto.ValidateRefreshToken(refreshTokenStr, s.jwtSecret)
	if err == nil && claims != nil && claims.ID != "" {
		s.tokens.RevokeToken(claims.ID)
	}
	return nil
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
	if user.RoleName == "" {
		user.RoleName = domain.RoleNameByID(user.RoleID)
	}
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now().UTC()
	}
	user.UpdatedAt = user.CreatedAt

	return s.userRepo.Create(ctx, user)
}

// RegisterStaff implementa el registro seguro de personal de salud con estado inactivo obligatorio (is_active = false)
// y validacion de tarjeta profesional ReTHUS para roles asistenciales segun Res. 1995/1999 y Ley 1581/2012.
func (s *authService) RegisterStaff(ctx context.Context, user *domain.User, plainPassword string) error {
	if (user.RoleID == 2 || user.RoleID == 3) && strings.TrimSpace(user.ProfessionalCard) == "" {
		return domain.ErrMissingProfessionalCard
	}

	// Todo registro ingresa bloqueado hasta la verificacion ReTHUS
	user.IsActive = false

	return s.Register(ctx, user, plainPassword)
}

// RegisterAdmin implementa el registro de un nuevo Administrador de Centro de Salud (rol fijo ADMIN, role_id = 1).
// La cuenta nace activa con su semilla criptográfica TOTP propia y exclusiva generada en el servidor.
func (s *authService) RegisterAdmin(ctx context.Context, user *domain.User, plainPassword string) error {
	user.RoleID = 1
	user.RoleName = "ADMIN"
	user.IsActive = true
	user.MFAEnabled = true

	if user.MFASecret == nil || *user.MFASecret == "" {
		sec, err := crypto.GenerateMFASecret()
		if err != nil {
			return err
		}
		user.MFASecret = &sec
	}

	return s.Register(ctx, user, plainPassword)
}

// GetMFASeed consulta o aprovisiona el secreto TOTP único y la URI otpauth asociada a un correo institucional.
// Garantiza que diferentes facultativos o administradores nunca compartan la misma semilla ni el mismo código TOTP.
func (s *authService) GetMFASeed(ctx context.Context, email string) (string, string, error) {
	normEmail := strings.ToLower(strings.TrimSpace(email))
	if normEmail == "" {
		normEmail = "usuario@saludconecta.ips.gov.co"
	}

	user, err := s.userRepo.GetByEmail(ctx, normEmail)
	var secret string
	if err == nil && user != nil {
		if user.MFASecret != nil && *user.MFASecret != "" {
			secret = *user.MFASecret
		} else {
			newSecret, genErr := crypto.GenerateMFASecret()
			if genErr != nil {
				return "", "", genErr
			}
			secret = newSecret
			user.MFASecret = &newSecret
			// No activar MFAEnabled aquí; solo se activa cuando el usuario verifica y habilita explícitamente en EnableMFA
			_ = s.userRepo.UpdateMFA(ctx, user.ID, newSecret, false)
		}
	} else {
		// Semilla determinista Base32 calculada a partir del hash del correo para que cada cuenta tenga un QR único
		sum := crypto.ComputeSHA256("saludconecta:mfa:seed:" + normEmail)
		alphabet := "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
		var sb strings.Builder
		for i := 0; i < len(sum) && sb.Len() < 24; i++ {
			idx := int(sum[i]) % len(alphabet)
			sb.WriteByte(alphabet[idx])
		}
		secret = sb.String()
	}

	uri := crypto.BuildOTPAuthURI(secret, normEmail, "SaludConecta IPS")
	return secret, uri, nil
}

// ValidateSession se consulta en cada solicitud autenticada: una cuenta suspendida pierde acceso de inmediato
// aunque su token JWT siga vigente, y el rol efectivo es el almacenado, no el declarado en el token.
func (s *authService) ValidateSession(ctx context.Context, userID string) (*domain.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, domain.ErrUserNotFound
	}
	if !user.IsActive {
		return nil, domain.ErrUserInactive
	}
	return user, nil
}

// verifyCurrentCode valida el TOTP vigente aplicando limite de intentos por cuenta.
func (s *authService) verifyCurrentCode(user *domain.User, code string) error {
	key := mfaKey(user.ID)
	if s.attempts.Blocked(key) {
		return domain.ErrTooManyAttempts
	}
	if user.MFASecret == nil || *user.MFASecret == "" || !crypto.VerifyTOTP(*user.MFASecret, code) {
		s.attempts.Fail(key)
		return domain.ErrMFAValidationFailed
	}
	s.attempts.Reset(key)
	return nil
}

func (s *authService) SetupMFA(ctx context.Context, userID, currentCode string) (string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", err
	}

	// Reemplazar o desactivar un segundo factor activo exige demostrar posesion del factor actual
	if user.MFAEnabled {
		if strings.TrimSpace(currentCode) == "" {
			return "", domain.ErrCurrentCodeRequired
		}
		if err := s.verifyCurrentCode(user, strings.TrimSpace(currentCode)); err != nil {
			return "", err
		}
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

	if err := s.verifyCurrentCode(user, strings.TrimSpace(totpCode)); err != nil {
		return err
	}

	return s.userRepo.UpdateMFA(ctx, user.ID, *user.MFASecret, true)
}
