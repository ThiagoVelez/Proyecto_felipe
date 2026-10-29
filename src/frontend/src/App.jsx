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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const handleLoginSuccess = (data) => {
    setIsAuthenticated(true);
    if (data && data.user) {
      setCurrentUser(data.user);
    }
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    apiClient.setAuth('', null);
    setIsAuthenticated(false);
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
        onUpdateUser={(updated) => setCurrentUser(updated)}
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
        onUpdateUser={(updated) => setCurrentUser(updated)}
        onNavigate={(view) => setCurrentView(view)}
      />

      <div className="flex flex-1 pt-20">
        {/* SIDEBAR DE NAVEGACION */}
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

        {/* CONTENEDOR PRINCIPAL: ml-64 garantiza que el contenido nunca sea tapado por el sidebar */}
        <main className="flex-1 ml-64 p-4 lg:p-8 min-w-0 overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardScreen
              onSelectPatient={(p) => setSelectedPatient(p)}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {currentView === 'triage' && (
            <TriageScreen onNavigate={(view) => setCurrentView(view)} />
          )}

          {currentView === 'hce' && (
            <HceScreen onNavigate={(view) => setCurrentView(view)} />
          )}

          {currentView === 'prescription' && <PrescriptionScreen />}

          {currentView === 'profile' && (
            <ProfileScreen
              user={currentUser}
              onUpdateUser={(updated) => setCurrentUser(updated)}
              onNavigate={(view) => setCurrentView(view)}
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
