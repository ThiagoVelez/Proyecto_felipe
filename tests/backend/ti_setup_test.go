package backend_test

// Registro inicial desde el login (Encargado de TI y administrador por sede) y panel del Encargado de TI.
// El servidor es quien decide: ocultar los botones en la pantalla no basta.

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
)

const sedeCartago = "Sede Cartago - Hospital Central"

func cuerpoRegistro(nombre, correo, sede string) string {
	return fmt.Sprintf(`{"full_name":%q,"document_type":"CC","document_number":"1094000000","email":%q,"password":"ClaveSegura-2026!","phone":"3000000000","branch":%q}`,
		nombre, correo, sede)
}

func registrarTI(t *testing.T, env calidadEnv, correo string) (int, string) {
	t.Helper()
	estado, out := peticionJSON(t, env, http.MethodPost, "/api/v1/auth/register-ti", cuerpoRegistro("Ing. Laura TI", correo, sedeCartago), "")
	id := ""
	if u, ok := out["user"].(map[string]interface{}); ok {
		id, _ = u["id"].(string)
	}
	return estado, id
}

func registrarAdminDeSede(t *testing.T, env calidadEnv, correo, sede string) (int, string) {
	t.Helper()
	estado, out := peticionJSON(t, env, http.MethodPost, "/api/v1/auth/register-branch-admin", cuerpoRegistro("Admin "+sede, correo, sede), "")
	id := ""
	if u, ok := out["user"].(map[string]interface{}); ok {
		id, _ = u["id"].(string)
	}
	return estado, id
}

func sedeTieneAdmin(t *testing.T, env calidadEnv, sede string) bool {
	t.Helper()
	estado, out := peticionJSON(t, env, http.MethodGet, "/api/v1/auth/setup-status", "", "")
	if estado != http.StatusOK {
		t.Fatalf("setup-status respondio %d", estado)
	}
	sedes, _ := out["branches"].([]interface{})
	for _, s := range sedes {
		m := s.(map[string]interface{})
		if m["name"] == sede {
			return m["has_admin"] == true
		}
	}
	t.Fatalf("la sede %q no aparece en setup-status", sede)
	return false
}

func TestSetupStatusInicialSinTINiAdministradores(t *testing.T) {
	env := newCalidadEnv(t)
	estado, out := peticionJSON(t, env, http.MethodGet, "/api/v1/auth/setup-status", "", "")
	if estado != http.StatusOK {
		t.Fatalf("estado esperado 200, obtenido %d", estado)
	}
	if out["ti_registered"] != false {
		t.Fatalf("ti_registered esperado false, obtenido %v", out["ti_registered"])
	}
	sedes, _ := out["branches"].([]interface{})
	if len(sedes) != len(domain.BranchCatalog) {
		t.Fatalf("se esperaban %d sedes, se obtuvieron %d", len(domain.BranchCatalog), len(sedes))
	}
	for _, s := range sedes {
		if s.(map[string]interface{})["has_admin"] != false {
			t.Fatalf("ninguna sede deberia tener administrador: %v", s)
		}
	}
}

func TestRegistroTIUnicoDesdeElLogin(t *testing.T) {
	env := newCalidadEnv(t)
	estado, id := registrarTI(t, env, "ti@ips.example")
	if estado != http.StatusCreated || id == "" {
		t.Fatalf("primer registro de TI: estado %d, id %q", estado, id)
	}
	u, err := memory.NewUserMemoryRepo(env.ds).GetByID(context.Background(), id)
	if err != nil || u.RoleID != domain.RoleIDTI || u.RoleName != "TI" || !u.IsActive || !u.MFAEnabled {
		t.Fatalf("la cuenta de TI no quedo con rol TI activo y MFA: %+v (%v)", u, err)
	}

	if estado, _ := registrarTI(t, env, "otro-ti@ips.example"); estado != http.StatusConflict {
		t.Fatalf("segundo registro de TI: estado esperado 409, obtenido %d", estado)
	}
	if _, err := memory.NewUserMemoryRepo(env.ds).GetByEmail(context.Background(), "otro-ti@ips.example"); err == nil {
		t.Fatal("el segundo Encargado de TI no debio crearse")
	}
	_, out := peticionJSON(t, env, http.MethodGet, "/api/v1/auth/setup-status", "", "")
	if out["ti_registered"] != true {
		t.Fatalf("ti_registered esperado true tras el registro, obtenido %v", out["ti_registered"])
	}
}

func TestRegistroTIConcurrenteCreaSoloUno(t *testing.T) {
	env := newCalidadEnv(t)
	var wg sync.WaitGroup
	var mu sync.Mutex
	creados := 0
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			estado, _ := registrarTI(t, env, fmt.Sprintf("ti%d@ips.example", i))
			if estado == http.StatusCreated {
				mu.Lock()
				creados++
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()
	ti := domain.RoleIDTI
	lista, _ := memory.NewUserMemoryRepo(env.ds).List(context.Background(), &ti, nil)
	if creados != 1 || len(lista) != 1 {
		t.Fatalf("registros concurrentes: %d respuestas 201 y %d cuentas TI; se esperaba exactamente 1", creados, len(lista))
	}
}

func TestRegistroAdministradorPorSedeDesdeElLogin(t *testing.T) {
	env := newCalidadEnv(t)
	estado, id := registrarAdminDeSede(t, env, "admin.cartago@ips.example", sedeCartago)
	if estado != http.StatusCreated || id == "" {
		t.Fatalf("registro del administrador de sede: estado %d", estado)
	}
	if !sedeTieneAdmin(t, env, sedeCartago) {
		t.Fatal("la sede deberia figurar con administrador")
	}
	if estado, _ := registrarAdminDeSede(t, env, "segundo.cartago@ips.example", sedeCartago); estado != http.StatusConflict {
		t.Fatalf("segundo administrador para la misma sede: estado esperado 409, obtenido %d", estado)
	}
	if estado, _ := registrarAdminDeSede(t, env, "admin.tulua@ips.example", "Sede Tuluá - Ambulatoria"); estado != http.StatusCreated {
		t.Fatalf("otra sede sin administrador deberia aceptar el registro: estado %d", estado)
	}
	if estado, _ := registrarAdminDeSede(t, env, "admin.falsa@ips.example", "Sede Inventada"); estado != http.StatusBadRequest {
		t.Fatalf("sede fuera del catalogo: estado esperado 400, obtenido %d", estado)
	}
}

func TestAdministradoresAdicionalesSoloLosRegistraTI(t *testing.T) {
	env := newCalidadEnv(t)
	_, adminID := registrarAdminDeSede(t, env, "admin.cartago@ips.example", sedeCartago)
	_, tiID := registrarTI(t, env, "ti@ips.example")
	cuerpo := cuerpoRegistro("Admin Adicional", "adicional@ips.example", sedeCartago)

	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v1/auth/register-admin", cuerpo, calidadToken(t, adminID, "ADMIN")); estado != http.StatusForbidden {
		t.Fatalf("un ADMIN no debe registrar administradores adicionales: estado %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v1/auth/register-admin", cuerpo, ""); estado != http.StatusUnauthorized {
		t.Fatalf("sin sesion: estado esperado 401, obtenido %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v1/auth/register-admin", cuerpo, calidadToken(t, tiID, "TI")); estado != http.StatusCreated {
		t.Fatalf("el Encargado de TI debe poder registrar un administrador adicional: estado %d", estado)
	}
}

func TestPanelTIRestringidoAlRolTI(t *testing.T) {
	env := newCalidadEnv(t)
	_, adminID := registrarAdminDeSede(t, env, "admin.cartago@ips.example", sedeCartago)
	_, tiID := registrarTI(t, env, "ti@ips.example")

	estado, out := peticionJSON(t, env, http.MethodGet, "/api/v1/ti/overview", "", calidadToken(t, tiID, "TI"))
	if estado != http.StatusOK {
		t.Fatalf("overview para TI: estado %d", estado)
	}
	usuarios, _ := out["users"].(map[string]interface{})
	if usuarios["total"] != float64(3) {
		t.Fatalf("total de usuarios esperado 3 (medico semilla, admin y TI), obtenido %v", usuarios["total"])
	}
	if estado, _ := peticionJSON(t, env, http.MethodGet, "/api/v1/ti/overview", "", calidadToken(t, adminID, "ADMIN")); estado != http.StatusForbidden {
		t.Fatalf("overview para ADMIN: estado esperado 403, obtenido %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodGet, "/api/v1/ti/overview", "", calidadToken(t, medicoSemillaID, "MEDICO")); estado != http.StatusForbidden {
		t.Fatalf("overview para MEDICO: estado esperado 403, obtenido %d", estado)
	}
}

func TestTIGestionaSoloCuentasDeAdministrador(t *testing.T) {
	env := newCalidadEnv(t)
	_, adminID := registrarAdminDeSede(t, env, "admin.cartago@ips.example", sedeCartago)
	_, tiID := registrarTI(t, env, "ti@ips.example")
	tokenTI := calidadToken(t, tiID, "TI")

	if estado, _ := peticionJSON(t, env, http.MethodPatch, "/api/v1/ti/admins/"+adminID+"/status", `{"is_active":false}`, tokenTI); estado != http.StatusOK {
		t.Fatalf("suspender administrador desde TI: estado %d", estado)
	}
	u, _ := memory.NewUserMemoryRepo(env.ds).GetByID(context.Background(), adminID)
	if u.IsActive {
		t.Fatal("el administrador deberia quedar suspendido")
	}
	if estado, _ := peticionJSON(t, env, http.MethodPatch, "/api/v1/ti/admins/"+medicoSemillaID+"/status", `{"is_active":false}`, tokenTI); estado != http.StatusBadRequest {
		t.Fatalf("TI no gestiona personal asistencial: estado esperado 400, obtenido %d", estado)
	}
}

func TestAdministradorNoPuedeSuspenderAlEncargadoDeTI(t *testing.T) {
	env := newCalidadEnv(t)
	_, adminID := registrarAdminDeSede(t, env, "admin.cartago@ips.example", sedeCartago)
	_, tiID := registrarTI(t, env, "ti@ips.example")

	estado, _ := peticionJSON(t, env, http.MethodPatch, "/api/v1/admin/users/"+tiID+"/status", `{"is_active":false}`, calidadToken(t, adminID, "ADMIN"))
	if estado != http.StatusForbidden {
		t.Fatalf("un ADMIN no debe suspender al Encargado de TI: estado esperado 403, obtenido %d", estado)
	}
	u, _ := memory.NewUserMemoryRepo(env.ds).GetByID(context.Background(), tiID)
	if !u.IsActive {
		t.Fatal("el Encargado de TI no debio quedar suspendido")
	}
}
