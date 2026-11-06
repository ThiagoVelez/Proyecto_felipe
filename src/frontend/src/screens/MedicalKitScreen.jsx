import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Stethoscope,
  HeartPulse,
  BookOpen,
  Plus,
  Search,
  Filter,
  Youtube,
  Video,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  FileText,
  Upload,
  Info,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { formatDateTime } from '../utils/clinical';

export const CATEGORIES = [
  { id: 'TODOS', label: 'Todas las Categorías', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  { id: 'CONSEJOS', label: 'Consejos de Salud', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { id: 'AYUDAS', label: 'Ayudas y Guías', color: 'bg-blue-50 text-blue-800 border-blue-300' },
  { id: 'ENFERMEDADES', label: 'Manejo de Enfermedades', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  { id: 'VACUNAS', label: 'Esquema de Vacunas', color: 'bg-purple-50 text-purple-800 border-purple-300' },
  { id: 'ESTILO_DE_VIDA', label: 'Estilo de Vida y Nutrición', color: 'bg-cyan-50 text-cyan-800 border-cyan-300' },
  { id: 'PREVENCION', label: 'Prevención y Autocuidado', color: 'bg-rose-50 text-rose-800 border-rose-300' },
];

export const INITIAL_SEEDS = [
  {
    id: 'seed-01',
    category: 'VACUNAS',
    title: 'Esquema Nacional de Vacunación 2026: Dosis de Refuerzo Adulto',
    summary: 'Guía oficial para actualización de esquemas contra Influenza estacional, Tétanos y COVID-19 en población vulnerable.',
    content: 'La vacunación en adultos mayores y personal de salud es prioritaria en la red pública hospitalaria. Se recomienda verificar carné de vacunación en cada triaje o consulta externa. Los biológicos disponibles en sede cuentan con cadena de frío garantizada entre 2°C y 8°C según protocolos del Instituto Nacional de Salud.',
    doctor_name: 'Dr. Santiago Vélez',
    specialty: 'Medicina de Urgencias',
    branch: 'Sede Cartago - Central',
    youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    video_duration: 90,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'seed-02',
    category: 'CONSEJOS',
    title: 'Pautas para el Control y Registro Domiciliario de la Presión Arterial',
    summary: 'Instrucciones claras para pacientes con hipertensión arterial o cifras tensionales limítrofes en triaje.',
    content: 'Recomiende al paciente reposar 5 minutos antes de la toma de tensión, evitar café o tabaco 30 minutos previos y mantener el brazo a la altura del corazón. Indicar el registro en la libreta ambulatoria para la próxima consulta de seguimiento con medicina general.',
    doctor_name: 'Dra. Camila Yalma',
    specialty: 'Pediatría y Urgencias',
    branch: 'Sede La Unión',
    youtube_url: '',
    video_duration: 0,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'seed-03',
    category: 'ENFERMEDADES',
    title: 'Detección Temprana de Signos de Alarma en Infecciones Respiratorias Agudas (IRA)',
    summary: 'Criterios clínicos para consulta inmediata en el servicio de urgencias hospitalario.',
    content: 'Fiebre persistente mayor a 38.5°C por más de 72 horas, retracciones intercostales, cianosis peribucal, saturación de oxígeno menor a 90% a nivel del mar o somnolencia extrema son criterios de ingreso directo a Triaje Manchester Nivel I o II.',
    doctor_name: 'Dr. Santiago Vélez',
    specialty: 'Medicina de Urgencias',
    branch: 'Sede Cartago - Central',
    youtube_url: '',
    video_duration: 0,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'seed-04',
    category: 'ESTILO_DE_VIDA',
    title: 'Hábitos Cardioprotectores: Hidratación y Pausas Activas',
    summary: 'Recomendaciones básicas de promoción de la salud física y mental para la comunidad asistencial.',
    content: 'La actividad física moderada de al menos 150 minutos semanales combinada con una ingesta reducida de sodio (< 5g diarios) reduce en un 28% el riesgo de complicaciones cardiovasculares mayores según la OMS.',
    doctor_name: 'Dra. Camila Yalma',
    specialty: 'Pediatría y Urgencias',
    branch: 'Sede La Unión',
    youtube_url: '',
    video_duration: 0,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

/**
 * Transforma un link de YouTube en URL embebible segura
 */
export function getYoutubeEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  try {
    // Casos: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/shorts/ID, youtube.com/embed/ID
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch && shortMatch[1]) {
      return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch && watchMatch[1]) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch && shortsMatch[1]) {
      return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    }
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch && embedMatch[1]) {
      return `https://www.youtube.com/embed/${embedMatch[1]}`;
    }
  } catch (err) {
    return null;
  }
  return null;
}

export const MedicalKitScreen = ({ user, onNavigate }) => {
  const isDoctor =
    user?.role === 'MEDICO' ||
    Number(user?.role_id) === 2 ||
    (user?.specialty || '').toLowerCase().includes('med') ||
    (user?.full_name || '').toLowerCase().startsWith('dr');

  const isNurse =
    user?.role === 'ENFERMERO' ||
    user?.role === 'ENFERMERA' ||
    Number(user?.role_id) === 3 ||
    (user?.specialty || '').toLowerCase().includes('enferm');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Modal para crear / editar publicación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [formData, setFormData] = useState({
    category: 'CONSEJOS',
    title: '',
    summary: '',
    content: '',
    image_url: '',
    youtube_url: '',
    video_url: '',
    video_duration: 0,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validación de video corto <= 120s
  const [videoValidationStatus, setVideoValidationStatus] = useState('');
  const [videoError, setVideoError] = useState('');

  const fetchSeq = useRef(0);

  // Carga publicaciones desde el backend
  const fetchPosts = useCallback(async (isSilent = false) => {
    const seq = ++fetchSeq.current;
    if (!isSilent) setRefreshing(true);
    try {
      const data = await apiClient.getHealthEducationPosts(selectedCategory);
      if (seq !== fetchSeq.current) return;
      if (Array.isArray(data) && data.length > 0) {
        setPosts(data);
      } else if (!isSilent && posts.length === 0) {
        // Fallback a seeds iniciales si la BD está vacía
        setPosts(INITIAL_SEEDS);
      }
      setError('');
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      if (posts.length === 0) {
        setPosts(INITIAL_SEEDS);
      }
    } finally {
      if (seq === fetchSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedCategory, posts.length]);

  // Carga inicial y cambio de categoría
  useEffect(() => {
    fetchPosts(false);
  }, [fetchPosts]);

  // Sincronización en tiempo real: sondeo periódico cada 4 segundos
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchPosts(true);
    }, 4000);

    const handleSyncEvent = () => {
      fetchPosts(false);
    };

    window.addEventListener('saludconecta_health_posts_sync', handleSyncEvent);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('saludconecta_health_posts_sync', handleSyncEvent);
    };
  }, [fetchPosts]);

  // Filtro de búsqueda local
  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      selectedCategory === 'TODOS' ||
      post.category?.toUpperCase() === selectedCategory.toUpperCase();

    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const titleMatch = (post.title || '').toLowerCase().includes(q);
    const summaryMatch = (post.summary || '').toLowerCase().includes(q);
    const contentMatch = (post.content || '').toLowerCase().includes(q);
    const doctorMatch = (post.doctor_name || '').toLowerCase().includes(q);

    return titleMatch || summaryMatch || contentMatch || doctorMatch;
  });

  // Apertura de modal para nuevo post
  const handleOpenNewModal = () => {
    setEditingPostId(null);
    setFormData({
      category: 'CONSEJOS',
      title: '',
      summary: '',
      content: '',
      image_url: '',
      youtube_url: '',
      video_url: '',
      video_duration: 0,
    });
    setFormError('');
    setVideoError('');
    setVideoValidationStatus('');
    setIsModalOpen(true);
  };

  // Apertura de modal para editar post
  const handleOpenEditModal = (post) => {
    setEditingPostId(post.id);
    setFormData({
      category: post.category || 'CONSEJOS',
      title: post.title || '',
      summary: post.summary || '',
      content: post.content || '',
      image_url: post.image_url || '',
      youtube_url: post.youtube_url || '',
      video_url: post.video_url || '',
      video_duration: post.video_duration || 0,
    });
    setFormError('');
    setVideoError('');
    setVideoValidationStatus(post.video_duration ? `Video existente: ${post.video_duration}s` : '');
    setIsModalOpen(true);
  };

  // Validación de archivo de video <= 120s
  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError('');
    setVideoValidationStatus('Validando duración del video...');

    // Validación de tipo
    if (!file.type.startsWith('video/')) {
      setVideoError('El archivo seleccionado no es un formato de video válido.');
      setVideoValidationStatus('');
      return;
    }

    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    videoElement.src = objectUrl;

    videoElement.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const duration = Math.round(videoElement.duration);

      if (duration > 120) {
        setVideoError(
          `El video seleccionado dura ${duration} segundos. La duración máxima permitida para videos educativos cortos es de 2 minutos (120 segundos).`
        );
        setVideoValidationStatus('');
        setFormData((prev) => ({ ...prev, video_url: '', video_duration: 0 }));
      } else {
        setVideoValidationStatus(`Video válido: ${duration} segundos (conforme al límite de 2 minutos).`);
        setVideoError('');

        // Leer como DataURL si el tamaño es razonable (< 20MB)
        if (file.size <= 20 * 1024 * 1024) {
          const reader = new FileReader();
          reader.onload = (uploadEvt) => {
            setFormData((prev) => ({
              ...prev,
              video_url: uploadEvt.target.result,
              video_duration: duration,
            }));
          };
          reader.readAsDataURL(file);
        } else {
          setVideoError('El archivo de video supera los 20MB. Por favor elija un video más ligero.');
          setVideoValidationStatus('');
        }
      }
    };

    videoElement.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setVideoError('No se pudo verificar la duración del archivo de video.');
      setVideoValidationStatus('');
    };
  };

  // Carga de archivo de imagen
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('El archivo debe ser una imagen válida (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((prev) => ({ ...prev, image_url: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Guardar publicación (Crear o Editar)
  const handleSubmitPost = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('El título de la publicación es obligatorio.');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('El contenido informativo es obligatorio.');
      return;
    }
    if (formData.video_duration > 120) {
      setFormError('El video no puede superar los 120 segundos (2 minutos).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: formData.category,
        title: formData.title.trim(),
        summary: formData.summary.trim(),
        content: formData.content.trim(),
        image_url: formData.image_url || null,
        youtube_url: formData.youtube_url?.trim() || null,
        video_url: formData.video_url || null,
        video_duration: formData.video_duration || 0,
      };

      if (editingPostId) {
        await apiClient.updateHealthEducationPost(editingPostId, payload);
        setNotice('Publicación actualizada exitosamente en el muro clínico.');
      } else {
        await apiClient.createHealthEducationPost(payload);
        setNotice('Nueva publicación educativa registrada y sincronizada en tiempo real.');
      }

      setIsModalOpen(false);
      // Disparar sincronización inmediata inter-pestañas
      window.dispatchEvent(new CustomEvent('saludconecta_health_posts_sync'));
      fetchPosts(false);
    } catch (err) {
      setFormError(err.message || 'No fue posible guardar la publicación en el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar publicación
  const handleDeletePost = async (postId) => {
    if (!window.confirm('¿Confirma que desea eliminar esta tarjeta educativa del muro?')) {
      return;
    }

    try {
      await apiClient.deleteHealthEducationPost(postId);
      setNotice('Publicación eliminada correctamente del muro clínico.');
      window.dispatchEvent(new CustomEvent('saludconecta_health_posts_sync'));
      fetchPosts(false);
    } catch (err) {
      setError(err.message || 'No fue posible eliminar la publicación.');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* CABECERA PRINCIPAL DEL MURO CLÍNICO */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-surface-container-high">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-teal-100 text-teal-900 border border-teal-200 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-teal-700" />
                Muro Clínico de Educación & Calidad de Vida
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant">
                v2.4 Integral
              </span>
              {isDoctor ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3 text-primary" />
                  Facultad Médica de Publicación & Edición
                </span>
              ) : isNurse ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-700" />
                  Modo Enfermería: Solo Lectura & Sincronización Continua
                </span>
              ) : null}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Kit Informático Médico: Muro de Salud & Concientización
            </h1>

            <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              Espacio asistencial interactivo de promoción de la salud, prevención, vacunas, manejo de patologías y orientación comunitaria.
              {isNurse
                ? ' Esta vista se actualiza automáticamente en tiempo real cuando el cuerpo médico publica o actualiza contenidos.'
                : ' El cuerpo médico puede publicar artículos, guías de autocuidado, fotos, enlaces de YouTube y videos cortos explicativos de hasta 2 minutos.'}
            </p>
          </div>

          {/* Acciones principales de cabecera */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Indicador de tiempo real */}
            <div
              className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center gap-2 text-xs font-mono"
              title="Sincronización activa mediante sondeo cada 4s y eventos locales"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-900">En Tiempo Real</span>
              <button
                type="button"
                onClick={() => fetchPosts(false)}
                disabled={refreshing}
                title="Actualizar muro manualmente"
                className="p-1 hover:bg-surface-container rounded-lg text-outline hover:text-on-surface transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>

            {/* Botón de creación exclusivo para el Médico */}
            {isDoctor && (
              <button
                type="button"
                data-testid="create-health-post-btn"
                onClick={handleOpenNewModal}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Publicación</span>
              </button>
            )}
          </div>
        </div>

        {/* Notificaciones y Avisos */}
        {notice && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* BARRA DE FILTROS POR CATEGORÍA Y BUSCADOR */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-surface-container-high shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant border-surface-container-high hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Buscador reactivo */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tema o título..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface-container-low border border-surface-container-high rounded-xl text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* MURO DE TARJETAS EDUCATIVAS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPosts.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-dashed border-surface-container-high space-y-3">
            <BookOpen className="w-10 h-10 text-outline mx-auto stroke-1" />
            <h3 className="text-base font-bold text-on-surface">No se encontraron publicaciones</h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              No hay contenidos registrados bajo la categoría seleccionada o el término de búsqueda actual.
              {isDoctor && ' Puede crear una nueva tarjeta presionando en «Nueva Publicación».'}
            </p>
            {isDoctor && (
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:bg-primary-container"
              >
                <Plus className="w-4 h-4" />
                <span>Crear la primera publicación</span>
              </button>
            )}
          </div>
        ) : (
          filteredPosts.map((post) => {
            const categoryMeta =
              CATEGORIES.find((c) => c.id === post.category?.toUpperCase()) || CATEGORIES[1];
            const youtubeEmbed = getYoutubeEmbedUrl(post.youtube_url);

            return (
              <article
                key={post.id}
                data-testid={`health-post-card-${post.id}`}
                className="bg-white rounded-3xl border border-surface-container-high shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Cabecera de la tarjeta con categoría y opciones de autor */}
                <div className="p-5 pb-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${categoryMeta.color}`}
                    >
                      {categoryMeta.label}
                    </span>

                    {/* Acciones de edición/eliminación si es Médico */}
                    {isDoctor && (
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          data-testid={`edit-post-btn-${post.id}`}
                          onClick={() => handleOpenEditModal(post)}
                          title="Editar publicación"
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          data-testid={`delete-post-btn-${post.id}`}
                          onClick={() => handleDeletePost(post.id)}
                          title="Eliminar publicación"
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-on-surface-variant hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Título de la tarjeta */}
                  <h2 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors leading-snug">
                    {post.title}
                  </h2>

                  {/* Resumen */}
                  {post.summary && (
                    <p className="text-xs font-semibold text-on-surface-variant line-clamp-2">
                      {post.summary}
                    </p>
                  )}

                  {/* Contenido principal */}
                  <p className="text-xs text-on-surface leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                </div>

                {/* SECCIÓN MULTIMEDIA: IMAGEN / YOUTUBE / VIDEO CORTO */}
                <div className="px-5 pb-4 space-y-3">
                  {/* Imagen adjunta */}
                  {post.image_url && (
                    <div className="overflow-hidden rounded-2xl border border-surface-container-high bg-slate-50">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-44 object-cover hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Reproductor de YouTube embebido */}
                  {youtubeEmbed && (
                    <div className="rounded-2xl overflow-hidden border border-surface-container-high shadow-2xs aspect-video bg-black">
                      <iframe
                        src={youtubeEmbed}
                        title={`Video educativo: ${post.title}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {/* Reproductor de Video Corto HTML5 (<= 120s) */}
                  {post.video_url && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-outline">
                        <span className="flex items-center gap-1 text-teal-700">
                          <Video className="w-3 h-3" />
                          Video Corto Clínico
                        </span>
                        {post.video_duration > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-surface-container text-on-surface-variant">
                            {post.video_duration}s / máx. 120s
                          </span>
                        )}
                      </div>
                      <video
                        controls
                        preload="metadata"
                        className="w-full rounded-2xl bg-black max-h-52 border border-surface-container-high"
                      >
                        <source src={post.video_url} type="video/mp4" />
                        <source src={post.video_url} type="video/webm" />
                        Su navegador no soporta reproducción nativa de video HTML5.
                      </video>
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta con autor y fecha */}
                <div className="px-5 py-3 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between text-[11px] text-outline font-mono">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-on-surface truncate max-w-[140px] sm:max-w-[180px]">
                      {post.doctor_name || 'Cuerpo Médico'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-outline shrink-0" />
                    <span>{formatDateTime(post.created_at)}</span>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* MODAL DE CREACIÓN / EDICIÓN (SOLO ACCESIBLE POR MÉDICO) */}
      {isModalOpen && isDoctor && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-surface-container-high space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-on-surface">
                  {editingPostId ? 'Editar Publicación Educativa' : 'Nueva Publicación en el Muro Clínico'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl hover:bg-surface-container text-outline hover:text-on-surface transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPost} className="space-y-4">
              {/* Categoría y Título */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-surface-container-high bg-white text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="CONSEJOS">Consejos de Salud</option>
                    <option value="AYUDAS">Ayudas y Guías</option>
                    <option value="ENFERMEDADES">Manejo de Enfermedades</option>
                    <option value="VACUNAS">Esquema de Vacunas</option>
                    <option value="ESTILO_DE_VIDA">Estilo de Vida y Nutrición</option>
                    <option value="PREVENCION">Prevención y Autocuidado</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                    Título de la Publicación *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: Medidas preventivas contra el dengue y control de vectores"
                    className="w-full p-2.5 rounded-xl border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Resumen */}
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                  Resumen Corto / Subtítulo
                </label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                  placeholder="Breve sinopsis explicativa de 1 o 2 líneas..."
                  className="w-full p-2.5 rounded-xl border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* Contenido Completo */}
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                  Contenido Educativo y Orientaciones *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Detalle los consejos clínicos, pautas semiológicas, signos de alarma o indicaciones..."
                  className="w-full p-3 rounded-xl border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* Adjuntar Imagen */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container-high">
                <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Imagen Ilustrativa (Foto / Infografía)
                </span>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="px-3 py-1.5 rounded-xl bg-white border border-surface-container-high hover:bg-surface-container text-xs font-bold text-primary cursor-pointer transition flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Seleccionar archivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                    placeholder="O pegue una URL directa de imagen..."
                    className="flex-1 p-2 bg-white rounded-xl border border-surface-container-high text-xs focus:outline-none focus:border-primary"
                  />
                  {formData.image_url && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image_url: '' }))}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Quitar imagen
                    </button>
                  )}
                </div>
              </div>

              {/* Adjuntar Video de YouTube */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container-high">
                <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5 text-rose-600" />
                  Enlace de Video en YouTube
                </span>
                <input
                  type="url"
                  value={formData.youtube_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, youtube_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                  className="w-full p-2 bg-white rounded-xl border border-surface-container-high text-xs focus:outline-none focus:border-primary"
                />
              </div>

              {/* Adjuntar Video Corto (<= 2 min) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container-high">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface uppercase flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-teal-700" />
                    Video Corto Educativo (Máximo 2 minutos / 120s)
                  </span>
                  <span className="text-[10px] font-mono text-outline font-bold">Límite: 120 seg</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="px-3 py-1.5 rounded-xl bg-white border border-surface-container-high hover:bg-surface-container text-xs font-bold text-teal-800 cursor-pointer transition flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir video corto</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={handleVideoFileChange}
                      className="hidden"
                    />
                  </label>
                  {formData.video_url && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, video_url: '', video_duration: 0 }));
                        setVideoValidationStatus('');
                        setVideoError('');
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Quitar video
                    </button>
                  )}
                </div>

                {videoValidationStatus && (
                  <p className="text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {videoValidationStatus}
                  </p>
                )}

                {videoError && (
                  <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {videoError}
                  </p>
                )}
              </div>

              {/* Botones de acción del formulario */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-surface-container-high text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || Boolean(videoError)}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? 'Guardando...'
                    : editingPostId
                    ? 'Actualizar Publicación'
                    : 'Publicar en el Muro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalKitScreen;
