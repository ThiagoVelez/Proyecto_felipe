package domain

import "time"

// RoleCount resume las cuentas de un rol: total, activas y pendientes de habilitacion.
type RoleCount struct {
	RoleID   int    `json:"role_id"`
	RoleName string `json:"role_name"`
	Total    int    `json:"total"`
	Active   int    `json:"active"`
	Pending  int    `json:"pending"`
}

// UserSummary agrupa las cuentas del sistema por estado y por rol.
type UserSummary struct {
	Total   int         `json:"total"`
	Active  int         `json:"active"`
	Pending int         `json:"pending"`
	ByRole  []RoleCount `json:"by_role"`
}

// BranchAdmins lista los administradores registrados en una sede del catalogo.
type BranchAdmins struct {
	Name   string  `json:"name"`
	Admins []*User `json:"admins"`
}

// ServerStatus describe el proceso del servidor que atiende la API.
type ServerStatus struct {
	Version       string    `json:"version"`
	DBDriver      string    `json:"db_driver"`
	StartedAt     time.Time `json:"started_at"`
	UptimeSeconds int64     `json:"uptime_seconds"`
	GoVersion     string    `json:"go_version"`
	Goroutines    int       `json:"goroutines"`
	MemoryAllocMB float64   `json:"memory_alloc_mb"`
}

// SystemOverview es el tablero de monitoreo del Encargado de TI. No incluye datos clinicos.
type SystemOverview struct {
	GeneratedAt    time.Time      `json:"generated_at"`
	Server         ServerStatus   `json:"server"`
	Users          UserSummary    `json:"users"`
	Branches       []BranchAdmins `json:"branches"`
	AdminsNoBranch []*User        `json:"admins_without_branch"`
	RecentAudit    []*AuditLog    `json:"recent_audit"`
}
