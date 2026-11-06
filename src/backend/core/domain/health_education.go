package domain

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrInvalidPostTitle     = errors.New("el título de la publicación es obligatorio (mínimo 3 caracteres)")
	ErrInvalidPostCategory  = errors.New("la categoría no pertenece al catálogo de concientización y salud")
	ErrInvalidPostContent   = errors.New("el contenido de la publicación es obligatorio")
	ErrVideoDurationTooLong  = errors.New("los videos subidos no pueden exceder 2 minutos (120 segundos) de duración")
	ErrPostNotFound         = errors.New("publicación educativa no encontrada")
)

// HealthPostCategory define las categorías del muro informativo para concientización ciudadana.
type HealthPostCategory string

const (
	CategoryConsejos     HealthPostCategory = "CONSEJOS"     // Consejos de salud y bienestar
	CategoryAyudas       HealthPostCategory = "AYUDAS"       // Guías y ayudas asistenciales
	CategoryEnfermedades HealthPostCategory = "ENFERMEDADES" // Prevención y detección temprana de enfermedades
	CategoryVacunas      HealthPostCategory = "VACUNAS"      // Esquema y jornadas de vacunación
	CategoryEstiloDeVida HealthPostCategory = "ESTILO_DE_VIDA" // Nutrición, actividad física y calidad de vida
	CategoryPrevencion   HealthPostCategory = "PREVENCION"   // Prevención en salud pública y autocuidado
)

// IsValid valida si la categoría pertenece al catálogo permitido.
func (c HealthPostCategory) IsValid() bool {
	switch c {
	case CategoryConsejos, CategoryAyudas, CategoryEnfermedades, CategoryVacunas, CategoryEstiloDeVida, CategoryPrevencion:
		return true
	default:
		return false
	}
}

// HealthEducationPost representa una publicación o tarjeta del Muro de Concientización y Salud (Kit Informático).
type HealthEducationPost struct {
	ID               string             `json:"id"`
	DoctorID         string             `json:"doctor_id"`
	AuthorName       string             `json:"author_name"`
	AuthorSpecialty  string             `json:"author_specialty"`
	Title            string             `json:"title"`
	Category         HealthPostCategory `json:"category"`
	Summary          string             `json:"summary"`
	Content          string             `json:"content"`
	ImageURL         string             `json:"image_url,omitempty"`
	YoutubeURL       string             `json:"youtube_url,omitempty"`
	VideoURL         string             `json:"video_url,omitempty"`
	VideoDurationSec int                `json:"video_duration_seconds,omitempty"`
	IsPublished      bool               `json:"is_published"`
	CreatedAt        time.Time          `json:"created_at"`
	UpdatedAt        time.Time          `json:"updated_at"`
}

// Validate verifica las reglas de negocio del artículo educativo.
func (p *HealthEducationPost) Validate() error {
	if len(strings.TrimSpace(p.Title)) < 3 {
		return ErrInvalidPostTitle
	}
	if !p.Category.IsValid() {
		return ErrInvalidPostCategory
	}
	if len(strings.TrimSpace(p.Content)) == 0 {
		return ErrInvalidPostContent
	}
	// Restricción: Videos cortos máximo de 2 minutos (120 segundos)
	if p.VideoDurationSec > 120 {
		return ErrVideoDurationTooLong
	}
	return nil
}

