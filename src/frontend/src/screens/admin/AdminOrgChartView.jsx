import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  Users,
  Building2,
  Stethoscope,
  Pill,
  HeartPulse,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Search,
  X,
  Mail,
  Phone,
  FileCheck2,
  Briefcase,
  Layers,
  ChevronDown,
  Info,
  FlaskConical,
} from 'lucide-react';
import { apiClient } from '../../services/api';

/**
 * Obtiene el avatar persistido en almacenamiento local para un usuario determinado
 */
const getPersonAvatar = (person) => {
  if (!person) return '';
  if (person.avatar) return person.avatar;
  const userKey = person.id || person.document_number || person.email || '';
  const saved =
    localStorage.getItem(`saludconecta_avatar_${userKey}`) ||
    (person.email ? localStorage.getItem(`saludconecta_avatar_${person.email}`) : null) ||
    (person.document_number ? localStorage.getItem(`saludconecta_avatar_${person.document_number}`) : null) ||
    (person.id ? localStorage.getItem(`saludconecta_avatar_${person.id}`) : null) ||
    '';
  return saved;
};

export const AdminOrgChartView = ({ users: initialUsers = [] }) => {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState(initialUsers.length === 0);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de navegación interactiva (Zoom y Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Cargar personal desde el servidor si no fue provisto
  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUsers(initialUsers);
      setLoading(false);
      return;
    }
    apiClient
      .adminGetUsers()
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error cargando personal para organigrama:', err))
      .finally(() => setLoading(false));
  }, [initialUsers]);

  // Manejo de Zoom con rueda del ratón (Scroll)
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomStep = 0.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    setZoom((prev) => {
      const next = prev + direction * zoomStep;
      return Math.min(2.0, Math.max(0.4, Number(next.toFixed(2))));
    });
  };

  // Manejo de Pan con clic sostenido (Arrastre)
  const handleMouseDown = (e) => {
    // Si hace clic en un botón o tarjeta interactiva, no iniciar arrastre global
    if (e.target.closest('button') || e.target.closest('.interactive-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Persona Cúspide: Gerencia General & Dirección Médica Institucional
  const generalManager = {
    id: 'gerente-01',
    full_name: 'Dr. Felipe Gutiérrez Isaza',
    role_name: 'GERENCIA GENERAL & DIRECCIÓN MÉDICA',
    specialty: 'Dirección Médica Hospitalaria & Salud Pública',
    branch: 'Sede Cartago - Hospital Central (Nivel II)',
    document_type: 'CC',
    document_number: '16289450',
    email: 'gerencia@saludconecta.ips.gov.co',
    phone: '315 892 1040',
    professional_card: 'DIR-GEN-001',
    is_active: true,
    created_at: '2026-01-15T08:00:00Z',
    bio: 'Director General y Decano Académico. Responsable de la habilitación ReTHUS, gobierno clínico, estándares de interoperabilidad RIPS (Res. 2275) y certificación ISO/IEC 25010 en la Red Norte del Valle.',
  };

  // Clasificación jerárquica de personas registradas según su rol
  const doctors = users.filter(
    (u) =>
      Number(u.role_id) === 2 ||
      u.role === 'MEDICO' ||
      u.specialty?.toLowerCase().includes('medicin') ||
      u.specialty?.toLowerCase().includes('urgenc') ||
      u.specialty?.toLowerCase().includes('pediatr')
  );

  const pharmacists = users.filter(
    (u) =>
      Number(u.role_id) === 6 ||
      u.role === 'FARMACIA' ||
      u.specialty?.toLowerCase().includes('farmac') ||
      (u.full_name || '').toLowerCase().includes('farma')
  );

  const nurses = users.filter(
    (u) =>
      Number(u.role_id) === 3 ||
      u.role === 'ENFERMERO' ||
      u.role === 'ENFERMERA' ||
      u.specialty?.toLowerCase().includes('enferm') ||
      (u.full_name || '').toLowerCase().includes('enf')
  );

  const assistants = users.filter(
    (u) =>
      u.role === 'AUXILIAR' ||
      u.specialty?.toLowerCase().includes('auxiliar') ||
      u.specialty?.toLowerCase().includes('asistencial')
  );

  const labStaff = users.filter(
    (u) =>
      Number(u.role_id) === 7 ||
      u.role === 'LABORATORIO' ||
      u.specialty?.toLowerCase().includes('laborat') ||
      u.specialty?.toLowerCase().includes('bacteri')
  );

  const administrative = users.filter(
    (u) =>
      Number(u.role_id) === 1 ||
      Number(u.role_id) === 4 ||
      Number(u.role_id) === 5 ||
      u.role === 'ADMIN' ||
      u.role === 'ADMISION' ||
      u.role === 'AUDITOR'
  );

  // Departamentos estructurados
  const departments = [
    {
      id: 'dep-medicos',
      title: 'Jefatura de Consulta Externa & Urgencias',
      roleCategory: 'Cuerpo Médico & Especialistas',
      icon: Stethoscope,
      color: 'emerald',
      members: doctors,
      leadTitle: 'Coordinación Médica',
    },
    {
      id: 'dep-farmacia',
      title: 'Dirección Técnica Farmacéutica',
      roleCategory: 'Dispensación & Control CUM',
      icon: Pill,
      color: 'teal',
      members: pharmacists,
      leadTitle: 'Regencia de Farmacia',
    },
    {
      id: 'dep-enfermeria',
      title: 'Coordinación Asistencial de Enfermería',
      roleCategory: 'Atención Continua & Cuidados',
      icon: HeartPulse,
      color: 'blue',
      members: nurses,
      leadTitle: 'Jefatura de Turno',
    },
    {
      id: 'dep-laboratorio',
      title: 'Laboratorio Clínico y Diagnóstico',
      roleCategory: 'Bacteriología & Procesamiento Diagnóstico',
      icon: FlaskConical,
      color: 'purple',
      members: labStaff,
      leadTitle: 'Coordinación de Laboratorio',
    },
    {
      id: 'dep-auxiliares',
      title: 'Cuerpo de Auxiliares Asistenciales',
      roleCategory: 'Soporte Asistencial & Camillería',
      icon: Layers,
      color: 'indigo',
      members: assistants,
      leadTitle: 'Supervisión Asistencial',
    },
    {
      id: 'dep-admin',
      title: 'Admisiones, Auditoría & Soporte TI',
      roleCategory: 'Gobernanza & Admisión',
      icon: ShieldCheck,
      color: 'amber',
      members: administrative,
      leadTitle: 'Coordinación Operativa',
    },
  ];

  // Componente de Tarjeta Pequeña / Nodo del Árbol Didáctico
  const PersonNode = ({ person, rankTitle, isTopLevel = false }) => {
    const avatarUrl = getPersonAvatar(person);
    const initials = (person.full_name || person.name || 'Personal')
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

    const matchesSearch =
      searchQuery.trim() &&
      ((person.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (person.specialty || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (person.document_number || '').includes(searchQuery));

    return (
      <button
        type="button"
        onClick={() => setSelectedPerson(person)}
        title="Clic para ver información completa del profesional"
        className={`interactive-card group relative p-2 sm:p-2.5 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-md text-left select-none ${
          isTopLevel
            ? 'border-amber-400 bg-gradient-to-b from-amber-50/50 to-white w-60 sm:w-64 ring-2 ring-amber-200'
            : matchesSearch
            ? 'border-primary ring-2 ring-primary/40 scale-105 w-44 sm:w-48'
            : 'border-surface-container-high hover:border-primary w-44 sm:w-48'
        }`}
      >
        {isTopLevel && (
          <span className="text-[8px] font-bold uppercase tracking-wider text-amber-800 font-mono block mb-1">
            {rankTitle}
          </span>
        )}
        <div className="flex items-center gap-2">
          {/* Avatar compacto con foto o iniciales */}
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={person.full_name}
                className={`rounded-xl object-cover border shadow-2xs ${
                  isTopLevel ? 'w-10 h-10 border-amber-400' : 'w-8 h-8 border-primary/30'
                }`}
              />
            ) : (
              <div
                className={`rounded-xl font-bold flex items-center justify-center text-white shadow-2xs ${
                  isTopLevel
                    ? 'w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-800 text-sm border border-amber-300'
                    : 'w-8 h-8 bg-gradient-to-br from-primary to-primary-container text-xs border border-primary/30'
                }`}
              >
                {initials}
              </div>
            )}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                person.is_active ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              title={person.is_active ? 'Habilitado ReTHUS' : 'Pendiente Habilitación'}
            />
          </div>

          {/* Información esencial y compacta */}
          <div className="min-w-0 flex-1">
            <h4 className="text-[11px] sm:text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors leading-tight">
              {person.full_name || person.name}
            </h4>
            <p className="text-[10px] text-outline truncate leading-tight mt-0.5">
              {person.specialty || rankTitle || person.role || 'General'}
            </p>
          </div>
        </div>

        {/* Indicador sutil de clic para ver información */}
        <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px]">
          <span className="text-slate-400 font-mono truncate max-w-[85px]">
            {person.professional_card || 'ReTHUS'}
          </span>
          <span className="text-primary font-semibold group-hover:underline flex items-center gap-0.5">
            Ver info
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* BARRA DE HERRAMIENTAS Y CONTROLES INTERACTIVOS */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Estructura Organizacional IPS
            </span>
            <span className="text-xs text-outline font-medium">
              Gobernanza Hospitalaria • Total Personal: <strong className="text-on-surface">{users.length + 1}</strong>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />
            <span>Diagrama Administrativo & Árbol Jerárquico</span>
          </h2>
        </div>

        {/* Controles de Zoom, Navegación y Búsqueda */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Buscador de Personal */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Localizar en el árbol..."
              className="w-full h-8 pl-8 pr-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Botones de Zoom */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-surface-container-high">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(2.0, Number((prev + 0.1).toFixed(2))))}
              title="Aumentar Zoom (+)"
              className="p-1.5 rounded-lg hover:bg-white text-on-surface transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold px-2 text-primary">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
              title="Reducir Zoom (-)"
              className="p-1.5 rounded-lg hover:bg-white text-on-surface transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              title="Restablecer posición y zoom (100%)"
              className="p-1.5 rounded-lg hover:bg-white text-outline hover:text-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* LIENZO INTERACTIVO (CANVAS CON ZOOM Y PAN) */}
      <div
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full h-[650px] sm:h-[720px] bg-slate-50 rounded-3xl border-2 border-surface-container-high overflow-hidden shadow-inner select-none transition-colors ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Fondo con Cuadrícula Gráfica Asistencial */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Guía Flotante de Uso Didáctico */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-surface-container-high text-[11px] text-outline shadow-sm flex items-center gap-2 pointer-events-none">
          <Move className="w-3.5 h-3.5 text-primary" />
          <span>Rueda del ratón: <strong>Zoom</strong> • Clic sostenido: <strong>Arrastrar</strong> • Clic en tarjeta: <strong>Ver detalle</strong></span>
        </div>

        {/* Contenedor Transformable (Aplica Escala y Desplazamiento) */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="w-full flex flex-col items-center pt-8 pb-32 px-12"
        >
          {/* NIVEL 1: ALTA DIRECCIÓN (GERENCIA GENERAL) */}
          <div className="flex flex-col items-center">
            <PersonNode person={generalManager} rankTitle="ALTA DIRECCIÓN" isTopLevel={true} />

            {/* Línea Conectora Vertical Principal */}
            <div className="w-0.5 h-10 bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-200" />
            <div className="w-0.5 h-6 bg-slate-300" />
          </div>

          {/* LÍNEA HORIZONTAL DE DISTRIBUCIÓN A JEFATURAS */}
          <div className="relative w-full max-w-6xl flex justify-center">
            <div className="w-11/12 h-0.5 bg-slate-300" />
          </div>

          {/* NIVEL 2 Y 3: DEPARTAMENTOS Y PERSONAL RAMIFICADO */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 mt-0 w-full max-w-6xl pt-2">
            {departments.map((dept) => {
              const IconComp = dept.icon;
              return (
                <div key={dept.id} className="flex flex-col items-center space-y-3">
                  {/* Conector vertical hacia la línea maestra */}
                  <div className="w-0.5 h-5 bg-slate-300" />

                  {/* Nodo de Jefatura de Área Compacto */}
                  <div className="w-44 sm:w-48 bg-white p-2.5 rounded-xl border border-surface-container-high shadow-2xs text-center space-y-1">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1 shadow-2xs">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-outline block font-mono">
                      {dept.leadTitle}
                    </span>
                    <h3 className="text-[11px] font-bold text-on-surface leading-tight">
                      {dept.title}
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-surface-container-low text-outline inline-block">
                      {dept.members.length} {dept.members.length === 1 ? 'colaborador' : 'colaboradores'}
                    </span>
                  </div>

                  {/* Conector vertical hacia los miembros */}
                  <div className="w-0.5 h-3 bg-slate-300" />

                  {/* Miembros del Departamento */}
                  <div className="flex flex-col gap-2.5 w-full items-center">
                    {dept.members.length > 0 ? (
                      dept.members.map((member) => (
                        <PersonNode
                          key={member.id}
                          person={member}
                          rankTitle={dept.roleCategory}
                        />
                      ))
                    ) : (
                      <div className="p-2.5 rounded-xl border border-dashed border-outline-variant/40 bg-white/60 text-center text-[10px] text-outline w-44 sm:w-48">
                        Sin personal asignado a este rango
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL DE DETALLES INTEGRALES DE LA PERSONA SELECCIONADA  */}
      {/* ======================================================== */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-surface-container-high shadow-2xl overflow-hidden animate-scale-in">
            {/* Cabecera del Modal */}
            <div className="p-6 bg-gradient-to-r from-primary to-[#073642] text-white flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {getPersonAvatar(selectedPerson) ? (
                    <img
                      src={getPersonAvatar(selectedPerson)}
                      alt={selectedPerson.full_name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/20 text-white font-bold text-xl flex items-center justify-center border-2 border-white/40">
                      {(selectedPerson.full_name || 'US').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      selectedPerson.is_active ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 font-mono block">
                    Ficha de Personal Institucional
                  </span>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {selectedPerson.full_name || selectedPerson.name}
                  </h3>
                  <p className="text-xs text-white/90">{selectedPerson.specialty || 'General'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con Información Detallada */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-surface-container">
                <div>
                  <span className="text-[11px] font-semibold text-outline block">Identificación Oficial</span>
                  <span className="font-mono font-bold text-on-surface">
                    {selectedPerson.document_type || 'CC'} {selectedPerson.document_number || 'No especificada'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-outline block">Tarjeta ReTHUS / Licencia</span>
                  <span className="font-mono font-bold text-primary">
                    {selectedPerson.professional_card || selectedPerson.license || 'RM-94821-VALLE'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-outline block">Sede Operativa Asignada</span>
                  <span className="font-semibold text-on-surface flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-outline" />
                    <span>{selectedPerson.branch || 'Sede Cartago - Hospital Central'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-outline block">Estado de Habilitación</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedPerson.is_active
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border border-amber-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{selectedPerson.is_active ? 'Habilitado para Ejercicio Clínico' : 'Pendiente de Validación'}</span>
                  </span>
                </div>
              </div>

              {/* Canales de Contacto */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                  Canales de Comunicación Corporativa
                </span>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-mono text-on-surface">{selectedPerson.email || 'correo@saludconecta.ips.gov.co'}</span>
                </div>
                {selectedPerson.phone && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-mono text-on-surface">{selectedPerson.phone}</span>
                  </div>
                )}
              </div>

              {/* Trayectoria o Bio */}
              {selectedPerson.bio && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-surface-container-high space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                    Perfil Profesional y Trayectoria
                  </span>
                  <p className="text-on-surface text-xs leading-relaxed">{selectedPerson.bio}</p>
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div className="p-4 bg-surface-container-low border-t border-surface-container-high flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrgChartView;

