package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"saludconecta-backend/adapters/email"
	"saludconecta-backend/adapters/pdf"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/pkg/logger"
)

type treatmentService struct {
	prescRepo   ports.PrescriptionV2Repository
	patientRepo ports.PatientRepository
	userRepo    ports.UserRepository
	pdfGen      *pdf.Generator
	emailSvc    *email.Service
	log         *logger.Logger
}

// NewTreatmentService crea el servicio de seguimiento de tratamiento y emision tripartita de recetas
func NewTreatmentService(
	prescRepo ports.PrescriptionV2Repository,
	patientRepo ports.PatientRepository,
	userRepo ports.UserRepository,
	pdfGen *pdf.Generator,
	emailSvc *email.Service,
	log *logger.Logger,
) ports.TreatmentService {
	return &treatmentService{
		prescRepo:   prescRepo,
		patientRepo: patientRepo,
		userRepo:    userRepo,
		pdfGen:      pdfGen,
		emailSvc:    emailSvc,
		log:         log,
	}
}

func (s *treatmentService) DispatchTreatment(ctx context.Context, presc *domain.PrescriptionV2) (*domain.PrescriptionV2, error) {
	if len(presc.Items) == 0 {
		return nil, domain.ErrEmptyPrescriptionItems
	}

	// 1. Generar identificadores unicos
	if presc.ID == "" {
		presc.ID = uuid.New().String()
	}
	if presc.UniqueCode == "" {
		presc.UniqueCode = GenerateRandomRXCode()
	}
	if presc.HCEID == "" {
		presc.HCEID = uuid.New().String()
	}
	presc.CreatedAt = time.Now().UTC()
	presc.Status = domain.PrescriptionStatusPending

	// 2. Completar datos asistenciales del medico y paciente
	if presc.DoctorName == "" && presc.DoctorID != "" {
		doc, err := s.userRepo.GetByID(ctx, presc.DoctorID)
		if err == nil && doc != nil {
			presc.DoctorName = doc.FullName
		}
	}

	var patientEmail string
	if presc.PatientID != "" {
		pat, err := s.patientRepo.GetByID(ctx, presc.PatientID)
		if err == nil && pat != nil {
			if presc.PatientName == "" {
				presc.PatientName = fmt.Sprintf("%s %s", pat.FirstName, pat.LastName)
			}
			if presc.PatientDocument == "" {
				presc.PatientDocument = pat.DocumentNumber
			}
			if presc.PatientEPS == "" {
				presc.PatientEPS = pat.EPSName
			}
			patientEmail = pat.Email
		}
	}

	// 3. Liquidacion economica por concentracion y unidades
	var subtotal float64
	for i := range presc.Items {
		it := &presc.Items[i]
		if it.ID == "" {
			it.ID = uuid.New().String()
		}
		it.PrescriptionID = presc.ID
		it.TotalItemPrice = it.UnitPrice * float64(it.QuantityPrescribed)
		subtotal += it.TotalItemPrice
	}
	presc.SubtotalAmount = subtotal

	// 4. Regla de liquidacion de cobertura (PBS 100% vs Copago vs Particular)
	switch presc.CoverageType {
	case domain.CoverageEPSPBS100, "":
		presc.CoverageType = domain.CoverageEPSPBS100
		presc.EPSCoverageAmount = subtotal
		presc.PatientPayableAmount = 0.0
		presc.PaymentMethod = domain.PaymentEPSDirect
	case domain.CoverageCopay:
		presc.EPSCoverageAmount = subtotal * 0.85
		presc.PatientPayableAmount = subtotal * 0.15
	case domain.CoverageParticular:
		presc.EPSCoverageAmount = 0.0
		presc.PatientPayableAmount = subtotal
	}

	// 5. Persistencia transaccional sincrona
	if err := s.prescRepo.CreateWithItemsTx(ctx, presc); err != nil {
		return nil, fmt.Errorf("error persistiendo prescripcion tripartita: %w", err)
	}

	// 6. Worker en segundo plano: genera PDF clinico y envia por correo electronico al paciente
	go func(prescCopy domain.PrescriptionV2, emailDest string) {
		_, pdfBytes, err := s.pdfGen.GeneratePrescriptionPDF(&prescCopy)
		if err != nil {
			s.log.Error("Fallo generando PDF de prescripcion tripartita en segundo plano", map[string]interface{}{
				"unique_code": prescCopy.UniqueCode,
				"error":       err.Error(),
			})
			return
		}

		subject := fmt.Sprintf("Orden Médica y Recetario - Código %s - SaludConecta IPS", prescCopy.UniqueCode)
		body := fmt.Sprintf("Estimado(a) %s,\n\nSe ha emitido su orden médica y prescripción ambulatoria con código único %s.\n\nEPS / Aseguradora: %s\nCobertura: %s\n\nPuede reclamar sus medicamentos en la farmacia de la IPS presentando su documento de identidad.\n\nAdjunto encontrará su fórmula médica oficial en PDF.",
			prescCopy.PatientName, prescCopy.UniqueCode, prescCopy.PatientEPS, prescCopy.CoverageType)

		filename := fmt.Sprintf("Receta_%s.pdf", prescCopy.UniqueCode)
		_ = s.emailSvc.SendWithPDFAttachment(emailDest, subject, body, filename, pdfBytes)
	}(*presc, patientEmail)

	return presc, nil
}

func (s *treatmentService) GetPrescriptionByID(ctx context.Context, id string) (*domain.PrescriptionV2, error) {
	return s.prescRepo.GetByID(ctx, id)
}

