import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import { useMobileNav } from './hooks/useMobileNav';
import Sidebar from './components/Sidebar';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import TriageScreen from './screens/TriageScreen';
import HceScreen from './screens/HceScreen';
import PrescriptionScreen from './screens/PrescriptionScreen';
import SecurityMfaScreen from './screens/SecurityMfaScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminLayout from './screens/admin/AdminLayout';
import TiLayout from './screens/ti/TiLayout';
import DoctorRequestsInbox from './screens/DoctorRequestsInbox';
import DoctorAppointmentsView from './screens/DoctorAppointmentsView';
import TreatmentFollowUpView from './screens/TreatmentFollowUpView';
import PharmacyDashboard from './screens/PharmacyDashboard';
import NurseSummaryView from './screens/NurseSummaryView';
import NurseChecklistView from './screens/NurseChecklistView';
import MedicalKitScreen from './screens/MedicalKitScreen';
import LaboratoryScreen from './screens/LaboratoryScreen';
import DoctorLabOrdersView from './screens/DoctorLabOrdersView';
import DoctorPrintLabResultsView from './screens/DoctorPrintLabResultsView';
import { apiClient, SESSION_EXPIRED_EVENT } from './services/api';
import { hasRole } from './utils/roles';
import { sessionStore, purgeClinicalStorage } from './services/session';

const getUserStorageKey = (u) => {
  if (!u) return 'anonymous';
  const email = u.email ? String(u.email).trim().toLowerCase() : '';
  const doc = u.document_number ? String(u.document_number).trim() : '';
  const id = u.id ? String(u.id).trim() : '';
  return email || doc || id || 'anonymous';
};

const getDefaultBannerForUser = (u) => {
  if (!u) return 'urgencias';
  const role = String(u.role || u.role_name || '').toUpperCase();
  const roleId = Number(u.role_id);
  const spec = String(u.specialty || '').toLowerCase();

  if (role === 'FARMACIA' || roleId === 6 || spec.includes('farmac')) {
    return 'farmacia';
  }
  if (role === 'LABORATORIO' || roleId === 7 || spec.includes('laborat') || spec.includes('bacteri')) {
    return 'cirugia';
  }
  if (spec.includes('pediatr')) {
    return 'pediatria';
  }
  if (role === 'ADMIN' || roleId === 1 || role === 'TI' || roleId === 8) {
    return 'cardiologia';
  }
  return 'urgencias';
};

/**
 * Enriquecer el usuario con su foto de perfil y configuración personalizada persistida.
 * Garantiza aislamiento estricto por usuario: nunca se mezclan fotos ni banners entre cuentas.
 */
function enrichUserWithCustomProfile(rawUser) {
  if (!rawUser) return rawUser;
  const userKey = getUserStorageKey(rawUser);

  // Limpiar cualquier clave residual compartida para erradicar contaminaciones pasadas
  try {
    localStorage.removeItem('saludconecta_profile_custom');
    localStorage.removeItem('saludconecta_avatar');
  } catch { /* almacenamiento local no disponible: se continúa sin él */ }

  let customProfile = {};
  try {
    const rawCustom =
      localStorage.getItem(`saludconecta_profile_${userKey}`) ||
      (rawUser.email ? localStorage.getItem(`saludconecta_profile_${String(rawUser.email).trim().toLowerCase()}`) : null) ||
      (rawUser.document_number ? localStorage.getItem(`saludconecta_profile_${rawUser.document_number}`) : null) ||
      (rawUser.id ? localStorage.getItem(`saludconecta_profile_${rawUser.id}`) : null);
    if (rawCustom) {
      customProfile = JSON.parse(rawCustom);
    }
  } catch { /* almacenamiento local no disponible: se continúa sin él */ }

  const savedAvatar =
    rawUser.avatar ||
    localStorage.getItem(`saludconecta_avatar_${userKey}`) ||
    (rawUser.email ? localStorage.getItem(`saludconecta_avatar_${String(rawUser.email).trim().toLowerCase()}`) : null) ||
    (rawUser.document_number ? localStorage.getItem(`saludconecta_avatar_${rawUser.document_number}`) : null) ||
    (rawUser.id ? localStorage.getItem(`saludconecta_avatar_${rawUser.id}`) : null) ||
    customProfile.avatarUrl ||
    '';

  const defaultBanner = getDefaultBannerForUser(rawUser);

  const merged = {
    ...rawUser,
    avatar: savedAvatar || '',
    bannerId: customProfile.bannerId || rawUser.bannerId || defaultBanner,
    phone: customProfile.phone || rawUser.phone || '',
    bio: customProfile.bio || rawUser.bio || '',
    specialty: customProfile.specialty || rawUser.specialty,
    branch: customProfile.branch || rawUser.branch,
  };

  try {
    sessionStore.setItem('saludconecta_user', JSON.stringify(merged));
  } catch { /* almacenamiento local no disponible: se continúa sin él */ }

  return merged;
}

// DEF-80: el rol sale solo de la sesión del servidor
const isNurseUser = (u) => hasRole(u, 'ENFERMERO');
const isLabUser = (u) => hasRole(u, 'LABORATORIO');

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const token = sessionStore.getItem('saludconecta_token');
      const storedUser = sessionStore.getItem('saludconecta_user');
      return Boolean(token && storedUser);
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStore.getItem('saludconecta_user');
      return stored ? enrichUserWithCustomProfile(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState(() => {
    try {
      return sessionStore.getItem('saludconecta_current_view') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [sessionVerified, setSessionVerified] = useState(() => !apiClient.token);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('saludconecta_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileNavOpen, setIsMobileNavOpen] = useMobileNav();

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedTriage, setSelectedTriage] = useState(null);

  // El contexto clinico no debe sobrevivir al cierre de sesion
  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedPatient(null);
      setSelectedTriage(null);
    }
  }, [isAuthenticated]);

  const [isOffline, setIsOffline] = useState(false);
  const [sessionNotice, setSessionNotice] = useState('');

  // Cierre de sesion centralizado
  useEffect(() => {
    const handleSessionExpired = () => {
      sessionStore.removeItem('saludconecta_current_view');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentView('dashboard');
      setSessionNotice('Su sesión ya no es válida. Inicie sesión nuevamente.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  // Revalida el token guardado contra el servidor al montar la aplicacion. DEF-33: mientras el servidor no confirme
  // la sesion no se pinta ninguna pantalla con el rol guardado en el navegador.
  useEffect(() => {
    if (!apiClient.token) {
      setSessionVerified(true);
      return undefined;
    }
    let cancelled = false;
    apiClient
      .me()
      .then((user) => {
        if (!cancelled && user) {
          const enriched = enrichUserWithCustomProfile(user);
          setCurrentUser(enriched);
        }
      })
      // Sin conexion se conserva la sesion local (el servidor sigue validando el rol en cada peticion);
      // un 401 cierra la sesion mediante SESSION_EXPIRED_EVENT.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSessionVerified(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirección de rol: situar a enfermeros y farmacéuticos en sus módulos especializados
  useEffect(() => {
    if (currentUser) {
      const isPharmacist = hasRole(currentUser, 'FARMACIA');

      const isNurse = isNurseUser(currentUser);
      const isLab = isLabUser(currentUser);

      if (
        isPharmacist &&
        ['dashboard', 'appointments', 'triage', 'hce', 'nurse_summary', 'nurse_checklist', 'medical_kit', 'laboratory'].includes(currentView)
      ) {
        setCurrentView('pharmacy');
        sessionStore.setItem('saludconecta_current_view', 'pharmacy');
      } else if (
        isNurse &&
        ['appointments', 'hce', 'treatment', 'pharmacy', 'inventory', 'prescription', 'laboratory'].includes(currentView)
      ) {
        setCurrentView('nurse_summary');
        sessionStore.setItem('saludconecta_current_view', 'nurse_summary');
      } else if (
        isLab &&
        ['dashboard', 'appointments', 'triage', 'hce', 'treatment', 'nurse_summary', 'nurse_checklist', 'pharmacy', 'inventory', 'prescription'].includes(currentView)
      ) {
        setCurrentView('laboratory');
        sessionStore.setItem('saludconecta_current_view', 'laboratory');
      }
    }
  }, [currentUser, currentView]);

  const handleLoginSuccess = (data) => {
    setSessionNotice('');
    setIsAuthenticated(true);
    sessionStore.setItem('saludconecta_session_active', 'true');
    if (data && data.user) {
      const enriched = enrichUserWithCustomProfile(data.user);
      setCurrentUser(enriched);

      // Vista inicial según rol
      const isPharm = hasRole(enriched, 'FARMACIA');

      const isNurse = isNurseUser(enriched);
      const isLab = isLabUser(enriched);

      if (isPharm) {
        setCurrentView('pharmacy');
        sessionStore.setItem('saludconecta_current_view', 'pharmacy');
      } else if (isNurse) {
        setCurrentView('nurse_summary');
        sessionStore.setItem('saludconecta_current_view', 'nurse_summary');
      } else if (isLab) {
        setCurrentView('laboratory');
        sessionStore.setItem('saludconecta_current_view', 'laboratory');
      } else {
        setCurrentView('dashboard');
        sessionStore.setItem('saludconecta_current_view', 'dashboard');
      }
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    sessionStore.removeItem('saludconecta_session_active');
    sessionStore.removeItem('saludconecta_user');
    sessionStore.removeItem('saludconecta_token');
    sessionStore.removeItem('saludconecta_refresh_token');
    sessionStore.removeItem('saludconecta_current_view');
    // DEF-76: no se deja información clínica en el navegador de una estación compartida
    purgeClinicalStorage();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  // Sincronización con botones Atrás y Adelante del navegador (History API)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hashView = window.location.hash ? window.location.hash.replace('#', '') : null;
    const initialView = hashView || currentView || 'dashboard';

    // Establecer la entrada inicial para activar las flechas de navegación nativas del navegador
    window.history.replaceState({ view: initialView }, '', `#${initialView}`);

    const handlePopState = (event) => {
      const targetView =
        event.state?.view ||
        (window.location.hash ? window.location.hash.replace('#', '') : null) ||
        'dashboard';

      if (targetView) {
        setCurrentView(targetView);
        sessionStore.setItem('saludconecta_current_view', targetView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (view, shouldPush = true) => {
    if (view === currentView) return;
    setCurrentView(view);
    sessionStore.setItem('saludconecta_current_view', view);
    if (shouldPush && typeof window !== 'undefined') {
      window.history.pushState({ view }, '', `#${view}`);
    }
  };

  const handleSelectPatient = (patient, triage = null) => {
    setSelectedPatient(patient);
    setSelectedTriage(triage);
  };

  // Sincronización reactiva global cuando cualquier departamento o médico actualiza un paciente
  useEffect(() => {
    const handlePatientGlobalSync = (e) => {
      const updated = e.detail;
      if (!updated) return;
      setSelectedPatient((prev) => {
        if (!prev) return prev;
        const sameId = updated.id && String(prev.id) === String(updated.id);
        const sameDoc = updated.document_number && String(prev.document_number) === String(updated.document_number);
        if (sameId || sameDoc) {
          return { ...prev, ...updated };
        }
        return prev;
      });
    };
    window.addEventListener('saludconecta_patient_updated', handlePatientGlobalSync);
    return () => window.removeEventListener('saludconecta_patient_updated', handlePatientGlobalSync);
  }, []);

  const handleHeaderSearch = async (documentType, documentNumber) => {
    const cleanDoc = documentNumber.trim().replace(/[.\s]/g, '');
    let found = null;
    try {
      found = await apiClient.lookupPatient(documentType, cleanDoc);
    } catch (e) {
      try {
        const list = await apiClient.listPatients({ limit: 200 });
        // DEF-78: solo coincidencia exacta de tipo y número de documento; nunca por nombre ni parcial
        found = list.find((p) => {
          const doc = String(p.document_number ?? '').trim();
          return p.document_type === documentType && (doc === cleanDoc || doc === documentNumber.trim());
        });
      } catch {
        // Ignorar
      }
      if (!found) throw e;
    }
    const detail = await apiClient.getPatient(found.id);
    handleSelectPatient(detail);
    handleNavigate('hce');
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('saludconecta_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleUpdateUser = (updated) => {
    const enriched = enrichUserWithCustomProfile(updated);
    setCurrentUser(enriched);
  };

  // Si no esta autenticado, mostrar pantalla de Login / AuthScreen
  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} sessionNotice={sessionNotice} />;
  }

  if (!sessionVerified) {
    return (
      <div role="status" className="min-h-screen flex items-center justify-center bg-surface text-sm text-on-surface-variant">
        Verificando la sesión con el servidor…
      </div>
    );
  }

  // El Encargado de TI dispone de su propio entorno de monitoreo, sin acceso a datos clinicos
  if (currentUser && (currentUser.role === 'TI' || Number(currentUser.role_id) === 8)) {
    return <TiLayout user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
  }

  // REGLA RBAC ESTRICTA: El usuario con rol ADMIN dispone de su propio entorno
  if (currentUser && (currentUser.role === 'ADMIN' || Number(currentUser.role_id) === 1)) {
    return (
      <AdminLayout
        user={currentUser}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased flex flex-col">
      {/* CABECERA GLOBAL ASISTENCIAL */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        currentView={currentView}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        onSearch={handleHeaderSearch}
        onUpdateUser={handleUpdateUser}
        onNavigate={handleNavigate}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
      />

      <div className="flex flex-1 pt-20">
        {/* SIDEBAR DE NAVEGACION COLAPSABLE */}
        <Sidebar
          currentView={currentView}
          setCurrentView={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          user={currentUser}
          isMobileOpen={isMobileNavOpen}
          onMobileClose={() => setIsMobileNavOpen(false)}
        />

        {/* CONTENEDOR PRINCIPAL */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
          } p-3 sm:p-4 lg:p-8 min-w-0 overflow-x-hidden overflow-y-auto`}
        >
          {currentView === 'dashboard' && (
            <DashboardScreen
              onSelectPatient={handleSelectPatient}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'appointment_requests' && (
            <DoctorRequestsInbox user={currentUser} onNavigate={handleNavigate} />
          )}

          {currentView === 'appointments' && (
            <DoctorAppointmentsView
              user={currentUser}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'triage' && (
            <TriageScreen
              patient={selectedPatient}
              onPatientChange={handleSelectPatient}
              triage={selectedTriage}
              onTriageSaved={setSelectedTriage}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'hce' && (
            <HceScreen
              patient={selectedPatient}
              onPatientChange={handleSelectPatient}
              triage={selectedTriage}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'medical_kit' && (
            <MedicalKitScreen
              user={currentUser}
              patient={selectedPatient}
              onSelectPatient={handleSelectPatient}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'treatment' && (
            <TreatmentFollowUpView
              user={currentUser}
              patient={selectedPatient}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'doctor_lab_orders' && (
            <DoctorLabOrdersView
              user={currentUser}
              patient={selectedPatient}
              onSelectPatient={handleSelectPatient}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'doctor_print_lab_results' && (
            <DoctorPrintLabResultsView
              user={currentUser}
              patient={selectedPatient}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'nurse_summary' && (
            <NurseSummaryView
              user={currentUser}
              patient={selectedPatient}
              onSelectPatient={handleSelectPatient}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'nurse_checklist' && (
            <NurseChecklistView
              user={currentUser}
              patient={selectedPatient}
              onSelectPatient={handleSelectPatient}
              onNavigate={handleNavigate}
            />
          )}

          {(currentView === 'pharmacy' || currentView === 'inventory' || currentView === 'prescription' || currentView === 'pharmacy_reports_copy') && (
            <PharmacyDashboard
              user={currentUser}
              initialTab={currentView === 'inventory' ? 'inventory' : currentView === 'pharmacy_reports_copy' ? 'reports_copy' : 'inbox'}
            />
          )}

          {currentView === 'laboratory' && (
            <LaboratoryScreen user={currentUser} />
          )}

          {currentView === 'profile' && (
            <ProfileScreen
              user={currentUser}
              onUpdateUser={handleUpdateUser}
              onNavigate={handleNavigate}
            />
          )}

          {(currentView === 'security' || currentView === 'auth') && (
            <SecurityMfaScreen user={currentUser} onUpdateUser={handleUpdateUser} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
