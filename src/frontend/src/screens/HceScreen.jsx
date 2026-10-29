import React, { useState } from 'react';
import {
  FileText,
  Lock,
  Unlock,
  AlertTriangle,
  Stethoscope,
  Activity,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  Download,
  PlusCircle,
  Copy,
  Clock,
  Sparkles,
} from 'lucide-react';

export const HceScreen = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('anamnesis');
  const [isClosed, setIsClosed] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [clarifications, setClarifications] = useState([
    {
      id: 1,
      author: 'Dra. Sofia Ramirez C. (RM-76001-VALLE)',
      date: '2026-10-29 09:45 COT',
      text: 'Se precisa que el paciente refiere iniciar cuadro doloroso tras esfuerzo fisico moderado. Se solicita troponina I seriada de control.',
      hash: 'sha256-adenda-001-e941b2',
    },
  ]);
  const [newClarificationText, setNewClarificationText] = useState('');

  // Datos clinicos del folio
  const [consultationReason, setConsultationReason] = useState(
    'Dolor toracico opresivo de 2 horas de evolucion irradiado a mandibula y miembro superior izquierdo, acompanado de diaforesis profusa y disnea en reposo.'
  );
  const [physicalExam, setPhysicalExam] = useState(
    'Paciente alerta, orientado en 3 esferas, fascie algica. Ruidos cardiacos taquicardicos sin soplos. Campos pulmonares con estertores basales bilaterales leves. Abdomen blando, depresible, no doloroso a la palpacion. Extremidades sin edemas, pulsos distales presentes y simetricos.'
  );
  const [cie11Code, setCie11Code] = useState('BA00');
  const [diagnosisDesc, setDiagnosisDesc] = useState('Hipertension esencial (primaria) descompensada con crisis hipertensiva tipo urgencia');
  const [treatmentPlan, setTreatmentPlan] = useState(
    '1. Reposo absoluto en cama de observacion con cabecera a 45 grados.\n2. Oxigenoterapia por canula nasal a 2 L/min para meta SpO2 > 94%.\n3. Electrocardiograma de 12 derivaciones inmediato.\n4. Enalaprilat 1.25 mg IV en bolo lento para modulacion tensional gradual.\n5. Monitoreo continuo de tension arterial cada 15 minutos.'
  );

  const previousHash = 'genesis-block-0000000000000000000000000000000000000000000000000000000000000000';
  const currentHash = isClosed
    ? 'c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2'
    : 'Borrador editable en proceso (No sellado)';

  const handleCloseAndSign = () => {
    setIsClosed(true);
    setActiveTab('forensic');
  };

  const handleAddClarification = (e) => {
    e.preventDefault();
    if (!newClarificationText.trim()) return;

    setClarifications([
      ...clarifications,
      {
        id: Date.now(),
        author: 'Dra. Sofia Ramirez C. (RM-76001-VALLE)',
        date: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' COT',
        text: newClarificationText,
        hash: 'sha256-adenda-' + Math.random().toString(36).substring(2, 8),
      },
    ]);
    setNewClarificationText('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* BANNER FIJO DEL PACIENTE (STICKY PATIENT IDENTITY TOP BAR) */}
      <section className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high sticky top-20 z-20">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                CM
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-on-surface truncate">Carlos Eduardo Mendoza Gomez</h1>
                  <span className="px-2 py-0.5 rounded bg-surface-container-high font-mono text-xs font-semibold text-on-surface-variant">
                    CC 1.118.234.901
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-[10px] uppercase">
                    RH O(+)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white font-bold text-[10px] uppercase">
                    NIVEL II • MUY URGENTE
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                  <span>47 anos</span>
                  <span>•</span>
                  <span>Urgencias Adultos - Cama Observacion OB-04</span>
                  <span>•</span>
                  <span className="font-semibold text-secondary">EPS Emssanar Contributivo</span>
                </div>
              </div>
            </div>

            {/* Biometria Triaje de Entrada */}
            <div className="flex items-center gap-2 bg-surface-container-low px-3.5 py-1.5 rounded-xl border border-outline-variant/30 text-xs">
              <div className="text-center px-1">
                <span className="text-[10px] uppercase font-mono text-outline block">PA</span>
                <span className="font-bold text-red-600 font-mono">158/98</span>
              </div>
              <div className="h-5 w-px bg-outline-variant/40"></div>
              <div className="text-center px-1">
                <span className="text-[10px] uppercase font-mono text-outline block">FC</span>
                <span className="font-bold text-red-600 font-mono">112</span>
              </div>
              <div className="h-5 w-px bg-outline-variant/40"></div>
              <div className="text-center px-1">
                <span className="text-[10px] uppercase font-mono text-outline block">FR</span>
                <span className="font-bold text-on-surface font-mono">22</span>
              </div>
              <div className="h-5 w-px bg-outline-variant/40"></div>
              <div className="text-center px-1">
                <span className="text-[10px] uppercase font-mono text-outline block">SpO2</span>
                <span className="font-bold text-red-600 font-mono">91%</span>
              </div>
              <div className="h-5 w-px bg-outline-variant/40"></div>
              <div className="text-center px-1">
                <span className="text-[10px] uppercase font-mono text-outline block">TEMP</span>
                <span className="font-bold text-red-600 font-mono">38.6°</span>
              </div>
            </div>

            {/* Toggle Estado Folio: Borrador vs Inmutable */}
            <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setIsClosed(false)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isClosed
                    ? 'bg-white text-on-surface font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Borrador Activo</span>
              </button>
              <button
                type="button"
                onClick={() => setIsClosed(true)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  isClosed
                    ? 'bg-primary-container text-white font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Folio Cerrado (Inmutable)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
            </div>
          </div>

          {/* Fila 2: ALERTA CRITICA DE ALERGIAS SEVERAS (Banner Rojo Institucional) */}
          <div className="w-full bg-red-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 shrink-0 text-white" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs uppercase tracking-wide truncate">
                  ALERGIA SEVERA A BETALACTAMICOS (PENICILINAS / CEFALOSPORINAS)
                </span>
                <span className="text-[11px] opacity-90 leading-tight truncate">
                  Reaccion Previa: Choque Anafilactico en UCI Cartago (2022). Contraindicacion absoluta para formulacion.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('prescription')}
              className="px-3 py-1 bg-white text-red-700 hover:bg-red-50 font-bold text-[10px] uppercase rounded-lg shrink-0 transition-all cursor-pointer"
            >
              Ver Prescripcion
            </button>
          </div>
        </div>
      </section>

      {/* PESTANAS CLINICAS DE DILIGENCIAMIENTO */}
      <div className="bg-white rounded-2xl shadow-xs border border-surface-container-high overflow-hidden">
        {/* Cabecera de Tabs */}
        <div className="flex items-center border-b border-surface-container-high bg-surface-container-low px-4 pt-2 overflow-x-auto gap-2">
          {[
            { id: 'anamnesis', label: '1. Anamnesis & Examen Fisico', icon: Stethoscope },
            { id: 'diagnosis', label: '2. Diagnostico CIE-11', icon: Activity },
            { id: 'plan', label: '3. Plan de Tratamiento', icon: FileText },
            { id: 'forensic', label: '4. Cadena Forense SHA-256', icon: ShieldCheck },
            { id: 'clarifications', label: '5. Notas Aclaratorias (Res. 1995)', icon: PlusCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'bg-white text-primary border-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface border-transparent hover:bg-surface-container'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-outline'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CONTENIDO DE CADA PESTANA */}
        <div className="p-6">
          {/* TAB 1: ANAMNESIS & EXAMEN FISICO */}
          {activeTab === 'anamnesis' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                  Motivo de Consulta y Enfermedad Actual
                </label>
                <textarea
                  rows={4}
                  disabled={isClosed}
                  value={consultationReason}
                  onChange={(e) => setConsultationReason(e.target.value)}
                  className={`w-full p-3.5 rounded-xl border text-sm outline-none transition-all ${
                    isClosed
                      ? 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 cursor-not-allowed'
                      : 'bg-white border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                  Examen Fisico Detallado por Sistemas
                </label>
                <textarea
                  rows={4}
                  disabled={isClosed}
                  value={physicalExam}
                  onChange={(e) => setPhysicalExam(e.target.value)}
                  className={`w-full p-3.5 rounded-xl border text-sm outline-none transition-all ${
                    isClosed
                      ? 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 cursor-not-allowed'
                      : 'bg-white border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
                  }`}
                />
              </div>
            </div>
          )}

          {/* TAB 2: DIAGNOSTICO CIE-11 */}
          {activeTab === 'diagnosis' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                    Codigo CIE-11 Oficial
                  </label>
                  <input
                    type="text"
                    disabled={isClosed}
                    value={cie11Code}
                    onChange={(e) => setCie11Code(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-outline-variant bg-white font-mono font-bold text-sm"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                    Descripcion Diagnostica Principal
                  </label>
                  <input
                    type="text"
                    disabled={isClosed}
                    value={diagnosisDesc}
                    onChange={(e) => setDiagnosisDesc(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-outline-variant bg-white text-sm"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs space-y-2">
                <span className="font-bold text-on-surface">Clasificacion Internacional OMS (CIE-11):</span>
                <p className="text-on-surface-variant">
                  Capitulo 11: Enfermedades del sistema circulatorio / Hipertension arterial primaria con repercusion hemodinamica aguda.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PLAN DE TRATAMIENTO */}
          {activeTab === 'plan' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase mb-1">
                  Conducta Medica, Ordenes y Plan Terapeutico
                </label>
                <textarea
                  rows={6}
                  disabled={isClosed}
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  className={`w-full p-3.5 rounded-xl border text-sm font-mono outline-none ${
                    isClosed ? 'bg-surface-container-low text-on-surface-variant cursor-not-allowed' : 'bg-white'
                  }`}
                />
              </div>
            </div>
          )}

          {/* TAB 4: CADENA FORENSE SHA-256 E INMUTABILIDAD */}
          {activeTab === 'forensic' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <span className="font-bold text-xs uppercase tracking-wide text-on-surface">
                      Sellado Criptografico e Integridad de Folio
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isClosed ? 'Bloque Cerrado e Inmutable' : 'Borrador Sin Sellar'}
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div>
                    <span className="text-outline text-[11px] block">Hash del Bloque Previo (PreviousHash):</span>
                    <span className="text-on-surface-variant break-all text-[11px]">{previousHash}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[11px] block">Hash SHA-256 Computado del Folio:</span>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-outline-variant/40 mt-1">
                      <span className="text-primary font-bold break-all text-xs">{currentHash}</span>
                      {isClosed && (
                        <button
                          type="button"
                          onClick={copyToClipboard}
                          className="ml-2 px-2 py-1 bg-surface-container text-xs rounded hover:bg-surface-container-high cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedHash ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-xs text-on-surface-variant border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-2">
                  <span>Firma Digital: Dra. Sofia Ramirez C. (ReTHUS: 760012345)</span>
                  <span className="font-mono">Fecha Cierre: 2026-10-29 09:30:14 COT</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NOTAS ACLARATORIAS */}
          {activeTab === 'clarifications' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                <strong>Resolucion 1995 de 1999 (Articulo 8):</strong> Una vez cerrado el folio clinico, queda estrictamente prohibida toda modificacion o supresion del texto original. Cualquier observacion posterior debe registrarse como nota aclaratoria con su propio sello temporal y firma digital.
              </div>

              {/* Lista de Aclaratorias Previas */}
              <div className="space-y-3">
                {clarifications.map((cl) => (
                  <div key={cl.id} className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-primary">{cl.author}</span>
                      <span className="font-mono text-[11px] text-outline">{cl.date}</span>
                    </div>
                    <p className="text-xs text-on-surface leading-relaxed">{cl.text}</p>
                    <div className="text-[10px] font-mono text-outline">Firma hash: {cl.hash}</div>
                  </div>
                ))}
              </div>

              {/* Formulario para Anadir Nueva Aclaratoria */}
              <form onSubmit={handleAddClarification} className="pt-2 space-y-3 border-t border-surface-container-high">
                <label className="block text-xs font-bold text-on-surface">
                  Redactar Nueva Nota Aclaratoria
                </label>
                <textarea
                  rows={3}
                  value={newClarificationText}
                  onChange={(e) => setNewClarificationText(e.target.value)}
                  placeholder="Escriba la adicion o precision clinica correspondiente..."
                  className="w-full p-3 rounded-xl border border-outline-variant text-xs outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Anexar Nota Aclaratoria Inmutable</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* BARRA DE ACCIONES INFERIOR */}
        <div className="p-4 border-t border-surface-container-high bg-surface-container-low flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('Exportacion RIPS JSON generada con exito segun Resolucion 2275 de 2023.')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-surface-container text-on-surface border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-primary" />
              <span>Exportar RIPS JSON</span>
            </button>
            <button
              type="button"
              onClick={() => alert('Bundle HL7 FHIR Release 4 generado en formato JSON estandar.')}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-surface-container text-on-surface border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-secondary" />
              <span>Exportar HL7 FHIR</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {!isClosed ? (
              <>
                <button
                  type="button"
                  onClick={() => alert('Borrador de historia clinica guardado en base de datos.')}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-surface-container text-primary border border-primary/30 text-xs font-bold cursor-pointer"
                >
                  Guardar Borrador
                </button>
                <button
                  type="button"
                  onClick={handleCloseAndSign}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Cerrar y Sellar Folio (SHA-256)</span>
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-950 font-bold text-xs border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Folio Cerrado Inmutable (Bloqueado)</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HceScreen;
