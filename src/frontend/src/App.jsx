import React, { useState } from 'react';
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
import { apiClient } from './services/api';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const active = localStorage.getItem('saludconecta_session_active');
      const token = localStorage.getItem('saludconecta_token');
      const storedUser = localStorage.getItem('saludconecta_user');
      return Boolean((active === 'true' || token) && storedUser);
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
  const [isOffline, setIsOffline] = useState(false);

  const handleLoginSuccess = (data) => {
    setIsAuthenticated(true);
    localStorage.setItem('saludconecta_session_active', 'true');
    if (data && data.user) {
      setCurrentUser(data.user);
      localStorage.setItem('saludconecta_user', JSON.stringify(data.user));
    }
    setCurrentView('dashboard');
    localStorage.setItem('saludconecta_current_view', 'dashboard');
  };

  const handleLogout = () => {
    apiClient.setAuth('', null);
    localStorage.removeItem('saludconecta_session_active');
    localStorage.removeItem('saludconecta_user');
    localStorage.removeItem('saludconecta_token');
    localStorage.removeItem('saludconecta_current_view');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
    localStorage.setItem('saludconecta_current_view', view);
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
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // REGLA RBAC ESTRICTA (ISO/IEC 25010): El usuario con rol ADMIN dispone de su propio entorno
  // desacoplado (AdminLayout) y NO tiene acceso a historias clinicas ni consulta asistencial
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
        />

        {/* CONTENEDOR PRINCIPAL: Margen dinamico sincronizado con el estado colapsado del sidebar */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'ml-20' : 'ml-64'
          } p-4 lg:p-8 min-w-0 overflow-y-auto`}
        >
          {currentView === 'dashboard' && (
            <DashboardScreen
              onSelectPatient={(p) => setSelectedPatient(p)}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'triage' && (
            <TriageScreen onNavigate={handleNavigate} />
          )}

          {currentView === 'hce' && (
            <HceScreen onNavigate={handleNavigate} />
          )}

          {currentView === 'prescription' && <PrescriptionScreen />}

          {currentView === 'profile' && (
            <ProfileScreen
              user={currentUser}
              onUpdateUser={handleUpdateUser}
              onNavigate={handleNavigate}
            />
          )}

          {(currentView === 'security' || currentView === 'auth') && (
            <SecurityMfaScreen onLogout={handleLogout} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
