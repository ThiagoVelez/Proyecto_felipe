package backend_test

import (
	"context"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// TestClinicalRecordImmutabilityAndClosingPolicy evalua el bloqueo legal de folios cerrados (Res. 1995 de 1999).
func TestClinicalRecordImmutabilityAndClosingPolicy(t *testing.T) {
	ds := memory.NewDataStore()
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	patientRepo := memory.NewPatientMemoryRepo(ds)
	userRepo := memory.NewUserMemoryRepo(ds)

	service := services.NewClinicalRecordService(recordRepo, patientRepo, userRepo)
	ctx := context.Background()

	// 1. Registrar paciente y facultativo habilitado
	patient := newPatientFixture("p-hce-01", "71223344")
	_ = patientRepo.Create(ctx, patient)

	doctor := newDoctorFixture("doc-hce-01", "RM-884920")
	_ = userRepo.Create(ctx, doctor)

	// 2. Crear borrador inicial de historia clinica
	draft := &domain.ClinicalRecord{
		PatientID:            patient.ID,
		DoctorID:             doctor.ID,
		Anamnesis:            "Paciente refiere dolor toracico opresivo de 30 minutos de evolucion",
		PhysicalExam:         "Palidez mucocutanea, ruidos cardiacos ritmicos sin soplos",
		CIE11Code:            "BA41", // Sindrome coronario agudo
		DiagnosisDescription: "Angina de pecho inestable",
		TreatmentPlan:        "Monitoreo continuo, electrocardiograma urgente, acido acetilsalicilico",
	}

	created, err := service.CreateDraft(ctx, draft)
	if err != nil {
		t.Fatalf("Fallo inesperado creando borrador de folio: %v", err)
	}

	if created.IsClosed {
		t.Fatal("Un folio en estado borrador no debe encontrarse cerrado")
	}

	// 3. Firma y cierre legal del folio clinico
	signatureToken := "token-firma-digital-sha256-doc-01"
	closedRecord, err := service.CloseAndSign(ctx, created.ID, doctor.ID, signatureToken)
	if err != nil {
		t.Fatalf("Error durante la firma y cierre del folio: %v", err)
	}

	if !closedRecord.IsClosed || closedRecord.HashSHA256 == nil {
		t.Fatal("El folio firmado debe marcarse cerrado y contener un hash SHA-256 valido")
	}

	// 4. Intento de alteracion o re-cierre ilegal (Debe ser denegado por inmutabilidad)
	_, errSecondClose := service.CloseAndSign(ctx, created.ID, doctor.ID, "nuevo-intento-token")
	if errSecondClose == nil || errSecondClose != domain.ErrRecordAlreadyClosed {
		t.Fatalf("Se esperaba rechazo por inmutabilidad domain.ErrRecordAlreadyClosed, pero se obtuvo: %v", errSecondClose)
	}

	// 5. Verificacion de adicion permitida: Nota aclaratoria legal
	note := "Se recibe reporte de troponinas I con elevacion en 0.45 ng/mL; se traslada a hemodinamia"
	errClarification := service.AddClarification(ctx, created.ID, doctor.ID, note)
	if errClarification != nil {
		t.Fatalf("Fallo inesperado al anexar nota aclaratoria valida: %v", errClarification)
	}

	// 6. Validar integridad de la cadena SHA-256 del folio
	validIntegrity, errVerify := service.VerifyIntegrity(ctx, created.ID)
	if errVerify != nil || !validIntegrity {
		t.Fatalf("La verificacion matematica del hash criptografico SHA-256 fallo: valid=%v, err=%v", validIntegrity, errVerify)
	}
}
