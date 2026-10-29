import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
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
  Scissors,
  CheckCircle2,
  Lock,
  UserCheck,
  Calendar,
  Share2,
} from 'lucide-react';
import { MEDICAL_BANNERS } from '../components/UserProfileModal';

// Ilustración vectorial de cada banner médico
const BannerArtwork = ({ bannerId }) => {
  switch (bannerId) {
    case 'pediatria':
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="15%" cy="30%" r="60" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="85%" cy="70%" r="80" fill="none" stroke="white" strokeWidth="2" strokeDasharray="6 6" />
          <path d="M 50 140 Q 90 90, 130 140 T 210 140" fill="none" stroke="white" strokeWidth="3" />
          <path d="M 600 50 Q 640 100, 680 50 T 760 50" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
        </svg>
      );
    case 'farmacia':
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-35" xmlns="http://www.w3.org/2000/svg">
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
          <path d="M 50 100 Q 120 40, 200 100 T 350 100" fill="none" stroke="#FB7185" strokeWidth="2" />
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

export const ProfileScreen = ({ user, onUpdateUser, onNavigate }) => {
  const fileInputRef = useRef(null);

  const savedProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem('saludconecta_profile_custom') || '{}');
    } catch {
      return {};
    }
  })();

  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'banners' | 'rethus' | 'security'
  const [isEditing, setIsEditing] = useState(false);

  const [bannerId, setBannerId] = useState(savedProfile.bannerId || user?.bannerId || 'urgencias');
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* BARRA SUPERIOR DE NAVEGACION */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('dashboard')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-surface-container-high hover:bg-surface-container-low text-xs font-semibold text-on-surface shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>Volver al Panel Principal</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-outline font-medium">
          <span>Mi Perfil Asistencial</span>
          <span>•</span>
          <span className="font-mono text-primary font-bold">{professionalCard}</span>
        </div>
      </div>

      {/* MENSAJE DE CONFIRMACION REACTIVO */}
      {saveFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveFeedback('')}
            className="text-[11px] underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN PRINCIPAL: PORTADA TIPO RED SOCIAL / FACEBOOK    */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-surface-container-high shadow-xs overflow-hidden">
        {/* Banner Superior Panorámico */}
        <div
          className={`relative h-60 sm:h-72 w-full bg-gradient-to-r ${currentBanner.gradient} p-6 sm:p-8 flex flex-col justify-between overflow-hidden transition-all duration-500`}
        >
          <BannerArtwork bannerId={bannerId} />

          {/* Badges Superiores */}
          <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-xs uppercase tracking-wider border border-white/20">
                SaludConecta IPS v2.4
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${currentBanner.bgBadge}`}>
                {currentBanner.name}
              </span>
            </div>

            {/* Botón selector de banners */}
            <button
              type="button"
              onClick={() => setActiveTab('banners')}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 border border-white/30 transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Cambiar Portada ({MEDICAL_BANNERS.length} Banners)</span>
            </button>
          </div>

          {/* Pie del Banner */}
          <div className="relative z-10 text-white/90">
            <div className="text-xs font-semibold text-white/80 uppercase tracking-widest">{currentBanner.category}</div>
            <p className="text-sm text-white/90 max-w-xl line-clamp-1">{currentBanner.description}</p>
          </div>
        </div>

        {/* Zona del Avatar Superpuesto y Acciones de Perfil */}
        <div className="px-6 sm:px-10 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-20 sm:-mt-24">
            {/* Foto de Perfil / Avatar */}
            <div className="flex items-end gap-5">
              <div className="relative group">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white bg-slate-100 shadow-2xl overflow-hidden flex items-center justify-center text-primary font-bold text-4xl">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-white text-4xl font-bold">
                      {fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Botón flotante para cambiar foto */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Cambiar foto de perfil desde su equipo"
                  className="absolute bottom-1 right-1 p-2.5 rounded-full bg-primary hover:bg-primary-hover text-white shadow-lg border-2 border-white transition-all cursor-pointer"
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

              {/* Nombre y Títulos */}
              <div className="space-y-1.5 mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-on-surface leading-tight">
                    {fullName}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>ReTHUS Verificado</span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-on-surface-variant flex-wrap font-medium">
                  <span className="px-2.5 py-0.5 rounded-lg bg-surface-container-high text-on-surface font-semibold">
                    {roleTitle}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-primary font-bold">
                    {professionalCard}
                  </span>
                  <span>•</span>
                  <span className="text-outline">{specialty}</span>
                  <span>•</span>
                  <span className="text-outline">{branch}</span>
                </div>
              </div>
            </div>

            {/* Botón de Edición */}
            <div className="flex items-center gap-2.5 self-start sm:self-end mb-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-on-surface font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-primary" />
                  <span>Editar Perfil</span>
                </button>
              )}
            </div>
          </div>

          {/* Navegación por pestañas estilo Red Social */}
          <div className="flex items-center gap-2 mt-6 pt-3 border-t border-surface-container text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
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
              className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'banners'
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Colección de Banners ({MEDICAL_BANNERS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rethus')}
              className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
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
              className={`px-4 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'security'
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Firma Criptográfica SHA-256</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECCIÓN INFERIOR: CONTENIDO DE LAS PESTAÑAS              */}
      {/* ======================================================== */}
      {/* PESTAÑA 1: INFORMACION PROFESIONAL */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Métricas Clínicas Asistenciales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs text-center space-y-1">
              <span className="text-xs text-outline font-medium">Turnos Cumplidos</span>
              <div className="text-2xl font-bold text-primary font-mono">184</div>
              <span className="text-[11px] text-emerald-600 font-semibold">100% Asistencia</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs text-center space-y-1">
              <span className="text-xs text-outline font-medium">Pacientes Atendidos</span>
              <div className="text-2xl font-bold text-on-surface font-mono">1,248</div>
              <span className="text-[11px] text-outline">Cartago y La Unión</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs text-center space-y-1">
              <span className="text-xs text-outline font-medium">Folios SHA-256</span>
              <div className="text-2xl font-bold text-emerald-700 font-mono">984</div>
              <span className="text-[11px] text-emerald-600 font-semibold">Firma Inmutable</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs text-center space-y-1">
              <span className="text-xs text-outline font-medium">Satisfacción Pacientes</span>
              <div className="text-2xl font-bold text-amber-600 font-mono">99.4%</div>
              <span className="text-[11px] text-amber-700 font-semibold">Calidad Óptima</span>
            </div>
          </div>

          {/* Resumen Biográfico / Trayectoria */}
          <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <span>Trayectoria & Perfil Asistencial</span>
            </h3>
            {isEditing ? (
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
                placeholder="Describa su trayectoria profesional..."
              />
            ) : (
              <p className="text-xs text-on-surface leading-relaxed">{bio}</p>
            )}
          </div>

          {/* Formulario de Datos Detallados */}
          <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-outline">
              Datos Institucionales & Habilitación
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
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
                <label className="block text-[11px] font-semibold text-outline mb-1">Teléfono Institucional</label>
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

      {/* PESTAÑA 2: COLECCIÓN DE 5 BANNERS MÉDICOS */}
      {activeTab === 'banners' && (
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs">
            <h3 className="text-sm font-bold text-on-surface">Colección de Banners Médicos</h3>
            <p className="text-xs text-on-surface-variant">
              Seleccione el diseño alusivo a su área médica predilecta. Su portada se actualizará de inmediato.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {MEDICAL_BANNERS.map((b) => {
              const isSelected = b.id === bannerId;
              const IconComp = b.icon;
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setBannerId(b.id);
                    const currentPref = JSON.parse(localStorage.getItem('saludconecta_profile_custom') || '{}');
                    localStorage.setItem(
                      'saludconecta_profile_custom',
                      JSON.stringify({ ...currentPref, bannerId: b.id })
                    );
                    setSaveFeedback(`Portada actualizada: "${b.name}".`);
                    setTimeout(() => setSaveFeedback(''), 3000);
                  }}
                  className={`relative rounded-3xl overflow-hidden border-2 transition-all cursor-pointer shadow-xs hover:shadow-md ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 scale-[1.01]'
                      : 'border-surface-container-high hover:border-primary/50'
                  }`}
                >
                  <div className={`h-36 w-full bg-gradient-to-r ${b.gradient} p-4 flex flex-col justify-between relative overflow-hidden`}>
                    <BannerArtwork bannerId={b.id} />

                    <div className="relative z-10 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/30 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                        {b.category}
                      </span>
                      {isSelected && (
                        <div className="w-7 h-7 rounded-full bg-white text-primary flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 flex items-center gap-2.5 text-white">
                      <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm leading-tight">{b.name}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white text-xs space-y-1.5">
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">{b.description}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-outline">Arte vectorial exclusivo</span>
                      <span className={`text-[11px] font-bold ${isSelected ? 'text-primary' : 'text-outline hover:text-on-surface'}`}>
                        {isSelected ? 'Portada Activa' : 'Clic para Activar'}
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
        <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container-high pb-4">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-6 h-6 text-emerald-700" />
              <div>
                <h4 className="font-bold text-sm text-on-surface">Registro Oficial de Talento Humano en Salud</h4>
                <p className="text-xs text-outline">Habilitación Legal ante el Ministerio de Salud y Protección Social</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
              Vigencia Activa 2026
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-surface-container-low space-y-1">
              <span className="text-[11px] text-outline">Número de Tarjeta Profesional / Matrícula</span>
              <div className="font-mono font-bold text-base text-primary">{professionalCard}</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low space-y-1">
              <span className="text-[11px] text-outline">Entidad de Certificación Legal</span>
              <div className="font-semibold text-on-surface">Colegio Médico Colombiano / MinSalud</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low space-y-1">
              <span className="text-[11px] text-outline">Ámbito de Ejercicio Profesional</span>
              <div className="font-semibold text-on-surface">Urgencias, Consulta Externa y Hospitalización</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-low space-y-1">
              <span className="text-[11px] text-outline">Normas de Trazabilidad e Historia Clínica</span>
              <div className="font-semibold text-on-surface">Resolución 1995 de 1999 & Ley 1581 de 2012</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <strong>Principio de No Repudio Asistencial:</strong>
            <p className="leading-relaxed text-[11px]">
              La firma digital y los identificadores ReTHUS asociados a este perfil son inmutables para cada atención clínica registrada en la red integrada del Valle del Cauca.
            </p>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: SEGURIDAD CRIPTOGRAFICA */}
      {activeTab === 'security' && (
        <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-surface-container-high pb-4">
            <Lock className="w-6 h-6 text-primary" />
            <div>
              <h4 className="font-bold text-sm text-on-surface">Mecanismos Criptográficos & Segundo Factor</h4>
              <p className="text-xs text-outline">Protección de datos conforme a ISO/IEC 27001 e ISO/IEC 25010</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low">
              <div>
                <div className="font-bold text-on-surface">Autenticación Multifactor (TOTP RFC 6238)</div>
                <div className="text-[11px] text-outline">Generador de códigos temporales de 30 segundos activo</div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                Activo & Sincronizado
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low">
              <div>
                <div className="font-bold text-on-surface">Firma Digital Resumen Hash SHA-256</div>
                <div className="text-[11px] text-outline">Cadena inmutable para historias clínicas y prescripciones</div>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
                SHA-256
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low">
              <div>
                <div className="font-bold text-on-surface">Cifrado en Tránsito y Reposo</div>
                <div className="text-[11px] text-outline">TLS 1.3 con RSA-256 y almacenamiento seguro</div>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                AES-256 / TLS 1.3
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
