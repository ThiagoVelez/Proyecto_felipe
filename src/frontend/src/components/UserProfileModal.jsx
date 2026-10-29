import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Check,
  ShieldCheck,
  FileCheck2,
  Building2,
  Mail,
  Phone,
  Clock,
  Sparkles,
  Edit3,
  Save,
  Award,
  Activity,
  HeartPulse,
  Pill,
  Baby,
  Stethoscope,
  Scissors,
  CheckCircle2,
  UserCheck,
  QrCode,
  Lock,
} from 'lucide-react';

// Colección oficial de los 5 Banners Médicos Institucionales
export const MEDICAL_BANNERS = [
  {
    id: 'pediatria',
    name: 'Pediatría & Salud Infantil',
    category: 'Atención Materno-Infantil',
    gradient: 'from-[#0F766E] via-[#0D9488] to-[#F59E0B]',
    patternColor: 'rgba(255, 255, 255, 0.15)',
    icon: Baby,
    description: 'Neonatología, desarrollo psicomotor y protección integral de la primera infancia.',
    accentColor: '#F59E0B',
    bgBadge: 'bg-teal-900/60 text-teal-100 border-teal-400/30',
  },
  {
    id: 'farmacia',
    name: 'Farmacología & Farmacia Hospitalaria',
    category: 'Gestión CUM y Bioquímica',
    gradient: 'from-[#064E3B] via-[#047857] to-[#022c22]',
    patternColor: 'rgba(52, 211, 153, 0.15)',
    icon: Pill,
    description: 'Dispensación segura, farmacovigilancia y control de contraindicaciones cruzadas.',
    accentColor: '#34D399',
    bgBadge: 'bg-emerald-900/60 text-emerald-100 border-emerald-400/30',
  },
  {
    id: 'urgencias',
    name: 'Urgencias & Cuidados Críticos',
    category: 'Medicina de Emergencias',
    gradient: 'from-[#0B1329] via-[#003B46] to-[#075985]',
    patternColor: 'rgba(56, 189, 248, 0.18)',
    icon: Activity,
    description: 'Soporte vital avanzado, triaje Manchester y estabilización hemodinámica 24/7.',
    accentColor: '#38BDF8',
    bgBadge: 'bg-sky-900/60 text-sky-100 border-sky-400/30',
  },
  {
    id: 'cirugia',
    name: 'Cirugía & Quirófano Especializado',
    category: 'Asepsia & Alta Complejidad',
    gradient: 'from-[#1E293B] via-[#1E3A8A] to-[#0F172A]',
    patternColor: 'rgba(147, 197, 253, 0.15)',
    icon: Scissors,
    description: 'Quirófano estéril, instrumentación de precisión e intervenciones quirúrgicas.',
    accentColor: '#93C5FD',
    bgBadge: 'bg-indigo-900/60 text-indigo-100 border-indigo-400/30',
  },
  {
    id: 'cardiologia',
    name: 'Cardiología & Medicina Interna',
    category: 'Sistema Cardiovascular',
    gradient: 'from-[#4C0519] via-[#881337] to-[#0F172A]',
    patternColor: 'rgba(251, 113, 133, 0.15)',
    icon: HeartPulse,
    description: 'Monitorización electrocardiográfica, hemodinamia y prevención cardiovascular.',
    accentColor: '#FB7185',
    bgBadge: 'bg-rose-900/60 text-rose-100 border-rose-400/30',
  },
];

// Componente para renderizar la ilustración vectorial de cada banner
const BannerArtwork = ({ bannerId }) => {
  switch (bannerId) {
    case 'pediatria':
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="15%" cy="30%" r="50" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="85%" cy="70%" r="70" fill="none" stroke="white" strokeWidth="2" strokeDasharray="6 6" />
          <path d="M 50 140 Q 90 90, 130 140 T 210 140" fill="none" stroke="white" strokeWidth="3" />
          <path d="M 600 50 Q 640 100, 680 50 T 760 50" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
        </svg>
      );
    case 'farmacia':
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-35" xmlns="http://www.w3.org/2000/svg">
          {/* Hexágonos de estructura molecular */}
          <polygon points="120,40 150,55 150,85 120,100 90,85 90,55" fill="none" stroke="white" strokeWidth="2" />
          <line x1="150" y1="70" x2="190" y2="70" stroke="white" strokeWidth="2" />
          <polygon points="220,55 250,70 250,100 220,115 190,100 190,70" fill="none" stroke="white" strokeWidth="2" />
          <polygon points="780,30 810,45 810,75 780,90 750,75 750,45" fill="none" stroke="white" strokeWidth="2" />
          <circle cx="220" cy="115" r="4" fill="white" />
          <circle cx="120" cy="40" r="4" fill="white" />
        </svg>
      );
    case 'urgencias':
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45" xmlns="http://www.w3.org/2000/svg">
          {/* Trazado ECG monitor de signos vitales */}
          <path
            d="M 0 100 L 150 100 L 170 85 L 185 115 L 205 30 L 225 150 L 240 90 L 255 105 L 270 100 L 500 100 L 520 85 L 535 115 L 555 30 L 575 150 L 590 90 L 605 105 L 620 100 L 900 100"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
          />
          <line x1="0" y1="50" x2="1000" y2="50" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="0" y1="150" x2="1000" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </svg>
      );
    case 'cirugia':
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" xmlns="http://www.w3.org/2000/svg">
          {/* Haz de luz de lámpara quirúrgica y cuadrícula */}
          <circle cx="75%" cy="30%" r="90" fill="none" stroke="white" strokeWidth="2" />
          <circle cx="75%" cy="30%" r="130" fill="none" stroke="white" strokeWidth="1" strokeDasharray="5 5" />
          <line x1="75%" y1="0" x2="75%" y2="200" stroke="white" strokeWidth="1" opacity="0.3" />
          <line x1="50%" y1="30%" x2="100%" y2="30%" stroke="white" strokeWidth="1" opacity="0.3" />
        </svg>
      );
    case 'cardiologia':
    default:
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
          {/* Pulso cardíaco arterial y silueta */}
          <path
            d="M 50 100 Q 120 40, 200 100 T 350 100"
            fill="none"
            stroke="#FB7185"
            strokeWidth="2"
          />
          <path
            d="M 600 100 L 650 100 L 665 75 L 680 135 L 700 20 L 720 160 L 735 90 L 750 105 L 850 100"
            fill="none"
            stroke="#FB7185"
            strokeWidth="2.5"
          />
        </svg>
      );
  }
};

export const UserProfileModal = ({ isOpen, onClose, user, onUpdateUser }) => {
  const fileInputRef = useRef(null);

  // Cargar preferencias guardadas en localStorage
  const savedProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem('saludconecta_profile_custom') || '{}');
    } catch {
      return {};
    }
  })();

  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'banners' | 'rethus' | 'security'
  const [isEditing, setIsEditing] = useState(false);

  // Estados del perfil
  const [bannerId, setBannerId] = useState(savedProfile.bannerId || 'urgencias');
  const [avatarUrl, setAvatarUrl] = useState(savedProfile.avatarUrl || user?.avatar || '');
  const [fullName, setFullName] = useState(user?.full_name || user?.name || 'Dr. Santiago Vélez');
  const [phone, setPhone] = useState(savedProfile.phone || user?.phone || '312 345 6789');
  const [specialty, setSpecialty] = useState(user?.specialty || 'Medicina de Urgencias');
  const [branch, setBranch] = useState(user?.branch || 'Sede Cartago - Hospital Central (Nivel II)');
  const [bio, setBio] = useState(
    savedProfile.bio ||
      'Especialista en Medicina de Urgencias y Trauma. Coordinador de atención clínica y protocolos de triaje Manchester. Comprometido con la atención oportuna y la seguridad del paciente bajo estándares MinSalud.'
  );
  const [shiftHours, setShiftHours] = useState(savedProfile.shiftHours || 'Turno Mañana (07:00 - 13:00 COT)');
  const [saveFeedback, setSaveFeedback] = useState('');

  const currentBanner = MEDICAL_BANNERS.find((b) => b.id === bannerId) || MEDICAL_BANNERS[2];
  const roleTitle = user?.role === 'ADMIN' || Number(user?.role_id) === 1 ? 'ADMINISTRADOR TI' : (user?.role || 'MEDICO');
  const professionalCard = user?.professional_card || user?.license || (roleTitle === 'ADMINISTRADOR TI' ? 'TI-ADMIN-001' : 'RM-94821-VALLE');

  // Manejo de carga de foto personalizada desde archivo local
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen seleccionada supera el límite de 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result;
        if (resultUrl) {
          setAvatarUrl(resultUrl);
          setSaveFeedback('Foto de perfil actualizada. Guarde los cambios para confirmar.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Guardar cambios del perfil
  const handleSaveChanges = (e) => {
    if (e) e.preventDefault();
    const updatedCustom = {
      bannerId,
      avatarUrl,
      phone,
      bio,
      shiftHours,
      specialty,
      branch,
    };

    localStorage.setItem('saludconecta_profile_custom', JSON.stringify(updatedCustom));

    // Actualizar usuario en el estado padre y localStorage global
    const updatedUser = {
      ...user,
      full_name: fullName,
      name: fullName,
      phone,
      specialty,
      branch,
      avatar: avatarUrl,
      bannerId,
    };

    localStorage.setItem('saludconecta_user', JSON.stringify(updatedUser));

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    setIsEditing(false);
    setSaveFeedback('Perfil actualizado exitosamente.');
    setTimeout(() => setSaveFeedback(''), 3500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-surface-container-high overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* BOTON DE CIERRE SUPERIOR */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer"
          title="Cerrar perfil"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CONTENEDOR DESPLAZABLE */}
        <div className="overflow-y-auto flex-1">
          {/* ======================================================== */}
          {/* SECCION 1: PORTADA / BANNER MEDICO (ESTILO FACEBOOK)      */}
          {/* ======================================================== */}
          <div className={`relative h-48 sm:h-60 w-full bg-gradient-to-r ${currentBanner.gradient} p-4 sm:p-6 flex flex-col justify-between overflow-hidden transition-all duration-500`}>
            {/* Ilustración de Arte Vectorial Médico */}
            <BannerArtwork bannerId={bannerId} />

            {/* Badges Institucionales Superiores */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-xs uppercase tracking-wider border border-white/20">
                  SaludConecta IPS v2.4
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${currentBanner.bgBadge}`}>
                  {currentBanner.name}
                </span>
              </div>

              {/* Botón rápido para abrir el selector de los 5 banners */}
              <button
                type="button"
                onClick={() => setActiveTab('banners')}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/30 transition-all cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Elegir Banner ({MEDICAL_BANNERS.length})</span>
              </button>
            </div>

            {/* Texto de Especialidad en la Portada */}
            <div className="relative z-10 hidden sm:block text-white/90">
              <div className="text-xs font-medium text-white/80 uppercase tracking-widest">{currentBanner.category}</div>
              <p className="text-[12px] text-white/90 max-w-md line-clamp-1">{currentBanner.description}</p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECCION 2: FOTO DE PERFIL SUPERPUESTA & ACCIONES         */}
          {/* ======================================================== */}
          <div className="px-4 sm:px-8 pb-4 bg-white border-b border-surface-container-high relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
              {/* Foto de Perfil / Avatar */}
              <div className="flex items-end gap-4">
                <div className="relative group">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-slate-100 shadow-xl overflow-hidden flex items-center justify-center text-primary font-bold text-3xl">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-white text-3xl font-bold">
                        {fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Botón flotante para cambiar foto de perfil */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Cambiar foto de perfil"
                    className="absolute bottom-1 right-1 p-2 rounded-full bg-primary hover:bg-primary-hover text-white shadow-md border-2 border-white transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Nombre y Título del Profesional */}
                <div className="space-y-1 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold text-on-surface leading-tight">
                      {fullName}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ReTHUS Verificado</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-on-surface-variant flex-wrap font-medium">
                    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                      {roleTitle}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-primary font-semibold">
                      {professionalCard}
                    </span>
                    <span>•</span>
                    <span className="text-outline">{specialty}</span>
                  </div>
                </div>
              </div>

              {/* Botón de Editar Perfil */}
              <div className="flex items-center gap-2 self-start sm:self-end mb-2">
                {isEditing ? (
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-on-surface font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-primary" />
                    <span>Editar Perfil</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mensaje de confirmación reactivo */}
            {saveFeedback && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveFeedback}</span>
              </div>
            )}

            {/* PESTAÑAS DE NAVEGACION ESTILO FACEBOOK */}
            <div className="flex items-center gap-2 mt-4 pt-2 border-t border-surface-container text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'info'
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Información Profesional
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('banners')}
                className={`px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'banners'
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Colección de Banners (5)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rethus')}
                className={`px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'rethus'
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Acreditación MinSalud</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'security'
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Firma Criptográfica</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECCION 3: CONTENIDO DE LAS PESTAÑAS                    */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-8 bg-surface-container-lowest">
            {/* PESTAÑA 1: INFORMACION PROFESIONAL */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Resumen Biográfico / "Sobre mí" */}
                <div className="p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span>Trayectoria & Perfil Asistencial</span>
                  </h3>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full p-3 text-xs rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
                      placeholder="Describa su trayectoria profesional..."
                    />
                  ) : (
                    <p className="text-xs text-on-surface leading-relaxed">{bio}</p>
                  )}
                </div>

                {/* Métricas Clínicas Rápidas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-surface-container-high shadow-xs text-center space-y-0.5">
                    <span className="text-[11px] text-outline font-medium">Turnos Cumplidos</span>
                    <div className="text-xl font-bold text-primary font-mono">184</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">100% Asistencia</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-surface-container-high shadow-xs text-center space-y-0.5">
                    <span className="text-[11px] text-outline font-medium">Pacientes Atendidos</span>
                    <div className="text-xl font-bold text-on-surface font-mono">1,248</div>
                    <span className="text-[10px] text-outline">Cartago y La Unión</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-surface-container-high shadow-xs text-center space-y-0.5">
                    <span className="text-[11px] text-outline font-medium">Folios SHA-256</span>
                    <div className="text-xl font-bold text-emerald-700 font-mono">984</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Firma Inmutable</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-surface-container-high shadow-xs text-center space-y-0.5">
                    <span className="text-[11px] text-outline font-medium">Satisfacción Pacientes</span>
                    <div className="text-xl font-bold text-amber-600 font-mono">99.4%</div>
                    <span className="text-[10px] text-amber-700 font-semibold">Calidad Óptima</span>
                  </div>
                </div>

                {/* Ficha de Datos Detallada / Formulario de Edición */}
                <div className="p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-outline">
                    Datos Institucionales & Habilitación
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">Nombre Completo</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface"
                        />
                      ) : (
                        <div className="font-semibold text-on-surface py-1">{fullName}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">Correo Institucional</label>
                      <div className="font-mono text-on-surface py-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-outline" />
                        <span>{user?.email || 'svelez@saludconecta.ips.gov.co'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">Teléfono / Buscapersonas</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface"
                        />
                      ) : (
                        <div className="font-mono text-on-surface py-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-outline" />
                          <span>{phone}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">Especialidad Médica</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface"
                        />
                      ) : (
                        <div className="font-semibold text-on-surface py-1">{specialty}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">Sede Operativa Asignada</label>
                      {isEditing ? (
                        <select
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface"
                        >
                          <option value="Sede Cartago - Hospital Central (Nivel II)">Sede Cartago - Hospital Central (Nivel II)</option>
                          <option value="Sede La Unión (Urgencias)">Sede La Unión (Urgencias)</option>
                          <option value="Sede Tuluá (Ambulatoria)">Sede Tuluá (Ambulatoria)</option>
                          <option value="Brigada Rural (PWA Sync)">Brigada Rural (PWA Sync)</option>
                        </select>
                      ) : (
                        <div className="font-semibold text-on-surface py-1 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-outline" />
                          <span>{branch}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">Horario Asistencial</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={shiftHours}
                          onChange={(e) => setShiftHours(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface"
                        />
                      ) : (
                        <div className="font-semibold text-on-surface py-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-outline" />
                          <span>{shiftHours}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 2: COLECCION DE 5 BANNERS MEDICOS */}
            {activeTab === 'banners' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Colección de Banners Médicos</h3>
                    <p className="text-xs text-on-surface-variant">
                      Seleccione el diseño alusivo a su área asistencial favorita. Se aplicará a su portada de inmediato.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    Banner Activo: <strong>{currentBanner.name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MEDICAL_BANNERS.map((b) => {
                    const isSelected = b.id === bannerId;
                    const IconComp = b.icon;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          setBannerId(b.id);
                          // Guardar de inmediato la preferencia
                          const currentPref = JSON.parse(localStorage.getItem('saludconecta_profile_custom') || '{}');
                          localStorage.setItem(
                            'saludconecta_profile_custom',
                            JSON.stringify({ ...currentPref, bannerId: b.id })
                          );
                          setSaveFeedback(`Banner "${b.name}" aplicado a su portada.`);
                          setTimeout(() => setSaveFeedback(''), 3000);
                        }}
                        className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shadow-xs hover:shadow-md ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/30 scale-[1.01]'
                            : 'border-surface-container-high hover:border-primary/50'
                        }`}
                      >
                        {/* Miniatura visual del banner */}
                        <div className={`h-28 w-full bg-gradient-to-r ${b.gradient} p-3.5 flex flex-col justify-between relative overflow-hidden`}>
                          <BannerArtwork bannerId={b.id} />

                          <div className="relative z-10 flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                              {b.category}
                            </span>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center shadow-md">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            )}
                          </div>

                          <div className="relative z-10 flex items-center gap-2 text-white">
                            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-xs leading-tight">{b.name}</span>
                          </div>
                        </div>

                        {/* Descripción técnica */}
                        <div className="p-3 bg-white text-xs space-y-1">
                          <p className="text-[11px] text-on-surface-variant leading-tight">{b.description}</p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-mono text-outline">Diseño vectorial exclusivo</span>
                            <span className={`text-[11px] font-bold ${isSelected ? 'text-primary' : 'text-outline hover:text-on-surface'}`}>
                              {isSelected ? 'Seleccionado' : 'Hacer Clic para Aplicar'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PESTAÑA 3: ACREDITACION RETHUS & MINSALUD */}
            {activeTab === 'rethus' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-emerald-700" />
                      <h4 className="font-bold text-sm text-on-surface">Registro Oficial de Talento Humano en Salud</h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                      Habilitación Vigente 2026
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                      <span className="text-[11px] text-outline">Número de Tarjeta Profesional / Matrícula</span>
                      <div className="font-mono font-bold text-sm text-primary">{professionalCard}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                      <span className="text-[11px] text-outline">Entidad de Certificación Legal</span>
                      <div className="font-semibold text-on-surface">Colegio Médico Colombiano / MinSalud</div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                      <span className="text-[11px] text-outline">Ámbito de Ejercicio Profesional</span>
                      <div className="font-semibold text-on-surface">Urgencias, Consulta Externa y Hospitalización</div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                      <span className="text-[11px] text-outline">Norma de Trazabilidad Aplicada</span>
                      <div className="font-semibold text-on-surface">Resolución 1995 de 1999 & Ley 1581 de 2012</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                    <strong>Principio de No Repudio Asistencial:</strong>
                    <p className="leading-tight">
                      La firma digital y los identificadores ReTHUS asociados a este perfil son inmutables para cada atención clínica registrada en la red integrada del Valle del Cauca.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 4: SEGURIDAD CRIPTOGRAFICA */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-surface-container-high pb-3">
                    <Lock className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-sm text-on-surface">Mecanismos Criptográficos & Segundo Factor</h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                      <div>
                        <div className="font-bold text-on-surface">Autenticación Multifactor (TOTP RFC 6238)</div>
                        <div className="text-[11px] text-outline">Generador de códigos temporales de 30 segundos activo</div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        Activo & Sincronizado
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                      <div>
                        <div className="font-bold text-on-surface">Firma Digital Resumen Hash SHA-256</div>
                        <div className="text-[11px] text-outline">Cadena inmutable para historias clínicas y prescripciones</div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold font-mono">
                        SHA-256
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                      <div>
                        <div className="font-bold text-on-surface">Cifrado en Tránsito y Reposo</div>
                        <div className="text-[11px] text-outline">TLS 1.3 con RSA-256 y almacenamiento seguro</div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                        AES-256 / TLS 1.3
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <div className="p-3.5 sm:px-8 bg-white border-t border-surface-container-high flex items-center justify-between text-xs">
          <span className="text-[11px] text-outline font-mono">
            SaludConecta IPS • Perfil Clínico Certificado ISO/IEC 25010
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;

