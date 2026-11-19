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
