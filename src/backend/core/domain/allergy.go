package domain

import (
	"strings"
	"unicode"
)

// allergyAccents reemplaza vocales acentuadas y dieresis para comparar principios activos sin tildes.
var allergyAccents = strings.NewReplacer(
	"Á", "A", "À", "A", "Ä", "A", "Â", "A",
	"É", "E", "È", "E", "Ë", "E", "Ê", "E",
	"Í", "I", "Ì", "I", "Ï", "I", "Î", "I",
	"Ó", "O", "Ò", "O", "Ö", "O", "Ô", "O",
	"Ú", "U", "Ù", "U", "Ü", "U", "Û", "U",
)

// allergyClassAliases unifica sinonimos y plurales de familias farmacologicas.
var allergyClassAliases = map[string]string{
	"BETALACTAMICO":    "BETALACTAMICOS",
	"BETALACTAMICOS":   "BETALACTAMICOS",
	"BETALACTAMA":      "BETALACTAMICOS",
	"BETALACTAMAS":     "BETALACTAMICOS",
	"PENICILINA":       "PENICILINA",
	"PENICILINAS":      "PENICILINA",
	"CEFALOSPORINA":    "CEFALOSPORINA",
	"CEFALOSPORINAS":   "CEFALOSPORINA",
	"CARBAPENEM":       "CARBAPENEM",
	"CARBAPENEMICOS":   "CARBAPENEM",
	"CARBAPENEMES":     "CARBAPENEM",
	"AINE":             "AINE",
	"AINES":            "AINE",
	"SULFA":            "SULFONAMIDA",
	"SULFAS":           "SULFONAMIDA",
	"SULFONAMIDA":      "SULFONAMIDA",
	"SULFONAMIDAS":     "SULFONAMIDA",
	"MACROLIDO":        "MACROLIDO",
	"MACROLIDOS":       "MACROLIDO",
	"QUINOLONA":        "QUINOLONA",
	"QUINOLONAS":       "QUINOLONA",
	"FLUOROQUINOLONA":  "QUINOLONA",
	"FLUOROQUINOLONAS": "QUINOLONA",
	"ASPIRINA":         "ACIDO ACETILSALICILICO",
	"AAS":              "ACIDO ACETILSALICILICO",
	"ACETAMINOFEN":     "PARACETAMOL",
	"ACETAMINOFENO":    "PARACETAMOL",
	"DIPIRONA":         "METAMIZOL",
	"NOVALGINA":        "METAMIZOL",
}

var nsaidIngredients = map[string]bool{
	"ACIDO ACETILSALICILICO": true,
	"IBUPROFENO":             true,
	"NAPROXENO":              true,
	"DICLOFENACO":            true,
	"KETOROLACO":             true,
	"INDOMETACINA":           true,
	"PIROXICAM":              true,
	"MELOXICAM":              true,
	"CELECOXIB":              true,
	"ETORICOXIB":             true,
	"KETOPROFENO":            true,
}

// NormalizeIngredient pasa a mayusculas, retira tildes y colapsa espacios y signos para comparar principios activos.
func NormalizeIngredient(value string) string {
	upper := allergyAccents.Replace(strings.ToUpper(strings.TrimSpace(value)))
	var b strings.Builder
	lastSpace := true
	for _, r := range upper {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
			lastSpace = false
			continue
		}
		if !lastSpace {
			b.WriteRune(' ')
			lastSpace = true
		}
	}
	return strings.TrimSpace(b.String())
}

// ingredientComponents separa asociaciones como "AMOXICILINA + ACIDO CLAVULANICO" en componentes individuales.
func ingredientComponents(value string) []string {
	upper := allergyAccents.Replace(strings.ToUpper(value))
	parts := strings.FieldsFunc(upper, func(r rune) bool {
		return r == '+' || r == '/' || r == ',' || r == ';' || r == '&'
	})
	var components []string
	for _, part := range parts {
		normalized := NormalizeIngredient(part)
		if normalized == "" {
			continue
		}
		components = append(components, strings.Split(normalized, " Y ")...)
	}
	if len(components) == 0 {
		return nil
	}
	return components
}

// canonicalToken resuelve alias y plurales hacia el identificador canonico del componente o familia.
func canonicalToken(token string) string {
	token = strings.TrimSpace(token)
	if canon, ok := allergyClassAliases[token]; ok {
		return canon
	}
	return token
}

// ingredientClasses devuelve las familias farmacologicas a las que pertenece un componente.
func ingredientClasses(component string) []string {
	var classes []string
	switch {
	case strings.Contains(component, "CILINA") || strings.HasPrefix(component, "PENICILIN"):
		classes = append(classes, "PENICILINA", "BETALACTAMICOS")
	case strings.HasPrefix(component, "CEF") || strings.HasPrefix(component, "CEPH"):
		classes = append(classes, "CEFALOSPORINA", "BETALACTAMICOS")
	case strings.HasSuffix(component, "PENEM"):
		classes = append(classes, "CARBAPENEM", "BETALACTAMICOS")
	case component == "AZTREONAM":
		classes = append(classes, "BETALACTAMICOS")
	case strings.HasSuffix(component, "FLOXACINO") || strings.HasSuffix(component, "FLOXACINA") || strings.HasPrefix(component, "NORFLOXACIN"):
		classes = append(classes, "QUINOLONA")
	case strings.HasSuffix(component, "MICINA") && (strings.HasPrefix(component, "ERITRO") || strings.HasPrefix(component, "AZITRO") || strings.HasPrefix(component, "CLARITRO")):
		classes = append(classes, "MACROLIDO")
	case strings.HasPrefix(component, "SULFA") || component == "TRIMETOPRIM SULFAMETOXAZOL" || component == "COTRIMOXAZOL":
		classes = append(classes, "SULFONAMIDA")
	case nsaidIngredients[component]:
		classes = append(classes, "AINE")
	}
	return classes
}

// matchComponents evalua si algun componente del medicamento coincide con el alergeno o con su familia.
func matchComponents(allergenParts []string, drugParts []string) bool {
	for _, allergen := range allergenParts {
		canonAllergen := canonicalToken(allergen)
		allergenClasses := ingredientClasses(canonAllergen)
		for _, drug := range drugParts {
			canonDrug := canonicalToken(drug)
			if canonAllergen == canonDrug ||
				strings.HasPrefix(canonDrug, canonAllergen+" ") ||
				strings.HasPrefix(canonAllergen, canonDrug+" ") {
				return true
			}
			drugClasses := ingredientClasses(canonDrug)
			for _, class := range drugClasses {
				if canonAllergen == class {
					return true
				}
			}
			for _, aClass := range allergenClasses {
				if canonDrug == aClass {
					return true
				}
				for _, dClass := range drugClasses {
					if aClass == dClass {
						return true
					}
				}
			}
		}
	}
	return false
}

// MatchAllergy retorna la primera alergia registrada que contraindica el principio activo indicado.
// Cubre coincidencia exacta sin tildes, pertenencia a familia (penicilina -> amoxicilina) y asociaciones.
func MatchAllergy(allergies []PatientAllergy, ingredients ...string) *PatientAllergy {
	var drugParts []string
	for _, ingredient := range ingredients {
		drugParts = append(drugParts, ingredientComponents(ingredient)...)
	}
	if len(drugParts) == 0 {
		return nil
	}

	for i := range allergies {
		allergenParts := ingredientComponents(allergies[i].ActiveIngredient)
		if matchComponents(allergenParts, drugParts) {
			return &allergies[i]
		}
	}
	return nil
}
