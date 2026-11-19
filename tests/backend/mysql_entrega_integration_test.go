//go:build integration

package backend_test

// Pruebas contra MySQL real de los cambios de la Entrega Final v2. Se ejecutan igual que mysql_integration_test.go:
//
//	MYSQL_TEST_HOST=127.0.0.1 MYSQL_TEST_PORT=3306 MYSQL_TEST_USER=root MYSQL_TEST_PASSWORD=... MYSQL_TEST_DB=saludconecta_db \
//	  go test -tags integration -run TestMySQL ./...

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/adapters/storage/mysql"
	"saludconecta-backend/core/domain"
)

func conexionMySQLPrueba(t *testing.T) *sql.DB {
	t.Helper()
	host := os.Getenv("MYSQL_TEST_HOST")
	if host == "" {
		t.Skip("MYSQL_TEST_HOST no definido")
	}
	db, err := mysql.NewConnection(mysql.Config{
		Host: host, Port: os.Getenv("MYSQL_TEST_PORT"), User: os.Getenv("MYSQL_TEST_USER"),
		Password: os.Getenv("MYSQL_TEST_PASSWORD"), DBName: os.Getenv("MYSQL_TEST_DB"),
	})
	if err != nil {
		t.Fatalf("conexion: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	if _, err := mysql.Migrate(db); err != nil {
		t.Fatalf("migracion: %v", err)
	}
	return db
}

// La fecha de vencimiento del inventario se leia como texto y con parseTime=true salia 0001-01-01.
func TestMySQLInventarioConservaFechaDeVencimiento(t *testing.T) {
	db := conexionMySQLPrueba(t)
	repo := mysql.NewInventoryRepository(db)
	ctx := context.Background()

	items, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("la migracion debe sembrar el inventario inicial")
	}
	for _, it := range items {
		if it.ExpiryDate.Year() < 2026 {
			t.Fatalf("%s %s: vencimiento %s; se esperaba la fecha sembrada", it.GenericName, it.Dosage, it.ExpiryDate.Format("2006-01-02"))
		}
	}
	uno, err := repo.GetByID(ctx, items[0].ID)
	if err != nil || !uno.ExpiryDate.Equal(items[0].ExpiryDate) {
		t.Fatalf("GetByID: vencimiento %v (%v)", uno, err)
	}
}

// Ciclo completo de una solicitud de primera cita en la tabla appointment_requests.
func TestMySQLSolicitudesDeCitaPersisten(t *testing.T) {
	db := conexionMySQLPrueba(t)
	ctx := context.Background()
	users := mysql.NewUserRepository(db)
	repo := mysql.NewAppointmentRequestRepository(db)

	medico := newDoctorFixture(uuid.New().String(), "RM-INT-"+uuid.New().String()[:6])
	medico.Email = "medico-" + medico.ID[:8] + "@ips.example"
	medico.PasswordHash = "$2a$12$abcdefghijklmnopqrstuuv0123456789abcdefghijklmnopqrstu"
	medico.Branch = "Sede Tuluá - Ambulatoria"
	if err := users.Create(ctx, medico); err != nil {
		t.Fatalf("crear medico: %v", err)
	}

	ahora := time.Now().UTC().Truncate(time.Second)
	req := &domain.AppointmentRequest{
		ID: uuid.New().String(), Code: "SOL-" + uuid.New().String()[:6], Branch: medico.Branch, DoctorID: medico.ID,
		DocumentType: domain.DocCC, DocumentNumber: "1094000777", FirstName: "Lucía", LastName: "Prado",
		BirthDate: time.Date(1990, 5, 14, 0, 0, 0, 0, time.UTC), Gender: domain.GenderOther, BloodType: "O+",
		EPSName: "Nueva EPS", Phone: "3001234567", Email: "lucia@correo.example", Observations: "Dolor de cabeza",
		ConsentAt: ahora, Status: domain.RequestPending, CreatedAt: ahora, UpdatedAt: ahora,
	}
	if err := repo.Create(ctx, req); err != nil {
		t.Fatalf("crear solicitud: %v", err)
	}
	if n, err := repo.CountPendingByDoctor(ctx, medico.ID); err != nil || n != 1 {
		t.Fatalf("pendientes: %d (%v)", n, err)
	}
	leida, err := repo.GetByID(ctx, req.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if leida.FirstName != "Lucía" || leida.Gender != domain.GenderOther || leida.DoctorName != medico.FullName ||
		leida.BirthDate.Format("2006-01-02") != "1990-05-14" {
		t.Fatalf("datos leidos: %+v", leida)
	}

	leida.Status = domain.RequestRejected
	leida.ResponseNote = "Debe acudir a urgencias"
	leida.UpdatedAt = time.Now().UTC()
	if err := repo.Update(ctx, leida); err != nil {
		t.Fatalf("actualizar: %v", err)
	}
	rechazadas, err := repo.ListByDoctor(ctx, medico.ID, domain.RequestRejected)
	if err != nil || len(rechazadas) != 1 || rechazadas[0].ResponseNote != "Debe acudir a urgencias" {
		t.Fatalf("listar rechazadas: %+v (%v)", rechazadas, err)
	}
	if pendientes, _ := repo.ListByDoctor(ctx, medico.ID, domain.RequestPending); len(pendientes) != 0 {
		t.Fatalf("no deben quedar pendientes: %d", len(pendientes))
	}
}

func TestMySQLLaboratorioEnfermeriaYSedes(t *testing.T) {
	db := conexionMySQLPrueba(t)
	ctx := context.Background()

	// Sedes sembradas por la migracion, con coordenadas opcionales
	branches := mysql.NewBranchRepository(db)
	lista, err := branches.List(ctx)
	if err != nil || len(lista) < 4 {
		t.Fatalf("sedes sembradas: %d (%v)", len(lista), err)
	}
	var conUbicacion, sinUbicacion int
	for _, b := range lista {
		if b.HasLocation() {
			conUbicacion++
		} else {
			sinUbicacion++
		}
	}
	if conUbicacion < 3 || sinUbicacion < 1 {
		t.Fatalf("coordenadas: %d con ubicacion y %d sin ubicacion", conUbicacion, sinUbicacion)
	}
	lat, lng := 4.41, -76.15
	nueva := &domain.Branch{ID: "br-int-" + uuid.New().String()[:6], Name: "Sede Integración " + uuid.New().String()[:6], Status: "Operativo",
		Latitude: &lat, Longitude: &lng, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
	if err := branches.Create(ctx, nueva); err != nil {
		t.Fatalf("crear sede: %v", err)
	}
	if err := branches.Create(ctx, &domain.Branch{ID: "br-dup-" + uuid.New().String()[:6], Name: nueva.Name, CreatedAt: time.Now(), UpdatedAt: time.Now()}); err != domain.ErrBranchNameTaken {
		t.Fatalf("nombre duplicado: %v", err)
	}
	nueva.Status = "En Espera"
	if err := branches.Update(ctx, nueva); err != nil {
		t.Fatalf("actualizar sede: %v", err)
	}
	if err := branches.Delete(ctx, nueva.ID); err != nil {
		t.Fatalf("eliminar sede: %v", err)
	}

	// Ordenes de laboratorio con identificador consecutivo
	labs := mysql.NewLabOrderRepository(db)
	ahora := time.Now().UTC().Truncate(time.Second)
	nuevaOrden := func() *domain.LabOrder {
		return &domain.LabOrder{PatientName: "Pedro Paz", PatientDocument: "55001", PatientDocumentType: "CC", TestType: "Hemograma",
			SampleType: "EDTA", Priority: "URGENTE", Status: domain.LabPending, Observations: "x", OrderingDoctor: "Dr. Externo",
			CreatedAt: ahora, UpdatedAt: ahora}
	}
	o1, o2 := nuevaOrden(), nuevaOrden()
	if err := labs.CreateWithNextID(ctx, o1); err != nil {
		t.Fatalf("crear orden: %v", err)
	}
	if err := labs.CreateWithNextID(ctx, o2); err != nil {
		t.Fatalf("crear segunda orden: %v", err)
	}
	if o1.ID == o2.ID {
		t.Fatalf("ids repetidos: %s", o1.ID)
	}
	validada := time.Now().UTC().Truncate(time.Second)
	o1.Status, o1.Results, o1.ValidatedAt, o1.ValidatedBy = domain.LabCompleted, "HB: 14 g/dL", &validada, "Bact. Ana"
	if err := labs.Update(ctx, o1); err != nil {
		t.Fatalf("sellar: %v", err)
	}
	leida, err := labs.GetByID(ctx, o1.ID)
	if err != nil || leida.Status != domain.LabCompleted || leida.ValidatedAt == nil || !leida.ValidatedAt.Equal(validada) {
		t.Fatalf("orden sellada: %+v (%v)", leida, err)
	}
	if completas, _ := labs.List(ctx, "", domain.LabCompleted); len(completas) == 0 {
		t.Fatal("listar por estado")
	}

	// Registro de enfermeria con JSON
	care := mysql.NewNursingRepository(db)
	paciente := "p-int-" + uuid.New().String()[:8]
	hora, quien := "10:30", "Enf. Luisa"
	registro := &domain.NursingCare{PatientID: paciente, Order: []byte(`{"unique_code":"RX-1"}`),
		Duties:    []domain.NursingDuty{{ID: "id-verify", Category: "SEGURIDAD", Label: "Verificar", Completed: true, CompletedAt: &hora, CompletedBy: &quien}},
		Notes:     []domain.NursingNote{{ID: "n1", Content: "Paciente estable", Author: quien, CreatedAt: ahora}},
		UpdatedAt: ahora, UpdatedBy: quien}
	if err := care.Save(ctx, registro); err != nil {
		t.Fatalf("guardar enfermeria: %v", err)
	}
	registro.Notes = append([]domain.NursingNote{{ID: "n2", Content: "Segunda nota", CreatedAt: ahora}}, registro.Notes...)
	if err := care.Save(ctx, registro); err != nil {
		t.Fatalf("actualizar enfermeria: %v", err)
	}
	leido, err := care.Get(ctx, paciente)
	if err != nil || len(leido.Notes) != 2 || *leido.Duties[0].CompletedBy != "Enf. Luisa" || string(leido.Order) != `{"unique_code":"RX-1"}` {
		t.Fatalf("registro de enfermeria: %+v (%v)", leido, err)
	}
}
