package backend_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	httpadapter "saludconecta-backend/adapters/http"
	"saludconecta-backend/adapters/http/handlers"
	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
	"saludconecta-backend/core/services"
	"saludconecta-backend/pkg/crypto"
)

type qualityTestEnv struct {
	ctx       context.Context
	store     *memory.DataStore
	users     ports.UserRepository
	patients  ports.PatientRepository
	records   ports.ClinicalRecordRepository
	triage    ports.TriageRepository
	presc     ports.PrescriptionRepository
	auth      ports.AuthService
	clinical  ports.ClinicalRecordService
	triageSvc ports.TriageService
	prescSvc  ports.PrescriptionService
	app       *fiber.App
}

func newQualityTestEnv(t *testing.T) *qualityTestEnv {
	t.Helper()
	store := memory.NewDataStore()
	userRepo := memory.NewUserMemoryRepo(store)
	patientRepo := memory.NewPatientMemoryRepo(store)
	recordRepo := memory.NewClinicalRecordMemoryRepo(store)
	triageRepo := memory.NewTriageMemoryRepo(store)
	prescRepo := memory.NewPrescriptionMemoryRepo(store)
	auditRepo := memory.NewAuditMemoryRepo(store)

	authSvc := services.NewAuthService(userRepo, jwtTestSecret, time.Hour)
	clinicalSvc := services.NewClinicalRecordService(recordRepo, patientRepo, userRepo)
	triageSvc := services.NewTriageService(triageRepo, patientRepo)
	prescSvc := services.NewPrescriptionService(prescRepo, recordRepo, patientRepo)

	app := fiber.New()
	httpadapter.SetupRoutes(app, httpadapter.RouterConfig{
		AuthHandler:           handlers.NewAuthHandler(authSvc),
		AdminHandler:          handlers.NewAdminHandler(services.NewAdminService(userRepo, auditRepo)),
		PatientHandler:        handlers.NewPatientHandler(services.NewPatientService(patientRepo)),
		TriageHandler:         handlers.NewTriageHandler(triageSvc),
		ClinicalRecordHandler: handlers.NewClinicalRecordHandler(clinicalSvc, patientRepo, prescRepo, nil, nil),
		PrescriptionHandler:   handlers.NewPrescriptionHandler(prescSvc),
		Sessions:              authSvc,
		JWTSecret:             jwtTestSecret,
	})

	return &qualityTestEnv{
		ctx:       context.Background(),
		store:     store,
		users:     userRepo,
		patients:  patientRepo,
		records:   recordRepo,
		triage:    triageRepo,
		presc:     prescRepo,
		auth:      authSvc,
		clinical:  clinicalSvc,
		triageSvc: triageSvc,
		prescSvc:  prescSvc,
		app:       app,
	}
}

func (e *qualityTestEnv) addTestUser(t *testing.T, id string, roleID int, email, password string, license string, active bool) {
	t.Helper()
	hash, err := crypto.HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	u := &domain.User{
		ID: id, RoleID: roleID, RoleName: domain.RoleNameByID(roleID), FullName: id, Email: email,
		PasswordHash: hash, ProfessionalCard: license, IsActive: active,
	}
	if err := e.users.Create(e.ctx, u); err != nil {
		t.Fatal(err)
	}
}

func (e *qualityTestEnv) callHTTP(t *testing.T, method, path, token string, body interface{}) (int, map[string]interface{}) {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		reader = bytes.NewReader(raw)
	} else {
		reader = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := e.app.Test(req, 3000)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var out map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&out)
	return resp.StatusCode, out
}

// TestRegression_ClosedRecordImmutability verifica la mitigacion del defecto DEF-01:
// Un folio clinico cerrado (is_closed = true) es estrictamente inmutable bajo la Res. 1995/1999.
// Cualquier intento de re-cierre, modificacion o alteracion debe ser rechazado en la capa de servicio
// con domain.ErrRecordAlreadyClosed y en la capa HTTP con codigo 403 Forbidden.
func TestRegression_ClosedRecordImmutability(t *testing.T) {
	env := newQualityTestEnv(t)

	// 1. Crear entidades requeridas
	patient := newPatientFixture("p-reg-immut-01", "1098765432")
	if err := env.patients.Create(env.ctx, patient); err != nil {
		t.Fatalf("error creando paciente: %v", err)
	}

	env.addTestUser(t, "doc-reg-immut-01", 2, "doc_immut@saludconecta.ips.gov.co", "Doctor2026*Secure!", "RM-10987-VALLE", true)

	draft := &domain.ClinicalRecord{
		PatientID:            patient.ID,
		DoctorID:             "doc-reg-immut-01",
		Anamnesis:            "Paciente refiere sintomatologia respiratoria aguda",
		PhysicalExam:         "Murmullo vesicular disminuido en base derecha",
		CIE11Code:            "CA40",
		DiagnosisDescription: "Neumonia bacteriana adquirida en la comunidad",
		TreatmentPlan:        "Manejo antibiotico y reposo",
	}

	created, err := env.clinical.CreateDraft(env.ctx, draft)
	if err != nil {
		t.Fatalf("error creando borrador: %v", err)
	}

	// 2. Cierre y firma digital inicial del folio
	signatureToken := "token-firma-forense-sha256-original"
	closedRecord, err := env.clinical.CloseAndSign(env.ctx, created.ID, "doc-reg-immut-01", signatureToken)
	if err != nil {
		t.Fatalf("error al cerrar folio: %v", err)
	}

	if !closedRecord.IsClosed || closedRecord.HashSHA256 == nil {
		t.Fatalf("el folio no quedo debidamente cerrado con firma criptografica")
	}

	// 3. Verificacion a nivel de Servicio: Intento de re-cierre o alteracion
	_, errSecondClose := env.clinical.CloseAndSign(env.ctx, created.ID, "doc-reg-immut-01", "token-intento-posterior")
	if errSecondClose == nil || !errors.Is(errSecondClose, domain.ErrRecordAlreadyClosed) {
		t.Fatalf("se esperaba rechazo con ErrRecordAlreadyClosed, pero se obtuvo: %v", errSecondClose)
	}

	// 4. Verificacion a nivel HTTP (403 Forbidden):
	tokenDoc, _, errLogin := env.auth.Login(env.ctx, "doc_immut@saludconecta.ips.gov.co", "Doctor2026*Secure!", "")
	if errLogin != nil {
		t.Fatalf("error autenticando facultativo: %v", errLogin)
	}

	closePayload := map[string]string{
		"signature_token": "token-intento-modificacion-ilegal",
	}
	status, _ := env.callHTTP(t, http.MethodPost, "/api/v1/clinical-records/"+created.ID+"/close", tokenDoc, closePayload)
	if status != http.StatusForbidden {
		t.Fatalf("se esperaba codigo HTTP 403 Forbidden al modificar/re-cerrar folio cerrado, pero se obtuvo: %d", status)
	}
}

// TestRegression_CrossAllergyInterception verifica la mitigacion del defecto DEF-03:
// Cruce farmacologico por familias ATC y normalizacion de tildes (Betalactamicos / Penicilinas).
// Cuando un paciente tiene alergia a 'Penicilinas', la prescripcion de 'Amoxicilina' debe ser interceptada.
func TestRegression_CrossAllergyInterception(t *testing.T) {
	env := newQualityTestEnv(t)

	// 1. Paciente con antecedente alergico severo a "Penicilinas"
	patient := newPatientFixture("p-reg-allergy-01", "20445566")
	if err := env.patients.Create(env.ctx, patient); err != nil {
		t.Fatalf("error creando paciente: %v", err)
	}

	allergy := &domain.PatientAllergy{
		PatientID:        patient.ID,
		ActiveIngredient: "Penicilinas", // Declarado como Penicilinas (plural / con mayuscula)
		Severity:         domain.SeveritySevere,
		Notes:            "Reaccion anafilactica confirmada",
		CreatedAt:        time.Now().UTC(),
	}
	if err := env.patients.AddPatientAllergy(env.ctx, allergy); err != nil {
		t.Fatalf("error registrando alergia: %v", err)
	}

	// 2. Folio clinico del paciente
	record := &domain.ClinicalRecord{
		ID:        "cr-reg-allergy-01",
		PatientID: patient.ID,
		DoctorID:  "doc-reg-01",
		Anamnesis: "Infeccion respiratoria alta",
		IsClosed:  false,
		CreatedAt: time.Now().UTC(),
	}
	if err := env.records.Create(env.ctx, record); err != nil {
		t.Fatalf("error creando folio: %v", err)
	}

	// 3. Medicamento en catalogo: Amoxicilina (Principio activo perteneciente a familia Betalactamicos / Penicilina)
	medAmox := &domain.MedicationCatalog{
		ID:                 201,
		CUMCode:            "19902030-01",
		GenericName:        "Amoxicilina",
		CommercialName:     "Amoxil 500mg",
		ActiveIngredient:   "AMOXICILINA",
		Concentration:      "500 mg",
		PharmaceuticalForm: "Capsula",
		StockQuantity:      200,
	}
	startMedInjection(env.store, medAmox)

	// 4. Intento de prescripcion de Amoxicilina -> Debe ser interceptado inmediatamente
	prescConflictiva := &domain.Prescription{
		ClinicalRecordID: record.ID,
		PatientID:        patient.ID,
		DoctorID:         "doc-reg-01",
		Items: []domain.PrescriptionItem{
			{
				MedicationID:   medAmox.ID,
				Dosage:         "500 mg cada 8 horas",
				FrequencyHours: 8,
				DurationDays:   7,
				TotalQuantity:  21,
			},
		},
	}

	_, errPresc := env.prescSvc.IssuePrescription(env.ctx, prescConflictiva)
	if errPresc == nil {
		t.Fatal("se esperaba que la prescripcion de Amoxicilina fuera interceptada por alergia a Penicilinas, pero paso sin error")
	}

	var allergyErr *domain.AllergyConflictError
	if !errors.As(errPresc, &allergyErr) {
		t.Fatalf("se esperaba error de tipo *domain.AllergyConflictError, pero se obtuvo: %v", errPresc)
	}
}

// TestRegression_GlasgowBoundaryValidation verifica la mitigacion del defecto DEF-04:
// La Escala de Coma de Glasgow debe restringirse estrictamente al intervalo cerrado [3, 15].
// Valores fuera de limite (ej. 2 o 16) deben ser rechazados con domain.ErrInvalidGlasgowScore.
func TestRegression_GlasgowBoundaryValidation(t *testing.T) {
	env := newQualityTestEnv(t)

	patient := newPatientFixture("p-reg-glasgow-01", "30998877")
	if err := env.patients.Create(env.ctx, patient); err != nil {
		t.Fatalf("error creando paciente: %v", err)
	}

	baseRecord := func(glasgow int) *domain.TriageRecord {
		return &domain.TriageRecord{
			PatientID:             patient.ID,
			EvaluatedBy:           "u-nurse-reg-01",
			SystolicBP:            120,
			DiastolicBP:           80,
			HeartRate:             75,
			RespiratoryRate:       18,
			OxygenSaturation:      98,
			BodyTemperature:       36.5,
			GlasgowScore:          glasgow,
			ReasonForConsultation: "Prueba de limites de Glasgow",
		}
	}

	casos := []struct {
		nombre       string
		glasgowScore int
		esperaError  bool
		errEsperado  error
	}{
		{
			nombre:       "Limite inferior invalido: Glasgow = 2 (Rechazado)",
			glasgowScore: 2,
			esperaError:  true,
			errEsperado:  domain.ErrInvalidGlasgowScore,
		},
		{
			nombre:       "Limite inferior valido: Glasgow = 3 (Aceptado)",
			glasgowScore: 3,
			esperaError:  false,
			errEsperado:  nil,
		},
		{
			nombre:       "Limite superior valido: Glasgow = 15 (Aceptado)",
			glasgowScore: 15,
			esperaError:  false,
			errEsperado:  nil,
		},
		{
			nombre:       "Limite superior invalido: Glasgow = 16 (Rechazado)",
			glasgowScore: 16,
			esperaError:  true,
			errEsperado:  domain.ErrInvalidGlasgowScore,
		},
	}

	for _, tc := range casos {
		t.Run(tc.nombre, func(t *testing.T) {
			rec := baseRecord(tc.glasgowScore)
			_, err := env.triageSvc.RegisterTriage(env.ctx, rec)

			if tc.esperaError {
				if err == nil {
					t.Fatalf("se esperaba rechazo para Glasgow=%d, pero no hubo error", tc.glasgowScore)
				}
				if !errors.Is(err, tc.errEsperado) {
					t.Fatalf("se esperaba error %v, pero se obtuvo: %v", tc.errEsperado, err)
				}
			} else {
				if err != nil {
					t.Fatalf("se esperaba registro exitoso para Glasgow=%d, pero fallo con: %v", tc.glasgowScore, err)
				}
			}
		})
	}
}

// TestRegression_HTTPTriageSecurityIntegration verifica la seguridad del endpoint de triaje (/api/v2/triage y /api/v1/triage):
// 1. Rechaza peticiones sin token JWT con 401 Unauthorized.
// 2. Rechaza peticiones con usuarios sin rol asistencial (ej. AUDITOR) con 403 Forbidden.
// 3. Acepta peticiones emitidas por personal con rol asistencial autorizado (MEDICO o ENFERMERO).
func TestRegression_HTTPTriageSecurityIntegration(t *testing.T) {
	env := newQualityTestEnv(t)

	// Crear usuarios con roles asistenciales y no asistenciales
	env.addTestUser(t, "usr-nurse-reg", 3, "enfermero_reg@saludconecta.ips.gov.co", "Enfermero2026*Secure!", "ENF-101", true)
	env.addTestUser(t, "usr-auditor-reg", 5, "auditor_reg@saludconecta.ips.gov.co", "Auditor2026*Secure!", "AUD-101", true)

	tokenNurse, _, err := env.auth.Login(env.ctx, "enfermero_reg@saludconecta.ips.gov.co", "Enfermero2026*Secure!", "")
	if err != nil {
		t.Fatalf("error al autenticar enfermero: %v", err)
	}

	tokenAuditor, _, err := env.auth.Login(env.ctx, "auditor_reg@saludconecta.ips.gov.co", "Auditor2026*Secure!", "")
	if err != nil {
		t.Fatalf("error al autenticar auditor: %v", err)
	}

	triagePayload := map[string]interface{}{
		"patient_id":              "p-reg-triage-http",
		"systolic_bp":             120,
		"diastolic_bp":            80,
		"heart_rate":              75,
		"respiratory_rate":        18,
		"oxygen_saturation":       98,
		"body_temperature":        36.6,
		"glasgow_score":           15,
		"reason_for_consultation": "Atencion prioritaria",
	}

	t.Run("Endpoint /api/v2/triage rechaza peticion sin token con 401 Unauthorized", func(t *testing.T) {
		status, _ := env.callHTTP(t, http.MethodGet, "/api/v2/triage", "", nil)
		if status != http.StatusUnauthorized {
			t.Fatalf("se esperaba codigo 401 Unauthorized para peticion sin token, pero se obtuvo: %d", status)
		}
	})

	t.Run("Endpoint /api/v2/triage rechaza rol no asistencial (AUDITOR) con 403 Forbidden", func(t *testing.T) {
		status, _ := env.callHTTP(t, http.MethodGet, "/api/v2/triage", tokenAuditor, nil)
		if status != http.StatusForbidden {
			t.Fatalf("se esperaba codigo 403 Forbidden para rol AUDITOR, pero se obtuvo: %d", status)
		}
	})

	t.Run("Endpoint /api/v2/triage acepta solicitud de usuario asistencial (ENFERMERO)", func(t *testing.T) {
		status, _ := env.callHTTP(t, http.MethodGet, "/api/v2/triage", tokenNurse, nil)
		if status != http.StatusOK {
			t.Fatalf("se esperaba codigo 200 OK para rol ENFERMERO en cola de triaje, pero se obtuvo: %d", status)
		}
	})

	t.Run("Endpoint /api/v1/triage mantiene compatibilidad y protege cola con 401 sin token", func(t *testing.T) {
		status, _ := env.callHTTP(t, http.MethodPost, "/api/v1/triage", "", triagePayload)
		if status != http.StatusUnauthorized {
			t.Fatalf("se esperaba 401 en /api/v1/triage sin token, pero se obtuvo: %d", status)
		}
	})
}
