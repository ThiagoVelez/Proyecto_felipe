package backend_test

import (
	"context"
	"sync"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// TestDEF46CatalogoNoExponePunteroInterno comprueba de forma determinista la causa de la carrera:
// modificar el medicamento devuelto no debe alterar el inventario almacenado.
func TestDEF46CatalogoNoExponePunteroInterno(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	ds.SeedMedication(&domain.MedicationCatalog{ID: 461, CommercialName: "Acetaminofen 500 mg", ActiveIngredient: "ACETAMINOFEN", StockQuantity: 10})
	repo := memory.NewPrescriptionMemoryRepo(ds)

	med, err := repo.GetMedicationByID(ctx, 461)
	if err != nil {
		t.Fatal(err)
	}
	med.StockQuantity = 0

	otra, _ := repo.GetMedicationByID(ctx, 461)
	if otra.StockQuantity != 10 {
		t.Fatalf("El inventario almacenado cambio a %d al modificar la copia devuelta; se esperaba 10", otra.StockQuantity)
	}
}

// TestDEF46PrescripcionesConcurrentesSinCarrera reproduce bajo -race el escenario detectado en CI:
// emitir prescripciones mientras otra goroutine descuenta inventario del mismo medicamento.
func TestDEF46PrescripcionesConcurrentesSinCarrera(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	sembrarPacienteYFolio(t, ds, "p-def46", "cr-def46", medicoSemillaID)
	ds.SeedMedication(&domain.MedicationCatalog{ID: 462, CommercialName: "Omeprazol 20 mg", ActiveIngredient: "OMEPRAZOL", StockQuantity: 1000})
	svc := services.NewPrescriptionService(memory.NewPrescriptionMemoryRepo(ds), memory.NewClinicalRecordMemoryRepo(ds), memory.NewPatientMemoryRepo(ds))

	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			p, err := svc.IssuePrescription(ctx, &domain.Prescription{ClinicalRecordID: "cr-def46", PatientID: "p-def46", DoctorID: medicoSemillaID,
				Items: []domain.PrescriptionItem{{MedicationID: 462, TotalQuantity: 1}}})
			if err != nil {
				t.Errorf("Prescripcion rechazada: %v", err)
				return
			}
			_ = p.Items[0].Medication.StockQuantity
		}()
	}
	wg.Wait()
}
