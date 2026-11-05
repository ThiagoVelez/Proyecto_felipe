import React, { useEffect, useRef } from 'react';
import {
  Fingerprint,
  FileCheck2,
  CheckCircle2,
  Scale,
  Activity,
} from 'lucide-react';

export const ClinicalBiometricVisualizer = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Evitar invocación de canvas 2D no soportado en entorno de pruebas JSDOM
    if (
      typeof window !== 'undefined' &&
      (window.navigator?.userAgent?.includes('jsdom') || import.meta.env?.MODE === 'test')
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== 'function') return;

    let ctx;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let particles = [];

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const particleCount = 28;
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * (width || 500),
        y: Math.random() * (height || 800),
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 1.2,
      });
    }

    const drawNetwork = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(20, 184, 166, ${0.22 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(drawNetwork);
    };

    drawNetwork();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section
      aria-label="Panel Visual Biométrico y Telemetría Hospitalaria"
      className="hidden lg:flex flex-1 min-h-screen bg-[#02171c] relative overflow-hidden flex-col justify-between p-8 xl:p-12 text-white select-none"
    >
      {/* Fondo Degradado Radial Oscuro y Grid Clínico */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/40 via-[#031d24] to-[#010e12] z-0" />
      <div className="absolute inset-0 clinical-grid opacity-30 z-0 pointer-events-none" />

      {/* Resplandores Bioluminiscentes de Ambiente */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-10 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Canvas Animado de Red de Nodos Asistenciales */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-40"
      />

      {/* TOP VISUAL: Estado Operativo y Hash Forense */}
      <div className="relative z-20 flex items-start justify-between w-full">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-teal-500/30 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-300">
            Red de Salud Integrada Valle
          </span>
          <span className="text-slate-500 text-xs">|</span>
          <span className="text-xs text-slate-300 font-mono">12 Hospitales Conectados</span>
        </div>

        <div className="text-right hidden xl:block">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
            Hash Forense de Entrada
          </div>
          <div className="text-xs font-mono text-emerald-400/90 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-500/20 mt-1">
            SHA256: 7f83b165...94c3d82a
          </div>
        </div>
      </div>

      {/* CENTER VISUAL: Orbe Biométrico Holográfico & ECG Cardiovascular */}
      <div className="relative z-20 my-auto flex flex-col items-center justify-center py-6">
        <div className="relative flex items-center justify-center w-72 h-72 xl:w-80 xl:h-80">
          {/* Anillos concéntricos giratorios */}
          <div className="absolute inset-0 rounded-full border border-teal-500/20 sonar-wave pointer-events-none" />
          <div className="absolute inset-3 rounded-full border border-dashed border-emerald-500/40 animate-spin-slow pointer-events-none" />
          <div className="absolute inset-8 rounded-full border border-teal-400/30 animate-reverse-spin pointer-events-none" />
          <div className="absolute inset-14 rounded-full border border-emerald-400/20 pointer-events-none" />

          {/* Núcleo de Identidad Biomecánica & Firma ReTHUS */}
          <div className="relative w-36 h-36 xl:w-40 xl:h-40 rounded-full bg-gradient-to-tr from-teal-950 via-teal-900 to-emerald-900 border-2 border-emerald-400/60 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.25)] backdrop-blur-xl">
            <Fingerprint className="w-14 h-14 text-emerald-300 opacity-90 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-emerald-300 uppercase mt-1 font-bold">
              Biometría OK
            </span>
          </div>

          {/* Tarjeta Flotante 1: Historial Clínico Unificado (Glassmorphism Izquierda) */}
          <div className="absolute -left-6 bottom-4 px-3.5 py-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-teal-500/40 shadow-xl shadow-black/40 flex items-center gap-3 transform -translate-y-4 hover:translate-y-0 transition-transform">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Historial Clínico Unificado
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>99.98% Disponibilidad</span>
                <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                  24ms
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta Flotante 2: Validez ReTHUS (Glassmorphism Derecha) */}
          <div className="absolute -right-8 top-6 px-3.5 py-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-cyan-500/40 shadow-xl shadow-black/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Validez Credencial
              </div>
              <div className="text-xs font-bold text-white">ReTHUS Vigente • 2026</div>
            </div>
          </div>
        </div>

        {/* TRAZADO CARDIOVASCULAR (ECG / MONITOR DE SIGNOS VITALES) */}
        <div className="w-full max-w-lg mt-8 bg-slate-900/70 border border-teal-500/30 rounded-2xl p-4 backdrop-blur-md shadow-2xl relative">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-emerald-300 text-[11px] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Telemetría y Monitor en Tiempo Real
              </span>
            </div>
            <div className="font-mono text-[11px] text-teal-300">
              FC: <span className="text-white font-bold">74 BPM</span> | SpO2:{' '}
              <span className="text-white font-bold">99%</span>
            </div>
          </div>

          {/* Curva SVG de Pulso Cardíaco ECG Animada */}
          <div className="relative w-full h-16 bg-[#021b21] rounded-lg overflow-hidden flex items-center border border-teal-900/60">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 80">
              <defs>
                <pattern id="monitorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="rgba(20, 184, 166, 0.08)"
                    strokeWidth="1"
                  />
                </pattern>
                <linearGradient id="ecgGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#monitorGrid)" />
              <path
                className="ecg-line"
                d="M0,40 L60,40 L75,40 L85,32 L95,46 L105,40 L130,40 L145,12 L158,70 L170,26 L180,44 L190,40 L230,40 L245,40 L255,32 L265,46 L275,40 L300,40 L315,12 L328,70 L340,26 L350,44 L360,40 L400,40 L415,40 L425,32 L435,46 L445,40 L470,40 L485,12 L498,70 L510,26 L520,44 L530,40 L600,40"
                fill="none"
                stroke="url(#ecgGlow)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.6"
              />
            </svg>
            <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent pointer-events-none animate-pulse" />
          </div>
        </div>
      </div>

      {/* BOTTOM VISUAL: Módulos de Conformidad Jurídica & Certificación ISO */}
      <div className="relative z-20 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Tarjeta de Advertencia Jurídica y Forense */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-teal-500/30 backdrop-blur-md">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider mb-1">
            <Scale className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Advertencia Jurídica y Forense</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Acceso restringido exclusivamente a profesionales autorizados por{' '}
            <strong className="text-white">ReTHUS y MinSalud</strong>. Cada prescripción o consulta
            queda registrada bajo bitácora inalterable (Ley 1581 de 2012 y Res. 1995 de 1999).
          </p>
        </div>

        {/* Tarjeta de Certificación de Grado Médico ISO/IEC 25010 */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-teal-500/30 backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Certificado ISO/IEC 25010</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Grado Médico
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Protocolo de auditoría continua y trazabilidad inmutable mediante funciones de resumen
            criptográfico hash SHA-256 según el estándar regulatorio MinSalud.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ClinicalBiometricVisualizer;

