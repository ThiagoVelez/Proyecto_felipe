package backend_test

// Pruebas de la revision de calidad R3 (10 nov 2026) sobre los modulos nuevos.
// Las que llevan requireDefectoAbierto reproducen defectos abiertos (docs/calidad/defectos-abiertos.txt);
// las demas son regresiones permanentes que confirman reglas que si se cumplen.

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	"saludconecta-backend/adapters/email"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/pdf"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/config"
	"saludconecta-backend/pkg/logger"
)

// servicioCitasR3 monta el servicio de citas sobre memoria. El PDF se genera en una goroutine que puede
// terminar despues de la prueba, por eso el directorio temporal se borra con margen.
func servicioCitasR3(t *testing.T) (*memory.DataStore, ports.AppointmentService) {
	t.Helper()
	ds := memory.NewDataStore()
	sembrarMedicoSemilla(t, memory.NewUserMemoryRepo(ds))
	dir, err := os.MkdirTemp("", "calidad-r3-citas-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { time.Sleep(300 * time.Millisecond); _ = os.RemoveAll(dir) })
	log := logger.New()
	svc := services.NewAppointmentService(memory.NewAppointmentMemoryRepo(ds), memory.NewPatientMemoryRepo(ds),
		memory.NewUserMemoryRepo(ds), pdf.NewGenerator(dir), email.NewService(email.Config{}, log), log)
	return ds, svc
}

// appCitasR3 expone solo el handler real de creacion de citas, con el medico semilla como usuario autenticado.
func appCitasR3(svc ports.AppointmentService) *fiber.App {
	app := fiber.New()
	h := handlers.NewAppointmentHandler(svc)
	app.Post("/citas", func(c *fiber.Ctx) error {
		c.Locals("user_id", medicoSemillaID)
		return c.Next()
	}, h.Create)
	return app
}

// La regla de 20 minutos se verifica en sus bordes: 19 min solapa; 20 y 21 min no solapan.
func TestR3CitaSolapamientoEnLosBordesDe20Minutos(t *testing.T) {
	ds, svc := servicioCitasR3(t)
	ctx := context.Background()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-r3-citas", "DOC-R3-CITAS"))
	base := time.Now().UTC().Add(48 * time.Hour).Truncate(time.Minute)
	if _, err := svc.ScheduleAppointment(ctx, &domain.Appointment{DoctorID: medicoSemillaID, PatientID: "p-r3-citas", AppointmentDate: base}); err != nil {
		t.Fatalf("No se pudo crear la cita base: %v", err)
	}
	casos := []struct {
		minutos  int
		solapada bool
	}{{19, true}, {-19, true}, {20, false}, {-20, false}, {21, false}}
	for _, c := range casos {
		// Cada caso usa un almacen nuevo con la misma cita base para que los casos no interfieran.
		dsCaso, svcCaso := servicioCitasR3(t)
		_ = memory.NewPatientMemoryRepo(dsCaso).Create(ctx, newPatientFixture("p-r3-citas", "DOC-R3-CITAS"))
		if _, err := svcCaso.ScheduleAppointment(ctx, &domain.Appointment{DoctorID: medicoSemillaID, PatientID: "p-r3-citas", AppointmentDate: base}); err != nil {
			t.Fatal(err)
		}
		_, err := svcCaso.ScheduleAppointment(ctx, &domain.Appointment{DoctorID: medicoSemillaID, PatientID: "p-r3-citas", AppointmentDate: base.Add(time.Duration(c.minutos) * time.Minute)})
		if got := errors.Is(err, domain.ErrDoctorScheduleOverlap); got != c.solapada {
			t.Errorf("Cita a %+d min: solapamiento=%v, se esperaba %v (err=%v)", c.minutos, got, c.solapada, err)
		}
	}
}

// El rechazo de fechas pasadas ocurre en el servidor, no solo en el atributo min del formulario.
func TestR3CitaEnElPasadoSeRechazaEnElServidor(t *testing.T) {
	ds, svc := servicioCitasR3(t)
	ctx := context.Background()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-r3-pasado", "DOC-R3-PASADO"))
	_, err := svc.ScheduleAppointment(ctx, &domain.Appointment{DoctorID: medicoSemillaID, PatientID: "p-r3-pasado", AppointmentDate: time.Now().UTC().Add(-1 * time.Hour)})
	if !errors.Is(err, domain.ErrAppointmentInPast) {
		t.Fatalf("Una cita de hace una hora no se rechazo con ErrAppointmentInPast: %v", err)
	}
}

// DEF-85: el formulario envia la hora local de Colombia (datetime-local, sin zona) y el handler la
// interpreta como UTC, por lo que la cita queda 5 horas antes de lo que eligio el medico.
func TestDEF85CitaConservaLaHoraLocalDeColombia(t *testing.T) {
	requireDefectoAbierto(t, "DEF-85")
	ds, svc := servicioCitasR3(t)
	_ = memory.NewPatientMemoryRepo(ds).Create(context.Background(), newPatientFixture("p-def85", "DOC-85"))
	bogota := time.FixedZone("America/Bogota", -5*60*60)
	elegida := time.Now().In(bogota).AddDate(0, 0, 7).Truncate(time.Hour)
	cuerpo := `{"patient_id":"p-def85","appointment_date":"` + elegida.Format("2006-01-02T15:04") + `"}`
	req := httptest.NewRequest(http.MethodPost, "/citas", strings.NewReader(cuerpo))
	req.Header.Set("Content-Type", "application/json")
	res, err := appCitasR3(svc).Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out struct {
		Appointment domain.Appointment `json:"appointment"`
	}
	_ = json.NewDecoder(res.Body).Decode(&out)
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("Estado %d al agendar la cita", res.StatusCode)
	}
	if !out.Appointment.AppointmentDate.Equal(elegida) {
		defectoReproducido(t, "DEF-85", "Hora elegida %s (Colombia); guardada %s, es decir %s en Colombia",
			elegida.Format("2006-01-02 15:04"), out.Appointment.AppointmentDate.UTC().Format(time.RFC3339),
			out.Appointment.AppointmentDate.In(bogota).Format("2006-01-02 15:04"))
	}
}

// DEF-88: se agenda una cita para un paciente que no existe; el servicio ignora el error de busqueda.
func TestDEF88CitaExigePacienteExistente(t *testing.T) {
	requireDefectoAbierto(t, "DEF-88")
	_, svc := servicioCitasR3(t)
	cita, err := svc.ScheduleAppointment(context.Background(), &domain.Appointment{DoctorID: medicoSemillaID, PatientID: "paciente-inexistente-def88", AppointmentDate: time.Now().UTC().Add(72 * time.Hour)})
	if err == nil {
		defectoReproducido(t, "DEF-88", "Cita %s creada para un paciente inexistente (nombre del paciente: %q)", cita.ID, cita.PatientName)
	}
}

// DEF-87: el limite de 120 s se aplica sobre la duracion que declara el cliente; el servidor no la
// verifica y acepta valores negativos y contenido que no es video.
func TestDEF87MuroNoConfiaEnLaDuracionDeclaradaPorElCliente(t *testing.T) {
	requireDefectoAbierto(t, "DEF-87")
	svc := services.NewHealthEducationService(memory.NewHealthEducationMemoryRepo(memory.NewDataStore()))
	autor := newDoctorFixture("usr-def87", "RM-87")
	post, err := svc.CreatePost(context.Background(), autor, &domain.HealthEducationPost{
		Title: "Video educativo", Category: domain.CategoryConsejos, Content: "Contenido",
		VideoURL: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==", VideoDurationSec: -30,
	})
	if err == nil {
		defectoReproducido(t, "DEF-87", "Publicacion %s aceptada con duracion declarada -30 s y un video_url de tipo text/html", post.ID)
	}
}

// Notas anatomicas: solo el autor edita y borra (anti-IDOR) y un folio cerrado bloquea la edicion.
func TestR3NotaAnatomicaSoloLaModificaSuAutorYNoTrasElCierre(t *testing.T) {
	ds := memory.NewDataStore()
	ctx := context.Background()
	users := memory.NewUserMemoryRepo(ds)
	sembrarMedicoSemilla(t, users)
	otro := newDoctorFixture("usr-r3-otro", "RM-R3-OTRO")
	if err := users.Create(ctx, otro); err != nil {
		t.Fatal(err)
	}
	sembrarPacienteYFolio(t, ds, "p-r3-notas", "f-r3-notas", medicoSemillaID)
	svc := services.NewClinicalRecordService(memory.NewClinicalRecordMemoryRepo(ds), memory.NewPatientMemoryRepo(ds), users)
	folio := "f-r3-notas"
	nota, err := svc.AddAnatomicalNote(ctx, &domain.ClinicalAnatomicalNote{ClinicalRecordID: &folio, PatientID: "p-r3-notas", DoctorID: medicoSemillaID, StructureKey: "torax", PainLevel: 5, DoctorObservation: "Dolor"})
	if err != nil {
		t.Fatalf("No se pudo crear la nota: %v", err)
	}
	if _, err := svc.UpdateAnatomicalNote(ctx, &domain.ClinicalAnatomicalNote{ID: nota.ID, DoctorID: otro.ID, PainLevel: 1}); !errors.Is(err, domain.ErrNotRecordOwner) {
		t.Errorf("Otro medico edito la nota: err=%v", err)
	}
	if err := svc.DeleteAnatomicalNote(ctx, nota.ID, otro.ID); !errors.Is(err, domain.ErrNotRecordOwner) {
		t.Errorf("Otro medico borro la nota: err=%v", err)
	}
	if _, err := svc.CloseAndSign(ctx, folio, medicoSemillaID, "firma"); err != nil {
		t.Fatalf("No se pudo cerrar el folio: %v", err)
	}
	if _, err := svc.UpdateAnatomicalNote(ctx, &domain.ClinicalAnatomicalNote{ID: nota.ID, DoctorID: medicoSemillaID, PainLevel: 1}); !errors.Is(err, domain.ErrRecordAlreadyClosed) {
		t.Errorf("Se edito una nota de un folio cerrado: err=%v", err)
	}
	if err := svc.DeleteAnatomicalNote(ctx, nota.ID, medicoSemillaID); !errors.Is(err, domain.ErrRecordAlreadyClosed) {
		t.Errorf("Se borro una nota de un folio cerrado: err=%v", err)
	}
}

// DEF-89: la EVA de una nota anatomica no se valida (-1 y 11 se aceptan); 0 y 10 son validos.
func TestDEF89NotaAnatomicaRechazaEVAFueraDeRango(t *testing.T) {
	requireDefectoAbierto(t, "DEF-89")
	ds := memory.NewDataStore()
	ctx := context.Background()
	sembrarPacienteYFolio(t, ds, "p-def89", "f-def89", medicoSemillaID)
	svc := services.NewClinicalRecordService(memory.NewClinicalRecordMemoryRepo(ds), memory.NewPatientMemoryRepo(ds), memory.NewUserMemoryRepo(ds))
	folio := "f-def89"
	var aceptados []int
	for _, eva := range []int{-1, 11} {
		if _, err := svc.AddAnatomicalNote(ctx, &domain.ClinicalAnatomicalNote{ClinicalRecordID: &folio, PatientID: "p-def89", DoctorID: medicoSemillaID, StructureKey: "torax", PainLevel: eva, CoordinatesX: -5000, CoordinatesY: 99999}); err == nil {
			aceptados = append(aceptados, eva)
		}
	}
	if len(aceptados) > 0 {
		defectoReproducido(t, "DEF-89", "Notas anatomicas aceptadas con EVA %v y coordenadas (-5000, 99999)", aceptados)
	}
}

// Farmacia: veinte dispensaciones simultaneas de la misma receta producen exactamente una entrega y
// un unico descuento de stock (ejecutar con -race en CI para descartar carreras de datos).
func TestR3DispensacionConcurrenteEntregaUnaSolaVez(t *testing.T) {
	ds, treat, pharm := entornoV2(t)
	ctx := context.Background()
	_ = memory.NewPatientMemoryRepo(ds).Create(ctx, newPatientFixture("p-r3-farm", "DOC-R3-FARM"))
	inv := memory.NewInventoryMemoryRepo(ds)
	antes, err := inv.GetByID(ctx, "inv-aceta-500")
	if err != nil {
		t.Fatal(err)
	}
	stockAntes := antes.StockQuantity
	presc, err := treat.DispatchTreatment(ctx, recetaV2("p-r3-farm", domain.PrescriptionItemV2{InventoryItemID: "inv-aceta-500", MedicationName: "Acetaminofen", Dosage: "500 mg", QuantityPrescribed: 3}))
	if err != nil {
		t.Fatalf("No se pudo emitir la receta: %v", err)
	}
	var exitos int32
	var wg sync.WaitGroup
	inicio := make(chan struct{})
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-inicio
			if _, err := pharm.DispensePrescription(ctx, domain.DispenseRequestDTO{PrescriptionID: presc.ID, PatientDocument: "DOC-R3-FARM"}); err == nil {
				atomic.AddInt32(&exitos, 1)
			}
		}()
	}
	close(inicio)
	wg.Wait()
	despues, _ := inv.GetByID(ctx, "inv-aceta-500")
	if exitos != 1 || despues.StockQuantity != stockAntes-3 || despues.StockQuantity < 0 {
		t.Fatalf("Dispensaciones exitosas %d (esperada 1); stock %d -> %d (esperado %d)", exitos, stockAntes, despues.StockQuantity, stockAntes-3)
	}
}

// DEF-63 (ampliado en R3): el README publica `defina_un_secreto_aleatorio_de_32_o_mas` como ejemplo de JWT_SECRET;
// con 39 caracteres superaba la validacion de longitud y se aceptaba como secreto real.
func TestDEF63EjemploDelREADMENoEsSecretoValido(t *testing.T) {
	if err := config.ValidateJWTSecret("defina_un_secreto_aleatorio_de_32_o_mas"); err == nil {
		t.Fatal("El valor de ejemplo publicado en el README se acepta como JWT_SECRET")
	}
}
