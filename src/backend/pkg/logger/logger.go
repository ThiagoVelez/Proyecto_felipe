package logger

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

// Level define el nivel de severidad del registro.
type Level string

const (
	LevelDebug Level = "DEBUG"
	LevelInfo  Level = "INFO"
	LevelWarn  Level = "WARN"
	LevelError Level = "ERROR"
)

// LogEntry representa una entrada de bitacora estructurada en formato JSON.
type LogEntry struct {
	Timestamp     string                 `json:"timestamp"`
	Level         Level                  `json:"level"`
	Message       string                 `json:"message"`
	CorrelationID string                 `json:"correlation_id,omitempty"`
	Fields        map[string]interface{} `json:"fields,omitempty"`
}

// Logger implementa un registrador estructurado con soporte para Correlation-ID.
type Logger struct {
	mu            sync.Mutex
	out           io.Writer
	correlationID string
}

// New crea una nueva instancia de Logger configurada hacia la salida estandar.
func New() *Logger {
	return &Logger{
		out: os.Stdout,
	}
}

// WithCorrelationID retorna una copia del logger asociada a un Correlation-ID especifico.
func (l *Logger) WithCorrelationID(correlationID string) *Logger {
	return &Logger{
		out:           l.out,
		correlationID: correlationID,
	}
}

func (l *Logger) log(level Level, message string, fields map[string]interface{}) {
	entry := LogEntry{
		Timestamp:     time.Now().UTC().Format(time.RFC3339Nano),
		Level:         level,
		Message:       message,
		CorrelationID: l.correlationID,
		Fields:        fields,
	}

	payload, err := json.Marshal(entry)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error serializando log: %v\n", err)
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	fmt.Fprintln(l.out, string(payload))
}

// Info registra un mensaje informativo.
func (l *Logger) Info(message string, fields ...map[string]interface{}) {
	var f map[string]interface{}
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(LevelInfo, message, f)
}

// Warn registra un mensaje de advertencia.
func (l *Logger) Warn(message string, fields ...map[string]interface{}) {
	var f map[string]interface{}
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(LevelWarn, message, f)
}

// Error registra un mensaje de error.
func (l *Logger) Error(message string, fields ...map[string]interface{}) {
	var f map[string]interface{}
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(LevelError, message, f)
}

// Debug registra un mensaje de depuracion.
func (l *Logger) Debug(message string, fields ...map[string]interface{}) {
	var f map[string]interface{}
	if len(fields) > 0 {
		f = fields[0]
	}
	l.log(LevelDebug, message, f)
}
