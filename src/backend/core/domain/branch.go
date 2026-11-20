package domain

import "strings"

// CanonicalBranchIn devuelve el nombre oficial de la sede si esta en la lista (sin distinguir mayusculas).
func CanonicalBranchIn(branches []Branch, name string) (string, bool) {
	clean := strings.TrimSpace(name)
	for _, b := range branches {
		if strings.EqualFold(b.Name, clean) {
			return b.Name, true
		}
	}
	return "", false
}

// BranchNamed busca una sede por nombre (sin distinguir mayusculas).
func BranchNamed(branches []Branch, name string) (Branch, bool) {
	clean := strings.TrimSpace(name)
	for _, b := range branches {
		if strings.EqualFold(b.Name, clean) {
			return b, true
		}
	}
	return Branch{}, false
}

// BranchMatches indica si la sede registrada en una cuenta corresponde a una sede del catalogo. Tolera sufijos
// como "Sede Cartago - Hospital Central (Nivel II)".
func BranchMatches(userBranch, catalogName string) bool {
	u := strings.ToLower(strings.TrimSpace(userBranch))
	c := strings.ToLower(strings.TrimSpace(catalogName))
	return u != "" && c != "" && strings.HasPrefix(u, c)
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
	Branches       []BranchAdminStatus `json:"branches"`
}
