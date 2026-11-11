package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/logger"
)

type pharmacyService struct {
	inventoryRepo ports.InventoryRepository
	prescRepo     ports.PrescriptionV2Repository
	reportRepo    ports.PharmacyReportRepository
	log           *logger.Logger
}

// NewPharmacyService crea el servicio de farmacia, control de stock, alertas automáticas y dispensación atómica con escáner PDF417
func NewPharmacyService(
	inventoryRepo ports.InventoryRepository,
	prescRepo ports.PrescriptionV2Repository,
	reportRepo ports.PharmacyReportRepository,
	log *logger.Logger,
) ports.PharmacyService {
	return &pharmacyService{
		inventoryRepo: inventoryRepo,
		prescRepo:     prescRepo,
		reportRepo:    reportRepo,
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

	if item.IsLowStock() {
		_ = s.generateStockReportForItem(ctx, item)
	}

	return item, nil
}

func (s *pharmacyService) UpdateInventoryItem(ctx context.Context, item *domain.InventoryItem) (*domain.InventoryItem, error) {
	if item.ID == "" {
		return nil, fmt.Errorf("el id del medicamento es obligatorio")
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

	if err := s.inventoryRepo.Update(ctx, item); err != nil {
		return nil, fmt.Errorf("error actualizando ítem de inventario: %w", err)
	}

	if item.IsLowStock() {
		_ = s.generateStockReportForItem(ctx, item)
	}

	return item, nil
}

func (s *pharmacyService) DeleteInventoryItem(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("el id del medicamento es obligatorio")
	}
	return s.inventoryRepo.Delete(ctx, id)
}

func (s *pharmacyService) AdjustStock(ctx context.Context, id string, newStock int, batch string) error {
	if newStock < 0 {
		return fmt.Errorf("la cantidad de stock no puede ser negativa")
	}
	if err := s.inventoryRepo.AdjustStock(ctx, id, newStock, batch); err != nil {
		return err
	}

	item, err := s.inventoryRepo.GetByID(ctx, id)
	if err == nil && item != nil {
		if item.IsLowStock() {
			_ = s.generateStockReportForItem(ctx, item)
		} else if s.reportRepo != nil {
			openRep, _ := s.reportRepo.GetOpenByItemID(ctx, item.ID)
			if openRep != nil {
				_ = s.reportRepo.UpdateStatus(ctx, openRep.ID, "REABASTECIDO", fmt.Sprintf("Reabastecido a %d unidades. Lote: %s", item.StockQuantity, item.BatchNumber), "Farmacia / Admin")
			}
		}
	}

	return nil
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

	// 2. Validacion de seguridad y reglas de negocio (DEF-53, DEF-59)
	if presc.Status == domain.PrescriptionStatusDispensed {
		return nil, domain.ErrAlreadyDispensed
	}
	if presc.Status != domain.PrescriptionStatusPending {
		return nil, fmt.Errorf("la prescripción no está en estado pendiente para dispensación (estado actual: %s)", presc.Status)
	}
	if req.PatientDocument == "" {
		return nil, fmt.Errorf("se requiere el documento de identidad del paciente para cotejo físico obligatorio")
	}
	if req.PatientDocument != presc.PatientDocument {
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

	// 4. Verificar si algun item dispensado quedo en nivel de stock bajo para disparar reporte automatico
	for _, it := range presc.Items {
		if it.InventoryItemID != "" {
			invItem, err := s.inventoryRepo.GetByID(ctx, it.InventoryItemID)
			if err == nil && invItem != nil && invItem.IsLowStock() {
				_ = s.generateStockReportForItem(ctx, invItem)
			}
		}
	}

	// 5. Retornar la prescripcion actualizada
	return s.prescRepo.GetByID(ctx, req.PrescriptionID)
}

func (s *pharmacyService) CheckAndGenerateStockReports(ctx context.Context) ([]domain.PharmacyStockReport, error) {
	items, err := s.inventoryRepo.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	for _, item := range items {
		if item.IsLowStock() {
			_ = s.generateStockReportForItem(ctx, &item)
		}
	}

	if s.reportRepo != nil {
		return s.reportRepo.GetAll(ctx, "")
	}
	return nil, nil
}

func (s *pharmacyService) generateStockReportForItem(ctx context.Context, item *domain.InventoryItem) error {
	if s.reportRepo == nil {
		return nil
	}

	// Evitar duplicar reportes abiertos para el mismo medicamento
	existing, err := s.reportRepo.GetOpenByItemID(ctx, item.ID)
	if err != nil {
		return err
	}
	if existing != nil {
		return nil
	}

	severity := "BAJO"
	if item.StockQuantity <= 0 {
		severity = "AGOTADO"
	} else if item.StockQuantity <= item.MinStock/2 {
		severity = "CRITICO"
	}

	deficit := item.MinStock - item.StockQuantity
	if deficit < 0 {
		deficit = 0
	}

	reportCode := fmt.Sprintf("REP-FARM-%d-%s", time.Now().Year(), strings.ToUpper(uuid.New().String()[:6]))

	impact := fmt.Sprintf("Alerta automática de seguridad clínica (ISO/IEC 25010): El inventario de %s (%s) se encuentra en nivel %s con %d unidades disponibles (umbral de seguridad mínimo: %d unidades). Requiere gestión prioritaria de abastecimiento para garantizar continuidad en la atención asistencial.",
		item.GenericName, item.Dosage, severity, item.StockQuantity, item.MinStock)

	report := &domain.PharmacyStockReport{
		ID:              uuid.New().String(),
		ReportCode:      reportCode,
		InventoryItemID: item.ID,
		MedicationName:  item.GenericName,
		GenericName:     item.GenericName,
		CodeCUM:         item.CodeCUM,
		Dosage:          item.Dosage,
		Presentation:    item.Presentation,
		BatchNumber:     item.BatchNumber,
		CurrentStock:    item.StockQuantity,
		MinStock:        item.MinStock,
		Deficit:         deficit,
		Severity:        severity,
		ClinicalImpact:  impact,
		Branch:          "Sede Cartago - Hospital Central",
		Status:          "PENDIENTE",
		Notes:           "Reporte generado automáticamente por el sistema de control de stock de farmacia.",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	err = s.reportRepo.Create(ctx, report)
	if err == nil {
		s.log.Warn("Alerta de stock bajo generada automaticamente y remitida a Direccion / Administrador", map[string]interface{}{
			"report_code":  reportCode,
			"medicamento":  item.GenericName,
			"stock_actual": item.StockQuantity,
			"min_stock":    item.MinStock,
			"severidad":    severity,
		})
	}
	return err
}

func (s *pharmacyService) GetStockReports(ctx context.Context, status string) ([]domain.PharmacyStockReport, error) {
	if s.reportRepo == nil {
		return nil, nil
	}
	_, _ = s.CheckAndGenerateStockReports(ctx)
	return s.reportRepo.GetAll(ctx, status)
}

func (s *pharmacyService) ResolveStockReport(ctx context.Context, id, notes, resolvedBy string) (*domain.PharmacyStockReport, error) {
	if s.reportRepo == nil {
		return nil, fmt.Errorf("repositorio de reportes no disponible")
	}
	if _, err := s.reportRepo.GetByID(ctx, id); err != nil {
		return nil, err
	}
	status := "REABASTECIDO"
	if notes == "EN_GESTION" {
		status = "EN_GESTION"
		notes = "Reporte puesto en revisión y gestión de reabastecimiento por administración."
	}
	if err := s.reportRepo.UpdateStatus(ctx, id, status, notes, resolvedBy); err != nil {
		return nil, err
	}
	return s.reportRepo.GetByID(ctx, id)
}

func (s *pharmacyService) GetPharmacyMetrics(ctx context.Context) (map[string]interface{}, error) {
	if s.reportRepo == nil {
		return nil, nil
	}
	return s.reportRepo.GetMetrics(ctx)
}
