package domain

import (
	"errors"
	"time"
)

var (
	ErrInvalidVitals             = errors.New("los signos vitales contienen valores fuera del rango fisiologico plausible")
	ErrTriageNotFound            = errors.New("registro de triaje no encontrado")
	ErrTriageAlreadyProcessed    = errors.New("el triaje ya ha sido procesado o finalizado")
	ErrInvalidGlasgowScore       = errors.New("la escala de coma de glasgow debe estar entre 3 y 15 puntos")
	ErrInvalidOxygenSaturation   = errors.New("la saturacion de oxigeno debe estar entre 0 y 100%")
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

// TriageStatus define el flujo de atencion del triaje.
type TriageStatus string

const (
	TriageStatusPending    TriageStatus = "PENDIENTE"
	TriageStatusInProgress TriageStatus = "EN_ATENCION"
	TriageStatusFinished   TriageStatus = "FINALIZADO"
)

// TriageRecord representa la valoracion inicial y signos vitales en el area de urgencias.
type TriageRecord struct {
	ID                    string
	PatientID             string
	EvaluatedBy           string
	SystolicBP            int     // Presion arterial sistolica (mmHg)
	DiastolicBP           int     // Presion arterial diastolica (mmHg)
	HeartRate             int     // Frecuencia cardiaca (lpm)
	RespiratoryRate       int     // Frecuencia respiratoria (rpm)
	OxygenSaturation      int     // Saturacion periferica de oxigeno (%)
	BodyTemperature       float64 // Temperatura corporal (°C)
	GlasgowScore          int     // Escala de Coma de Glasgow (3-15)
	ManchesterLevel       ManchesterLevel
	ReasonForConsultation string
	Status                TriageStatus
	CreatedAt             time.Time
}

// Validate verifica la coherencia y rangos fisiologicos de los datos ingresados.
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
	return nil
}

// SuggestManchesterPriority calcula la prioridad sugerida con base en discriminadores vitales de alerta temprana.
func (t *TriageRecord) SuggestManchesterPriority() ManchesterLevel {
	// Nivel I (Inmediato): Inestabilidad hemodinamica o neurologica extrema
	if t.GlasgowScore <= 8 || t.OxygenSaturation < 85 || t.HeartRate < 40 || t.HeartRate > 150 || t.SystolicBP < 70 {
		return ManchesterLevelI
	}
	// Nivel II (Muy urgente): Compromiso respiratorio o hemodinamico severo
	if (t.GlasgowScore >= 9 && t.GlasgowScore <= 12) || t.OxygenSaturation < 90 || t.HeartRate > 130 || t.BodyTemperature >= 40.0 {
		return ManchesterLevelII
	}
	// Nivel III (Urgente): Alteraciones moderadas
	if t.OxygenSaturation < 94 || t.BodyTemperature >= 38.5 || t.SystolicBP >= 180 || t.DiastolicBP >= 110 {
		return ManchesterLevelIII
	}
	// Nivel IV (Estandar): Parametros estables con sintomatologia aguda leve
	if t.BodyTemperature >= 37.5 || t.SystolicBP >= 140 {
		return ManchesterLevelIV
	}
	// Nivel V (No urgente)
	return ManchesterLevelV
}

