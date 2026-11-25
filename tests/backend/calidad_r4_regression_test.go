package backend_test

// Revision R4 de Calidad (24 nov 2026): reproducciones de los defectos reabiertos y nuevos.
// Cada prueba afirma el comportamiento correcto y por eso FALLA mientras el defecto exista. Se omiten salvo con
// CALIDAD_DEFECTOS_ABIERTOS=1 (requireDefectoAbierto) y las ejecuta el job «Backend - control de defectos abiertos»
// segun docs/calidad/defectos-abiertos.txt. Al corregir un defecto: quitar requireDefectoAbierto, quitar su linea de
// la lista y cerrarlo en la bitacora en el mismo PR.

import (
	"bytes"
	"context"
	"encoding/binary"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	"saludconecta-backend/adapters/email"
	"saludconecta-backend/adapters/storage"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/adapters/storage/mysql"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/pkg/logger"
)

// DEF-72 (reabierto en R4): el cierre solo corrigio la parte de AUDITOR. ADMIN, un rol administrativo, sigue leyendo
// recetas y la bandeja de farmacia (nombre, documento y medicamentos del paciente) y puede dispensar.
func TestDEF72R4AdminNoAccedeARecetasNiDispensa(t *testing.T) {
	requireDefectoAbierto(t, "DEF-72")
	env := newCalidadEnv(t)
	sembrarUsuariosPorRol(t, env, []string{"ADMIN"})
	token := calidadToken(t, "usr-rbac-admin", "ADMIN")

	rutas := []struct{ metodo, ruta, cuerpo string }{
		{http.MethodGet, "/api/v2/treatments/rx-cualquiera", ""},
		{http.MethodGet, "/api/v2/pharmacy/inbox", ""},
		{http.MethodGet, "/api/v2/pharmacy/prescriptions/lookup?code=RX-1", ""},
		{http.MethodPost, "/api/v2/pharmacy/dispense", `{}`},
	}
	for _, r := range rutas {
		estado, _ := peticionJSON(t, env, r.metodo, r.ruta, r.cuerpo, token)
		if estado != http.StatusForbidden {
			defectoReproducido(t, "DEF-72", "ADMIN en %s %s obtuvo %d; se esperaba 403 (dato clinico, Ley 1581)", r.metodo, r.ruta, estado)
		}
	}
}

// DEF-99: una solicitud publica y anonima con el documento de un paciente ya registrado (sin correo) escribe el correo
// del solicitante en la ficha real del paciente al agendarla, aunque el nombre y la fecha de nacimiento no coincidan.
// Desde ese momento las citas, recetas y resultados de laboratorio del paciente se envian a ese correo.
func TestDEF99SolicitudPublicaNoAsignaCorreoAPacienteExistenteSinVerificarIdentidad(t *testing.T) {
	requireDefectoAbierto(t, "DEF-99")
	env := newCalidadEnv(t)
	crearMedico(t, env, "med-def99", "Medico DEF99", sedeTulua)
	pacientes := memory.NewPatientMemoryRepo(env.ds)
	pacienteReal := newPatientFixture("pac-def99", "71000099")
	pacienteReal.Email = ""
	if err := pacientes.Create(context.Background(), pacienteReal); err != nil {
		t.Fatal(err)
	}

	// Nombre y fecha de nacimiento distintos de los del paciente real (cuerpoSolicitud usa «Lucía Prado», 1990-05-14)
	estado, _ := enviarSolicitud(t, env, cuerpoSolicitud(sedeTulua, "71000099", "tercero.def99@example.com", true))
	if estado != http.StatusCreated {
		t.Fatalf("preparacion: la solicitud publica respondio %d", estado)
	}
	token := calidadToken(t, "med-def99", "MEDICO")
	solicitudes := bandeja(t, env, token)
	if len(solicitudes) != 1 {
		t.Fatalf("preparacion: se esperaba 1 solicitud en la bandeja, hay %d", len(solicitudes))
	}
	fecha := time.Now().Add(72 * time.Hour).Format(time.RFC3339)
	estado, _ = peticionJSON(t, env, http.MethodPost, "/api/v2/appointment-requests/"+solicitudes[0].ID+"/schedule",
		`{"appointment_date":"`+fecha+`","note":"R4"}`, token)
	if estado != http.StatusOK && estado != http.StatusCreated {
		t.Fatalf("preparacion: agendar respondio %d", estado)
	}
	esperarComprobante(t, env, "med-def99")

	tras, err := pacientes.GetByID(context.Background(), "pac-def99")
	if err != nil {
		t.Fatal(err)
	}
	if tras.Email == "tercero.def99@example.com" {
		defectoReproducido(t, "DEF-99", "la ficha de %s %s quedo con el correo de un solicitante anonimo cuyo nombre no coincide", tras.FirstName, tras.LastName)
	}
}

// DEF-100: la conexion a PostgreSQL se abre con sslmode=disable fijo (adapters/storage/factory.go). Con un servidor
// falso se comprueba el primer mensaje del cliente: con TLS habilitado lib/pq envia SSLRequest (codigo 80877103).
func TestDEF100ConexionABaseDeDatosSolicitaTLS(t *testing.T) {
	requireDefectoAbierto(t, "DEF-100")
	comprobarTLSPostgres(t)
	comprobarTLSMySQL(t)
}

func comprobarTLSPostgres(t *testing.T) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = ln.Close() }()
	_, puerto, _ := net.SplitHostPort(ln.Addr().String())

	terminado := make(chan struct{})
	go func() {
		defer close(terminado)
		_, _ = storage.NewRepositoryBundle(storage.Config{
			Driver: "postgres", Host: "127.0.0.1", Port: puerto, User: "usuario", Password: "clave-de-prueba",
			DBName: "saludconecta", AllowPostgresMemoryModules: true,
		}, logger.New())
	}()

	_ = ln.(*net.TCPListener).SetDeadline(time.Now().Add(10 * time.Second))
	conn, err := ln.Accept()
	if err != nil {
		t.Fatalf("preparacion: el adaptador PostgreSQL no intento conectarse: %v", err)
	}
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
	primero := make([]byte, 8)
	_, err = io.ReadFull(conn, primero)
	_ = conn.Close()
	_ = ln.Close()
	<-esperarCanal(terminado, 15*time.Second)
	if err != nil {
		t.Fatalf("preparacion: no se leyo el primer mensaje del cliente: %v", err)
	}
	if binary.BigEndian.Uint32(primero[4:8]) != 80877103 {
		defectoReproducido(t, "DEF-100", "el cliente PostgreSQL inicio sin SSLRequest (sslmode=disable): datos clinicos en claro hacia la base de datos")
	}
}

// comprobarTLSMySQL (MySQL, motor por defecto): el DSN de adapters/storage/mysql/connection.go no declara tls. Un servidor falso
// anuncia CLIENT_SSL en el saludo; un cliente que exige TLS responde con el indicador CLIENT_SSL (0x800) activo.
func comprobarTLSMySQL(t *testing.T) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = ln.Close() }()
	_, puerto, _ := net.SplitHostPort(ln.Addr().String())

	terminado := make(chan struct{})
	go func() {
		defer close(terminado)
		db, err := mysql.NewConnection(mysql.Config{Host: "127.0.0.1", Port: puerto, User: "usuario", Password: "clave-de-prueba", DBName: "saludconecta"})
		if err == nil {
			_ = db.Close()
		}
	}()

	_ = ln.(*net.TCPListener).SetDeadline(time.Now().Add(10 * time.Second))
	conn, err := ln.Accept()
	if err != nil {
		t.Fatalf("preparacion: el adaptador MySQL no intento conectarse: %v", err)
	}
	_ = conn.SetDeadline(time.Now().Add(5 * time.Second))
	if _, err := conn.Write(saludoMySQLConTLS()); err != nil {
		t.Fatalf("preparacion: no se envio el saludo: %v", err)
	}
	respuesta := make([]byte, 8)
	_, err = io.ReadFull(conn, respuesta)
	_ = conn.Close()
	_ = ln.Close()
	<-esperarCanal(terminado, 15*time.Second)
	if err != nil {
		t.Fatalf("preparacion: no se leyo la respuesta del cliente: %v", err)
	}
	const clientSSL = 0x00000800
	if binary.LittleEndian.Uint32(respuesta[4:8])&clientSSL == 0 {
		defectoReproducido(t, "DEF-100", "el cliente MySQL no pidio TLS aunque el servidor lo ofrece (DSN sin tls)")
	}
}

// saludoMySQLConTLS arma un paquete Handshake v10 minimo que anuncia soporte de TLS (CLIENT_SSL).
func saludoMySQLConTLS() []byte {
	const capacidades = 0x00000001 | 0x00000008 | 0x00000200 | 0x00000800 | 0x00002000 | 0x00008000 | 0x00080000
	var p bytes.Buffer
	p.WriteByte(10)
	p.WriteString("8.0.36\x00")
	_ = binary.Write(&p, binary.LittleEndian, uint32(7))
	p.WriteString("abcdefgh")
	p.WriteByte(0)
	_ = binary.Write(&p, binary.LittleEndian, uint16(capacidades&0xffff))
	p.WriteByte(0x21)
	_ = binary.Write(&p, binary.LittleEndian, uint16(2))
	_ = binary.Write(&p, binary.LittleEndian, uint16(capacidades>>16))
	p.WriteByte(21)
	p.Write(make([]byte, 10))
	p.WriteString("ijklmnopqrst\x00")
	p.WriteString("mysql_native_password\x00")
	cuerpo := p.Bytes()
	cabecera := []byte{byte(len(cuerpo)), byte(len(cuerpo) >> 8), byte(len(cuerpo) >> 16), 0}
	return append(cabecera, cuerpo...)
}

func esperarCanal(c chan struct{}, limite time.Duration) chan struct{} {
	listo := make(chan struct{})
	go func() {
		select {
		case <-c:
		case <-time.After(limite):
		}
		close(listo)
	}()
	return listo
}

// DEF-101: cuando falla el envio SMTP, adapters/email/smtp.go registra el destinatario sin enmascarar, aunque el
// cierre de DEF-62 declara «logs con correo enmascarado».
func TestDEF101EnvioSMTPFallidoNoRegistraCorreoEnClaro(t *testing.T) {
	requireDefectoAbierto(t, "DEF-101")
	cerrado, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	_, puerto, _ := net.SplitHostPort(cerrado.Addr().String())
	_ = cerrado.Close() // puerto sin servidor: el envio falla de inmediato

	original := os.Stdout
	lector, escritor, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = escritor
	registro := logger.New() // captura os.Stdout al construirse
	os.Stdout = original

	svc := email.NewService(email.Config{Host: "127.0.0.1", Port: puerto, Username: "usuario", Password: "clave"}, registro)
	errEnvio := svc.SendWithPDFAttachment("paciente.def101@example.com", "Resultado", "cuerpo", "", nil)
	_ = escritor.Close()
	salida, _ := io.ReadAll(lector)
	if errEnvio == nil {
		t.Fatal("preparacion: se esperaba un error de envio SMTP")
	}
	if strings.Contains(string(salida), "paciente.def101@example.com") {
		defectoReproducido(t, "DEF-101", "el registro del fallo SMTP contiene el correo del paciente sin enmascarar")
	}
}

// H-R4-11: costo de Fiber Immutable (DEF-98) en una ruta con parametro. Informativo: se ejecuta con -bench.
func BenchmarkR4FiberImmutable(b *testing.B) {
	for _, inmutable := range []bool{false, true} {
		nombre := "Immutable=false"
		if inmutable {
			nombre = "Immutable=true"
		}
		b.Run(nombre, func(b *testing.B) {
			app := fiber.New(fiber.Config{Immutable: inmutable})
			app.Get("/sedes/:id", func(c *fiber.Ctx) error { return c.SendString(c.Params("id")) })
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				req, _ := http.NewRequest(http.MethodGet, "/sedes/sede-cartago-hospital-central", nil)
				res, err := app.Test(req, -1)
				if err != nil {
					b.Fatal(err)
				}
				_ = res.Body.Close()
			}
		})
	}
}

// DEF-107: las cuentas privilegiadas que se crean desde el login (Encargado de TI y administrador de sede) aceptan
// contrasenas de 8 caracteres (auth_handler.go, buildPrivilegedUser) y el alta de personal no exige minimo, mientras
// el administrador inicial exige 12 (bootstrap.go) y OWASP ASVS 4.0.3 V2.1.1 pide al menos 12.
func TestDEF107CuentaPrivilegiadaExigeContrasenaDeDoceCaracteres(t *testing.T) {
	requireDefectoAbierto(t, "DEF-107")
	env := newCalidadEnv(t)
	cuerpo := `{"full_name":"Admin Sede Corta","document_number":"1000000107","email":"corta.def107@example.com",` +
		`"password":"Abc12345","branch":"Sede Tuluá - Ambulatoria"}`
	estado, _ := peticionJSON(t, env, http.MethodPost, "/api/v1/auth/register-branch-admin", cuerpo, "")
	if estado == http.StatusCreated {
		defectoReproducido(t, "DEF-107", "register-branch-admin acepto una contrasena de 8 caracteres para una cuenta ADMIN")
	}

	// El alta de personal asistencial por el administrador no exige longitud minima (auth_handler.go, RegisterStaff)
	sembrarUsuariosPorRol(t, env, []string{"ADMIN"})
	estado, _ = peticionJSON(t, env, http.MethodPost, "/api/v1/admin/users",
		`{"role_id":2,"full_name":"Medico Clave Corta","email":"corta2.def107@example.com","password":"x","professional_card":"RM-107"}`,
		calidadToken(t, "usr-rbac-admin", "ADMIN"))
	if estado == http.StatusCreated {
		defectoReproducido(t, "DEF-107", "el alta de personal acepto una contrasena de 1 caracter")
	}
}

// DEF-50 (reabierto en R4): el cierre exigio sesion en GET /api/v1/auth/mfa-seed, pero cualquier usuario autenticado
// sigue obteniendo la semilla TOTP de OTRA cuenta indicando su correo. Con la semilla y la contrasena se anula el
// segundo factor de un administrador o del Encargado de TI.
func TestDEF50R4SemillaMFASoloDelPropioUsuario(t *testing.T) {
	requireDefectoAbierto(t, "DEF-50")
	env := newCalidadEnv(t)
	sembrarUsuariosPorRol(t, env, []string{"ADMIN", "ENFERMERO"})
	semilla := "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"
	usuarios := memory.NewUserMemoryRepo(env.ds)
	admin, err := usuarios.GetByID(context.Background(), "usr-rbac-admin")
	if err != nil {
		t.Fatal(err)
	}
	if err := usuarios.UpdateMFA(context.Background(), admin.ID, semilla, true); err != nil {
		t.Fatalf("preparacion: %v", err)
	}
	token := calidadToken(t, "usr-rbac-enfermero", "ENFERMERO")
	estado, out := peticionJSON(t, env, http.MethodGet, "/api/v1/auth/mfa-seed?email="+admin.Email, "", token)
	if estado == http.StatusOK && out["secret"] == semilla {
		defectoReproducido(t, "DEF-50", "un ENFERMERO obtuvo la semilla TOTP del ADMIN %s", admin.Email)
	}
}

// DEF-110 (H-R4-21, mutacion M6): ninguna prueba del equipo usaba Glasgow 8, la frontera del Nivel I. Cambiar
// `GlasgowScore <= 8` por `< 8` en SuggestManchesterPriority no hacia fallar nada. Regresion permanente de Calidad.
func TestR4GlasgowOchoEsNivelI(t *testing.T) {
	casos := []struct {
		glasgow  int
		esperado domain.ManchesterLevel
	}{
		{8, domain.ManchesterLevelI},
		{9, domain.ManchesterLevelII},
	}
	for _, c := range casos {
		tr := &domain.TriageRecord{SystolicBP: 120, DiastolicBP: 80, HeartRate: 75, RespiratoryRate: 16,
			OxygenSaturation: 98, BodyTemperature: 36.8, GlasgowScore: c.glasgow}
		if got := tr.SuggestManchesterPriority(); got != c.esperado {
			t.Errorf("Glasgow %d: nivel %v, se esperaba %v", c.glasgow, got, c.esperado)
		}
	}
}
