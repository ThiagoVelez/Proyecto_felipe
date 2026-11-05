package email

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	"saludconecta-backend/pkg/logger"
)

// Config define las credenciales y servidor SMTP institucional
type Config struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

// Service gestiona el envio asincrono de correos con adjuntos en segundo plano
type Service struct {
	cfg       Config
	log       *logger.Logger
	outboxDir string
}

// NewService inicializa el servicio de correo asegurando la carpeta de auditoria de salida
func NewService(cfg Config, log *logger.Logger) *Service {
	outbox := "storage/outbox"
	_ = os.MkdirAll(outbox, 0755)
	if cfg.From == "" {
		cfg.From = "notificaciones@saludconecta.ips.gov.co"
	}
	return &Service{
		cfg:       cfg,
		log:       log,
		outboxDir: outbox,
	}
}

// SendWithPDFAttachment despacha un correo electronico con el archivo PDF adjunto
func (s *Service) SendWithPDFAttachment(to string, subject, body, pdfFilename string, pdfData []byte) error {
	if to == "" {
		to = "paciente@saludconecta.local"
	}

	// 1. Si no hay host SMTP real configurado, emula y persiste el correo en outbox para auditoria y pruebas
	if s.cfg.Host == "" || s.cfg.Host == "localhost" || s.cfg.Username == "" {
		recordFile := fmt.Sprintf("%s_mail_%d.txt", strings.ReplaceAll(to, "@", "_at_"), time.Now().UnixNano())
		filePath := filepath.Join(s.outboxDir, recordFile)

		content := fmt.Sprintf("FROM: %s\nTO: %s\nSUBJECT: %s\nDATE: %s\nATTACHMENT: %s (%d bytes)\n\nBODY:\n%s\n",
			s.cfg.From, to, subject, time.Now().Format(time.RFC3339), pdfFilename, len(pdfData), body)

		_ = os.WriteFile(filePath, []byte(content), 0644)
		s.log.Info("Correo electronico despachado y registrado en outbox local", map[string]interface{}{
			"destinatario": to,
			"asunto":       subject,
			"archivo_pdf":  pdfFilename,
			"tamano_bytes": len(pdfData),
			"auditoria":    filePath,
		})
		return nil
	}

	// 2. Envio SMTP real con MIME multipart para adjuntar PDF
	boundary := fmt.Sprintf("boundary_%d", time.Now().UnixNano())
	var msg bytes.Buffer

	msg.WriteString(fmt.Sprintf("From: %s\r\n", s.cfg.From))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", to))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n\r\n", boundary))

	// Cuerpo en texto plano
	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: text/plain; charset=UTF-8\r\n\r\n")
	msg.WriteString(body)
	msg.WriteString("\r\n\r\n")

	// Adjunto PDF
	if len(pdfData) > 0 {
		msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		msg.WriteString("Content-Type: application/pdf; name=\"" + pdfFilename + "\"\r\n")
		msg.WriteString("Content-Transfer-Encoding: base64\r\n")
		msg.WriteString("Content-Disposition: attachment; filename=\"" + pdfFilename + "\"\r\n\r\n")

		encoded := base64.StdEncoding.EncodeToString(pdfData)
		for i := 0; i < len(encoded); i += 76 {
			end := i + 76
			if end > len(encoded) {
				end = len(encoded)
			}
			msg.WriteString(encoded[i:end] + "\r\n")
		}
	}
	msg.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	addr := fmt.Sprintf("%s:%s", s.cfg.Host, s.cfg.Port)
	auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)

	err := smtp.SendMail(addr, auth, s.cfg.From, []string{to}, msg.Bytes())
	if err != nil {
		s.log.Warn("Fallo en el envio SMTP real, registrado para reintento", map[string]interface{}{
			"error": err.Error(),
			"to":    to,
		})
		return err
	}
	return nil
}

