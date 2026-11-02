package services

import (
	"sync"
	"time"
)

const (
	defaultMaxFailures    = 5
	defaultFailureWindow  = 15 * time.Minute
	defaultLockoutPeriod  = 15 * time.Minute
	attemptTrackerMaxKeys = 10000
)

type attemptEntry struct {
	failures    int
	windowStart time.Time
	lockedUntil time.Time
}

// attemptTracker limita intentos fallidos por clave (cuenta) para frenar fuerza bruta de contrasenas y codigos TOTP.
// Tras maxFailures fallos dentro de la ventana la clave queda bloqueada durante el periodo de bloqueo.
type attemptTracker struct {
	mu          sync.Mutex
	maxFailures int
	window      time.Duration
	lockout     time.Duration
	entries     map[string]*attemptEntry
	now         func() time.Time
}

func newAttemptTracker(maxFailures int, window, lockout time.Duration) *attemptTracker {
	return &attemptTracker{
		maxFailures: maxFailures,
		window:      window,
		lockout:     lockout,
		entries:     make(map[string]*attemptEntry),
		now:         time.Now,
	}
}

func newDefaultAttemptTracker() *attemptTracker {
	return newAttemptTracker(defaultMaxFailures, defaultFailureWindow, defaultLockoutPeriod)
}

// Blocked indica si la clave se encuentra actualmente bloqueada.
func (t *attemptTracker) Blocked(key string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	entry, ok := t.entries[key]
	return ok && t.now().Before(entry.lockedUntil)
}

// Fail registra un intento fallido y bloquea la clave al superar el limite.
func (t *attemptTracker) Fail(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	now := t.now()
	if len(t.entries) >= attemptTrackerMaxKeys {
		t.purgeLocked(now)
	}

	entry, ok := t.entries[key]
	if !ok || now.Sub(entry.windowStart) > t.window {
		entry = &attemptEntry{windowStart: now}
		t.entries[key] = entry
	}
	entry.failures++
	if entry.failures >= t.maxFailures {
		entry.lockedUntil = now.Add(t.lockout)
		entry.failures = 0
		entry.windowStart = now
	}
}

// Reset limpia el historial de fallos tras una autenticacion exitosa.
func (t *attemptTracker) Reset(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.entries, key)
}

func (t *attemptTracker) purgeLocked(now time.Time) {
	for key, entry := range t.entries {
		if now.After(entry.lockedUntil) && now.Sub(entry.windowStart) > t.window {
			delete(t.entries, key)
		}
	}
}
