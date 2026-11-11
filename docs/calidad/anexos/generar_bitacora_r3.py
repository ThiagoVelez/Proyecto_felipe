# -*- coding: utf-8 -*-
"""Genera la actualización R3 (10 nov 2026) de 04-bitacora-defectos.md y cifras-r3.json.

Uso (desde la raíz del repositorio): python -X utf8 docs/calidad/anexos/generar_bitacora_r3.py
Es idempotente: si la bitácora ya contiene la marca R3, no la vuelve a modificar y solo regenera el JSON.
Los veredictos y la evidencia de DEF-49 a DEF-84 parten de borrador-reverificacion-v2.py (revisión 2,
no publicada); las rutas de evidencia de la v2 no se conservaron y se sustituyen por la evidencia R3.
"""
import importlib.util
import json
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[3]
CAL = RAIZ / "docs" / "calidad"
BITACORA = CAL / "04-bitacora-defectos.md"
MARCA = "<!-- R3: actualización del 10 nov 2026 -->"

spec = importlib.util.spec_from_file_location("borrador", CAL / "anexos" / "borrador-reverificacion-v2.py")
borrador = importlib.util.module_from_spec(spec)
spec.loader.exec_module(borrador)

V = "Verificado — corregido"
P = "Corregido parcialmente"
A = "Sigue abierto"
N = "Corrección presente; ejecución No medida"

EV_SIN_CAMBIOS = "`src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`)"
EV_TESTS = "`evidencias/r3/12-go-test-tests.txt` (suite `tests/backend` en verde)"
EV_REPRO = "`evidencias/r3/30-defectos-abiertos-reproduccion.txt`"

# id: (veredicto R3, estado en la tabla resumen, evidencia R3)
R3 = {
 "DEF-01": (V, "", "Triggers en MySQL y PostgreSQL y guardia `CanModify()` en servicio y sincronización. `TestRegression_ClosedRecordImmutability` (equipo) y `TestDEF07SincronizacionNoSobrescribeFolioCerrado` pasan; " + EV_TESTS + "."),
 "DEF-02": (P, "", "El índice existe, pero la caché en memoria declarada no existe. Además, el README de `main` (sección 14.3) reutiliza el identificador DEF-02 para otro defecto (carrera en la auditoría); ver DEF-92."),
 "DEF-03": (A, "", "La copia de cadenas no está en `main`: con `audit_middleware.go` de `origin/main`, `TestDEF28AuditoriaConservaDatosTrasFinalizarPeticion` altera 18 de 20 entradas en tres corridas (`evidencias/r3/31-def28-en-main.txt`). La corrección está en la rama de calidad (DEF-28)."),
 "DEF-04": (V, "", "`core/domain/triage.go` rechaza Glasgow fuera de [3, 15]; `TestH23LimitesGlasgowNoCubiertos` y `TestRegression_GlasgowBoundaryValidation` pasan (" + EV_TESTS + ")."),
 "DEF-05": (V, "Cerrado (verificado en R3)", "`TestDEF05PrescripcionRechazaPacienteDistintoAlFolio` pasa sobre el código del equipo (`prescription_service.go:43-49`); " + EV_TESTS + "."),
 "DEF-06": (V, "Cerrado (verificado en R3)", "`TestDEF06CruceAlergiasReactividadCruzadaYTildes` pasa (penicilina frente a amoxicilina y tildes). Las brechas que quedan se registran aparte: DEF-51 (vía v2 sin cruce) y DEF-60 (familia del alérgeno)."),
 "DEF-07": (V, "Cerrado (verificado en R3)", "`TestDEF07SincronizacionNoSobrescribeFolioCerrado` pasa; " + EV_TESTS + "."),
 "DEF-08": (V, "Cerrado (verificado en R3)", "`TestDEF08NivelManchesterFueraDelCatalogo` pasa; `triage_service.go:41-47` solo acepta niveles del catálogo iguales o más urgentes que el calculado."),
 "DEF-09": (V, "Cerrado (verificado en R3)", "`TestDEF09HipotermiaSeveraNoEsNoUrgente` pasa: 30 °C ya no se clasifica como Nivel IV ni V."),
 "DEF-10": (P, "Reabierto (corregido parcialmente, R3)", "Corregido para MySQL: `cmd/api/main.go:51-58` termina si no conecta. Persiste con `DB_DRIVER=postgres`: `adapters/storage/factory.go:152-163` conecta citas, inventario, recetas v2 y muro de salud al adaptador **en memoria** sin aviso, y esos datos se pierden al reiniciar. Ejecución con PostgreSQL: **No medida** (sin motor)."),
 "DEF-11": (V, "Cerrado (verificado en R3)", "No hay cuentas sembradas; el administrador inicial se crea con `ADMIN_INITIAL_*`. Comprobado al arrancar el backend en memoria: el registro solo muestra «Administrador inicial creado con las credenciales definidas por el operador» (`evidencias/r3/42-carga-http-real.txt`)."),
 "DEF-12": (V, "Cerrado (verificado en R3)", "`pkg/config/config.go:55-68` rechaza secretos ausentes, cortos o publicados; `src/backend/pkg/config/config_regression_test.go` pasa (`evidencias/r3/10-go-test-src.txt`)."),
 "DEF-13": (V, "Cerrado (verificado en R3)", "`TestDEF13TokenDeUsuarioDesactivadoEsRechazado` pasa."),
 "DEF-14": (V, "Cerrado (verificado en R3)", "`TestDEF14SetupMFANoDesactivaSegundoFactor` pasa. El segundo factor se puede eludir por otra vía, registrada como DEF-50."),
 "DEF-15": (P, "Reabierto (corregido parcialmente, R3)", "Hay bloqueo por cuenta y límites por ruta, pero por defecto se confía en `X-Real-IP` desde 10/8, 172.16/12 y 192.168/16 (`pkg/config/config.go:144`), así que un equipo de la red local puede rotar la cabecera. Severidad Alta -> Media."),
 "DEF-16": (V, "Cerrado (verificado en R3)", "`TestDEF16CierreConcurrenteNoBifurcaCadena` pasa (sin `-race` en local; con `-race` en CI)."),
 "DEF-17": (V, "Cerrado (verificado en R3)", "`TestDEF17MedicoNoCierraFolioAjeno` pasa."),
 "DEF-18": (V, "Cerrado (verificado en R3)", "`TestDEF18SincronizacionUsaMedicoAutenticado` pasa."),
 "DEF-19": (V, "Cerrado (verificado en R3)", "El reenvío de un folio cerrado se reconoce en el servicio antes de llegar al repositorio (`sync_service.go:91-94`), lógica común a todos los adaptadores; `TestDEF07…` lo ejercita. Ejecución contra MySQL: **No medida**."),
 "DEF-20": (V, "Cerrado (verificado en R3)", "`sealTime` trunca `closed_at` a segundos; `TestClosedAtIsSealedToSeconds` (equipo) pasa. Ejecución contra MySQL: **No medida**."),
 "DEF-21": (P, "Reabierto (corregido parcialmente, R3)", "Las pantallas de v1 consumen la API. Las nuevas repiten el patrón: `MedicalKitScreen.jsx` presenta publicaciones semilla como reales si la API falla y `DoctorAppointmentsView.jsx:139-142` afirma que el PDF «ha sido enviado» sin confirmación. Los casos de enfermería se registran como DEF-74 y DEF-75."),
 "DEF-22": (P, "Reabierto (corregido parcialmente, R3)", "La bitácora y los estados vienen del servidor, pero `AdminOrgChartView.jsx:110-125` inventa una «Gerencia General» con datos personales y `:64-69` silencia el error de carga. Severidad Alta -> Media."),
 "DEF-23": (V, "Cerrado (verificado en R3)", "El cliente ya no valida el TOTP; lo decide el servidor (`AuthMfa.test.jsx` pasa). El respaldo de la semilla pública se registra en DEF-50."),
 "DEF-24": (V, "Cerrado (verificado en R3)", "Fiber v2.52.16 (`src/backend/go.mod:7`); `govulncheck` ya no reporta GO-2025-3845 (`evidencias/r3/07-govulncheck.txt`). Reporta GO-2026-6888 en brotli v1.1.0 (DEF-83)."),
 "DEF-25": (N, "Corrección presente (ejecución con motor No medida, R3)", "Hay triggers de inmutabilidad en `postgres/schema.sql` y en MySQL para aclaraciones, y `CanModify()` se usa en los servicios. Sin MySQL ni PostgreSQL en el entorno la ejecución de los triggers queda **No medida**."),
 "DEF-26": (V, "Cerrado (verificado en R3)", "API de admisión y alergias para ADMISION, ENFERMERO y MEDICO; `TestAdmissionPatientAndAllergyAPI` y `TestRBACMatrizRutasPorRol` pasan."),
 "DEF-27": (V, "Cerrado (verificado en R3)", "`TestDEF27FrecuenciaCardiacaLimiteSuperior` pasa."),
 "DEF-28": (A, "Confirmado en main (corregido en la rama de calidad, pendiente de fusión)", "Con el `audit_middleware.go` de `origin/main` la prueba altera 18 de 20 entradas en tres corridas; con la corrección de la rama pasa (`evidencias/r3/31-def28-en-main.txt`)."),
 "DEF-29": (A, "Confirmado (sigue abierto, R3)", "`TestDEF29HashSinColisionPorDelimitador` reproduce la colisión (" + EV_REPRO + ")."),
 "DEF-30": (A, "Confirmado (sigue abierto, R3)", "`TestDEF30VerificacionValidaEnlaceConFolioAnterior` reproduce el defecto (" + EV_REPRO + ")."),
 "DEF-31": (V, "Cerrado (verificado en R3)", "`TestDEF31LoginNoRevelaCuentaInactivaConClaveErronea` pasa."),
 "DEF-32": (A, "Confirmado (sigue abierto, R3)", "`router.go:34-40` responde `UP` sin consultar la base de datos; comprobado contra el backend real (`GET /api/v1/health`, `evidencias/r3/42-carga-http-real.txt`)."),
 "DEF-33": (P, "Reabierto (corregido parcialmente, R3)", "Revalida con `/auth/me` al montar, pero pinta antes la interfaz con el rol de `localStorage`, guarda el *refresh token* en `localStorage` y declara un cifrado «AES-256 / TLS 1.3» inexistente."),
 "DEF-34": (V, "Cerrado (verificado en R3)", "`docker-compose.yml:16,60` publica solo en `127.0.0.1` y las credenciales son obligatorias (`${VAR:?…}`). Docker no disponible: verificación por lectura del archivo de despliegue."),
 "DEF-35": (A, "Confirmado (sigue abierto, R3)", "`src/frontend/nginx.conf:16-19` no define CSP ni HSTS y el bloque de activos (`:39`) anula las cabeceras heredadas."),
 "DEF-36": (A, "Confirmado (sigue abierto, R3)", "Blanco sobre el tramo `#F59E0B` del banner de pediatría: 2,15:1; sobre `#0D9488`: 3,74:1 (`evidencias/r3/44-contraste-modal-alergias.txt`). No cumple AA ni AAA."),
 "DEF-37": (V, "Cerrado (verificado en R3)", "`GetByID` devuelve una copia; `TestDEF37LecturaConcurrenteDeFolioSinCarrera` pasa. Con `-race`: **No medido** en local (sin gcc); se ejecuta en CI."),
 "DEF-38": (P, "Reabierto (corregido parcialmente, R3)", "Los descuentos son atómicos y los errores se propagan, pero la prescripción se persiste antes de descontar y sin transacción. Severidad Media -> Baja."),
 "DEF-39": (A, "Confirmado (sigue abierto, R3)", "`main` vuelve a publicar listas de Trello antiguas, el rango «RF01 a RF12» (hay RF01 a RF16) y la bitácora «DEF-01 a DEF-04». Calidad reaplica en esta rama solo los cambios autorizados del README."),
 "DEF-40": (P, "Reabierto (corregido parcialmente, R3)", "La cobertura frontend es ejecutable (72,85 %), pero persisten pruebas que dan confianza falsa: `AllergyAlertModal.test.jsx` prueba una copia del componente (DEF-90) y `MedicalKit.test.jsx` afirma contenido semilla."),
 "DEF-41": (A, "Confirmado en main (corregido en la rama de calidad, pendiente de fusión)", "La corrección (`fix(DEF-41)`) solo está en la rama de calidad; `TestDEF41CorrelationIDSoloAceptaUUID` pasa en la rama."),
 "DEF-42": (V, "Cerrado (verificado en R3)", "El seeder ya no crea cuentas y el único hash usa coste 12 (`pkg/crypto/crypto.go:38`)."),
 "DEF-43": (A, "Confirmado (sigue abierto, R3)", "Siguen datos personales de apariencia real en `AdminOrgChartView.jsx:112-119`, `MedicalKitScreen.jsx`, `Header.jsx` y `ProfileScreen.jsx`."),
 "DEF-44": (A, "Confirmado (sigue abierto, R3)", "16 funciones con complejidad mayor de 15 (media 3,86), 62 hallazgos de golangci-lint (21 nuevos desde `6492f07`) y 89 avisos de ESLint (`evidencias/r3/05c-golangci-lint-total.txt`, `08-gocyclo.txt`, `23-eslint.txt`). Los errores de ESLint de `App.jsx` están corregidos solo en la rama."),
 "DEF-45": (A, "Confirmado (sigue abierto, R3)", "`npm audit`: 6 vulnerabilidades en dependencias de desarrollo (2 críticas, 1 alta, 3 moderadas); producción: 0 (`evidencias/r3/22b-npm-audit-completo.txt`, `22-npm-audit-prod.txt`)."),
 "DEF-46": (V, "Cerrado (verificado en R3)", "`TestDEF46CatalogoNoExponePunteroInterno` y `TestDEF46PrescripcionesConcurrentesSinCarrera` pasan."),
 "DEF-47": (V, "Cerrado (verificado en R3)", "`tests/frontend/totp.regression.test.js` (3 pruebas) pasa (`evidencias/r3/24-vitest.txt`)."),
 "DEF-48": (P, "Reabierto (corregido parcialmente, R3)", "El equipo corrigió `staff_register_routes_test.go:84` (timeout de 30 s) y Calidad retiró el `-skip` de `calidad.yml`. El primer run del pipeline de R3 (`42922715510`) mostró la misma causa en otras pruebas del equipo: `TestDualTokenLoginAndRefreshFlow` y `TestRefreshTokenRevocationOnUserDeactivation` (`auth_security_test.go:278,308,387`, timeout por defecto de 1 s) fallan bajo `-race` con «timeout error 1000ms» y un pánico derivado (`evidencias/r3/60-ci-run-42922715510-fallos.txt`). Sin `-race` pasan. Corrección propuesta al Responsable de Pruebas: `app.Test(req, -1)` o un timeout explícito."),
}

# Defectos nuevos de la revisión R3. Mismo orden de campos que borrador.NUEVOS.
NUEVOS_R3 = [
 ("DEF-85", "Interpretar como UTC la hora local de la cita", "Backend / Frontend", "Crítica", "P1", "Confirmado", "RF13 (agendamiento, sección 5 del README)", "Seguridad operacional -> Identificación de riesgos; Adecuación funcional -> Corrección", "Lógica / Datos",
  "Un médico agenda en `DoctorAppointmentsView` una cita a las 18:00 (hora de Colombia, UTC-5); el `input datetime-local` envía `2026-11-17T18:00` sin zona.",
  "Cita a las 18:00 de Colombia / se guarda `18:00Z` (13:00 en Colombia): el calendario del médico la muestra a las 13:00, mientras el PDF y el correo dicen 18:00. Las citas de las 5 horas siguientes se rechazan como «pasadas».",
  "`appointment_handler.go:45-54` usa `time.Parse` sin zona (UTC); `DoctorAppointmentsView.jsx:468` calcula `min` con `toISOString()` (UTC). `TestDEF85CitaConservaLaHoraLocalDeColombia` lo reproduce: «Hora elegida 2026-11-17 18:00 (Colombia); guardada 2026-11-17T18:00:00Z, es decir 2026-11-17 13:00 en Colombia» (" + EV_REPRO + ").",
  "Fechas sin zona horaria en el contrato y en el formulario.", "M-49: enviar la fecha en RFC 3339 con zona desde el cliente y rechazar en el servidor fechas sin zona (o interpretarlas en `America/Bogota` de forma explícita). Cambia el contrato de la API: lo decide el equipo.", "TestDEF85CitaConservaLaHoraLocalDeColombia"),
 ("DEF-86", "Extraer el documento del PDF417 con una expresión genérica y compararlo sin normalizar", "Frontend / Backend", "Media", "P3", "Confirmado", "RF15", "Adecuación funcional -> Corrección; Capacidad de interacción -> Protección frente a errores", "Lógica",
  "Escanear una cédula cuyo PDF417 contiene otra secuencia de 8 a 10 dígitos antes del número de documento, o cuyo documento lleva ceros a la izquierda.",
  "Se extrae el número de documento normalizado / se toma la primera secuencia de 8 a 10 dígitos y el servidor compara la cadena exacta (`0001234567` ≠ `1234567`).",
  "`PharmacyDashboard.jsx:164-166` (`/\\b\\d{8,10}\\b/`); `pharmacy_service.go:117` compara cadenas tras `TrimSpace`. El fallo es «cerrado» (rechaza), por lo que no entrega a otro paciente, pero obliga a la contingencia manual, que DEF-77 debilita. Verificado por lectura.",
  "No se modeló el formato del PDF417 de la cédula colombiana.", "M-50: parser del formato de la cédula y normalización (solo dígitos, sin ceros a la izquierda) en el servidor.", None),
 ("DEF-87", "Validar la duración del video con el valor que declara el cliente y aceptar contenido que no es video", "Backend / Frontend", "Media", "P3", "Confirmado", "Muro de salud (RF13 de la RTM)", "Seguridad -> Integridad; Adecuación funcional -> Corrección", "Lógica / Datos",
  "`CreatePost` con `video_duration_seconds = -30` y `video_url = data:text/html;base64,...`.",
  "Rechazo / publicación aceptada. Además, el formulario admite videos de hasta 20 MB en base64, pero Fiber limita el cuerpo a 4 MB por defecto.",
  "`core/domain/health_education.go:70` solo compara el número declarado; `MedicalKitScreen.jsx:298-316` mide la duración en el navegador y envía el archivo como *data URL*. `TestDEF87MuroNoConfiaEnLaDuracionDeclaradaPorElCliente` lo reproduce (" + EV_REPRO + "). React escapa el texto y `<source src>` no ejecuta HTML, así que **no** se reprodujo XSS.",
  "La regla de 120 s se implementó en el cliente y el servidor confía en sus metadatos.", "M-51: subir el video como archivo, validar tipo MIME, tamaño y duración en el servidor (o restringir a URL de YouTube) y alinear el límite de cuerpo.", "TestDEF87MuroNoConfiaEnLaDuracionDeclaradaPorElCliente"),
 ("DEF-88", "Agendar citas para pacientes inexistentes", "Backend", "Media", "P3", "Confirmado", "RF13 (agendamiento)", "Adecuación funcional -> Corrección; Fiabilidad -> Integridad", "Lógica",
  "`ScheduleAppointment` con `patient_id` que no existe.", "404 o 422 / cita creada con nombre de paciente vacío.",
  "`appointment_service.go:62-78` ignora los errores de búsqueda del médico y del paciente. `TestDEF88CitaExigePacienteExistente` lo reproduce (" + EV_REPRO + ").",
  "Errores de búsqueda tratados como opcionales.", "M-36 (ampliada): exigir que el paciente exista y que el médico tenga rol MEDICO.", "TestDEF88CitaExigePacienteExistente"),
 ("DEF-89", "Aceptar EVA y coordenadas fuera de rango en notas anatómicas", "Backend", "Media", "P3", "Confirmado", "RF13 de la RTM (kit médico)", "Adecuación funcional -> Corrección", "Lógica / Datos",
  "`AddAnatomicalNote` con EVA −1 y 11 y coordenadas (−5000, 99999).", "Rechazo / notas guardadas.",
  "`clinical_record_service.go:209-244` no valida `PainLevel` ni coordenadas. `TestDEF89NotaAnatomicaRechazaEVAFueraDeRango` lo reproduce; 0 y 10 son valores válidos (" + EV_REPRO + "). Complementa DEF-67, que cubre el triaje.",
  "Validación de dominio ausente en la entidad nueva.", "M-34 (ampliada): `Validate()` en `ClinicalAnatomicalNote`.", "TestDEF89NotaAnatomicaRechazaEVAFueraDeRango"),
 ("DEF-90", "Probar una copia del modal de alergias en lugar del componente real", "Pruebas", "Media", "P2", "Confirmado", "RF05, RF09", "Mantenibilidad -> Capacidad de ser probado", "Lógica de prueba",
  "Leer `tests/frontend/AllergyAlertModal.test.jsx`.", "La prueba importa `src/frontend/src/components/AllergyAlertModal.jsx` / define su propio componente en las líneas 5-40 y comprueba sus clases.",
  "El archivo declara «Simulación del componente AllergyAlertModal». El componente real solo lo usa `PrescriptionScreen`, que la interfaz no muestra (DEF-51). Tampoco mide contraste: solo busca `bg-red-50` y `border-red-600`. Medición propia del componente real: 14,76:1 en el texto principal, pero 6,47:1 en el dato de severidad (`text-red-700`), que no llega a AAA (`evidencias/r3/44-contraste-modal-alergias.txt`).",
  "Prueba escrita sobre una especificación y no sobre el código.", "M-52 (propuesta al Responsable de Pruebas): importar el componente real y medir el contraste con axe-core.", None),
 ("DEF-91", "Publicar un dictamen «Aprobado 100 % conforme a ISO/IEC 25010» y una RTM al 100 % sin evidencia que los sostenga", "Documentación", "Alta", "P1", "Confirmado", "RNF03; todos los RF", "Mantenibilidad -> Analizabilidad; Seguridad -> Responsabilidad", "Documentación",
  "Comparar la tarjeta «Certificación de Calidad», el README (secciones 4.5, 4.7 y 14.1) y la evidencia de R3.",
  "Dictamen y RTM coherentes con la evidencia / «Aprobado 100 %» y «100 % de RF01 a RF12 y RNF01 a RNF08» con 18 defectos críticos abiertos en `main`.",
  "La RTM cita pruebas que existen (18 de 21 filas, `evidencias/r3/50-rtm-verificacion.txt`), pero solo 5 de 21 requisitos se sostienen sin un defecto abierto que los contradiga. El README define RF01 a RF16 y la RTM omite RF14 a RF16 y llama RF13 a otro requisito. La cifra p95 de 28,4 ms no tiene comando de origen. El endpoint `/health` responde `\"iso_quality\": \"ISO/IEC 25010 Evaluated\"`.",
  "La certificación la emitió el rol de Pruebas sin la evaluación del rol de Calidad.", "M-53: retirar el dictamen de conformidad hasta cerrar los Críticos; la RTM debe enlazar pruebas que fallarían si el requisito se incumple.", None),
 ("DEF-92", "Reutilizar los identificadores DEF-01 a DEF-04 y crear identificadores SEC-* paralelos con referencias a archivos inexistentes", "Documentación", "Media", "P3", "Confirmado", "RNF02", "Mantenibilidad -> Analizabilidad", "Documentación",
  "Comparar la sección 14.3 del README con `docs/informe-calidad.md` y la bitácora.",
  "Un identificador por defecto / DEF-02 y DEF-03 tienen dos significados; 25 defectos de la bitácora tienen además un ID SEC-*.",
  "README 14.3: DEF-02 pasa de «latencia de alergias» a «carrera en auditoría» y DEF-03 de «pánico en auditoría» a «pool MySQL»; cita `adapters/http/middleware/audit.go` y `mysql/db.go`, que no existen; afirma `append([]byte(nil), c.Body()...)` (no está en el código) y timeouts de 3 s en todos los repositorios SQL (no hay `context.WithTimeout` en `adapters/storage/mysql`). Mapa completo en `mapa-ids-sec-def.md`.",
  "Dos registros de defectos sin un responsable único.", "M-54: una sola bitácora (la de Calidad) y tabla de equivalencias SEC -> DEF en el README.", None),
]

# Medidas de R3 con su evidencia (anexos/linea-base-r3.md). Fuente única para el bloque de cifras.
MEDIDAS = {
    "pruebas_backend": "91 pasan, 0 fallan, 22 reproducciones omitidas (evidencias/r3/12-go-test-tests.txt)",
    "cobertura_backend": "68,9 %",
    "vitest": "108 pruebas en 15 archivos (105 en 14 archivos del equipo), todas pasan",
    "cobertura_frontend": "72,85 %",
    "reproducciones_abiertas": "22 de 22",
    "golangci_lint": "62 hallazgos (21 nuevos desde la v1)",
    "gocyclo": "16 funciones con complejidad mayor de 15",
    "govulncheck": "1 vulnerabilidad alcanzable (GO-2026-6888)",
    "npm_audit": "0 en producción; 6 en desarrollo",
    "eslint": "0 errores, 89 avisos",
    "p95": "1,38 ms HTTP real; 3,92 a 7,86 ms en proceso",
    "memoria": "11,5 a 16,3 MB",
    "afirmaciones": "48 evaluadas: 7 verificadas, 24 parciales, 2 no verificadas, 15 falsas",
    "rtm": "5 de 21 requisitos se sostienen",
    "dictamen": "No conforme con ISO/IEC 25010:2023",
}

def limpiar_v2(texto):
    """Quita las rutas de evidencia de la v2, que no se conservaron en el repositorio."""
    t = re.sub(r"\s*\(`?evidencias/v2/[^)]*\)", "", texto)
    t = re.sub(r"`?evidencias/v2/[\w.\-]+`?", "[evidencia v2 no conservada]", t)
    return t.replace("`07-…`", "[evidencia v2 no conservada]")

def fila(d):
    return f"| {d[0]} | {d[1]} | {d[2]} | {d[3]} | {d[4]} | {d[5]} |"

def ficha(d, origen):
    (i, tit, mod, sev, pri, est, req, iso, tipo, pasos, eo, evid, causa, acc, prueba) = d
    repro = (f"Prueba `{prueba}` (falla mientras el defecto exista; ver `defectos-abiertos.txt`)." if prueba else "Sin prueba automatizada: verificado por lectura de código o análisis estático.")
    if i == "DEF-63":
        repro = "Regresión permanente en `calidad_defectos_corregidos_v2_regression_test.go` (pasa en la rama)."
    return f"""### {i}. {tit}

| Campo | Contenido |
|---|---|
| Registrado en | {origen} |
| Módulo | {mod} |
| Requisito afectado | {req} |
| Característica ISO 25010:2023 | {iso} |
| Tipo (IEEE 1044) | {tipo} |
| Severidad / Prioridad | {sev} / {pri} |
| Pasos para reproducir | {pasos} |
| Resultado esperado / obtenido | {eo} |
| Evidencia | {evid} |
| Reproducción | {repro} |
| Causa raíz | {causa} |
| Acción propuesta | {acc} |
| Estado | {est} |
"""

def estado_v2(d):
    if d[0] == "DEF-63":
        return "Corregido en la rama de calidad (pendiente de fusión a main)"
    return "Confirmado (reverificado en R3)"

def main():
    nuevos_v2 = [tuple(limpiar_v2(x) if isinstance(x, str) else x for x in d) for d in borrador.NUEVOS]
    for k, d in enumerate(nuevos_v2):
        ev = d[11]
        if d[14]:
            ev += f" R3: `{d[14]}` sigue fallando por el defecto ({EV_REPRO})."
        elif d[0] != "DEF-63":
            ev += f" R3: verificado por lectura; {EV_SIN_CAMBIOS}."
        nuevos_v2[k] = d[:5] + (estado_v2(d),) + d[6:11] + (ev,) + d[12:]
    nuevos = nuevos_v2 + NUEVOS_R3

    sev_v2 = {k: v[1] for k, v in borrador.VIEJOS.items()}
    texto = BITACORA.read_text(encoding="utf-8")
    if MARCA not in texto:
        lineas = texto.split("\n")
        salida = []
        for ln in lineas:
            m = re.match(r"^\| (DEF-\d+) \|(.*)\|\s*$", ln)
            if m and m.group(1) in R3 and R3[m.group(1)][1]:
                celdas = ln.split(" | ")
                ident = m.group(1)
                celdas[3] = sev_v2.get(ident, celdas[3])
                celdas[-1] = R3[ident][1] + " |"
                ln = " | ".join(celdas)
            salida.append(ln)
            if ln.startswith("| DEF-48 |"):
                salida.extend(fila(d) for d in nuevos)
        texto = "\n".join(salida)
        # Verificación R3 al final de cada ficha DEF-05..48 (antes de la ficha siguiente).
        def anexar(mt):
            ident = mt.group(1)
            ver, _, ev = R3[ident]
            return mt.group(0) + f"\n#### Verificación R3 (10 nov 2026)\n\n| Veredicto | Evidencia |\n|---|---|\n| **{ver}** | {ev} |\n"
        texto = re.sub(r"### (DEF-(?:0[5-9]|[1-3]\d|4[0-8]))\. .*?\| Estado \|[^\n]*\n", anexar, texto, flags=re.S)
        # DEF-01..04: tabla de verificación R3 tras la tabla histórica.
        hist = "\n".join(f"| {i} | **{R3[i][0]}** | {R3[i][2]} |" for i in ("DEF-01", "DEF-02", "DEF-03", "DEF-04"))
        texto = texto.replace("\n---\n\n## 2. Resumen de defectos nuevos",
            "\n#### Verificación R3 (10 nov 2026) de DEF-01 a DEF-04\n\n| ID | Veredicto | Evidencia |\n|---|---|---|\n" + hist + "\n\n---\n\n## 2. Resumen de defectos nuevos", 1)
        fichas = "\n".join(ficha(d, "Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026)" if int(d[0][4:]) <= 84 else "Revisión R3 (10 nov 2026)") for d in nuevos)
        texto = texto.replace("\n---\n\n## 4. Métricas de la bitácora", "\n" + fichas + "\n---\n\n## 4. Métricas de la bitácora", 1)
        texto = texto.replace("# 04. Bitácora de defectos\n", "# 04. Bitácora de defectos\n\n" + MARCA + "\n> **Actualización R3 (10 nov 2026).** Base verificada: `origin/main` `9bacb0a` más la rama `calidad/revision-r3`. Se agregan la verificación R3 de DEF-01 a DEF-48, las fichas DEF-49 a DEF-84 (registradas en la revisión 2 y no publicadas hasta ahora) y los defectos nuevos DEF-85 a DEF-92. La historia anterior se conserva sin cambios. Métricas vigentes en la sección 5.\n", 1)
        texto = texto.rstrip("\n") + "\n\n" + metricas_md(nuevos) + "\n"
        BITACORA.write_text(texto, encoding="utf-8")
    cifras = calcular(nuevos)
    (CAL / "anexos" / "cifras-r3.json").write_text(json.dumps(cifras, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(cifras["resumen"], ensure_ascii=False, indent=1))

def universo(nuevos):
    sev = {k: v[1] for k, v in borrador.VIEJOS.items()}
    filas = []
    for i in sorted(R3, key=lambda x: int(x[4:])):
        if int(i[4:]) < 5:
            continue
        filas.append((i, sev[i], R3[i][0]))
    for d in nuevos:
        filas.append((d[0], d[3], "Corregido en rama" if d[0] == "DEF-63" else A))
    return filas

def calcular(nuevos):
    filas = universo(nuevos)
    ver = {}
    for i in R3:
        ver.setdefault(R3[i][0], []).append(int(i[4:]))
    abiertos_main = [f for f in filas if f[2] in (A, P, "Corregido en rama")]
    por_sev = {}
    for f in abiertos_main:
        por_sev[f[1]] = por_sev.get(f[1], 0) + 1
    nuevos_r3 = [d for d in nuevos if int(d[0][4:]) >= 85]
    sev_r3 = {}
    for d in nuevos_r3:
        sev_r3[d[3]] = sev_r3.get(d[3], 0) + 1
    resumen = {
        "defectos_registrados": 92,
        "verificacion_01_48": {k: len(v) for k, v in ver.items()},
        "verificacion_01_48_ids": {k: sorted(v) for k, v in ver.items()},
        "abiertos_en_main": len(abiertos_main),
        "abiertos_en_main_por_severidad": por_sev,
        "corregidos_en_rama_pendientes_de_fusion": ["DEF-28", "DEF-41", "DEF-63"],
        "nuevos_v2_publicados_en_r3": len([d for d in nuevos if int(d[0][4:]) <= 84]),
        "nuevos_r3": len(nuevos_r3),
        "nuevos_r3_por_severidad": sev_r3,
        "kloc_productivo": 30.157,
    }
    resumen["densidad_abiertos_por_kloc"] = round(len(abiertos_main) / 30.157, 2)
    return {"resumen": resumen, "medidas": MEDIDAS, "filas": filas}

def metricas_md(nuevos):
    c = calcular(nuevos)["resumen"]
    v = c["verificacion_01_48"]
    ids = c["verificacion_01_48_ids"]
    fmt = lambda xs: ", ".join(f"{x:02d}" for x in xs)
    sev = c["abiertos_en_main_por_severidad"]
    orden = ["Crítica", "Alta", "Media", "Baja"]
    tabla_sev = "\n".join(f"| {s} | {sev.get(s, 0)} |" for s in orden)
    r3 = c["nuevos_r3_por_severidad"]
    return f"""---

## 5. Métricas R3 (10 nov 2026)

Fuente única: `anexos/cifras-r3.json`, generado por `anexos/generar_bitacora_r3.py`. Universo: 92 defectos registrados (DEF-01 a DEF-92). Código productivo: 30,157 KLOC (`src/`, Go + JSX + JS sin pruebas, `evidencias/r3/01b-inventario.txt`).

### 5.1 Verificación R3 de DEF-01 a DEF-48

| Veredicto | Cantidad | Defectos |
|---|---|---|
| Verificado — corregido | {v.get(V, 0)} | {fmt(ids.get(V, []))} |
| Corregido parcialmente | {v.get(P, 0)} | {fmt(ids.get(P, []))} |
| Sigue abierto | {v.get(A, 0)} | {fmt(ids.get(A, []))} |
| Corrección presente; ejecución No medida | {v.get(N, 0)} | {fmt(ids.get(N, []))} |
| Regresión | 0 | — |
| Ya no aplica | 0 | — |
| **Total** | **48** | |

### 5.2 Defectos abiertos en `main` por severidad

Ámbito DEF-05 a DEF-92 (los históricos DEF-02 y DEF-03, también abiertos, no tienen severidad vigente). Incluye los «Sigue abierto», los «Corregido parcialmente», DEF-49 a DEF-92 y las tres correcciones de Calidad aún no fusionadas (DEF-28, DEF-41, DEF-63). Total: **{c['abiertos_en_main']}**; densidad {str(c['densidad_abiertos_por_kloc']).replace('.', ',')} defectos abiertos/KLOC.

| Severidad | Abiertos |
|---|---|
{tabla_sev}

### 5.3 Defectos nuevos de R3 (DEF-85 a DEF-92)

| Crítica | Alta | Media | Baja | Total |
|---|---|---|---|---|
| {r3.get('Crítica', 0)} | {r3.get('Alta', 0)} | {r3.get('Media', 0)} | {r3.get('Baja', 0)} | {c['nuevos_r3']} |

Los {c['nuevos_v2_publicados_en_r3']} defectos DEF-49 a DEF-84 se registraron en la revisión 2 (7 nov 2026), que no llegó a publicarse; R3 los reverificó y los publica."""

if __name__ == "__main__":
    main()
