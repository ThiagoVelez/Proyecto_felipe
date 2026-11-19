package domain

import (
	"errors"
	"time"
)

var (
	ErrBranchNotFound     = errors.New("sede no encontrada")
	ErrBranchNameTaken    = errors.New("ya existe una sede con ese nombre")
	ErrInvalidBranch      = errors.New("los datos de la sede son incompletos o invalidos")
	ErrBranchHasPersonnel = errors.New("la sede tiene personal asignado; reasignelo antes de eliminarla")
)

// Branch es una sede de la red asistencial. Las coordenadas son opcionales: solo las sedes con ubicacion fija
// aparecen en el portal del paciente.
type Branch struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Level        string    `json:"level"`
	Municipality string    `json:"municipality"`
	Status       string    `json:"status"`
	Description  string    `json:"description"`
	Latitude     *float64  `json:"latitude"`
	Longitude    *float64  `json:"longitude"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// HasLocation indica si la sede tiene ubicacion fija para calcular distancias.
func (b Branch) HasLocation() bool { return b.Latitude != nil && b.Longitude != nil }

func floatPtr(v float64) *float64 { return &v }

// InitialBranches son las sedes con las que arranca una instalacion nueva (antes vivian en el navegador).
func InitialBranches() []Branch {
	return []Branch{
		{ID: "br-01", Name: "Sede Cartago - Hospital Central", Level: "Nivel II • Hospitalario", Municipality: "Cartago, Valle del Cauca",
			Status: "Operativo", Description: "Centro de referencia regional. Servicio de Urgencias 24/7, Consulta Especializada y Quirófanos.",
			Latitude: floatPtr(4.7464), Longitude: floatPtr(-75.9117)},
		{ID: "br-02", Name: "Sede La Unión - Urgencias", Level: "Nivel I • Trauma", Municipality: "La Unión, Valle del Cauca",
			Status: "Operativo", Description: "Unidad de Atención Rápida y Estabilización de Trauma. Triaje Manchester sincronizado.",
			Latitude: floatPtr(4.5322), Longitude: floatPtr(-76.1036)},
		{ID: "br-03", Name: "Sede Tuluá - Ambulatoria", Level: "Ambulatorio • Promoción & Prevención", Municipality: "Tuluá, Valle del Cauca",
			Status: "Operativo", Description: "Centro de Atención Ambulatoria, Promoción de la Salud y Prevención de la Enfermedad.",
			Latitude: floatPtr(4.0847), Longitude: floatPtr(-76.1954)},
		{ID: "br-04", Name: "Brigada Rural Desconectada", Level: "PWA Sync • Atención en Terreno", Municipality: "Zonas Rurales Valle Norte",
			Status: "En Espera", Description: "Módulo de atención rural en veredas del norte del Valle. Almacenamiento IndexedDB y sincronización por lotes."},
	}
}
