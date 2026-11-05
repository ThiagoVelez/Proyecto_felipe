package pdf

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"saludconecta-backend/core/domain"
)

// Generator construye comprobantes y folios clinicos en formato PDF 1.4 estricto
type Generator struct {
	outputDir string
}

// NewGenerator inicializa el generador de documentos asegurando el directorio de salida
func NewGenerator(outputDir string) *Generator {
	if outputDir == "" {
		outputDir = "storage/documents"
	}
	_ = os.MkdirAll(outputDir, 0755)
	return &Generator{outputDir: outputDir}
}

// sanitize limpia cadenas de caracteres para texto seguro en streams PDF
func sanitize(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "(", "\\(")
	s = strings.ReplaceAll(s, ")", "\\)")
	return s
}

// buildMinimalPDF compone un archivo PDF 1.4 estructurado con vectores y fuentes base
func buildMinimalPDF(title string, lines []string, barcodeText string) []byte {
	var stream bytes.Buffer

	// Fondo y encabezado decorativo institucional (Verde Clinico SaludConecta IPS)
	stream.WriteString("q\n")
	stream.WriteString("0.04 0.38 0.33 rg\n")          // Color #0A6154
	stream.WriteString("36 720 540 45 re f\n")         // Barra superior
	stream.WriteString("0.85 0.95 0.92 rg\n")          // Verde suave de fondo
	stream.WriteString("36 670 540 38 re f\n")
	stream.WriteString("Q\n")

	// Texto del membrete
	stream.WriteString("BT\n")
	stream.WriteString("/F2 16 Tf\n")
	stream.WriteString("1 1 1 rg\n") // Blanco
	stream.WriteString("48 738 Td\n")
	stream.WriteString("(SALUDCONECTA IPS v2.4 - SISTEMA HOSPITALARIO) Tj\n")
	stream.WriteString("ET\n")

	stream.WriteString("BT\n")
	stream.WriteString("/F1 10 Tf\n")
	stream.WriteString("0.05 0.25 0.20 rg\n")
	stream.WriteString("48 688 Td\n")
	stream.WriteString("(Documento Oficial Valido - Resolucion 1995/1999 MinSalud - Nit: 900.548.112-4) Tj\n")
	stream.WriteString("ET\n")

	// Titulo del documento
	stream.WriteString("BT\n")
	stream.WriteString("/F2 14 Tf\n")
	stream.WriteString("0.1 0.1 0.1 rg\n")
	stream.WriteString(fmt.Sprintf("48 640 Td (%s) Tj\n", sanitize(title)))
	stream.WriteString("ET\n")

	// Separador horizontal
	stream.WriteString("q 0.7 0.7 0.7 RG 1 w 36 625 m 576 625 l S Q\n")

	// Lineas de cuerpo del documento
	y := 605
	stream.WriteString("BT\n")
	stream.WriteString("/F1 10 Tf\n")
	stream.WriteString("0.15 0.15 0.15 rg\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "###") {
			// Subtitulo destacado
			clean := strings.TrimSpace(strings.TrimPrefix(line, "###"))
			stream.WriteString("ET\nBT\n/F2 11 Tf\n0.04 0.38 0.33 rg\n")
			stream.WriteString(fmt.Sprintf("48 %d Td (%s) Tj\n", y, sanitize(clean)))
			stream.WriteString("ET\nBT\n/F1 10 Tf\n0.15 0.15 0.15 rg\n")
		} else {
			stream.WriteString(fmt.Sprintf("48 %d Td (%s) Tj\n", y, sanitize(line)))
		}
		y -= 16
		if y < 140 {
			break
		}
	}
	stream.WriteString("ET\n")

	// Bloque de codigo de validacion / representacion visual de barras
	if barcodeText != "" {
		stream.WriteString("q\n")
		stream.WriteString("0.94 0.94 0.94 rg\n")
		stream.WriteString("48 80 516 45 re f\n")
		stream.WriteString("0.2 0.2 0.2 RG 1 w 48 80 516 45 re S\n")
		// Lineas tipo codigo de barras PDF417 simuladas vectorialmente
		stream.WriteString("0 0 0 rg\n")
		for bx := 60; bx < 220; bx += 4 {
			width := (bx % 3) + 1
			stream.WriteString(fmt.Sprintf("%d 92 %d 24 re f\n", bx, width))
		}
		stream.WriteString("Q\n")

		stream.WriteString("BT\n")
		stream.WriteString("/F2 9 Tf\n")
		stream.WriteString("0.1 0.1 0.1 rg\n")
		stream.WriteString(fmt.Sprintf("235 104 Td (CODIGO UNICO VALIDABLE: %s) Tj\n", sanitize(barcodeText)))
		stream.WriteString("/F1 8 Tf\n")
		stream.WriteString("235 90 Td (Verificacion digital en ventanilla de farmacia o consulta externa) Tj\n")
		stream.WriteString("ET\n")
	}

	// Pie de pagina legal
	stream.WriteString("BT\n")
	stream.WriteString("/F1 8 Tf\n")
	stream.WriteString("0.4 0.4 0.4 rg\n")
	stream.WriteString(fmt.Sprintf("48 45 Td (Generado electronicamente por SaludConecta IPS v2.4 | Fecha: %s) Tj\n", time.Now().Format("2006-01-02 15:04:05")))
	stream.WriteString("ET\n")

	streamBytes := stream.Bytes()
	streamLen := len(streamBytes)

	// Estructura de objetos PDF 1.4
	var pdf bytes.Buffer
	pdf.WriteString("%PDF-1.4\n")
	pdf.WriteString("%\xE2\xE3\xCF\xD3\n")

	var offsets []int
	offsets = append(offsets, pdf.Len())
	pdf.WriteString("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

	offsets = append(offsets, pdf.Len())
	pdf.WriteString("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

	offsets = append(offsets, pdf.Len())
	pdf.WriteString("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n")

	offsets = append(offsets, pdf.Len())
	pdf.WriteString(fmt.Sprintf("4 0 obj\n<< /Length %d >>\nstream\n", streamLen))
	pdf.Write(streamBytes)
	pdf.WriteString("\nendstream\nendobj\n")

	offsets = append(offsets, pdf.Len())
	pdf.WriteString("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

	offsets = append(offsets, pdf.Len())
	pdf.WriteString("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n")

	startxref := pdf.Len()
	pdf.WriteString("xref\n")
	pdf.WriteString(fmt.Sprintf("0 %d\n", len(offsets)+1))
	pdf.WriteString("0000000000 65535 f \n")
	for _, off := range offsets {
		pdf.WriteString(fmt.Sprintf("%010d 00000 n \n", off))
	}
	pdf.WriteString("trailer\n")
	pdf.WriteString(fmt.Sprintf("<< /Size %d /Root 1 0 R >>\n", len(offsets)+1))
	pdf.WriteString("startxref\n")
	pdf.WriteString(fmt.Sprintf("%d\n", startxref))
	pdf.WriteString("%%EOF\n")

	return pdf.Bytes()
}

// GenerateAppointmentPDF crea el comprobante de cita médica para el paciente
func (g *Generator) GenerateAppointmentPDF(app *domain.Appointment) (string, []byte, error) {
	filename := fmt.Sprintf("cita_%s_%s.pdf", app.PatientDocument, time.Now().Format("20060102_150405"))
	fullPath := filepath.Join(g.outputDir, filename)

	lines := []string{
		"### INFORMACION DE LA CITA PROGRAMADA",
		fmt.Sprintf("Fecha y Hora: %s", app.AppointmentDate.Format("02/01/2006 15:04")),
		fmt.Sprintf("Estado de la Cita: %s", app.Status),
		"",
		"### DATOS DEL PACIENTE",
		fmt.Sprintf("Nombre Completo: %s", app.PatientName),
		fmt.Sprintf("Documento: %s", app.PatientDocument),
		fmt.Sprintf("Correo Notificado: %s", app.PatientEmail),
		fmt.Sprintf("Telefono: %s", app.PatientPhone),
		"",
		"### PROFESIONAL TRATANTE",
		fmt.Sprintf("Medico: %s", app.DoctorName),
		fmt.Sprintf("Especialidad: %s", app.DoctorSpecialty),
		fmt.Sprintf("Tarjeta Profesional (ReTHUS): %s", app.DoctorCard),
		"",
		"### OBSERVACIONES Y PLAN DE LA CITA",
		app.Observations,
	}

	barcode := fmt.Sprintf("CITA-%s-%s", app.PatientDocument, app.AppointmentDate.Format("20060102"))
	data := buildMinimalPDF("COMPROBANTE DE ASIGNACION DE CITA MEDICA", lines, barcode)

	_ = os.MkdirAll(filepath.Dir(fullPath), 0755)
	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		return "", nil, err
	}
	return fullPath, data, nil
}

// GeneratePrescriptionPDF crea el comprobante y receta clínica tripartita
func (g *Generator) GeneratePrescriptionPDF(presc *domain.PrescriptionV2) (string, []byte, error) {
	filename := fmt.Sprintf("receta_%s_%s.pdf", presc.UniqueCode, time.Now().Format("20060102_150405"))
	fullPath := filepath.Join(g.outputDir, filename)

	lines := []string{
		"### INFORMACION DE LA RECETA MEDICA (PRESCRIPCION TRIPARTITA)",
		fmt.Sprintf("Codigo Unico de Receta: %s", presc.UniqueCode),
		fmt.Sprintf("Fecha de Emision: %s", presc.CreatedAt.Format("02/01/2006 15:04")),
		fmt.Sprintf("Entidad Prestadora / EPS: %s", presc.PatientEPS),
		fmt.Sprintf("Esquema de Cobertura: %s", presc.CoverageType),
		"",
		"### DATOS DEL PACIENTE",
		fmt.Sprintf("Nombre del Paciente: %s", presc.PatientName),
		fmt.Sprintf("Documento de Identidad: %s", presc.PatientDocument),
		"",
		"### MEDICAMENTOS FORMULADOS Y DOSIFICACION",
	}

	for idx, item := range presc.Items {
		lines = append(lines, fmt.Sprintf("%d. %s [%s] - Cantidad: %d und - Subtotal: $%.2f COP",
			idx+1, item.MedicationName, item.Dosage, item.QuantityPrescribed, item.TotalItemPrice))
		if item.Instructions != "" {
			lines = append(lines, fmt.Sprintf("   Indicacion: %s", item.Instructions))
		}
	}

	lines = append(lines, "")
	lines = append(lines, "### LIQUIDACION ECONOMICA")
	lines = append(lines, fmt.Sprintf("Valor Total Farmaceutico: $%.2f COP", presc.SubtotalAmount))
	lines = append(lines, fmt.Sprintf("Cobertura Asumida por EPS/PBS: $%.2f COP", presc.EPSCoverageAmount))
	lines = append(lines, fmt.Sprintf("Monto a Pagar por el Paciente: $%.2f COP", presc.PatientPayableAmount))
	if presc.TreatmentNotes != "" {
		lines = append(lines, "")
		lines = append(lines, "### INDICACIONES GENERALES DE TRATAMIENTO")
		lines = append(lines, presc.TreatmentNotes)
	}

	data := buildMinimalPDF("ORDEN MEDICA Y RECETARIO AMBULATORIO", lines, presc.UniqueCode)

	_ = os.MkdirAll(filepath.Dir(fullPath), 0755)
	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		return "", nil, err
	}
	return fullPath, data, nil
}
