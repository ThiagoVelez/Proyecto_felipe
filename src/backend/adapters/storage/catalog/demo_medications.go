package catalog

import "saludconecta-backend/core/domain"

// DemoMedications retorna el catalogo farmacologico inicial para entornos de desarrollo y demostracion.
// Los codigos llevan el prefijo CUM-DEMO porque no son codigos oficiales: en produccion deben sustituirse
// por la carga oficial del Codigo Unico de Medicamentos (INVIMA).
func DemoMedications() []domain.MedicationCatalog {
	return []domain.MedicationCatalog{
		{CUMCode: "CUM-DEMO-001", CommercialName: "Acetaminofen 500 mg", GenericName: "Acetaminofen", ActiveIngredient: "PARACETAMOL", Concentration: "500 mg", PharmaceuticalForm: "Tableta", StockQuantity: 2000},
		{CUMCode: "CUM-DEMO-002", CommercialName: "Amoxicilina 500 mg", GenericName: "Amoxicilina", ActiveIngredient: "AMOXICILINA", Concentration: "500 mg", PharmaceuticalForm: "Capsula", StockQuantity: 800},
		{CUMCode: "CUM-DEMO-003", CommercialName: "Amoxicilina + Acido clavulanico 875/125 mg", GenericName: "Amoxicilina + Acido clavulanico", ActiveIngredient: "AMOXICILINA + ACIDO CLAVULANICO", Concentration: "875 mg / 125 mg", PharmaceuticalForm: "Tableta", StockQuantity: 600},
		{CUMCode: "CUM-DEMO-004", CommercialName: "Ibuprofeno 400 mg", GenericName: "Ibuprofeno", ActiveIngredient: "IBUPROFENO", Concentration: "400 mg", PharmaceuticalForm: "Tableta", StockQuantity: 1500},
		{CUMCode: "CUM-DEMO-005", CommercialName: "Diclofenaco 50 mg", GenericName: "Diclofenaco", ActiveIngredient: "DICLOFENACO", Concentration: "50 mg", PharmaceuticalForm: "Tableta", StockQuantity: 900},
		{CUMCode: "CUM-DEMO-006", CommercialName: "Omeprazol 20 mg", GenericName: "Omeprazol", ActiveIngredient: "OMEPRAZOL", Concentration: "20 mg", PharmaceuticalForm: "Capsula", StockQuantity: 1200},
		{CUMCode: "CUM-DEMO-007", CommercialName: "Loratadina 10 mg", GenericName: "Loratadina", ActiveIngredient: "LORATADINA", Concentration: "10 mg", PharmaceuticalForm: "Tableta", StockQuantity: 1000},
		{CUMCode: "CUM-DEMO-008", CommercialName: "Cefalexina 500 mg", GenericName: "Cefalexina", ActiveIngredient: "CEFALEXINA", Concentration: "500 mg", PharmaceuticalForm: "Capsula", StockQuantity: 700},
		{CUMCode: "CUM-DEMO-009", CommercialName: "Azitromicina 500 mg", GenericName: "Azitromicina", ActiveIngredient: "AZITROMICINA", Concentration: "500 mg", PharmaceuticalForm: "Tableta", StockQuantity: 500},
		{CUMCode: "CUM-DEMO-010", CommercialName: "Salbutamol 100 mcg", GenericName: "Salbutamol", ActiveIngredient: "SALBUTAMOL", Concentration: "100 mcg/dosis", PharmaceuticalForm: "Inhalador", StockQuantity: 400},
		{CUMCode: "CUM-DEMO-011", CommercialName: "Metformina 850 mg", GenericName: "Metformina", ActiveIngredient: "METFORMINA", Concentration: "850 mg", PharmaceuticalForm: "Tableta", StockQuantity: 1500},
		{CUMCode: "CUM-DEMO-012", CommercialName: "Losartan 50 mg", GenericName: "Losartan", ActiveIngredient: "LOSARTAN", Concentration: "50 mg", PharmaceuticalForm: "Tableta", StockQuantity: 1500},
	}
}
