package backend_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
)

// TestRBACMatrizRutasPorRol recorre todas las rutas de router.go con un token por rol y verifica
// que el middleware RBAC permita o niegue exactamente segun la matriz esperada (H12).
// Una respuesta distinta de 401/403 significa que la peticion supero autenticacion y RBAC.
func TestRBACMatrizRutasPorRol(t *testing.T) {
	env := newCalidadEnv(t)
	roles := []string{"ADMIN", "MEDICO", "ENFERMERO", "ADMISION", "AUDITOR", "FARMACIA"}
	sembrarUsuariosPorRol(t, env, roles)

	rutas := []struct {
		metodo    string
		ruta      string
		permitido []string
	}{
		{http.MethodPost, "/api/v1/auth/mfa/setup", roles},
		{http.MethodPost, "/api/v1/auth/mfa/enable", roles},
		{http.MethodGet, "/api/v1/admin/users", []string{"ADMIN"}},
		{http.MethodPost, "/api/v1/admin/users", []string{"ADMIN"}},
		{http.MethodPatch, "/api/v1/admin/users/x/status", []string{"ADMIN"}},
		{http.MethodGet, "/api/v1/admin/audit-logs", []string{"ADMIN"}},
		{http.MethodPost, "/api/v1/triage/", []string{"ENFERMERO", "MEDICO"}},
		{http.MethodGet, "/api/v1/triage/", []string{"ENFERMERO", "MEDICO"}},
		{http.MethodGet, "/api/v1/triage/x", []string{"ENFERMERO", "MEDICO"}},
		{http.MethodPatch, "/api/v1/triage/x/status", []string{"ENFERMERO", "MEDICO"}},
		{http.MethodPost, "/api/v1/clinical-records/", []string{"MEDICO"}},
		{http.MethodPost, "/api/v1/clinical-records/x/close", []string{"MEDICO"}},
		{http.MethodPost, "/api/v1/clinical-records/x/clarifications", []string{"MEDICO"}},
		{http.MethodGet, "/api/v1/clinical-records/x", []string{"MEDICO"}},
		{http.MethodGet, "/api/v1/clinical-records/patient/x", []string{"MEDICO"}},
		{http.MethodGet, "/api/v1/clinical-records/x/verify", []string{"MEDICO", "AUDITOR"}},
		{http.MethodGet, "/api/v1/clinical-records/x/rips", []string{"MEDICO", "AUDITOR"}},
		{http.MethodGet, "/api/v1/clinical-records/x/fhir", []string{"MEDICO", "AUDITOR"}},
		{http.MethodPost, "/api/v1/prescriptions/", []string{"MEDICO"}},
		{http.MethodGet, "/api/v1/prescriptions/x", []string{"MEDICO"}},
		{http.MethodGet, "/api/v1/prescriptions/record/x", []string{"MEDICO"}},
		{http.MethodPost, "/api/v1/sync/batch", []string{"MEDICO"}},

		// H34 (v2): rutas nuevas. Se registra la politica EFECTIVA; las discrepancias con la intencion
		// declarada en router.go se documentan como defectos (DEF-72) y no se corrigen aqui.
		{http.MethodGet, "/api/v1/auth/me", roles},
		{http.MethodGet, "/api/v1/medications", []string{"MEDICO"}},
		{http.MethodPost, "/api/v1/patients/", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		{http.MethodGet, "/api/v1/patients/", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		{http.MethodGet, "/api/v1/patients/lookup", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		{http.MethodGet, "/api/v1/patients/x", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		{http.MethodPatch, "/api/v1/patients/x", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		{http.MethodDelete, "/api/v1/patients/x", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		{http.MethodPost, "/api/v1/patients/x/allergies", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		{http.MethodGet, "/api/v1/patients/x/allergies", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		// Declarada para MEDICO, ENFERMERO y AUDITOR, pero el grupo /patients excluye a AUDITOR (DEF-72).
		{http.MethodGet, "/api/v1/patients/x/anatomical-notes", []string{"ENFERMERO", "MEDICO"}},
		{http.MethodPost, "/api/v1/patients/x/anatomical-notes", []string{"MEDICO"}},
		{http.MethodGet, "/api/v1/clinical-records/x/anatomical-notes", []string{"MEDICO", "ENFERMERO", "AUDITOR"}},
		{http.MethodPost, "/api/v1/clinical-records/x/anatomical-notes", []string{"MEDICO"}},
		{http.MethodPut, "/api/v1/clinical-records/x/pain-mapping", []string{"MEDICO"}},
		{http.MethodDelete, "/api/v1/anatomical-notes/x", []string{"MEDICO"}},
		{http.MethodGet, "/api/v1/health-education/", []string{"MEDICO", "ENFERMERO", "ADMIN", "FARMACIA"}},
		{http.MethodPost, "/api/v1/health-education/", []string{"MEDICO"}},
		{http.MethodPut, "/api/v1/health-education/x", []string{"MEDICO"}},
		{http.MethodDelete, "/api/v1/health-education/x", []string{"MEDICO"}},
		{http.MethodPost, "/api/v2/triage/", []string{"ENFERMERO", "MEDICO"}},
		{http.MethodPost, "/api/v2/appointments/", []string{"MEDICO", "ADMIN", "ENFERMERO"}},
		{http.MethodGet, "/api/v2/appointments/", []string{"MEDICO", "ADMIN", "ENFERMERO"}},
		{http.MethodGet, "/api/v2/appointments/doctor/x", []string{"MEDICO", "ADMIN", "ENFERMERO"}},
		{http.MethodPost, "/api/v2/treatments/dispatch", []string{"MEDICO"}},
		{http.MethodGet, "/api/v2/treatments/x", []string{"MEDICO", "FARMACIA", "ADMIN", "ENFERMERO"}},
		{http.MethodGet, "/api/v2/pharmacy/inbox", []string{"FARMACIA", "ADMIN", "MEDICO", "ENFERMERO"}},
		{http.MethodGet, "/api/v2/pharmacy/inventory", []string{"FARMACIA", "ADMIN", "MEDICO", "ENFERMERO"}},
		{http.MethodPost, "/api/v2/pharmacy/inventory", []string{"FARMACIA", "ADMIN"}},
		{http.MethodPatch, "/api/v2/pharmacy/inventory/x/stock", []string{"FARMACIA", "ADMIN"}},
		{http.MethodDelete, "/api/v2/pharmacy/inventory/x", []string{"FARMACIA", "ADMIN"}},
		{http.MethodGet, "/api/v2/pharmacy/prescriptions/lookup", []string{"FARMACIA", "ADMIN"}},
		{http.MethodPost, "/api/v2/pharmacy/dispense", []string{"FARMACIA", "ADMIN"}},
	}

	var tabla strings.Builder
	tabla.WriteString("| Metodo | Ruta | " + strings.Join(roles, " | ") + " | Sin token |\n")
	tabla.WriteString("|---|---|" + strings.Repeat("---|", len(roles)+1) + "\n")

	for _, r := range rutas {
		fila := fmt.Sprintf("| %s | `%s` |", r.metodo, r.ruta)
		for _, rol := range roles {
			esperado := contiene(r.permitido, rol)
			req := httptest.NewRequest(r.metodo, r.ruta, strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+calidadToken(t, "usr-rbac-"+strings.ToLower(rol), rol))
			res, err := env.app.Test(req, -1)
			if err != nil {
				t.Fatalf("%s %s: %v", r.metodo, r.ruta, err)
			}
			paso := res.StatusCode != http.StatusForbidden && res.StatusCode != http.StatusUnauthorized
			if paso != esperado {
				t.Errorf("%s %s con rol %s: estado %d, se esperaba acceso=%v", r.metodo, r.ruta, rol, res.StatusCode, esperado)
			}
			fila += fmt.Sprintf(" %d |", res.StatusCode)
		}

		req := httptest.NewRequest(r.metodo, r.ruta, strings.NewReader("{}"))
		res, err := env.app.Test(req, -1)
		if err != nil {
			t.Fatalf("%s %s sin token: %v", r.metodo, r.ruta, err)
		}
		if res.StatusCode != http.StatusUnauthorized {
			t.Errorf("%s %s sin token: estado %d, se esperaba 401", r.metodo, r.ruta, res.StatusCode)
		}
		fila += fmt.Sprintf(" %d |\n", res.StatusCode)
		tabla.WriteString(fila)
	}

	t.Log("\n" + tabla.String())
	if salida := os.Getenv("CALIDAD_MATRIZ_SALIDA"); salida != "" {
		if err := os.WriteFile(salida, []byte(tabla.String()), 0o600); err != nil {
			t.Fatalf("No se pudo escribir la matriz: %v", err)
		}
	}
}

// sembrarUsuariosPorRol crea una cuenta activa por rol: desde la v2 el middleware de autenticacion
// rechaza tokens de cuentas inexistentes o inactivas (validador de sesion), lo que antes no ocurria.
func sembrarUsuariosPorRol(t *testing.T, env calidadEnv, roles []string) {
	t.Helper()
	repo := memory.NewUserMemoryRepo(env.ds)
	for _, rol := range roles {
		id := "usr-rbac-" + strings.ToLower(rol)
		u := &domain.User{
			ID: id, RoleID: rolIDPorNombre(t, rol), RoleName: rol, FullName: id, Email: id + "@example.com",
			ProfessionalCard: "RM-" + id, IsActive: true,
		}
		if err := repo.Create(context.Background(), u); err != nil {
			t.Fatalf("No se pudo crear el usuario %s: %v", id, err)
		}
	}
}

func rolIDPorNombre(t *testing.T, rol string) int {
	t.Helper()
	for id := 1; id <= 10; id++ {
		if domain.RoleNameByID(id) == rol {
			return id
		}
	}
	t.Fatalf("Rol desconocido en el catalogo: %s", rol)
	return 0
}

func contiene(lista []string, valor string) bool {
	for _, v := range lista {
		if v == valor {
			return true
		}
	}
	return false
}
