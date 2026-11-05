package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/logger"
)

type pharmacyService struct {
	inventoryRepo ports.InventoryRepository
	prescRepo     ports.PrescriptionV2Repository
	log           *logger.Logger
}

// NewPharmacyService crea el servicio de farmacia, control de stock y dispensacion atomica con escaner PDF417
func NewPharmacyService(
	inventoryRepo ports.InventoryRepository,
	prescRepo ports.PrescriptionV2Repository,
	log *logger.Logger,
) ports.PharmacyService {
	return &pharmacyService{
		inventoryRepo: inventoryRepo,
		prescRepo:     prescRepo,
		log:           log,
	}
}

func (s *pharmacyService) GetInventory(ctx context.Context) ([]domain.InventoryItem, error) {
	return s.inventoryRepo.GetAll(ctx)
}

func (s *pharmacyService) AddInventoryItem(ctx context.Context, item *domain.InventoryItem) (*domain.InventoryItem, error) {
	if item.ID == "" {
		item.ID = uuid.New().String()
	}
	item.GenericName = strings.TrimSpace(item.GenericName)
	item.Dosage = strings.TrimSpace(item.Dosage)
	if item.GenericName == "" || item.Dosage == "" {
		return nil, fmt.Errorf("el nombre genérico y la dosificación/concentración son obligatorios")
	}
	if item.UnitPrice < 0 {
		return nil, fmt.Errorf("el precio unitario no puede ser negativo")
	}
	item.IsActive = true

	if err := s.inventoryRepo.Create(ctx, item); err != nil {
		return nil, fmt.Errorf("error registrando ítem de inventario: %w", err)
	}
	return item, nil
}

func (s *pharmacyService) AdjustStock(ctx context.Context, id string, newStock int, batch string) error {
	if newStock < 0 {
		return fmt.Errorf("la cantidad de stock no puede ser negativa")
	}
	return s.inventoryRepo.AdjustStock(ctx, id, newStock, batch)
}

func (s *pharmacyService) GetInbox(ctx context.Context, status *domain.PrescriptionStatusV2, query string) ([]domain.PrescriptionV2, error) {
	return s.prescRepo.GetAllInbox(ctx, status, query)
}

func (s *pharmacyService) GetPrescriptionByCodeOrDocument(ctx context.Context, term string) (*domain.PrescriptionV2, error) {
	term = strings.TrimSpace(term)
	if term == "" {
		return nil, fmt.Errorf("el término de búsqueda o documento no puede estar vacío")
	}
	return s.prescRepo.GetByUniqueCodeOrDocument(ctx, term)
}

func (s *pharmacyService) DispensePrescription(ctx context.Context, req domain.DispenseRequestDTO) (*domain.PrescriptionV2, error) {
	req.PatientDocument = strings.TrimSpace(req.PatientDocument)

	// 1. Obtener la prescripcion existente
	presc, err := s.prescRepo.GetByID(ctx, req.PrescriptionID)
	if err != nil {
		return nil, err
	}

	// 2. Validacion de seguridad y reglas de negocio
	if presc.Status == domain.PrescriptionStatusDispensed {
		return nil, domain.ErrAlreadyDispensed
	}
	if req.PatientDocument != "" && req.PatientDocument != presc.PatientDocument {
		return nil, domain.ErrDocumentMismatch
	}

	// 3. Ejecutar transaccion ACID de descuento de inventario y marcado de dispensacion
	if err := s.prescRepo.MarkAsDispensedTx(ctx, req, presc.Items); err != nil {
		return nil, err
	}

	s.log.Info("Dispensacion farmacologica completada exitosamente", map[string]interface{}{
		"prescription_id":  req.PrescriptionID,
		"unique_code":      presc.UniqueCode,
		"patient_document": presc.PatientDocument,
		"dispensed_by":     req.DispensedByID,
		"coverage_type":    req.CoverageType,
		"payment_method":   req.PaymentMethod,
	})

	// 4. Retornar la prescripcion actualizada
	return s.prescRepo.GetByID(ctx, req.PrescriptionID)
}

