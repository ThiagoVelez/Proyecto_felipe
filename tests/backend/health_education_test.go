package backend_test

import (
	"context"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

func TestHealthEducation_DoctorCanCreatePost(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	repo := memory.NewHealthEducationMemoryRepo(ds)
	svc := services.NewHealthEducationService(repo)

	doctor := newDoctorFixture("doc-he-01", "RM-99881-VALLE")
	doctor.FullName = "Dr. Carlos Mario Rivas"
	doctor.Specialty = "Medicina Familiar y Comunitaria"

	post := &domain.HealthEducationPost{
		Title:            "Jornada Departamental de Vacunación",
		Category:         domain.CategoryVacunas,
		Summary:          "Esquemas gratuitos de vacunación para niños y adultos mayores.",
		Content:          "Durante este mes se habilitan los puntos de vacunación en todas las sedes de la IPS...",
		YoutubeURL:       "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		VideoDurationSec: 90,
	}

	created, err := svc.CreatePost(ctx, doctor, post)
	if err != nil {
		t.Fatalf("Se esperaba éxito al crear publicación por médico, error: %v", err)
	}

	if created.ID == "" {
		t.Fatal("Se esperaba que la publicación tuviera un ID asignado")
	}
	if created.AuthorName != doctor.FullName {
		t.Fatalf("Autor esperado %s, obtenido: %s", doctor.FullName, created.AuthorName)
	}

	// Verificar listado
	posts, err := svc.ListPosts(ctx, "VACUNAS")
	if err != nil {
		t.Fatalf("Error listando posts: %v", err)
	}
	if len(posts) != 1 {
		t.Fatalf("Se esperaba 1 post en categoría VACUNAS, obtenidos: %d", len(posts))
	}
}

func TestHealthEducation_RejectsNurseCreatingOrModifying(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	repo := memory.NewHealthEducationMemoryRepo(ds)
	svc := services.NewHealthEducationService(repo)

	nurse := newNurseFixture("enf-he-01", "RM-55442-VALLE")

	post := &domain.HealthEducationPost{
		Title:    "Consejos de Hidratación en Clima Cálido",
		Category: domain.CategoryConsejos,
		Content:  "El consumo adecuado de agua previene la deshidratación...",
	}

	_, err := svc.CreatePost(ctx, nurse, post)
	if err == nil {
		t.Fatal("Se esperaba ErrUnauthorizedRole cuando una enfermera intenta crear un post")
	}

	// También debe fallar en update y delete
	_, err = svc.UpdatePost(ctx, nurse, "some-id", post)
	if err == nil {
		t.Fatal("Se esperaba ErrUnauthorizedRole en UpdatePost para enfermería")
	}

	err = svc.DeletePost(ctx, nurse, "some-id")
	if err == nil {
		t.Fatal("Se esperaba ErrUnauthorizedRole en DeletePost para enfermería")
	}
}

func TestHealthEducation_RejectsVideosLongerThan2Minutes(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	repo := memory.NewHealthEducationMemoryRepo(ds)
	svc := services.NewHealthEducationService(repo)

	doctor := newDoctorFixture("doc-he-02", "RM-12345-VALLE")

	post := &domain.HealthEducationPost{
		Title:            "Video Educativo de Hábitos",
		Category:         domain.CategoryEstiloDeVida,
		Content:          "Explicación de pausa activa.",
		VideoURL:         "https://storage.saludconecta.local/video-largo.mp4",
		VideoDurationSec: 150, // 2.5 minutos (excede los 120s reglamentarios)
	}

	_, err := svc.CreatePost(ctx, doctor, post)
	if err == nil {
		t.Fatal("Se esperaba ErrVideoDurationTooLong para videos superiores a 120 segundos")
	}
}

func TestHealthEducation_DoctorCanUpdateAndDelete(t *testing.T) {
	ctx := context.Background()
	ds := memory.NewDataStore()
	repo := memory.NewHealthEducationMemoryRepo(ds)
	svc := services.NewHealthEducationService(repo)

	doctor := newDoctorFixture("doc-he-03", "RM-77777-VALLE")

	post := &domain.HealthEducationPost{
		Title:    "Prevención del Dengue",
		Category: domain.CategoryEnfermedades,
		Content:  "Eliminar criaderos de agua estancada...",
	}

	created, err := svc.CreatePost(ctx, doctor, post)
	if err != nil {
		t.Fatalf("Error creando post: %v", err)
	}

	// Actualizar
	created.Title = "Prevención del Dengue y Chikungunya en el Valle"
	created.Summary = "Guía actualizada"
	updated, err := svc.UpdatePost(ctx, doctor, created.ID, created)
	if err != nil {
		t.Fatalf("Error actualizando post: %v", err)
	}
	if updated.Title != "Prevención del Dengue y Chikungunya en el Valle" {
		t.Fatalf("Título no actualizado: %s", updated.Title)
	}

	// Eliminar
	err = svc.DeletePost(ctx, doctor, created.ID)
	if err != nil {
		t.Fatalf("Error eliminando post: %v", err)
	}

	// Verificar que no exista
	found, err := svc.GetPostByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("Error en GetPostByID: %v", err)
	}
	if found != nil {
		t.Fatal("Se esperaba que el post hubiera sido eliminado")
	}
}

func TestTriage_PainScalePersistedInRecord(t *testing.T) {
	record := &domain.TriageRecord{
		ID:                    "trg-pain-01",
		PatientID:             "pat-01",
		EvaluatedBy:           "enf-01",
		SystolicBP:            120,
		DiastolicBP:           80,
		HeartRate:             75,
		RespiratoryRate:       18,
		OxygenSaturation:      98,
		BodyTemperature:       36.5,
		GlasgowScore:          15,
		ManchesterLevel:       domain.ManchesterLevelIV,
		ReasonForConsultation: "Dolor abdominal en fosa ilíaca derecha",
		PainScaleScore:        7,
		PainScaleObservations: "Dolor punzante que se intensifica a la marcha",
		Status:                domain.TriageStatusPending,
		CreatedAt:             time.Now(),
	}

	if err := record.Validate(); err != nil {
		t.Fatalf("El triaje con escala EVA debe ser válido: %v", err)
	}

	if record.PainScaleScore != 7 {
		t.Fatalf("Puntaje EVA esperado 7, obtenido %d", record.PainScaleScore)
	}
	if record.PainScaleObservations == "" {
		t.Fatal("Observaciones de dolor no deben ser vacías")
	}
}
