package backend_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// TestR4MatrizRBACRutasNuevasYRolesTI recorre las rutas agregadas desde R3 (TI, sedes, solicitudes de cita,
// laboratorio y enfermeria) y una muestra de rutas clinicas con los 8 roles, incluidos TI y LABORATORIO, que la
// matriz original (rbac_matrix_regression_test.go) no cubre. Registra la politica EFECTIVA de router.go: si cambia,
// la prueba falla y obliga a revisar la matriz. Las discrepancias con la Ley 1581 (ADMIN en recetas y farmacia) se
// reproducen aparte en TestDEF72R4AdminNoAccedeARecetasNiDispensa.
func TestR4MatrizRBACRutasNuevasYRolesTI(t *testing.T) {
	env := newCalidadEnv(t)
	roles := []string{"ADMIN", "MEDICO", "ENFERMERO", "ADMISION", "AUDITOR", "FARMACIA", "LABORATORIO", "TI"}
	sembrarUsuariosPorRol(t, env, roles)

	rutas := []struct {
		metodo    string
		ruta      string
		permitido []string
	}{
		{http.MethodGet, "/api/v1/ti/overview", []string{"TI"}},
		{http.MethodGet, "/api/v1/ti/users", []string{"TI"}},
		{http.MethodPatch, "/api/v1/ti/admins/x/status", []string{"TI"}},
		{http.MethodGet, "/api/v1/ti/audit-logs", []string{"TI"}},
		{http.MethodPost, "/api/v1/auth/register-admin", []string{"TI"}},
		{http.MethodPost, "/api/v1/admin/branches", []string{"ADMIN"}},
		{http.MethodPut, "/api/v1/admin/branches/x", []string{"ADMIN"}},
		{http.MethodDelete, "/api/v1/admin/branches/x", []string{"ADMIN"}},
		{http.MethodGet, "/api/v1/admin/users", []string{"ADMIN"}},
		{http.MethodGet, "/api/v2/appointment-requests/", []string{"MEDICO"}},
		{http.MethodGet, "/api/v2/appointment-requests/pending-count", []string{"MEDICO"}},
		{http.MethodPost, "/api/v2/appointment-requests/x/schedule", []string{"MEDICO"}},
		{http.MethodPost, "/api/v2/appointment-requests/x/reject", []string{"MEDICO"}},
		{http.MethodGet, "/api/v2/lab-orders/", []string{"MEDICO", "LABORATORIO"}},
		{http.MethodPost, "/api/v2/lab-orders/", []string{"MEDICO", "LABORATORIO"}},
		{http.MethodPut, "/api/v2/lab-orders/x/progress", []string{"LABORATORIO"}},
		{http.MethodPost, "/api/v2/lab-orders/x/seal", []string{"LABORATORIO"}},
		{http.MethodPost, "/api/v2/lab-orders/x/dispatch", []string{"LABORATORIO", "MEDICO"}},
		{http.MethodGet, "/api/v2/nursing/", []string{"ENFERMERO", "MEDICO"}},
		{http.MethodGet, "/api/v2/nursing/x", []string{"ENFERMERO", "MEDICO"}},
		{http.MethodPut, "/api/v2/nursing/x/order", []string{"MEDICO"}},
		{http.MethodPut, "/api/v2/nursing/x/duties", []string{"ENFERMERO"}},
		{http.MethodPost, "/api/v2/nursing/x/notes", []string{"ENFERMERO"}},
		// Muestra de rutas clinicas: TI y LABORATORIO no deben leer la historia clinica ni datos de pacientes
		{http.MethodGet, "/api/v1/patients/", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		{http.MethodGet, "/api/v1/patients/x/allergies", []string{"ADMISION", "ENFERMERO", "MEDICO"}},
		{http.MethodGet, "/api/v1/clinical-records/patient/x", []string{"MEDICO"}},
		{http.MethodGet, "/api/v1/clinical-records/x/fhir", []string{"MEDICO", "AUDITOR"}},
		{http.MethodGet, "/api/v2/triage/", []string{"ENFERMERO", "MEDICO"}},
		// Politica efectiva con ADMIN en recetas y farmacia (DEF-72 reabierto en R4)
		{http.MethodGet, "/api/v2/treatments/x", []string{"MEDICO", "FARMACIA", "ADMIN", "ENFERMERO"}},
		{http.MethodGet, "/api/v2/pharmacy/inbox", []string{"FARMACIA", "ADMIN", "MEDICO", "ENFERMERO"}},
		{http.MethodPost, "/api/v2/pharmacy/dispense", []string{"FARMACIA", "ADMIN"}},
	}

	var tabla strings.Builder
	tabla.WriteString("| Metodo | Ruta | " + strings.Join(roles, " | ") + " | sin token |\n|---|---|" + strings.Repeat("---|", len(roles)+1) + "\n")
	for _, r := range rutas {
		fila := fmt.Sprintf("| %s | `%s` |", r.metodo, r.ruta)
		for _, rol := range roles {
			req := httptest.NewRequest(r.metodo, r.ruta, strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+calidadToken(t, "usr-rbac-"+strings.ToLower(rol), rol))
			res, err := env.app.Test(req, -1)
			if err != nil {
				t.Fatalf("%s %s: %v", r.metodo, r.ruta, err)
			}
			_ = res.Body.Close()
			paso := res.StatusCode != http.StatusForbidden && res.StatusCode != http.StatusUnauthorized
			if paso != contiene(r.permitido, rol) {
				t.Errorf("%s %s con rol %s: estado %d, se esperaba acceso=%v", r.metodo, r.ruta, rol, res.StatusCode, contiene(r.permitido, rol))
			}
			fila += fmt.Sprintf(" %d |", res.StatusCode)
		}
		req := httptest.NewRequest(r.metodo, r.ruta, strings.NewReader("{}"))
		res, err := env.app.Test(req, -1)
		if err != nil {
			t.Fatal(err)
		}
		_ = res.Body.Close()
		if res.StatusCode != http.StatusUnauthorized {
			t.Errorf("%s %s sin token: estado %d, se esperaba 401", r.metodo, r.ruta, res.StatusCode)
		}
		fila += fmt.Sprintf(" %d |\n", res.StatusCode)
		tabla.WriteString(fila)
	}
	t.Log("\n" + tabla.String())
	if salida := os.Getenv("CALIDAD_MATRIZ_R4_SALIDA"); salida != "" {
		if err := os.WriteFile(salida, []byte(tabla.String()), 0o600); err != nil {
			t.Fatal(err)
		}
	}
}
