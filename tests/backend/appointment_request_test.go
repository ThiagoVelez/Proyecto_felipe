package backend_test

// Portal publico del paciente: solicitud de primera cita, asignacion al medico con mayor disponibilidad de la
// sede y bandeja del medico para agendar (con envio por correo) o rechazar.

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
)

const sedeTulua = "Sede Tuluá - Ambulatoria"

func crearMedico(t *testing.T, env calidadEnv, id, nombre, sede string) {
	t.Helper()
	u := newDoctorFixture(id, "RM-"+id)
	u.FullName = nombre
	u.Branch = sede
	if err := memory.NewUserMemoryRepo(env.ds).Create(context.Background(), u); err != nil {
		t.Fatalf("no se pudo crear el medico %s: %v", id, err)
	}
}

func crearCitaFutura(t *testing.T, env calidadEnv, doctorID string, enDias int) {
	t.Helper()
	cita := &domain.Appointment{
		ID: fmt.Sprintf("cita-%s-%d", doctorID, enDias), DoctorID: doctorID, PatientID: "p-x",
		AppointmentDate: time.Now().UTC().Add(time.Duration(enDias) * 24 * time.Hour), Status: domain.AppointmentScheduled,
	}
	if err := memory.NewAppointmentMemoryRepo(env.ds).Create(context.Background(), cita); err != nil {
		t.Fatal(err)
	}
}

// esperarComprobante espera a que el envio en segundo plano (PDF y correo) termine antes de que la prueba
// borre su directorio temporal.
func esperarComprobante(t *testing.T, env calidadEnv, doctorID string) {
	t.Helper()
	repo := memory.NewAppointmentMemoryRepo(env.ds)
	for i := 0; i < 100; i++ {
		citas, _ := repo.GetByDoctorID(context.Background(), doctorID)
		listo := len(citas) > 0
		for _, c := range citas {
			if c.PDFPath == "" {
				listo = false
			}
		}
		if listo {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("el comprobante PDF de la cita no se genero en segundo plano")
}

func cuerpoSolicitud(sede, documento, correo string, consentimiento bool) string {
	return fmt.Sprintf(`{"branch":%q,"document_type":"CC","document_number":%q,"first_name":"Lucía","last_name":"Prado",
		"birth_date":"1990-05-14","gender":"F","blood_type":"O+","eps_name":"Nueva EPS","phone":"3001234567",
		"email":%q,"address":"Calle 10 # 5-20","observations":"Dolor de cabeza frecuente hace dos semanas","consent":%v}`,
		sede, documento, correo, consentimiento)
}

func enviarSolicitud(t *testing.T, env calidadEnv, cuerpo string) (int, map[string]interface{}) {
	t.Helper()
	return peticionJSON(t, env, http.MethodPost, "/api/v1/public/appointment-requests", cuerpo, "")
}

func bandeja(t *testing.T, env calidadEnv, token string) []domain.AppointmentRequest {
	t.Helper()
	estado, out := peticionJSON(t, env, http.MethodGet, "/api/v2/appointment-requests", "", token)
	if estado != http.StatusOK {
		t.Fatalf("bandeja: estado %d", estado)
	}
	raw, _ := json.Marshal(out["requests"])
	var lista []domain.AppointmentRequest
	_ = json.Unmarshal(raw, &lista)
	return lista
}

func TestPortalListaSedesConUbicacionSinSesion(t *testing.T) {
	env := newCalidadEnv(t)
	estado, out := peticionJSON(t, env, http.MethodGet, "/api/v1/public/branches", "", "")
	if estado != http.StatusOK {
		t.Fatalf("estado %d", estado)
	}
	sedes, _ := out["branches"].([]interface{})
	if len(sedes) != 3 {
		t.Fatalf("se esperaban %d sedes, se obtuvieron %d", 3, len(sedes))
	}
	for _, s := range sedes {
		m := s.(map[string]interface{})
		if m["latitude"] == nil || m["longitude"] == nil || m["name"] == "Brigada Rural Desconectada" {
			t.Fatalf("sede sin ubicacion o sin sede fija en el portal: %v", m)
		}
	}
}

func TestSolicitudSeAsignaAlMedicoConMayorDisponibilidad(t *testing.T) {
	env := newCalidadEnv(t)
	crearMedico(t, env, "med-tulua-ocupado", "Dra. Ocupada", sedeTulua)
	crearMedico(t, env, "med-tulua-libre", "Dr. Libre", sedeTulua+" (Nivel I)")
	crearMedico(t, env, "med-cartago", "Dr. Otra Sede", sedeCartago)
	crearCitaFutura(t, env, "med-tulua-ocupado", 1)
	crearCitaFutura(t, env, "med-tulua-ocupado", 3)

	estado, out := enviarSolicitud(t, env, cuerpoSolicitud(sedeTulua, "1094111222", "lucia@correo.example", true))
	if estado != http.StatusCreated {
		t.Fatalf("estado esperado 201, obtenido %d: %v", estado, out)
	}
	if codigo, _ := out["code"].(string); len(codigo) != 10 {
		t.Fatalf("codigo de solicitud inesperado: %v", out["code"])
	}
	if _, revela := out["doctor_id"]; revela {
		t.Fatal("la respuesta publica no debe revelar el medico asignado")
	}

	if n := len(bandeja(t, env, calidadToken(t, "med-tulua-libre", "MEDICO"))); n != 1 {
		t.Fatalf("el medico con mas disponibilidad debe recibir la solicitud: %d en su bandeja", n)
	}
	if n := len(bandeja(t, env, calidadToken(t, "med-tulua-ocupado", "MEDICO"))); n != 0 {
		t.Fatalf("el medico mas ocupado no debe recibirla: %d en su bandeja", n)
	}
	if n := len(bandeja(t, env, calidadToken(t, "med-cartago", "MEDICO"))); n != 0 {
		t.Fatalf("un medico de otra sede no debe recibirla: %d en su bandeja", n)
	}

	// Las solicitudes pendientes cuentan como carga: con 2 citas vs 1 pendiente + 2 nuevas, se reparte
	enviarSolicitud(t, env, cuerpoSolicitud(sedeTulua, "1094111333", "otro@correo.example", true))
	enviarSolicitud(t, env, cuerpoSolicitud(sedeTulua, "1094111444", "tercero@correo.example", true))
	libre := len(bandeja(t, env, calidadToken(t, "med-tulua-libre", "MEDICO")))
	ocupado := len(bandeja(t, env, calidadToken(t, "med-tulua-ocupado", "MEDICO")))
	if libre+ocupado != 3 || ocupado == 0 {
		t.Fatalf("las pendientes deben contar como carga: libre=%d ocupado=%d", libre, ocupado)
	}
}

func TestSolicitudValidaDatosYConsentimiento(t *testing.T) {
	casos := map[string]string{
		"sin consentimiento":  cuerpoSolicitud(sedeTulua, "1", "a@correo.example", false),
		"correo invalido":     cuerpoSolicitud(sedeTulua, "1", "no-es-correo", true),
		"sede sin ubicacion":  cuerpoSolicitud("Brigada Rural Desconectada", "1", "a@correo.example", true),
		"sede inexistente":    cuerpoSolicitud("Sede Inventada", "1", "a@correo.example", true),
		"fecha de nacimiento": `{"branch":"` + sedeTulua + `","birth_date":"14/05/1990","consent":true}`,
		"campos obligatorios": `{"branch":"` + sedeTulua + `","birth_date":"1990-05-14","consent":true}`,
	}
	for nombre, cuerpo := range casos {
		// Entorno nuevo por caso: el portal limita a 5 envios por minuto por IP
		env := newCalidadEnv(t)
		crearMedico(t, env, "med-tulua", "Dr. Tuluá", sedeTulua)
		if estado, _ := enviarSolicitud(t, env, cuerpo); estado != http.StatusBadRequest {
			t.Errorf("%s: estado esperado 400, obtenido %d", nombre, estado)
		}
	}
	env := newCalidadEnv(t)
	if estado, _ := enviarSolicitud(t, env, cuerpoSolicitud("Sede La Unión - Urgencias", "1", "a@correo.example", true)); estado != http.StatusConflict {
		t.Fatalf("sede sin medicos: estado esperado 409, obtenido %d", estado)
	}
}

func TestPortalLimitaEnviosPorIP(t *testing.T) {
	env := newCalidadEnv(t)
	crearMedico(t, env, "med-tulua", "Dr. Tuluá", sedeTulua)
	limitado := false
	for i := 0; i < 8; i++ {
		estado, _ := enviarSolicitud(t, env, cuerpoSolicitud(sedeTulua, fmt.Sprintf("10940%d", i), "a@correo.example", true))
		if estado == http.StatusTooManyRequests {
			limitado = true
			break
		}
	}
	if !limitado {
		t.Fatal("el portal debe limitar los envios repetidos desde la misma IP")
	}
}

func TestBandejaSoloParaMedicos(t *testing.T) {
	env := newCalidadEnv(t)
	if estado, _ := peticionJSON(t, env, http.MethodGet, "/api/v2/appointment-requests", "", ""); estado != http.StatusUnauthorized {
		t.Fatalf("sin sesion: estado esperado 401, obtenido %d", estado)
	}
	_, adminID := registrarAdminDeSede(t, env, "admin.cartago@ips.example", sedeCartago)
	aprobar(t, env, adminID)
	if estado, _ := peticionJSON(t, env, http.MethodGet, "/api/v2/appointment-requests", "", calidadToken(t, adminID, "ADMIN")); estado != http.StatusForbidden {
		t.Fatalf("ADMIN: estado esperado 403, obtenido %d", estado)
	}
}

func TestMedicoAgendaSolicitudCreaPacienteYCita(t *testing.T) {
	env := newCalidadEnv(t)
	crearMedico(t, env, "med-tulua", "Dr. Tuluá", sedeTulua)
	crearMedico(t, env, "med-ajeno", "Dr. Ajeno", sedeCartago)
	enviarSolicitud(t, env, cuerpoSolicitud(sedeTulua, "1094555666", "lucia@correo.example", true))
	token := calidadToken(t, "med-tulua", "MEDICO")
	lista := bandeja(t, env, token)
	if len(lista) != 1 {
		t.Fatalf("bandeja con %d solicitudes", len(lista))
	}
	sol := lista[0]
	_, conteo := peticionJSON(t, env, http.MethodGet, "/api/v2/appointment-requests/pending-count", "", token)
	if conteo["pending"] != float64(1) {
		t.Fatalf("contador de pendientes esperado 1, obtenido %v", conteo["pending"])
	}

	futura := time.Now().UTC().Add(72 * time.Hour).Truncate(time.Minute).Format(time.RFC3339)
	ruta := "/api/v2/appointment-requests/" + sol.ID + "/schedule"
	cuerpo := fmt.Sprintf(`{"appointment_date":%q,"note":"Traer exámenes previos"}`, futura)

	if estado, _ := peticionJSON(t, env, http.MethodPost, ruta, cuerpo, calidadToken(t, "med-ajeno", "MEDICO")); estado != http.StatusNotFound {
		t.Fatalf("otro medico no puede agendar la solicitud: estado %d", estado)
	}
	pasada := time.Now().UTC().Add(-48 * time.Hour).Format(time.RFC3339)
	if estado, _ := peticionJSON(t, env, http.MethodPost, ruta, fmt.Sprintf(`{"appointment_date":%q}`, pasada), token); estado != http.StatusBadRequest {
		t.Fatalf("fecha pasada: estado esperado 400, obtenido %d", estado)
	}

	estado, out := peticionJSON(t, env, http.MethodPost, ruta, cuerpo, token)
	if estado != http.StatusOK {
		t.Fatalf("agendar: estado %d %v", estado, out)
	}
	paciente, err := memory.NewPatientMemoryRepo(env.ds).GetByDocument(context.Background(), domain.DocCC, "1094555666")
	if err != nil || paciente.Email != "lucia@correo.example" || paciente.FirstName != "Lucía" {
		t.Fatalf("el paciente debe quedar registrado con los datos de la solicitud: %+v (%v)", paciente, err)
	}
	citas, _ := memory.NewAppointmentMemoryRepo(env.ds).GetByDoctorID(context.Background(), "med-tulua")
	if len(citas) != 1 || citas[0].PatientID != paciente.ID {
		t.Fatalf("debe existir una cita del medico con el paciente: %+v", citas)
	}
	esperarComprobante(t, env, "med-tulua")
	if bandeja(t, env, token)[0].Status != domain.RequestScheduled {
		t.Fatal("la solicitud debe quedar AGENDADA")
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, ruta, cuerpo, token); estado != http.StatusConflict {
		t.Fatalf("agendar dos veces: estado esperado 409, obtenido %d", estado)
	}
}

func TestAgendarAsociaPacienteExistenteSinDuplicarlo(t *testing.T) {
	env := newCalidadEnv(t)
	crearMedico(t, env, "med-tulua", "Dr. Tuluá", sedeTulua)
	existente := newPatientFixture("p-existente", "1094777888")
	existente.Email = ""
	if err := memory.NewPatientMemoryRepo(env.ds).Create(context.Background(), existente); err != nil {
		t.Fatal(err)
	}
	enviarSolicitud(t, env, cuerpoSolicitud(sedeTulua, "1094777888", "nuevo@correo.example", true))
	token := calidadToken(t, "med-tulua", "MEDICO")
	sol := bandeja(t, env, token)[0]
	futura := time.Now().UTC().Add(96 * time.Hour).Format(time.RFC3339)
	if estado, out := peticionJSON(t, env, http.MethodPost, "/api/v2/appointment-requests/"+sol.ID+"/schedule",
		fmt.Sprintf(`{"appointment_date":%q}`, futura), token); estado != http.StatusOK {
		t.Fatalf("agendar: estado %d %v", estado, out)
	}
	esperarComprobante(t, env, "med-tulua")
	lista, _ := memory.NewPatientMemoryRepo(env.ds).List(context.Background(), 100, 0)
	if len(lista) != 1 {
		t.Fatalf("no debe duplicarse el paciente: hay %d", len(lista))
	}
	p, _ := memory.NewPatientMemoryRepo(env.ds).GetByID(context.Background(), "p-existente")
	if p.Email != "nuevo@correo.example" || p.FirstName != "Carlos" {
		t.Fatalf("se completa el correo vacio sin alterar los datos clinicos: %+v", p)
	}
}

func TestMedicoRechazaSolicitudConMotivo(t *testing.T) {
	env := newCalidadEnv(t)
	crearMedico(t, env, "med-tulua", "Dr. Tuluá", sedeTulua)
	enviarSolicitud(t, env, cuerpoSolicitud(sedeTulua, "1094999000", "lucia@correo.example", true))
	token := calidadToken(t, "med-tulua", "MEDICO")
	sol := bandeja(t, env, token)[0]
	ruta := "/api/v2/appointment-requests/" + sol.ID + "/reject"
	if estado, _ := peticionJSON(t, env, http.MethodPost, ruta, `{"note":""}`, token); estado != http.StatusBadRequest {
		t.Fatalf("rechazo sin motivo: estado esperado 400, obtenido %d", estado)
	}
	if estado, _ := peticionJSON(t, env, http.MethodPost, ruta, `{"note":"Debe consultar primero por urgencias"}`, token); estado != http.StatusOK {
		t.Fatalf("rechazo con motivo: estado %d", estado)
	}
	rechazada := bandeja(t, env, token)[0]
	if rechazada.Status != domain.RequestRejected || rechazada.ResponseNote == "" {
		t.Fatalf("la solicitud debe quedar RECHAZADA con su motivo: %+v", rechazada)
	}
	if estado, _ := peticionJSON(t, env, http.MethodGet, "/api/v2/appointment-requests?status=PENDIENTE", "", token); estado != http.StatusOK {
		t.Fatalf("filtro por estado: %d", estado)
	}
}

func TestCorreoYPDFDeLaCitaUsanLaHoraDeColombia(t *testing.T) {
	// 10:20 en Colombia se guarda como 15:20 UTC; al paciente se le debe mostrar 10:20
	enUTC := time.Date(2026, 11, 22, 15, 20, 0, 0, time.UTC)
	if got := domain.FormatColombia(enUTC); got != "22/11/2026 10:20" {
		t.Fatalf("hora mostrada al paciente: esperado 22/11/2026 10:20, obtenido %s", got)
	}
	// Una cita a las 8 p. m. de Colombia cae al dia siguiente en UTC, pero el correo debe conservar el dia local
	if got := domain.FormatColombia(time.Date(2026, 11, 23, 1, 0, 0, 0, time.UTC)); got != "22/11/2026 20:00" {
		t.Fatalf("cita nocturna: esperado 22/11/2026 20:00, obtenido %s", got)
	}
}
