import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import TriageScreen from './screens/TriageScreen';
import HceScreen from './screens/HceScreen';
import PrescriptionScreen from './screens/PrescriptionScreen';
import SecurityMfaScreen from './screens/SecurityMfaScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminLayout from './screens/admin/AdminLayout';
import DoctorAppointmentsView from './screens/DoctorAppointmentsView';
import TreatmentFollowUpView from './screens/TreatmentFollowUpView';
import PharmacyDashboard from './screens/PharmacyDashboard';
import NurseSummaryView from './screens/NurseSummaryView';
import NurseChecklistView from './screens/NurseChecklistView';
import MedicalKitScreen from './screens/MedicalKitScreen';
import { apiClient, SESSION_EXPIRED_EVENT } from './services/api';

/**
 * Enriquecer el usuario con su foto de perfil y configuración personalizada persistida.
 * Garantiza que la foto de perfil nunca se pierda en recargas (F5), navegación o reingreso.
 */
function enrichUserWithCustomProfile(rawUser) {
  if (!rawUser) return rawUser;
  const userKey = rawUser.id || rawUser.document_number || rawUser.email || 'current';

  let customProfile = {};
  try {
    const rawCustom =
      localStorage.getItem(`saludconecta_profile_${userKey}`) ||
      (rawUser.email ? localStorage.getItem(`saludconecta_profile_${rawUser.email}`) : null) ||
      (rawUser.document_number ? localStorage.getItem(`saludconecta_profile_${rawUser.document_number}`) : null) ||
      localStorage.getItem('saludconecta_profile_custom');
    if (rawCustom) {
      customProfile = JSON.parse(rawCustom);
    }
  } catch {
    // Perfil local corrupto o almacenamiento bloqueado: se continua con los datos del servidor.
  }

  const savedAvatar =
    rawUser.avatar ||
    localStorage.getItem(`saludconecta_avatar_${userKey}`) ||
    (rawUser.email ? localStorage.getItem(`saludconecta_avatar_${rawUser.email}`) : null) ||
    (rawUser.document_number ? localStorage.getItem(`saludconecta_avatar_${rawUser.document_number}`) : null) ||
    (rawUser.id ? localStorage.getItem(`saludconecta_avatar_${rawUser.id}`) : null) ||
    customProfile.avatarUrl ||
    localStorage.getItem('saludconecta_avatar') ||
    '';

  const merged = {
    ...rawUser,
    avatar: savedAvatar || '',
    bannerId: rawUser.bannerId || customProfile.bannerId || 'urgencias',
    phone: rawUser.phone || customProfile.phone || '',
    bio: rawUser.bio || customProfile.bio || '',
    specialty: rawUser.specialty || customProfile.specialty || rawUser.specialty,
    branch: rawUser.branch || customProfile.branch || rawUser.branch,
  };

  try {
    localStorage.setItem('saludconecta_user', JSON.stringify(merged));
  } catch {
    // Cuota excedida o almacenamiento bloqueado: la sesion sigue en memoria sin persistir el perfil.
  }

  return merged;
}

const isNurseUser = (u) => {
  if (!u) return false;
  return (
    u.role === 'ENFERMERO' ||
    u.role === 'ENFERMERA' ||
    Number(u.role_id) === 3 ||
    u.specialty?.toLowerCase().includes('enferm') ||
    (u.full_name || u.name || '').toLowerCase().includes('enf')
  );
};

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const token = localStorage.getItem('saludconecta_token');
      const storedUser = localStorage.getItem('saludconecta_user');
      return Boolean(token && storedUser);
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('saludconecta_user');
      return stored ? enrichUserWithCustomProfile(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState(() => {
    try {
      return localStorage.getItem('saludconecta_current_view') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('saludconecta_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

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
      localStorage.removeItem('saludconecta_current_view');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentView('dashboard');
      setSessionNotice('Su sesión ya no es válida. Inicie sesión nuevamente.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  // Revalida el token guardado contra el servidor al montar la aplicacion
  useEffect(() => {
    if (!apiClient.token) return undefined;
    let cancelled = false;
    apiClient
      .me()
      .then((user) => {
        if (!cancelled && user) {
          const enriched = enrichUserWithCustomProfile(user);
          setCurrentUser(enriched);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirección de rol: situar a enfermeros y farmacéuticos en sus módulos especializados
  useEffect(() => {
    if (currentUser) {
      const isPharmacist =
        currentUser.role === 'FARMACIA' ||
        Number(currentUser.role_id) === 6 ||
        currentUser.specialty?.toLowerCase().includes('farmac') ||
        (currentUser.full_name || currentUser.name || '').toLowerCase().includes('farma');

      const isNurse = isNurseUser(currentUser);

      if (
        isPharmacist &&
        ['dashboard', 'appointments', 'triage', 'hce', 'nurse_summary', 'nurse_checklist', 'medical_kit'].includes(currentView)
      ) {
        setCurrentView('pharmacy');
        localStorage.setItem('saludconecta_current_view', 'pharmacy');
      } else if (
        isNurse &&
        ['appointments', 'hce', 'treatment', 'pharmacy', 'inventory', 'prescription'].includes(currentView)
      ) {
        setCurrentView('nurse_summary');
        localStorage.setItem('saludconecta_current_view', 'nurse_summary');
      }
    }
  }, [currentUser, currentView]);

  const handleLoginSuccess = (data) => {
    setSessionNotice('');
    setIsAuthenticated(true);
    localStorage.setItem('saludconecta_session_active', 'true');
    if (data && data.user) {
      const enriched = enrichUserWithCustomProfile(data.user);
      setCurrentUser(enriched);

      // Vista inicial según rol
      const isPharm =
        enriched.role === 'FARMACIA' ||
        Number(enriched.role_id) === 6 ||
        enriched.specialty?.toLowerCase().includes('farmac') ||
        (enriched.full_name || enriched.name || '').toLowerCase().includes('farma');

      const isNurse = isNurseUser(enriched);

      if (isPharm) {
        setCurrentView('pharmacy');
        localStorage.setItem('saludconecta_current_view', 'pharmacy');
      } else if (isNurse) {
        setCurrentView('nurse_summary');
        localStorage.setItem('saludconecta_current_view', 'nurse_summary');
      } else {
        setCurrentView('dashboard');
        localStorage.setItem('saludconecta_current_view', 'dashboard');
      }
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    localStorage.removeItem('saludconecta_session_active');
    localStorage.removeItem('saludconecta_user');
    localStorage.removeItem('saludconecta_token');
    localStorage.removeItem('saludconecta_refresh_token');
    localStorage.removeItem('saludconecta_current_view');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
    localStorage.setItem('saludconecta_current_view', view);
  };

  const handleSelectPatient = (patient, triage = null) => {
    setSelectedPatient(patient);
    setSelectedTriage(triage);
  };

  const handleHeaderSearch = async (documentType, documentNumber) => {
    const cleanDoc = documentNumber.trim().replace(/[.\s]/g, '');
    let found = null;
    try {
      found = await apiClient.lookupPatient(documentType, cleanDoc);
    } catch (e) {
      try {
        const list = await apiClient.listPatients({ limit: 200 });
        found = list.find((p) => {
          const doc = String(p.document_number ?? '').trim();
          const name = (p.full_name || `${p.first_name || ''} ${p.last_name || ''}`).toLowerCase();
          return (
            doc === cleanDoc ||
            doc === documentNumber.trim() ||
            name.includes(documentNumber.trim().toLowerCase())
          );
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
      />

      <div className="flex flex-1 pt-20">
        {/* SIDEBAR DE NAVEGACION COLAPSABLE */}
        <Sidebar
          currentView={currentView}
          setCurrentView={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          user={currentUser}
        />

        {/* CONTENEDOR PRINCIPAL */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'ml-20' : 'ml-64'
          } p-4 lg:p-8 min-w-0 overflow-y-auto`}
        >
          {currentView === 'dashboard' && (
            <DashboardScreen
              onSelectPatient={handleSelectPatient}
              onNavigate={handleNavigate}
            />
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

          {(currentView === 'pharmacy' || currentView === 'inventory' || currentView === 'prescription') && (
            <PharmacyDashboard
              user={currentUser}
              initialTab={currentView === 'inventory' ? 'inventory' : 'inbox'}
            />
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
