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
import { apiClient, SESSION_EXPIRED_EVENT } from './services/api';

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
      return stored ? JSON.parse(stored) : null;
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
        if (!cancelled && user) setCurrentUser(user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirección de rol: si el usuario es farmacéutico y está en una vista clínica médica, situarlo en farmacia
  useEffect(() => {
    if (currentUser) {
      const isPharmacist =
        currentUser.role === 'FARMACIA' ||
        Number(currentUser.role_id) === 6 ||
        currentUser.specialty?.toLowerCase().includes('farmac') ||
        (currentUser.full_name || currentUser.name || '').toLowerCase().includes('farma');

      if (isPharmacist && ['dashboard', 'appointments', 'triage', 'hce'].includes(currentView)) {
        setCurrentView('pharmacy');
        localStorage.setItem('saludconecta_current_view', 'pharmacy');
      }
    }
  }, [currentUser, currentView]);

  const handleLoginSuccess = (data) => {
    setSessionNotice('');
    setIsAuthenticated(true);
    localStorage.setItem('saludconecta_session_active', 'true');
    if (data && data.user) {
      setCurrentUser(data.user);
      localStorage.setItem('saludconecta_user', JSON.stringify(data.user));

      // Vista inicial según rol
      const isPharm =
        data.user.role === 'FARMACIA' ||
        Number(data.user.role_id) === 6 ||
        data.user.specialty?.toLowerCase().includes('farmac') ||
        (data.user.full_name || data.user.name || '').toLowerCase().includes('farma');

      if (isPharm) {
        setCurrentView('pharmacy');
        localStorage.setItem('saludconecta_current_view', 'pharmacy');
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
    const found = await apiClient.lookupPatient(documentType, documentNumber);
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
    setCurrentUser(updated);
    localStorage.setItem('saludconecta_user', JSON.stringify(updated));
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

          {currentView === 'treatment' && (
            <TreatmentFollowUpView
              user={currentUser}
              patient={selectedPatient}
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
