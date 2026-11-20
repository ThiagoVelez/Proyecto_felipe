package services

import (
	"context"
	"runtime"
	"sort"
	"time"

	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type tiService struct {
	userRepo  ports.UserRepository
	auditRepo ports.AuditRepository
	branches  ports.BranchRepository
	dbDriver  string
	version   string
	startedAt time.Time
}

// NewTIService construye los casos de uso del Encargado de TI.
func NewTIService(userRepo ports.UserRepository, auditRepo ports.AuditRepository, branches ports.BranchRepository, dbDriver, version string, startedAt time.Time) ports.TIService {
	if startedAt.IsZero() {
		startedAt = time.Now().UTC()
	}
	return &tiService{userRepo: userRepo, auditRepo: auditRepo, branches: branches, dbDriver: dbDriver, version: version, startedAt: startedAt}
}

func (s *tiService) Overview(ctx context.Context) (*domain.SystemOverview, error) {
	users, err := s.userRepo.List(ctx, nil, nil)
	if err != nil {
		return nil, err
	}
	catalog, err := loadBranches(ctx, s.branches)
	if err != nil {
		return nil, err
	}

	summary := domain.UserSummary{}
	byRole := map[int]*domain.RoleCount{}
	branchAdmins := map[string][]*domain.User{}
	var adminsNoBranch []*domain.User
	for _, u := range users {
		summary.Total++
		rc, ok := byRole[u.RoleID]
		if !ok {
			name := u.RoleName
			if name == "" {
				name = domain.RoleNameByID(u.RoleID)
			}
			rc = &domain.RoleCount{RoleID: u.RoleID, RoleName: name}
			byRole[u.RoleID] = rc
		}
		rc.Total++
		if u.IsActive {
			summary.Active++
			rc.Active++
		} else {
			summary.Pending++
			rc.Pending++
		}
		if u.RoleID == 1 {
			if name, ok := domain.CanonicalBranchIn(catalog, u.Branch); ok {
				branchAdmins[name] = append(branchAdmins[name], u)
			} else {
				adminsNoBranch = append(adminsNoBranch, u)
			}
		}
	}
	for _, rc := range byRole {
		summary.ByRole = append(summary.ByRole, *rc)
	}
	sort.Slice(summary.ByRole, func(i, j int) bool { return summary.ByRole[i].RoleID < summary.ByRole[j].RoleID })

	branches := make([]domain.BranchAdmins, 0, len(catalog))
	for _, cb := range catalog {
		b := cb.Name
		admins := branchAdmins[b]
		if admins == nil {
			admins = []*domain.User{}
		}
		branches = append(branches, domain.BranchAdmins{Name: b, Admins: admins})
	}

	recent, err := s.auditRepo.ListLogs(ctx, 10)
	if err != nil {
		recent = nil
	}
	if recent == nil {
		recent = []*domain.AuditLog{}
	}
	if adminsNoBranch == nil {
		adminsNoBranch = []*domain.User{}
	}

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	now := time.Now().UTC()

	return &domain.SystemOverview{
		GeneratedAt: now,
		Server: domain.ServerStatus{
			Version:       s.version,
			DBDriver:      s.dbDriver,
			StartedAt:     s.startedAt,
			UptimeSeconds: int64(now.Sub(s.startedAt).Seconds()),
			GoVersion:     runtime.Version(),
			Goroutines:    runtime.NumGoroutine(),
			MemoryAllocMB: float64(mem.Alloc) / (1024 * 1024),
		},
		Users:          summary,
		Branches:       branches,
		AdminsNoBranch: adminsNoBranch,
		RecentAudit:    recent,
	}, nil
}

func (s *tiService) ListUsers(ctx context.Context) ([]*domain.User, error) {
	return s.userRepo.List(ctx, nil, nil)
}

func (s *tiService) SetAdminStatus(ctx context.Context, userID string, active bool) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user.RoleID != 1 {
		return domain.ErrNotAdminAccount
	}
	return s.userRepo.UpdateStatus(ctx, userID, active)
}

func (s *tiService) GetAuditLogs(ctx context.Context, limit int) ([]*domain.AuditLog, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	return s.auditRepo.ListLogs(ctx, limit)
}
