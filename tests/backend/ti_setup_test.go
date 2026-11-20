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

// calidadSetupCode es el codigo de instalacion con el que se arma el entorno de pruebas (TI_SETUP_CODE).
const calidadSetupCode = "codigo-instalacion-pruebas-2026"

func cuerpoRegistro(nombre, correo, sede string) string {
	return cuerpoRegistroConCodigo(nombre, correo, sede, "")
}

func cuerpoRegistroConCodigo(nombre, correo, sede, codigo string) string {
	return fmt.Sprintf(`{"full_name":%q,"document_type":"CC","document_number":"1094000000","email":%q,"password":"ClaveSegura-2026!","phone":"3000000000","branch":%q,"setup_code":%q}`,
		nombre, correo, sede, codigo)
}

func registrarTIConCodigo(t *testing.T, env calidadEnv, correo, codigo string) (int, string) {
	t.Helper()
	estado, out := peticionJSON(t, env, http.MethodPost, "/api/v1/auth/register-ti", cuerpoRegistroConCodigo("Ing. Laura TI", correo, sedeCartago, codigo), "")
	id := ""
	if u, ok := out["user"].(map[string]interface{}); ok {
		id, _ = u["id"].(string)
	}
	return estado, id
}

func registrarTI(t *testing.T, env calidadEnv, correo string) (int, string) {
	t.Helper()
	return registrarTIConCodigo(t, env, correo, calidadSetupCode)
}

// aprobar habilita una cuenta directamente en el repositorio (simula la aprobacion del Encargado de TI).
func aprobar(t *testing.T, env calidadEnv, id string) {
	t.Helper()
	if err := memory.NewUserMemoryRepo(env.ds).UpdateStatus(context.Background(), id, true); err != nil {
		t.Fatalf("no se pudo aprobar la cuenta %s: %v", id, err)
	}
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
	if out["ti_setup_enabled"] != true {
		t.Fatalf("ti_setup_enabled esperado true con TI_SETUP_CODE configurado, obtenido %v", out["ti_setup_enabled"])
	}
	sedes, _ := out["branches"].([]interface{})
	if len(sedes) != len(domain.InitialBranches()) {
		t.Fatalf("se esperaban %d sedes, se obtuvieron %d", len(domain.InitialBranches()), len(sedes))
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

func TestRegistroTIExigeElCodigoDeInstalacion(t *testing.T) {
	env := newCalidadEnv(t)
	for _, codigo := range []string{"", "codigo-equivocado-2026", calidadSetupCode + "x"} {
		if estado, _ := registrarTIConCodigo(t, env, "intruso@ips.example", codigo); estado != http.StatusForbidden {
			t.Fatalf("codigo %q: estado esperado 403, obtenido %d", codigo, estado)
		}
	}
	if _, err := memory.NewUserMemoryRepo(env.ds).GetByEmail(context.Background(), "intruso@ips.example"); err == nil {
		t.Fatal("no debio crearse ninguna cuenta con un codigo invalido")
	}
	if estado, _ := registrarTI(t, env, "ti@ips.example"); estado != http.StatusCreated {
		t.Fatalf("con el codigo correcto: estado esperado 201, obtenido %d", estado)
	}
}

func TestRegistroTIDeshabilitadoSinCodigoConfigurado(t *testing.T) {
	env := newCalidadEnvConCodigo(t, "")
	_, out := peticionJSON(t, env, http.MethodGet, "/api/v1/auth/setup-status", "", "")
	if out["ti_setup_enabled"] != false {
		t.Fatalf("sin TI_SETUP_CODE el registro de TI debe figurar deshabilitado: %v", out["ti_setup_enabled"])
	}
	if estado, _ := registrarTIConCodigo(t, env, "ti@ips.example", ""); estado != http.StatusForbidden {
		t.Fatalf("sin TI_SETUP_CODE: estado esperado 403, obtenido %d", estado)
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

func TestRegistroAdministradorPorSedeQuedaPendienteDeAprobacion(t *testing.T) {
	env := newCalidadEnv(t)
	estado, id := registrarAdminDeSede(t, env, "admin.cartago@ips.example", sedeCartago)
	if estado != http.StatusCreated || id == "" {
		t.Fatalf("registro del administrador de sede: estado %d", estado)
	}
	u, _ := memory.NewUserMemoryRepo(env.ds).GetByID(context.Background(), id)
	if u.IsActive || u.RoleID != 1 {
		t.Fatalf("el administrador registrado desde el login debe quedar pendiente: activo=%v rol=%d", u.IsActive, u.RoleID)
	}
	if sedeTieneAdmin(t, env, sedeCartago) {
		t.Fatal("una solicitud pendiente no ocupa la sede")
	}
	// Una solicitud ajena (o de un intruso) no bloquea la del administrador real
	estado, idReal := registrarAdminDeSede(t, env, "real.cartago@ips.example", sedeCartago)
	if estado != http.StatusCreated {
		t.Fatalf("segunda solicitud pendiente para la misma sede: estado esperado 201, obtenido %d", estado)
	}
	// Una cuenta pendiente no puede iniciar sesion
	estado, _ = peticionJSON(t, env, http.MethodPost, "/api/v1/auth/login", `{"email":"real.cartago@ips.example","password":"ClaveSegura-2026!"}`, "")
	if estado == http.StatusOK {
		t.Fatal("una cuenta pendiente de aprobacion no debe iniciar sesion")
	}

	aprobar(t, env, idReal)
	if !sedeTieneAdmin(t, env, sedeCartago) {
		t.Fatal("con un administrador aprobado la sede debe figurar con administrador")
	}
	if estado, _ := registrarAdminDeSede(t, env, "tercero.cartago@ips.example", sedeCartago); estado != http.StatusConflict {
		t.Fatalf("sede con administrador aprobado: estado esperado 409, obtenido %d", estado)
	}
	if estado, _ := registrarAdminDeSede(t, env, "admin.falsa@ips.example", "Sede Inventada"); estado != http.StatusBadRequest {
		t.Fatalf("sede fuera del catalogo: estado esperado 400, obtenido %d", estado)
	}
}

func TestAdministradoresAdicionalesSoloLosRegistraTI(t *testing.T) {
	env := newCalidadEnv(t)
	_, adminID := registrarAdminDeSede(t, env, "admin.cartago@ips.example", sedeCartago)
	aprobar(t, env, adminID)
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
	aprobar(t, env, adminID)
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
	aprobar(t, env, adminID)
	_, tiID := registrarTI(t, env, "ti@ips.example")
	tokenTI := calidadToken(t, tiID, "TI")

	_, pendienteID := registrarAdminDeSede(t, env, "pendiente@ips.example", "Sede Tuluá - Ambulatoria")
	if estado, _ := peticionJSON(t, env, http.MethodPatch, "/api/v1/ti/admins/"+pendienteID+"/status", `{"is_active":true}`, tokenTI); estado != http.StatusOK {
		t.Fatalf("aprobar solicitud desde TI: estado %d", estado)
	}
	if !sedeTieneAdmin(t, env, "Sede Tuluá - Ambulatoria") {
		t.Fatal("tras la aprobacion de TI la sede debe figurar con administrador")
	}
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
	aprobar(t, env, adminID)
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
