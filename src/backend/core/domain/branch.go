package domain

import "strings"

// BranchCatalog lista las sedes institucionales que pueden registrar su administrador desde el login.
// Coincide con las sedes iniciales del cliente web (src/frontend/src/services/branches.js).
var BranchCatalog = []string{
	"Sede Cartago - Hospital Central",
	"Sede La Unión - Urgencias",
	"Sede Tuluá - Ambulatoria",
	"Brigada Rural Desconectada",
}

// CanonicalBranch devuelve el nombre oficial de la sede si pertenece al catalogo (sin distinguir mayusculas).
func CanonicalBranch(name string) (string, bool) {
	clean := strings.TrimSpace(name)
	for _, b := range BranchCatalog {
		if strings.EqualFold(b, clean) {
			return b, true
		}
	}
	return "", false
}

// BranchAdminStatus indica si una sede del catalogo ya tiene administrador.
type BranchAdminStatus struct {
	Name     string `json:"name"`
	HasAdmin bool   `json:"has_admin"`
}

// SetupStatus resume lo que el login puede ofrecer: registro del Encargado de TI y de administradores por sede.
type SetupStatus struct {
	TIRegistered bool `json:"ti_registered"`
	// TISetupEnabled indica si el servidor tiene TI_SETUP_CODE: sin el no se puede registrar TI desde el login
	TISetupEnabled bool                `json:"ti_setup_enabled"`
	Branches     []BranchAdminStatus `json:"branches"`
}

// PublicBranch es una sede con ubicacion fija que atiende solicitudes de primera cita desde el portal del paciente.
type PublicBranch struct {
	Name         string  `json:"name"`
	Municipality string  `json:"municipality"`
	Address      string  `json:"address"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
}

// PublicBranches son las sedes que el portal del paciente ofrece. La Brigada Rural no se incluye porque no tiene
// ubicacion fija. Las coordenadas corresponden al casco urbano de cada municipio.
var PublicBranches = []PublicBranch{
	{Name: "Sede Cartago - Hospital Central", Municipality: "Cartago, Valle del Cauca", Address: "Casco urbano de Cartago", Latitude: 4.7464, Longitude: -75.9117},
	{Name: "Sede La Unión - Urgencias", Municipality: "La Unión, Valle del Cauca", Address: "Casco urbano de La Unión", Latitude: 4.5322, Longitude: -76.1036},
	{Name: "Sede Tuluá - Ambulatoria", Municipality: "Tuluá, Valle del Cauca", Address: "Casco urbano de Tuluá", Latitude: 4.0847, Longitude: -76.1954},
}

// PublicBranchByName busca una sede del portal del paciente (sin distinguir mayusculas).
func PublicBranchByName(name string) (PublicBranch, bool) {
	clean := strings.TrimSpace(name)
	for _, b := range PublicBranches {
		if strings.EqualFold(b.Name, clean) {
			return b, true
		}
	}
	return PublicBranch{}, false
}

// BranchMatches indica si la sede registrada en una cuenta corresponde a una sede del catalogo. Tolera sufijos
// como "Sede Cartago - Hospital Central (Nivel II)".
func BranchMatches(userBranch, catalogName string) bool {
	u := strings.ToLower(strings.TrimSpace(userBranch))
	c := strings.ToLower(strings.TrimSpace(catalogName))
	return u != "" && c != "" && strings.HasPrefix(u, c)
}
