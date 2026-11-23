package services

import (
	"fmt"
	"testing"
	"time"
)

// DEF-73: rotar miles de veces el refresh token de un usuario no debe acumular identificadores.
func TestRefreshTrackerPodaIdentificadoresRotados(t *testing.T) {
	tracker := newRefreshTokenTracker()
	expira := time.Now().Add(time.Hour)

	tracker.Register("usr-1", "jti-0", expira)
	for i := 1; i <= 5000; i++ {
		anterior := fmt.Sprintf("jti-%d", i-1)
		if _, ok, reuso := tracker.ConsumeAndRotate(anterior); !ok || reuso {
			t.Fatalf("rotacion %d: valido=%v reuso=%v", i, ok, reuso)
		}
		tracker.Register("usr-1", fmt.Sprintf("jti-%d", i), expira)
	}

	if n := tracker.trackedCount("usr-1"); n != 1 {
		t.Fatalf("el usuario conserva %d identificadores; se esperaba solo la sesion vigente", n)
	}
	// La deteccion de reuso sigue funcionando para un token ya rotado
	if _, ok, reuso := tracker.ConsumeAndRotate("jti-10"); ok || !reuso {
		t.Fatal("presentar un token rotado debe detectarse como reuso")
	}
}

func TestRefreshTrackerPodaSesionesVencidas(t *testing.T) {
	tracker := newRefreshTokenTracker()
	ahora := time.Now()
	tracker.now = func() time.Time { return ahora }

	tracker.Register("usr-2", "viejo", ahora.Add(time.Minute))
	ahora = ahora.Add(2 * time.Minute)
	tracker.Register("usr-2", "nuevo", ahora.Add(time.Hour))

	if n := tracker.trackedCount("usr-2"); n != 1 {
		t.Fatalf("la sesion vencida debio podarse; quedan %d", n)
	}
}
