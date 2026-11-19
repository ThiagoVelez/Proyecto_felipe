package backend_test

// Laboratorio, enfermeria y sedes en el servidor (antes vivian en el navegador de cada equipo).

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
)

func crearUsuarioRol(t *testing.T, env calidadEnv, id string, roleID int, nombre, sede string) string {
	t.Helper()
	u := newDoctorFixture(id, "REG-"+id)
	u.RoleID = roleID
	u.RoleName = domain.RoleNameByID(roleID)
	u.FullName = nombre
	u.Branch = sede
	if err := memory.NewUserMemoryRepo(env.ds).Create(context.Background(), u); err != nil {
		t.Fatalf("crear usuario %s: %v", id, err)
	}
	return calidadToken(t, id, u.RoleName)
}

func crearPacientePrueba(t *testing.T, env calidadEnv, id, doc string) {
	t.Helper()
	p := newPatientFixture(id, doc)
	p.Email = "paciente-" + id + "@correo.example"
	if err := memory.NewPatientMemoryRepo(env.ds).Create(context.Background(), p); err != nil {
		t.Fatal(err)
	}
}

func decodificar(t *testing.T, v interface{}, out interface{}) {
	t.Helper()
	raw, _ := json.Marshal(v)
	if err := json.Unmarshal(raw, out); err != nil {
		t.Fatalf("decodificar: %v", err)
	}
}

func ordenesLab(t *testing.T, env calidadEnv, token string) []domain.LabOrder {
	t.Helper()
	estado, out := peticionJSON(t, env, http.MethodGet, "/api/v2/lab-orders", "", token)
	if estado != http.StatusOK {
		t.Fatalf("listar ordenes: estado %d", estado)
	}
	var lista []domain.LabOrder
	decodificar(t, out["orders"], &lista)
	return lista
}

func TestOrdenDeLaboratorioDelMedicoLlegaAlLaboratorio(t *testing.T) {
	env := newCalidadEnv(t)
	medico := calidadToken(t, medicoSemillaID, "MEDICO")
	otroMedico := crearUsuarioRol(t, env, "med-otro", 2, "Dr. Otro", sedeCartago)
	lab := crearUsuarioRol(t, env, "lab-1", 7, "Bact. Ana Ruiz", sedeCartago)
	crearPacientePrueba(t, env, "p-lab", "1094555000")

	cuerpo := `{"patient_id":"p-lab","test_type":"Hemograma Completo","sample_type":"Sangre EDTA","priority":"URGENTE","observations":"Fiebre"}`
	estado, out := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders", cuerpo, medico)
	if estado != http.StatusCreated {
		t.Fatalf("crear orden: estado %d %v", estado, out)
	}
	var orden domain.LabOrder
	decodificar(t, out, &orden)
	if orden.ID == "" || orden.PatientName != "Carlos Ramirez" || orden.OrderingDoctorID != medicoSemillaID || orden.Status != domain.LabPending {
		t.Fatalf("orden creada: %+v", orden)
	}
	// Segunda orden: numero consecutivo asignado por el servidor
	_, out2 := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders", cuerpo, medico)
	var orden2 domain.LabOrder
	decodificar(t, out2, &orden2)
	if orden2.ID == orden.ID || orden2.ID[len(orden2.ID)-3:] != "002" {
		t.Fatalf("ids consecutivos: %s y %s", orden.ID, orden2.ID)
	}

	if n := len(ordenesLab(t, env, lab)); n != 2 {
		t.Fatalf("el laboratorio debe ver todas las ordenes: %d", n)
	}
	if n := len(ordenesLab(t, env, medico)); n != 2 {
		t.Fatalf("el medico ve sus ordenes: %d", n)
	}
	if n := len(ordenesLab(t, env, otroMedico)); n != 0 {
		t.Fatalf("otro medico no ve ordenes ajenas: %d", n)
	}
	// Enfermeria no accede al laboratorio
	enf := crearUsuarioRol(t, env, "enf-1", 3, "Enf. Luisa", sedeCartago)
	if estado, _ := peticionJSON(t, env, http.MethodGet, "/api/v2/lab-orders", "", enf); estado != http.StatusForbidden {
		t.Fatalf("enfermeria en laboratorio: estado esperado 403, obtenido %d", estado)
	}
	// El medico debe indicar un paciente registrado
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders", `{"patient_name":"X","patient_document":"1","test_type":"Hemograma"}`, medico); estado != http.StatusBadRequest {
		t.Fatalf("orden del medico sin paciente: estado esperado 400, obtenido %d", estado)
	}
}

func TestLaboratorioGuardaAvanceSellaYEnviaPorCorreo(t *testing.T) {
	env := newCalidadEnv(t)
	medico := calidadToken(t, medicoSemillaID, "MEDICO")
	lab := crearUsuarioRol(t, env, "lab-1", 7, "Bact. Ana Ruiz", sedeCartago)
	crearPacientePrueba(t, env, "p-lab", "1094555000")
	_, out := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders", `{"patient_id":"p-lab","test_type":"Glucemia","priority":"RUTINA"}`, medico)
	id := out["id"].(string)

	if estado, _ := peticionJSON(t, env, http.MethodPut, "/api/v2/lab-orders/"+id+"/progress", `{"results":"GLUCOSA: 95","method_notes":"x"}`, medico); estado != http.StatusForbidden {
		t.Fatalf("el medico no registra resultados: estado %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPut, "/api/v2/lab-orders/"+id+"/progress", `{"results":"GLUCOSA: 95","method_notes":"x"}`, lab); estado != http.StatusOK {
		t.Fatalf("guardar avance: estado %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders/"+id+"/dispatch", `{"email":"p@correo.example"}`, lab); estado != http.StatusConflict {
		t.Fatalf("enviar sin sellar: estado esperado 409, obtenido %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders/"+id+"/seal", `{"results":""}`, lab); estado != http.StatusBadRequest {
		t.Fatalf("sellar sin resultados: estado esperado 400, obtenido %d", estado)
	}
	estado, sellada := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders/"+id+"/seal", `{"results":"GLUCOSA: 95 mg/dL","method_notes":"Analizador"}`, lab)
	if estado != http.StatusOK || sellada["validated_by"] != "Bact. Ana Ruiz" || sellada["bacteriologist_license"] != "REG-lab-1" {
		t.Fatalf("sellar: estado %d %v", estado, sellada)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPut, "/api/v2/lab-orders/"+id+"/progress", `{"results":"alterado"}`, lab); estado != http.StatusConflict {
		t.Fatalf("un resultado sellado es inmutable: estado esperado 409, obtenido %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders/"+id+"/dispatch", `{"email":"no-valido"}`, lab); estado != http.StatusBadRequest {
		t.Fatalf("correo invalido: estado esperado 400, obtenido %d", estado)
	}
	estado, enviada := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders/"+id+"/dispatch", `{"email":"paciente@correo.example","copy_doctor":true}`, lab)
	if estado != http.StatusOK || enviada["dispatched_to"] != "paciente@correo.example" || enviada["email_dispatched_at"] == nil {
		t.Fatalf("despacho: estado %d %v", estado, enviada)
	}
	// El medico ve el resultado sellado en su lista
	ordenes := ordenesLab(t, env, medico)
	if len(ordenes) != 1 || ordenes[0].Status != domain.LabCompleted || ordenes[0].Results != "GLUCOSA: 95 mg/dL" {
		t.Fatalf("el medico debe ver el resultado sellado: %+v", ordenes)
	}
}

func TestRecepcionDelLaboratorioRegistraOrdenManual(t *testing.T) {
	env := newCalidadEnv(t)
	lab := crearUsuarioRol(t, env, "lab-1", 7, "Bact. Ana Ruiz", sedeCartago)
	estado, out := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders",
		`{"patient_name":"Pedro Paz","patient_document":"55001","test_type":"Uroanálisis","priority":"PRIORITARIO","ordering_doctor":"Dr. Externo"}`, lab)
	if estado != http.StatusCreated || out["ordering_doctor"] != "Dr. Externo" || out["patient_name"] != "Pedro Paz" {
		t.Fatalf("orden manual: estado %d %v", estado, out)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v2/lab-orders", `{"test_type":"Uroanálisis"}`, lab); estado != http.StatusBadRequest {
		t.Fatalf("orden manual sin paciente: estado esperado 400, obtenido %d", estado)
	}
}

func TestEnfermeriaRecibeLaOrdenYRegistraDeberesYNotas(t *testing.T) {
	env := newCalidadEnv(t)
	medico := calidadToken(t, medicoSemillaID, "MEDICO")
	enf := crearUsuarioRol(t, env, "enf-1", 3, "Enf. Luisa Gómez", sedeCartago)
	crearPacientePrueba(t, env, "p-enf", "1094666000")

	// Sin registro: el servidor sugiere la lista inicial sin guardarla
	estado, inicial := peticionJSON(t, env, http.MethodGet, "/api/v2/nursing/p-enf", "", enf)
	if estado != http.StatusOK || inicial["saved"] != false || len(inicial["duties"].([]interface{})) != 6 {
		t.Fatalf("lista inicial: estado %d %v", estado, inicial)
	}

	orden := `{"order":{"unique_code":"RX-2026-00001","diagnosis":"Faringitis","items":[{"medication_name":"Amoxicilina"}]},
		"medications":[{"label":"Administrar Amoxicilina 500 mg","instructions":"Cada 8 horas"}]}`
	if estado, _ := peticionJSON(t, env, http.MethodPut, "/api/v2/nursing/p-enf/order", orden, enf); estado != http.StatusForbidden {
		t.Fatalf("solo el medico envia la orden: estado %d", estado)
	}
	estado, conOrden := peticionJSON(t, env, http.MethodPut, "/api/v2/nursing/p-enf/order", orden, medico)
	if estado != http.StatusOK || len(conOrden["duties"].([]interface{})) != 7 {
		t.Fatalf("orden del medico: estado %d %v", estado, conOrden)
	}

	// La enfermera marca un deber: el servidor registra quien y a que hora (ignora lo que diga el cliente)
	var care domain.NursingCare
	decodificar(t, conOrden, &care)
	care.Duties[0].Completed = true
	falso := "Otra persona"
	care.Duties[0].CompletedBy = &falso
	cuerpo, _ := json.Marshal(map[string]interface{}{"duties": care.Duties})
	estado, guardado := peticionJSON(t, env, http.MethodPut, "/api/v2/nursing/p-enf/duties", string(cuerpo), enf)
	if estado != http.StatusOK {
		t.Fatalf("guardar deberes: estado %d", estado)
	}
	decodificar(t, guardado, &care)
	if care.Duties[0].CompletedBy == nil || *care.Duties[0].CompletedBy != "Enf. Luisa Gómez" || care.Duties[0].CompletedAt == nil {
		t.Fatalf("el servidor debe registrar quien completo el deber: %+v", care.Duties[0])
	}

	// Notas de solo anexo
	for i := 1; i <= 2; i++ {
		if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v2/nursing/p-enf/notes", fmt.Sprintf(`{"content":"Nota %d"}`, i), enf); estado != http.StatusCreated {
			t.Fatalf("nota %d: estado %d", i, estado)
		}
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v2/nursing/p-enf/notes", `{"content":"  "}`, enf); estado != http.StatusBadRequest {
		t.Fatalf("nota vacia: estado esperado 400, obtenido %d", estado)
	}
	_, lista := peticionJSON(t, env, http.MethodGet, "/api/v2/nursing", "", medico)
	var registros []domain.NursingCare
	decodificar(t, lista["records"], &registros)
	if len(registros) != 1 || len(registros[0].Notes) != 2 || registros[0].Notes[0].Content != "Nota 2" || registros[0].Notes[0].Author != "Enf. Luisa Gómez" {
		t.Fatalf("el medico ve el registro de enfermeria con las notas: %+v", registros)
	}

	// Una nueva formula reemplaza solo los deberes de medicamentos
	nueva := `{"order":{"unique_code":"RX-2026-00002"},"medications":[{"label":"Administrar Ibuprofeno 400 mg"},{"label":"Administrar Omeprazol 20 mg"}]}`
	_, actualizado := peticionJSON(t, env, http.MethodPut, "/api/v2/nursing/p-enf/order", nueva, medico)
	decodificar(t, actualizado, &care)
	meds := 0
	for _, d := range care.Duties {
		if d.Category == "MEDICAMENTOS" {
			meds++
		}
	}
	if meds != 2 || len(care.Duties) != 8 || !care.Duties[0].Completed || len(care.Notes) != 2 {
		t.Fatalf("nueva formula: %d medicamentos, %d deberes, completado=%v, %d notas", meds, len(care.Duties), care.Duties[0].Completed, len(care.Notes))
	}
}

func TestSedesEnElServidorConCRUDDelAdministrador(t *testing.T) {
	env := newCalidadEnv(t)
	_, adminID := registrarAdminDeSede(t, env, "admin.cartago@ips.example", sedeCartago)
	aprobar(t, env, adminID)
	admin := calidadToken(t, adminID, "ADMIN")

	estado, out := peticionJSON(t, env, http.MethodGet, "/api/v1/branches", "", "")
	if estado != http.StatusOK || out["count"] != float64(4) {
		t.Fatalf("sedes publicas: estado %d %v", estado, out["count"])
	}

	nueva := `{"name":"Sede Roldanillo - Ambulatoria","level":"Nivel I","municipality":"Roldanillo, Valle del Cauca","latitude":4.4123,"longitude":-76.1547}`
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v1/admin/branches", nueva, ""); estado != http.StatusUnauthorized {
		t.Fatalf("crear sede sin sesion: estado %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v1/admin/branches", nueva, calidadToken(t, medicoSemillaID, "MEDICO")); estado != http.StatusForbidden {
		t.Fatalf("crear sede como medico: estado %d", estado)
	}
	estado, creada := peticionJSON(t, env, http.MethodPost, "/api/v1/admin/branches", nueva, admin)
	if estado != http.StatusCreated {
		t.Fatalf("crear sede: estado %d %v", estado, creada)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v1/admin/branches", nueva, admin); estado != http.StatusConflict {
		t.Fatalf("sede duplicada: estado esperado 409, obtenido %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v1/admin/branches", `{"name":"Sin coordenada","latitude":4.1}`, admin); estado != http.StatusBadRequest {
		t.Fatalf("coordenadas incompletas: estado esperado 400, obtenido %d", estado)
	}

	// La sede nueva aparece en el login, en el registro inicial y en el portal del paciente (tiene ubicacion)
	_, setup := peticionJSON(t, env, http.MethodGet, "/api/v1/auth/setup-status", "", "")
	if len(setup["branches"].([]interface{})) != 5 {
		t.Fatalf("setup-status debe incluir la sede nueva: %v", setup["branches"])
	}
	_, publicas := peticionJSON(t, env, http.MethodGet, "/api/v1/public/branches", "", "")
	if len(publicas["branches"].([]interface{})) != 4 {
		t.Fatalf("portal: 3 iniciales con ubicacion + la nueva: %v", publicas["branches"])
	}

	id := creada["id"].(string)
	if estado, out := peticionJSON(t, env, http.MethodPut, "/api/v1/admin/branches/"+id, `{"name":"Sede Roldanillo - Ambulatoria","status":"En Espera","description":"Cerrada por remodelación"}`, admin); estado != http.StatusOK || out["status"] != "En Espera" {
		t.Fatalf("editar sede: estado %d %v", estado, out)
	}
	if estado, _ := peticionJSON(t, env, http.MethodDelete, "/api/v1/admin/branches/br-01", "", admin); estado != http.StatusConflict {
		t.Fatalf("no se elimina una sede con personal: estado esperado 409, obtenido %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodDelete, "/api/v1/admin/branches/"+id, "", admin); estado != http.StatusNoContent {
		t.Fatalf("eliminar sede sin personal: estado %d", estado)
	}
}
