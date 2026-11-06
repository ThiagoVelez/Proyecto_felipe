package backend_test

import (
	"context"
	"errors"
	"testing"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// TestAnatomicalNotesCreationAndDoctorLicensing evalua que solo medicos habilitados puedan crear notas anatomicas.
func TestAnatomicalNotesCreationAndDoctorLicensing(t *testing.T) {
	ds := memory.NewDataStore()
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	patientRepo := memory.NewPatientMemoryRepo(ds)
	userRepo := memory.NewUserMemoryRepo(ds)

	service := services.NewClinicalRecordService(recordRepo, patientRepo, userRepo)
	ctx := context.Background()

	patient := newPatientFixture("p-anat-01", "1020304050")
	_ = patientRepo.Create(ctx, patient)

	doctor := newDoctorFixture("doc-anat-01", "RM-774411")
	_ = userRepo.Create(ctx, doctor)

	nurse := newNurseFixture("nurse-anat-01", "ENF-992211")
	_ = userRepo.Create(ctx, nurse)

	// Medico registrado crea nota anatomica valida
	note := &domain.ClinicalAnatomicalNote{
		PatientID:         patient.ID,
		DoctorID:          doctor.ID,
		StructureKey:      "heart",
		StructureName:     "Corazón y Válvula Aórtica",
		Layer:             domain.LayerOrgan,
		ViewOrientation:   domain.OrientationAnterior,
		CoordinatesX:      195,
		CoordinatesY:      140,
		PainLevel:         7,
		DoctorObservation: "Soplo sistólico en foco aórtico con irradiación a carótidas",
		PreliminaryCIE11:  "BA00",
	}

	created, err := service.AddAnatomicalNote(ctx, note)
	if err != nil {
		t.Fatalf("Fallo inesperado creando nota anatomica: %v", err)
	}
	if created.ID == "" || created.DoctorName == "" {
		t.Fatal("La nota anatomica debe incluir ID generado y nombre del facultativo")
	}

	// Intento de creacion de nota anatomica por enfermero (debe ser denegado por rol)
	nurseNote := &domain.ClinicalAnatomicalNote{
		PatientID:         patient.ID,
		DoctorID:          nurse.ID,
		StructureKey:      "heart",
		StructureName:     "Corazón",
		Layer:             domain.LayerOrgan,
		ViewOrientation:   domain.OrientationAnterior,
		CoordinatesX:      195,
		CoordinatesY:      140,
		PainLevel:         5,
		DoctorObservation: "Enfermero intentando redactar nota",
	}
	_, err = service.AddAnatomicalNote(ctx, nurseNote)
	if !errors.Is(err, domain.ErrUnauthorizedRole) {
		t.Fatalf("Se esperaba ErrUnauthorizedRole para el personal de enfermeria, obtenido: %v", err)
	}
}

// TestAnatomicalNotesImmutabilityOnClosedRecord valida que un folio cerrado bloquee adiciones o mutaciones de notas (Res. 1995 de 1999).
func TestAnatomicalNotesImmutabilityOnClosedRecord(t *testing.T) {
	ds := memory.NewDataStore()
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	patientRepo := memory.NewPatientMemoryRepo(ds)
	userRepo := memory.NewUserMemoryRepo(ds)

	service := services.NewClinicalRecordService(recordRepo, patientRepo, userRepo)
	ctx := context.Background()

	patient := newPatientFixture("p-anat-02", "88223344")
	_ = patientRepo.Create(ctx, patient)

	doctor := newDoctorFixture("doc-anat-02", "RM-552233")
	_ = userRepo.Create(ctx, doctor)

	draft := &domain.ClinicalRecord{
		PatientID:            patient.ID,
		DoctorID:             doctor.ID,
		Anamnesis:            "Dolor lumbar irradiado",
		PhysicalExam:         "Palpacion con dolor en L4-L5",
		CIE11Code:            "FA80",
		DiagnosisDescription: "Lumbalgia mecanica",
		TreatmentPlan:        "Reposo, calor local, AINEs",
	}
	record, err := service.CreateDraft(ctx, draft)
	if err != nil {
		t.Fatalf("Fallo creando borrador: %v", err)
	}

	// Agregar nota durante el borrador
	note := &domain.ClinicalAnatomicalNote{
		ClinicalRecordID:  &record.ID,
		PatientID:         patient.ID,
		DoctorID:          doctor.ID,
		StructureKey:      "lumbar_spine",
		StructureName:     "Columna Lumbar",
		Layer:             domain.LayerBone,
		ViewOrientation:   domain.OrientationPosterior,
		CoordinatesX:      200,
		CoordinatesY:      260,
		PainLevel:         8,
		DoctorObservation: "Puntos gatillo bilaterales a nivel L4-L5",
		PreliminaryCIE11:  "FA80",
	}
	createdNote, err := service.AddAnatomicalNote(ctx, note)
	if err != nil {
		t.Fatalf("Fallo agregando nota a folio borrador: %v", err)
	}

	// Cierre legal del folio
	_, err = service.CloseAndSign(ctx, record.ID, doctor.ID, "firma-digital-sha256")
	if err != nil {
		t.Fatalf("Fallo cerrando folio: %v", err)
	}

	// Intento 1: Agregar nueva nota anatomica al folio ya cerrado (debe fallar)
	newNote := &domain.ClinicalAnatomicalNote{
		ClinicalRecordID:  &record.ID,
		PatientID:         patient.ID,
		DoctorID:          doctor.ID,
		StructureKey:      "trapezius",
		StructureName:     "Musculo Trapecio",
		Layer:             domain.LayerMuscle,
		ViewOrientation:   domain.OrientationPosterior,
		CoordinatesX:      200,
		CoordinatesY:      110,
		PainLevel:         6,
		DoctorObservation: "Contractura cervical asociada",
	}
	_, err = service.AddAnatomicalNote(ctx, newNote)
	if !errors.Is(err, domain.ErrRecordAlreadyClosed) {
		t.Fatalf("Se esperaba ErrRecordAlreadyClosed al intentar agregar nota a folio cerrado, obtenido: %v", err)
	}

	// Intento 2: Modificar nota existente asociada a folio cerrado (debe fallar)
	createdNote.DoctorObservation = "Intento de mutacion ilegal post-cierre"
	_, err = service.UpdateAnatomicalNote(ctx, createdNote)
	if !errors.Is(err, domain.ErrRecordAlreadyClosed) {
		t.Fatalf("Se esperaba ErrRecordAlreadyClosed al intentar modificar nota de folio cerrado, obtenido: %v", err)
	}

	// Intento 3: Eliminar nota de folio cerrado (debe fallar)
	err = service.DeleteAnatomicalNote(ctx, createdNote.ID, doctor.ID)
	if !errors.Is(err, domain.ErrRecordAlreadyClosed) {
		t.Fatalf("Se esperaba ErrRecordAlreadyClosed al intentar eliminar nota de folio cerrado, obtenido: %v", err)
	}
}

// TestAnatomicalNotesDoctorOwnership evalua que solo el medico autor pueda modificar o eliminar sus notas.
func TestAnatomicalNotesDoctorOwnership(t *testing.T) {
	ds := memory.NewDataStore()
	recordRepo := memory.NewClinicalRecordMemoryRepo(ds)
	patientRepo := memory.NewPatientMemoryRepo(ds)
	userRepo := memory.NewUserMemoryRepo(ds)

	service := services.NewClinicalRecordService(recordRepo, patientRepo, userRepo)
	ctx := context.Background()

	patient := newPatientFixture("p-anat-03", "99887766")
	_ = patientRepo.Create(ctx, patient)

	doctor1 := newDoctorFixture("doc-anat-03-a", "RM-111111")
	_ = userRepo.Create(ctx, doctor1)

	doctor2 := newDoctorFixture("doc-anat-03-b", "RM-222222")
	_ = userRepo.Create(ctx, doctor2)

	note := &domain.ClinicalAnatomicalNote{
		PatientID:         patient.ID,
		DoctorID:          doctor1.ID,
		StructureKey:      "gallbladder",
		StructureName:     "Vesícula Biliar",
		Layer:             domain.LayerOrgan,
		ViewOrientation:   domain.OrientationAnterior,
		CoordinatesX:      225,
		CoordinatesY:      190,
		PainLevel:         9,
		DoctorObservation: "Signo de Murphy positivo franco",
		PreliminaryCIE11:  "DC11",
	}
	created, err := service.AddAnatomicalNote(ctx, note)
	if err != nil {
		t.Fatalf("Error creando nota: %v", err)
	}

	// Doctor 2 intenta editar la nota de Doctor 1 (debe fallar)
	created.DoctorID = doctor2.ID
	created.DoctorObservation = "Observacion modificada por medico ajeno"
	_, err = service.UpdateAnatomicalNote(ctx, created)
	if !errors.Is(err, domain.ErrNotRecordOwner) {
		t.Fatalf("Se esperaba ErrNotRecordOwner al intentar editar nota ajena, obtenido: %v", err)
	}

	// Doctor 2 intenta eliminar la nota de Doctor 1 (debe fallar)
	err = service.DeleteAnatomicalNote(ctx, created.ID, doctor2.ID)
	if !errors.Is(err, domain.ErrNotRecordOwner) {
		t.Fatalf("Se esperaba ErrNotRecordOwner al intentar eliminar nota ajena, obtenido: %v", err)
	}

	// Doctor 1 (autor legitimo) si puede actualizar
	created.DoctorID = doctor1.ID
	created.DoctorObservation = "Ecografia confirma colelitiasis aguda"
	updated, err := service.UpdateAnatomicalNote(ctx, created)
	if err != nil {
		t.Fatalf("Fallo inesperado al actualizar nota por autor legitimo: %v", err)
	}
	if updated.DoctorObservation != "Ecografia confirma colelitiasis aguda" {
		t.Fatal("La observacion no se actualizo correctamente")
	}
}
