//go:build integration

package backend_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
)

// probarRecetaSinStockSeRevierte emite una receta con dos medicamentos donde el segundo no alcanza: no debe quedar
// la receta ni el descuento del primero (DEF-38).
func probarRecetaSinStockSeRevierte(t *testing.T, db *sql.DB, users ports.UserRepository, patients ports.PatientRepository,
	records ports.ClinicalRecordRepository, presc ports.PrescriptionRepository) {
	t.Helper()
	ctx := context.Background()
	medico := newDoctorFixture(uuid.New().String(), "RM-S-"+uuid.New().String()[:6])
	medico.Email = "medico-" + medico.ID[:8] + "@ips.example"
	medico.PasswordHash = "$2a$12$abcdefghijklmnopqrstuuv0123456789abcdefghijklmnopqrstu"
	if err := users.Create(ctx, medico); err != nil {
		t.Fatal(err)
	}
	paciente := newPatientFixture(uuid.New().String(), fmt.Sprintf("50%08d", time.Now().UnixNano()%100000000))
	if err := patients.Create(ctx, paciente); err != nil {
		t.Fatal(err)
	}
	clinical := services.NewClinicalRecordService(records, patients, users)
	folio, err := clinical.CreateDraft(ctx, &domain.ClinicalRecord{PatientID: paciente.ID, DoctorID: medico.ID,
		Anamnesis: "a", PhysicalExam: "e", CIE11Code: "1D01", DiagnosisDescription: "d", TreatmentPlan: "t"})
	if err != nil {
		t.Fatal(err)
	}

	var ids [2]int
	var stocks [2]int
	rows, err := db.QueryContext(ctx, "SELECT id, stock_quantity FROM medications_catalog WHERE stock_quantity > 0 ORDER BY id LIMIT 2")
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; rows.Next() && i < 2; i++ {
		if err := rows.Scan(&ids[i], &stocks[i]); err != nil {
			t.Fatal(err)
		}
	}
	rows.Close()
	if ids[1] == 0 {
		t.Skip("el catalogo sembrado no tiene dos medicamentos con stock")
	}

	svc := services.NewPrescriptionService(presc, records, patients)
	_, err = svc.IssuePrescription(ctx, &domain.Prescription{ClinicalRecordID: folio.ID, PatientID: paciente.ID, DoctorID: medico.ID,
		Items: []domain.PrescriptionItem{
			{MedicationID: ids[0], Dosage: "1", FrequencyHours: 8, DurationDays: 1, TotalQuantity: 1},
			{MedicationID: ids[1], Dosage: "1", FrequencyHours: 8, DurationDays: 1, TotalQuantity: stocks[1] + 1},
		}})
	if !errors.Is(err, domain.ErrInsufficientMedicationStock) {
		t.Fatalf("se esperaba stock insuficiente: %v", err)
	}
	if _, err := presc.GetByClinicalRecordID(ctx, folio.ID); err == nil {
		t.Fatal("la receta rechazada quedo guardada")
	}
	med, _ := presc.GetMedicationByID(ctx, ids[0])
	if med.StockQuantity != stocks[0] {
		t.Fatalf("el primer medicamento quedo descontado: %d -> %d", stocks[0], med.StockQuantity)
	}
}
