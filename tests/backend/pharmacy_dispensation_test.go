package backend_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/logger"
)

func TestPharmacyDispensation_DeductsExactStock(t *testing.T) {
	ds := memory.NewDataStore()
	invRepo := memory.NewInventoryMemoryRepo(ds)
	prescRepo := memory.NewPrescriptionV2MemoryRepo(ds)
	log := logger.New()

	pharmSvc := services.NewPharmacyService(invRepo, prescRepo, memory.NewPharmacyReportMemoryRepo(ds), log)

	// Verificar stock inicial de Amoxicilina 500mg (sembrado con 200 unds)
	medID := "inv-amox-500"
	itemBefore, err := invRepo.GetByID(context.Background(), medID)
	if err != nil {
		t.Fatalf("no se encontro item de inventario sembrado: %v", err)
	}
	initialStock := itemBefore.StockQuantity

	prescribedQty := 21
	presc := &domain.PrescriptionV2{
		ID:              "rx-test-01",
		UniqueCode:      "RX-2026-12345",
		PatientID:       "pat-01",
		PatientDocument: "1144098231",
		PatientName:     "Marta Lucía Gomez",
		PatientEPS:      "Nueva EPS",
		CoverageType:    domain.CoverageEPSPBS100,
		Status:          domain.PrescriptionStatusPending,
		CreatedAt:       time.Now().UTC(),
		Items: []domain.PrescriptionItemV2{
			{
				ID:                 "rx-item-01",
				PrescriptionID:     "rx-test-01",
				InventoryItemID:    medID,
				MedicationName:     "Amoxicilina 500mg",
				Dosage:             "500 mg",
				QuantityPrescribed: prescribedQty,
				UnitPrice:          1200.00,
				TotalItemPrice:     float64(prescribedQty) * 1200.00,
			},
		},
	}
	if err := prescRepo.CreateWithItemsTx(context.Background(), presc); err != nil {
		t.Fatalf("error creando prescripcion de prueba: %v", err)
	}

	// Dispensar usando la cédula escaneada
	req := domain.DispenseRequestDTO{
		PrescriptionID:  presc.ID,
		PatientDocument: "1144098231",
		CoverageType:    string(domain.CoverageEPSPBS100),
		PaymentMethod:   string(domain.PaymentEPSDirect),
		DispensedByID:   "pharm-user-01",
	}

	dispensed, err := pharmSvc.DispensePrescription(context.Background(), req)
	if err != nil {
		t.Fatalf("error dispensando receta valida: %v", err)
	}
	if dispensed.Status != domain.PrescriptionStatusDispensed {
		t.Errorf("estado esperado DISPENSED, obtenido %s", dispensed.Status)
	}
	if dispensed.DispensedAt == nil {
		t.Errorf("se esperaba timestamp en dispensed_at")
	}

	// Verificar deducción exacta en stock
	itemAfter, err := invRepo.GetByID(context.Background(), medID)
	if err != nil {
		t.Fatalf("error consultando stock posterior: %v", err)
	}

	expectedStock := initialStock - prescribedQty
	if itemAfter.StockQuantity != expectedStock {
		t.Errorf("stock esperado %d, encontrado %d", expectedStock, itemAfter.StockQuantity)
	}
}

func TestPharmacyDispensation_RejectsAlreadyDispensedWithConflict(t *testing.T) {
	ds := memory.NewDataStore()
	invRepo := memory.NewInventoryMemoryRepo(ds)
	prescRepo := memory.NewPrescriptionV2MemoryRepo(ds)
	log := logger.New()

	pharmSvc := services.NewPharmacyService(invRepo, prescRepo, memory.NewPharmacyReportMemoryRepo(ds), log)

	presc := &domain.PrescriptionV2{
		ID:              "rx-test-02",
		UniqueCode:      "RX-2026-99999",
		PatientID:       "pat-02",
		PatientDocument: "1098765432",
		PatientName:     "Andres Felipe Mejia",
		PatientEPS:      "Sura",
		CoverageType:    domain.CoverageEPSPBS100,
		Status:          domain.PrescriptionStatusPending,
		CreatedAt:       time.Now().UTC(),
		Items: []domain.PrescriptionItemV2{
			{
				ID:                 "rx-item-02",
				PrescriptionID:     "rx-test-02",
				InventoryItemID:    "inv-ibup-400",
				MedicationName:     "Ibuprofeno 400mg",
				Dosage:             "400 mg",
				QuantityPrescribed: 10,
				UnitPrice:          650.00,
				TotalItemPrice:     6500.00,
			},
		},
	}
	_ = prescRepo.CreateWithItemsTx(context.Background(), presc)

	// Primer despacho exitoso
	req := domain.DispenseRequestDTO{
		PrescriptionID:  presc.ID,
		PatientDocument: "1098765432",
		CoverageType:    string(domain.CoverageEPSPBS100),
		PaymentMethod:   string(domain.PaymentEPSDirect),
		DispensedByID:   "pharm-01",
	}
	_, err := pharmSvc.DispensePrescription(context.Background(), req)
	if err != nil {
		t.Fatalf("error en primera dispensacion: %v", err)
	}

	// Segundo intento de despacho de la misma receta -> Debe arrojar ErrAlreadyDispensed
	_, err = pharmSvc.DispensePrescription(context.Background(), req)
	if err == nil {
		t.Fatalf("se esperaba error 409 Conflict por receta ya dispensada, se obtuvo nil")
	}
	if !errors.Is(err, domain.ErrAlreadyDispensed) {
		t.Errorf("error esperado %v, obtenido %v", domain.ErrAlreadyDispensed, err)
	}
}

func TestPharmacyDispensation_RejectsPatientDocumentMismatch(t *testing.T) {
	ds := memory.NewDataStore()
	invRepo := memory.NewInventoryMemoryRepo(ds)
	prescRepo := memory.NewPrescriptionV2MemoryRepo(ds)
	log := logger.New()

	pharmSvc := services.NewPharmacyService(invRepo, prescRepo, memory.NewPharmacyReportMemoryRepo(ds), log)

	presc := &domain.PrescriptionV2{
		ID:              "rx-test-03",
		UniqueCode:      "RX-2026-77777",
		PatientID:       "pat-03",
		PatientDocument: "1144000111",
		PatientName:     "Sofia Restrepo",
		PatientEPS:      "Sanitas",
		CoverageType:    domain.CoverageParticular,
		Status:          domain.PrescriptionStatusPending,
		CreatedAt:       time.Now().UTC(),
		Items: []domain.PrescriptionItemV2{
			{
				ID:                 "rx-item-03",
				PrescriptionID:     "rx-test-03",
				InventoryItemID:    "inv-risp-3",
				MedicationName:     "Risperidona 3mg",
				Dosage:             "3 mg",
				QuantityPrescribed: 30,
				UnitPrice:          5800.00,
				TotalItemPrice:     174000.00,
			},
		},
	}
	_ = prescRepo.CreateWithItemsTx(context.Background(), presc)

	// Intento de despacho escaneando una cédula diferente a la del paciente de la receta
	req := domain.DispenseRequestDTO{
		PrescriptionID:  presc.ID,
		PatientDocument: "9999999999", // Documento no coincide con 1144000111
		CoverageType:    string(domain.CoverageParticular),
		PaymentMethod:   string(domain.PaymentCash),
		DispensedByID:   "pharm-01",
	}

	_, err := pharmSvc.DispensePrescription(context.Background(), req)
	if err == nil {
		t.Fatalf("se esperaba rechazo por discrepancia de documento, se obtuvo nil")
	}
	if !errors.Is(err, domain.ErrDocumentMismatch) {
		t.Errorf("error esperado %v, obtenido %v", domain.ErrDocumentMismatch, err)
	}
}

