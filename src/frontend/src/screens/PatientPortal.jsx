import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  LocateFixed,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  CalendarPlus,
  ShieldCheck,
  Building2,
  Mail,
  ArrowLeft,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { apiClient } from '../services/api';
import { DOCUMENT_TYPES, BLOOD_TYPES } from '../utils/clinical';

// Distancia en kilometros entre dos coordenadas (formula del semiverseno)
export const distanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const EMPTY_FORM = {
  document_type: 'CC',
  document_number: '',
  first_name: '',
  last_name: '',
  birth_date: '',
  gender: '',
  blood_type: '',
  eps_name: '',
  phone: '',
  email: '',
  address: '',
  observations: '',
  consent: false,
};

const inputClass =
  'w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-700';

const Field = ({ id, label, children, hint }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
      {label}
    </label>
    {children}
    {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
  </div>
);

// Portal publico del paciente: elige la sede mas cercana y solicita su primera cita. No requiere sesion.
// La solicitud llega a la bandeja del medico con mayor disponibilidad de la sede, que agenda y envia la cita por correo.
export const PatientPortal = () => {
  const [branches, setBranches] = useState([]);
  const [branchesError, setBranchesError] = useState('');
  const [selected, setSelected] = useState('');
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    apiClient
      .getPublicBranches()
      .then((list) => {
        setBranches(list);
        if (list.length === 1) setSelected(list[0].name);
      })
      .catch((err) => setBranchesError(err.message || 'No fue posible cargar las sedes.'));
  }, []);

  const sorted = useMemo(() => {
    if (!position) return branches.map((b) => ({ ...b, distance: null }));
    return branches
      .map((b) => ({ ...b, distance: distanceKm(position.lat, position.lng, b.latitude, b.longitude) }))
      .sort((a, b) => a.distance - b.distance);
  }, [branches, position]);

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationMsg('Su navegador no permite usar la ubicación. Elija la sede de la lista.');
      return;
    }
    setLocating(true);
    setLocationMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(here);
        const nearest = [...branches].sort(
          (a, b) =>
            distanceKm(here.lat, here.lng, a.latitude, a.longitude) -
            distanceKm(here.lat, here.lng, b.latitude, b.longitude)
        )[0];
        if (nearest) setSelected(nearest.name);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationMsg('No pudimos obtener su ubicación. Elija la sede de la lista.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) {
      setError('Elija la sede donde desea ser atendido.');
      return;
    }
    if (!form.consent) {
      setError('Debe aceptar el tratamiento de sus datos personales para enviar la solicitud.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await apiClient.submitAppointmentRequest({ ...form, branch: selected });
      setResult(res);
      window.scrollTo?.(0, 0);
    } catch (err) {
      setError(err.message || 'No fue posible enviar la solicitud. Intente de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const obsLength = form.observations.trim().length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white text-slate-900">
      <header className="bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size="md" />
            <div className="min-w-0">
              <p className="font-bold text-teal-900 leading-tight truncate">SaludConecta IPS</p>
              <p className="text-[11px] text-slate-500 truncate">Portal del Paciente • Red Norte del Valle</p>
            </div>
          </div>
          <a href="/" className="text-xs font-semibold text-teal-800 hover:underline whitespace-nowrap">
            Personal de salud
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        {result ? (
          <section className="p-6 sm:p-8 rounded-3xl bg-white border border-emerald-200 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black">Solicitud recibida</h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Un médico de la sede revisará su agenda y le enviará la cita a su correo.
            </p>
            <div className="inline-flex flex-col items-center gap-1 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Código de su solicitud</span>
              <span className="text-2xl font-mono font-bold text-teal-900">{result.code}</span>
              <span className="text-xs text-slate-500">{result.branch}</span>
            </div>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Revise su correo (también la carpeta de spam). Allí recibirá la fecha, la hora y el comprobante en PDF.
            </p>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setForm(EMPTY_FORM);
              }}
              className="h-11 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Enviar otra solicitud
            </button>
          </section>
        ) : (
          <>
            <section className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Solicite su primera cita médica</h1>
              <p className="text-sm text-slate-600">
                Elija la sede más cercana y complete sus datos. Un médico de la sede revisará su agenda y le enviará la
                cita a su correo.
              </p>
            </section>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate={false}>
              {/* 1. Sede */}
              <section className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-700" />
                    1. Sede donde desea ser atendido
                  </h2>
                  <button
                    type="button"
                    onClick={locate}
                    disabled={locating || branches.length === 0}
                    className="h-10 px-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                    {locating ? 'Buscando...' : 'Usar mi ubicación'}
                  </button>
                </div>
                {locationMsg && <p className="text-xs text-amber-800">{locationMsg}</p>}
                {branchesError && (
                  <p role="alert" className="text-sm text-red-700">
                    {branchesError}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3" role="radiogroup" aria-label="Sedes disponibles">
                  {sorted.map((b, i) => {
                    const isSelected = selected === b.name;
                    const nearest = position && i === 0;
                    return (
                      <button
                        key={b.name}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelected(b.name)}
                        className={`text-left p-4 rounded-2xl border-2 transition-colors cursor-pointer ${
                          isSelected ? 'border-teal-700 bg-teal-50' : 'border-slate-200 hover:border-teal-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Building2 className={`w-5 h-5 shrink-0 ${isSelected ? 'text-teal-700' : 'text-slate-400'}`} />
                          {nearest && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Más cercana
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm mt-2">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.municipality}</p>
                        {b.distance !== null && (
                          <p className="text-xs font-semibold text-teal-800 mt-1">A {Math.round(b.distance)} km de usted</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 2. Datos personales */}
              <section className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-base font-bold">2. Sus datos personales</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="pp-doc-type" label="Tipo de documento *">
                    <select id="pp-doc-type" name="document_type" value={form.document_type} onChange={update} className={inputClass}>
                      {DOCUMENT_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="pp-doc" label="Número de documento *">
                    <input id="pp-doc" name="document_number" required maxLength={25} inputMode="numeric" value={form.document_number} onChange={update} className={inputClass} />
                  </Field>
                  <Field id="pp-first" label="Nombres *">
                    <input id="pp-first" name="first_name" required maxLength={80} autoComplete="given-name" value={form.first_name} onChange={update} className={inputClass} />
                  </Field>
                  <Field id="pp-last" label="Apellidos *">
                    <input id="pp-last" name="last_name" required maxLength={80} autoComplete="family-name" value={form.last_name} onChange={update} className={inputClass} />
                  </Field>
                  <Field id="pp-birth" label="Fecha de nacimiento *">
                    <input id="pp-birth" name="birth_date" type="date" required max={today} value={form.birth_date} onChange={update} className={inputClass} />
                  </Field>
                  <Field id="pp-gender" label="Sexo *">
                    <select id="pp-gender" name="gender" required value={form.gender} onChange={update} className={inputClass}>
                      <option value="">Seleccione...</option>
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </Field>
                  <Field id="pp-blood" label="Grupo sanguíneo *">
                    <select id="pp-blood" name="blood_type" required value={form.blood_type} onChange={update} className={inputClass}>
                      <option value="">Seleccione...</option>
                      {BLOOD_TYPES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="pp-eps" label="EPS *">
                    <input id="pp-eps" name="eps_name" required maxLength={100} placeholder="Ej: Nueva EPS" value={form.eps_name} onChange={update} className={inputClass} />
                  </Field>
                  <Field id="pp-phone" label="Teléfono celular *">
                    <input id="pp-phone" name="phone" type="tel" required maxLength={20} autoComplete="tel" placeholder="Ej: 3001234567" value={form.phone} onChange={update} className={inputClass} />
                  </Field>
                  <Field id="pp-email" label="Correo electrónico *" hint="Aquí le enviaremos la cita.">
                    <input id="pp-email" name="email" type="email" required maxLength={100} autoComplete="email" value={form.email} onChange={update} className={inputClass} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="pp-address" label="Dirección de residencia">
                      <input id="pp-address" name="address" maxLength={200} autoComplete="street-address" value={form.address} onChange={update} className={inputClass} />
                    </Field>
                  </div>
                </div>
              </section>

              {/* 3. Observacion */}
              <section className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-base font-bold">3. Motivo de la consulta</h2>
                <Field id="pp-obs" label="Observación *" hint={`Cuéntenos brevemente qué le sucede. ${obsLength}/1000 caracteres.`}>
                  <textarea
                    id="pp-obs"
                    name="observations"
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={4}
                    value={form.observations}
                    onChange={update}
                    className={`${inputClass} h-auto py-2.5 resize-y`}
                  />
                </Field>
                <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input type="checkbox" name="consent" checked={form.consent} onChange={update} className="mt-1 w-4 h-4 accent-teal-700" />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    <ShieldCheck className="inline w-3.5 h-3.5 text-teal-700 mr-1" />
                    Autorizo a SaludConecta IPS a tratar mis datos personales y de salud para gestionar esta solicitud de cita,
                    conforme a la Ley 1581 de 2012. *
                  </span>
                </label>
              </section>

              {error && (
                <div role="alert" className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                {submitting ? 'Enviando solicitud...' : 'Solicitar primera cita'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default PatientPortal;
