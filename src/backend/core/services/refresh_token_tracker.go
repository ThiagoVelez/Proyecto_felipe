package services

import (
	"sync"
	"time"
)

type refreshSession struct {
	userID    string
	expiresAt time.Time
}

// refreshTokenTracker gestiona la rotacion, vigencia y deteccion de reuso de tokens de renovacion
// conforme al estandar OWASP ASVS v4 (V3.7 - Refresh Token Rotation & Automatic Revocation).
type refreshTokenTracker struct {
	mu      sync.Mutex
	active  map[string]refreshSession // jti -> datos de sesion activa
	revoked map[string]time.Time      // jti -> marca temporal de revocacion/rotacion previa
	userJTI map[string][]string       // userID -> lista de identificadores activos
	now     func() time.Time
}

func newRefreshTokenTracker() *refreshTokenTracker {
	return &refreshTokenTracker{
		active:  make(map[string]refreshSession),
		revoked: make(map[string]time.Time),
		userJTI: make(map[string][]string),
		now:     time.Now,
	}
}

// Register asocia un nuevo identificador de refresh token al usuario.
func (t *refreshTokenTracker) Register(userID, jti string, expiresAt time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.active[jti] = refreshSession{
		userID:    userID,
		expiresAt: expiresAt,
	}
	t.userJTI[userID] = append(t.userJTI[userID], jti)
	t.cleanExpiredLocked()
}

// ConsumeAndRotate valida el token actual, lo revoca para rotarlo y detecta si ya habia sido consumido previamente.
// Si reuseDetected es true, significa que un token ya consumido fue presentado nuevamente (posible clonacion/robo).
func (t *refreshTokenTracker) ConsumeAndRotate(jti string) (userID string, valid bool, reuseDetected bool) {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := t.now()

	// 1. Deteccion de reuso fraudulento: si el token ya figura como revocado/rotado
	if _, wasRevoked := t.revoked[jti]; wasRevoked {
		return "", false, true
	}

	session, exists := t.active[jti]
	if !exists {
		return "", false, false
	}

	if now.After(session.expiresAt) {
		delete(t.active, jti)
		return "", false, false
	}

	// 2. Rotacion limpia: movemos el JTI de activo a revocado para prevenir duplicados
	delete(t.active, jti)
	t.revoked[jti] = now

	return session.userID, true, false
}

// RevokeAllForUser invalida de inmediato todos los refresh tokens activos de un usuario.
// Se invoca ante deteccion de reuso fraudulento, cambio de credenciales o suspension por el Administrador.
func (t *refreshTokenTracker) RevokeAllForUser(userID string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := t.now()
	for _, jti := range t.userJTI[userID] {
		if _, exists := t.active[jti]; exists {
			delete(t.active, jti)
			t.revoked[jti] = now
		}
	}
	delete(t.userJTI, userID)
}

// RevokeToken invalida un refresh token especifico (cierre de sesion individual).
func (t *refreshTokenTracker) RevokeToken(jti string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if session, exists := t.active[jti]; exists {
		delete(t.active, jti)
		t.revoked[jti] = t.now()

		jtis := t.userJTI[session.userID]
		filtered := make([]string, 0, len(jtis))
		for _, id := range jtis {
			if id != jti {
				filtered = append(filtered, id)
			}
		}
		t.userJTI[session.userID] = filtered
	}
}

// cleanExpiredLocked purga registros vencidos para evitar saturacion de memoria.
func (t *refreshTokenTracker) cleanExpiredLocked() {
	if len(t.active)+len(t.revoked) < 10000 {
		return
	}
	now := t.now()
	for jti, sess := range t.active {
		if now.After(sess.expiresAt) {
			delete(t.active, jti)
		}
	}
	// Los identificadores revocados se retienen maximo 24 horas para deteccion de reuso
	for jti, revTime := range t.revoked {
		if now.Sub(revTime) > 24*time.Hour {
			delete(t.revoked, jti)
		}
	}
}
