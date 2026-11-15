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
