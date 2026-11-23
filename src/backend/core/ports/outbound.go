package ports

import "saludconecta-backend/core/domain"

// Notifier envia correos con un adjunto opcional. Lo implementa adapters/email (DEF-84: el nucleo no depende del adaptador).
type Notifier interface {
	SendWithPDFAttachment(to, subject, body, pdfFilename string, pdfData []byte) error
}

// DocumentGenerator produce los comprobantes PDF y retorna la ruta guardada y su contenido. Lo implementa adapters/pdf.
type DocumentGenerator interface {
	GenerateAppointmentPDF(app *domain.Appointment) (string, []byte, error)
	GeneratePrescriptionPDF(presc *domain.PrescriptionV2) (string, []byte, error)
}

// Logger registra eventos estructurados. Lo implementa pkg/logger; el nucleo solo depende de este contrato (DEF-84).
type Logger interface {
	Info(message string, fields ...map[string]interface{})
	Warn(message string, fields ...map[string]interface{})
	Error(message string, fields ...map[string]interface{})
}
