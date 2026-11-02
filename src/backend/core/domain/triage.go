package domain

import (
	"errors"
	"time"
)

var (
	ErrInvalidVitals           = errors.New("los signos vitales contienen valores fuera del rango fisiologico plausible")
	ErrTriageNotFound          = errors.New("registro de triaje no encontrado")
	ErrTriageAlreadyProcessed  = errors.New("el triaje ya ha sido procesado o finalizado")
	ErrInvalidGlasgowScore     = errors.New("la escala de coma de glasgow debe estar entre 3 y 15 puntos")
	ErrInvalidOxygenSaturation = errors.New("la saturacion de oxigeno debe estar entre 0 y 100%")
	ErrInvalidManchesterLevel  = errors.New("el nivel Manchester no pertenece al catalogo o es menos urgente que el calculado por los signos vitales")
	ErrInvalidTriageStatus     = errors.New("el estado de triaje no pertenece al catalogo")
)

// ManchesterLevel define la prioridad clinica segun el protocolo internacional de Manchester.
type ManchesterLevel string

const (
	ManchesterLevelI   ManchesterLevel = "NIVEL_I"   // Rojo: Atencion inmediata / Reanimacion
	ManchesterLevelII  ManchesterLevel = "NIVEL_II"  // Naranja: Muy urgente (hasta 10-15 minutos)
	ManchesterLevelIII ManchesterLevel = "NIVEL_III" // Amarillo: Urgente (hasta 60 minutos)
	ManchesterLevelIV  ManchesterLevel = "NIVEL_IV"  // Verde: Estandar / Menos urgente (hasta 120 minutos)
	ManchesterLevelV   ManchesterLevel = "NIVEL_V"   // Azul: No urgente (hasta 240 minutos)
)

// Rank retorna la urgencia numerica del nivel (1 = mas urgente) o 0 si el valor no pertenece al catalogo.
func (m ManchesterLevel) Rank() int {
	switch m {
	case ManchesterLevelI:
		return 1
	case ManchesterLevelII:
		return 2
	case ManchesterLevelIII:
		return 3
	case ManchesterLevelIV:
		return 4
	case ManchesterLevelV:
		return 5
	default:
		return 0
	}
}

// IsValid indica si el nivel pertenece al catalogo cerrado de Manchester.
func (m ManchesterLevel) IsValid() bool {
	return m.Rank() > 0
}

// TriageStatus define el flujo de atencion del triaje.
type TriageStatus string

const (
	TriageStatusPending    TriageStatus = "PENDIENTE"
	TriageStatusInProgress TriageStatus = "EN_ATENCION"
	TriageStatusFinished   TriageStatus = "FINALIZADO"
)

// IsValid indica si el estado pertenece al catalogo de estados de triaje.
func (s TriageStatus) IsValid() bool {
	switch s {
	case TriageStatusPending, TriageStatusInProgress, TriageStatusFinished:
		return true
	default:
		return false
	}
}

// TriageRecord representa la valoracion inicial y signos vitales en el area de urgencias.
type TriageRecord struct {
	ID                    string          `json:"id"`
	PatientID             string          `json:"patient_id"`
	EvaluatedBy           string          `json:"evaluated_by"`
	SystolicBP            int             `json:"systolic_bp"`      // Presion arterial sistolica (mmHg)
	DiastolicBP           int             `json:"diastolic_bp"`     // Presion arterial diastolica (mmHg)
	HeartRate             int             `json:"heart_rate"`       // Frecuencia cardiaca (lpm)
	RespiratoryRate       int             `json:"respiratory_rate"` // Frecuencia respiratoria (rpm)
	OxygenSaturation      int             `json:"oxygen_saturation"`
	BodyTemperature       float64         `json:"body_temperature"` // Temperatura corporal (°C)
	GlasgowScore          int             `json:"glasgow_score"`    // Escala de Coma de Glasgow (3-15)
	ManchesterLevel       ManchesterLevel `json:"manchester_level"`
	ReasonForConsultation string          `json:"reason_for_consultation"`
	Status                TriageStatus    `json:"status"`
	CreatedAt             time.Time       `json:"created_at"`
}

// Validate verifica la coherencia y rangos fisiologicos plausibles de los datos ingresados.
func (t *TriageRecord) Validate() error {
	if t.GlasgowScore < 3 || t.GlasgowScore > 15 {
		return ErrInvalidGlasgowScore
	}
	if t.OxygenSaturation < 0 || t.OxygenSaturation > 100 {
		return ErrInvalidOxygenSaturation
	}
	if t.SystolicBP <= 0 || t.DiastolicBP <= 0 || t.HeartRate <= 0 || t.RespiratoryRate <= 0 || t.BodyTemperature <= 0 {
		return ErrInvalidVitals
	}
	if t.SystolicBP > 300 || t.DiastolicBP > 200 || t.HeartRate > 300 || t.RespiratoryRate > 80 ||
		t.BodyTemperature < 20 || t.BodyTemperature > 45 {
		return ErrInvalidVitals
	}
	return nil
}

// SuggestManchesterPriority calcula la prioridad sugerida con base en discriminadores vitales de alerta temprana.
// Los signos con valor cero se interpretan como no medidos y no activan discriminadores.
func (t *TriageRecord) SuggestManchesterPriority() ManchesterLevel {
	rr := t.RespiratoryRate
	temp := t.BodyTemperature

	// Nivel I (Inmediato): Inestabilidad hemodinamica, respiratoria, neurologica o termica extrema
	if t.GlasgowScore <= 8 || t.OxygenSaturation < 85 || t.HeartRate < 40 || t.HeartRate > 150 || t.SystolicBP < 70 ||
		(rr > 0 && (rr < 8 || rr > 35)) ||
		(temp > 0 && (temp < 28.0 || temp >= 41.5)) {
		return ManchesterLevelI
	}
	// Nivel II (Muy urgente): Compromiso respiratorio, hemodinamico o termico severo
	if (t.GlasgowScore >= 9 && t.GlasgowScore <= 12) || t.OxygenSaturation < 90 || t.HeartRate > 130 ||
		(t.SystolicBP > 0 && t.SystolicBP < 90) ||
		(rr > 0 && (rr < 10 || rr > 30)) ||
		(temp > 0 && (temp < 32.0 || temp >= 40.0)) {
		return ManchesterLevelII
	}
	// Nivel III (Urgente): Alteraciones moderadas
	if t.OxygenSaturation < 94 || t.SystolicBP >= 180 || t.DiastolicBP >= 110 ||
		(t.HeartRate > 0 && (t.HeartRate > 110 || t.HeartRate < 50)) ||
		(rr > 24) ||
		(temp > 0 && (temp < 35.0 || temp >= 38.5)) {
		return ManchesterLevelIII
	}
	// Nivel IV (Estandar): Parametros estables con sintomatologia aguda leve
	if t.SystolicBP >= 140 || t.DiastolicBP >= 90 || t.HeartRate > 100 || (temp > 0 && temp >= 37.5) {
		return ManchesterLevelIV
	}
	// Nivel V (No urgente)
	return ManchesterLevelV
}
