package backend_test

import (
	"net/http"
	"testing"
)

var admissionPayload = map[string]interface{}{
	"document_type":   "CC",
	"document_number": "55667788",
	"first_name":      "Marta",
	"last_name":       "Gomez",
	"birth_date":      "1985-03-14",
	"gender":          "F",
	"blood_type":      "O+",
	"eps_name":        "Sura EPS",
}

// El rol ADMISION puede admitir pacientes y registrar alergias; roles ajenos quedan fuera.
func TestAdmissionPatientAndAllergyAPI(t *testing.T) {
	env := newAuthEnv(t)
	env.addUser(t, "adm-1", 4, "admision@example.com", "ClaveAdmision2026*", true)
	env.addUser(t, "aud-1", 5, "auditor@example.com", "ClaveAuditor2026*", true)

	admision, _, err := env.auth.Login(env.ctx, "admision@example.com", "ClaveAdmision2026*", "")
	if err != nil {
		t.Fatal(err)
	}
	auditor, _, _ := env.auth.Login(env.ctx, "auditor@example.com", "ClaveAuditor2026*", "")

	if status, _ := env.call(t, http.MethodPost, "/api/v1/patients", "", admissionPayload); status != http.StatusUnauthorized {
		t.Fatalf("sin sesion debe rechazarse, status=%d", status)
	}
	if status, _ := env.call(t, http.MethodPost, "/api/v1/patients", auditor, admissionPayload); status != http.StatusForbidden {
		t.Fatalf("el auditor no admite pacientes, status=%d", status)
	}

	status, created := env.call(t, http.MethodPost, "/api/v1/patients", admision, admissionPayload)
	if status != http.StatusCreated {
		t.Fatalf("la admision debia crear el paciente, status=%d body=%v", status, created)
	}
	id, _ := created["id"].(string)
	if id == "" || created["birth_date"] != "1985-03-14" {
		t.Fatalf("respuesta incompleta: %v", created)
	}

	if status, _ := env.call(t, http.MethodPost, "/api/v1/patients", admision, admissionPayload); status != http.StatusConflict {
		t.Fatalf("el documento duplicado debe responder 409, status=%d", status)
	}

	invalid := map[string]interface{}{}
	for k, v := range admissionPayload {
		invalid[k] = v
	}
	invalid["document_number"] = "99990000"
	invalid["blood_type"] = "Z+"
	if status, _ := env.call(t, http.MethodPost, "/api/v1/patients", admision, invalid); status != http.StatusUnprocessableEntity {
		t.Fatalf("un grupo sanguineo invalido debe responder 422, status=%d", status)
	}

	allergy := map[string]string{"active_ingredient": "Penicilina", "severity": "SEVERA", "notes": "anafilaxia"}
	if status, _ := env.call(t, http.MethodPost, "/api/v1/patients/"+id+"/allergies", admision, allergy); status != http.StatusCreated {
		t.Fatalf("la alergia debia registrarse, status=%d", status)
	}
	if status, _ := env.call(t, http.MethodPost, "/api/v1/patients/"+id+"/allergies", admision, map[string]string{"active_ingredient": "X", "severity": "FATAL"}); status != http.StatusUnprocessableEntity {
		t.Fatalf("una severidad fuera del catalogo debe responder 422, status=%d", status)
	}

	status, fetched := env.call(t, http.MethodGet, "/api/v1/patients/"+id, admision, nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d", status)
	}
	if allergies, _ := fetched["allergies"].([]interface{}); len(allergies) != 1 {
		t.Fatalf("el paciente debe incluir su alergia: %v", fetched)
	}

	if status, _ := env.call(t, http.MethodGet, "/api/v1/patients/lookup?document_type=CC&document_number=55667788", admision, nil); status != http.StatusOK {
		t.Fatalf("la busqueda por documento debia encontrar al paciente, status=%d", status)
	}
	if status, _ := env.call(t, http.MethodGet, "/api/v1/patients/no-existe", admision, nil); status != http.StatusNotFound {
		t.Fatalf("status=%d", status)
	}
}
