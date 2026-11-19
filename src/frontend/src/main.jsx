import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PatientPortal from './screens/PatientPortal';
import './index.css';

// El portal del paciente es publico y vive aparte de la aplicacion del personal de salud
export const PATIENT_PORTAL_PATH = '/solicitar-cita';
const isPatientPortal = window.location.pathname.replace(/\/+$/, '') === PATIENT_PORTAL_PATH;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isPatientPortal ? <PatientPortal /> : <App />}</React.StrictMode>
);
