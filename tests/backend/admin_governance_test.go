package backend_test

import (
	"context"
	"testing"
	"time"

	"saludconecta-backend/adapters/storage/memory"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/services"
)

// TestStaffGovernanceAndReTHUSVerification evalua el flujo de registro seguro e inactividad por defecto
// conforme a la Resolucion 1995 de 1999 y Ley 1581 de 2012.
func TestStaffGovernanceAndReTHUSVerification(t *testing.T) {
	ds := memory.NewDataStore()
	userRepo := memory.NewUserMemoryRepo(ds)
	auditRepo := memory.NewAuditMemoryRepo(ds)

	authService := services.NewAuthService(userRepo, "test-jwt-secret", 1*time.Hour)
	adminService := services.NewAdminService(userRepo, auditRepo)
	ctx := context.Background()

	// 1. Intentar registrar personal asistencial (MEDICO) sin Tarjeta Profesional ReTHUS -> Debe fallar
	invalidDoctor := &domain.User{
		ID:               "doc-pending-01",
		RoleID:           2,
		RoleName:         "MEDICO",
		FullName:         "Dr. Andrés Caicedo",
		Email:            "acaicedo@saludconecta.ips.gov.co",
		ProfessionalCard: "", // Vacio -> ilegal segun Res. 1995
	}

	err := authService.RegisterStaff(ctx, invalidDoctor, "ClaveSegura2026*")
	if err != domain.ErrMissingProfessionalCard {
		t.Fatalf("Se esperaba ErrMissingProfessionalCard al registrar medico sin ReTHUS, pero se obtuvo: %v", err)
	}

	// 2. Registrar personal asistencial con Tarjeta Profesional valida -> Debe crearse con is_active = false
	validDoctor := &domain.User{
		ID:               "doc-pending-02",
		RoleID:           2,
		RoleName:         "MEDICO",
		FullName:         "Dra. Natalia Morales",
		Email:            "nmorales@saludconecta.ips.gov.co",
		ProfessionalCard: "RM-99412-VALLE",
		Specialty:        "Medicina General",
		Branch:           "Sede Cartago - Hospital Central",
	}

	err = authService.RegisterStaff(ctx, validDoctor, "ClaveSegura2026*")
	if err != nil {
		t.Fatalf("Fallo inesperado en autorregistro de personal: %v", err)
	}

	// 3. Verificar que el usuario no puede iniciar sesion mientras este inactivo
	_, _, err = authService.Login(ctx, "nmorales@saludconecta.ips.gov.co", "ClaveSegura2026*", "")
	if err != domain.ErrUserInactive {
		t.Fatalf("Se esperaba ErrUserInactive para usuario pendiente de habilitacion, pero se obtuvo: %v", err)
	}

	// 4. Listar solicitudes pendientes desde el panel de gobernanza de administracion
	inactiveFlag := false
	pendingUsers, err := adminService.ListUsers(ctx, nil, &inactiveFlag)
	if err != nil {
		t.Fatalf("Fallo consultando usuarios pendientes: %v", err)
	}

	found := false
	for _, u := range pendingUsers {
		if u.Email == "nmorales@saludconecta.ips.gov.co" {
			found = true
			if u.IsActive {
				t.Fatal("El usuario en cola de gobernanza no debe encontrarse activo")
			}
			break
		}
	}
	if !found {
		t.Fatal("La solicitud de registro no fue listada en las cuentas pendientes")
	}

	// 5. El Administrador verifica el ReTHUS y activa la cuenta
	err = adminService.ActivateUser(ctx, "doc-pending-02")
	if err != nil {
		t.Fatalf("Error durante la activacion de cuenta ReTHUS: %v", err)
	}

	// 6. Intentar iniciar sesion tras aprobacion -> Debe expedir token de acceso exitoso
	token, user, err := authService.Login(ctx, "nmorales@saludconecta.ips.gov.co", "ClaveSegura2026*", "")
	if err != nil {
		t.Fatalf("Fallo inicio de sesion tras habilitacion administrativa: %v", err)
	}
	if token == "" || !user.IsActive {
		t.Fatal("El token generado es vacio o el usuario sigue inactivo")
	}
}

