import React from 'react';

// Cada latido es relativo y vuelve a su altura inicial: al desplazar la tira -50% el bucle no tiene costura.
const HEARTBEAT = 'h180 q15 -18 30 0 h30 l10 8 l14 -90 l16 124 l12 -42 h30 q25 -28 50 0 h228';
const ECG_PATH = `M0 110 ${HEARTBEAT.repeat(4)}`;

const EcgStrip = ({ className }) => (
  <div className={`absolute left-0 w-[200%] h-40 login-ecg ${className}`}>
    <svg className="w-full h-full" viewBox="0 0 2400 200" preserveAspectRatio="none" fill="none">
      <path d={ECG_PATH} stroke="#2dd4bf" strokeOpacity="0.18" strokeWidth="7" vectorEffect="non-scaling-stroke" />
      <path d={ECG_PATH} stroke="#5eead4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  </div>
);

const LoginBackground = () => (
  <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#071320]">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#0f4c5c_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#005c55_0%,transparent_60%)]" />
    <div className="absolute -top-1/4 -right-[10%] w-[60vw] h-[60vw] rounded-full login-glow bg-[radial-gradient(circle,rgba(45,212,191,0.28)_0%,transparent_65%)]" />
    <div className="absolute inset-0 login-ecg-grid" />
    <EcgStrip className="top-[12%] opacity-30 login-ecg-slow" />
    <EcgStrip className="top-[calc(50%-5rem)] opacity-90" />
    <EcgStrip className="bottom-[8%] opacity-25 login-ecg-slower" />
  </div>
);

export default LoginBackground;
