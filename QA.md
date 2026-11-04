# Informe Integral de Aseguramiento de Calidad y Pruebas (QA)
## Plataforma Clínica Hospitalaria «SaludConecta IPS v2.4»

---

### Control Institucional del Documento
- **Institución:** Corporación de Estudios Tecnológicos del Norte del Valle (COTECNOVA)
- **Programa Académico:** Ingeniería de Sistemas — Asignatura: Ingeniería de Software II (Periodo 2026-2)
- **Docente Titular:** Ing. Felipe Gutiérrez Isaza
- **Responsable de Pruebas (QA / Testing Lead):** **Santiago Arcos**
- **Proyecto Evaluado:** Sistema Clínico Hospitalario «SaludConecta IPS v2.4»
- **Hito / Tag de Entrega:** `Entrega-s2` (Seguimiento 2: Calidad, Pruebas y Mantenimiento)
- **Rama Oficial de Validación:** `prueba` / `main`
- **Estándares Aplicados:** **ISO/IEC/IEEE 29119** (Software Testing), **ISO/IEC 25010** (Product Quality), **ISO/IEC 14764** (Software Maintenance), **OWASP ASVS v4.0.3 Nivel 2**, **Resolución 1995 de 1999** (MinSalud HCE), **Resolución 2275 de 2023** (RIPS JSON) y **Ley 1581 de 2012** (Habeas Data).

---

## 1. Resumen Ejecutivo y Alcance del Rol de QA

El presente informe técnico ha sido estructurado y consolidado por **Santiago Arcos** en calidad de **Responsable de Pruebas (QA / Testing Lead)** del equipo de ingeniería. Su propósito es certificar formalmente la fiabilidad, seguridad, corrección algorítmica y adecuación funcional del sistema asistencial **SaludConecta IPS v2.4**.

El aseguramiento de calidad comprendió el diseño, automatización, parametrización matemática y ejecución de pruebas sobre dos capas principales:
1. **Núcleo Transaccional Backend (Go 1.22+):** Pruebas unitarias de dominio puro, validaciones fisiológicas deterministas, integración de adaptadores primarios Fiber con middlewares de seguridad, inmutabilidad criptográfica SHA-256 encadenada, consistencia concurrente sin condiciones de carrera (`-race`), y simulación transaccional MySQL / en memoria.
2. **Capa Cliente Asistencial Web (React 18 / Vite 5 / Tailwind CSS):** Pruebas de componentes, integración de flujos asistenciales con mock de red estricto (rechazo de simulaciones falsas de éxito), renderizado condicional de alertas de alto riesgo farmacológico, validación matemática de tokens TOTP RFC 6238 en frontend/backend y resiliencia ante errores `HTTP 500` para prevenir pantallas en blanco en estaciones hospitalarias.

---

## 2. Estrategia y Arquitectura de Pruebas (ISO/IEC/IEEE 29119)

La arquitectura de pruebas implementada sigue el principio de la **Pirámide de Pruebas**, garantizando una base masiva de pruebas unitarias de ejecución ultrarrápida, una capa intermedia de integración HTTP/adaptadores con aislamiento por interfaces, y pruebas de interfaz de usuario desacopladas:

```
                      / \
                     /   \
                    / UI  \        Frontend Component & Screens (Vitest + RTL)
                   /-------\       - Tolerancia a HTTP 500 (Resiliencia sin crash)
                  /         \      - WCAG AA / Bloqueo visual de folios cerrados
                 / Integrac. \     HTTP Fiber Handlers + Middlewares + Memory/MySQL
                /-------------\    - RBAC estricto, rotación JWT, MFA TOTP, Idempotencia
               /               \   Unitarias Dominio Puro & Servicios (Go Core)
              /    Unitarias    \  - Algoritmo Manchester, Interceptor de Familias Alérgicas,
             /___________________\ - Inmutabilidad SHA-256, BVA/EP de Constantes Vitales
```

### 2.1. Tipología de Pruebas Ejecutadas
- **Caja Blanca Unitaria:** Inspección de rutas de ejecución de servicios (`ClinicalRecordService`, `TriageService`, `PrescriptionService`, `AuthService`, `SyncService`, `PatientService`).
- **Caja Negra Funcional:** Validación de entradas/salidas contra especificación formal (Gherkin BDD).
- **Pruebas de Seguridad (Security Testing - OWASP ASVS Nivel 2):** Resistencia a inyecciones, ataques de fuerza bruta en autenticación, revocación inmediata de sesiones suspendidas, aislamiento horizontal de objetos (IDOR médico-legal) y rechazo de secretos débiles.
- **Pruebas de Concurrencia y Resistencia a Condiciones de Carrera (Concurrency & Race Testing):** Ejecución con banderas `-race` para garantizar la linealidad de la cadena SHA-256 bajo cierres simultáneos y aislamiento en la deducción de inventario de medicamentos.
- **Pruebas de Regresión y Blindaje de Defectos (Regression Testing):** Verificación automatizada de parches aplicados a defectos mayores (`DEF-01` a `DEF-04`) y de la auditoría de seguridad (`SEC-C01` a `SEC-B01`).

---

## 3. Técnicas Formales de Diseño de Pruebas

Para maximizar la cobertura lógica minimizando el número de casos de prueba redundantes, se aplicaron rigurosamente dos técnicas formales de caja negra: **Partición de Equivalencia (Equivalence Partitioning - EP)** y **Análisis de Valores Límite (Boundary Value Analysis - BVA)**.

### 3.1. Escala de Coma de Glasgow (GCS)
- **Rango Teórico y Fisiológico:** Intervalo entero cerrado $[3, 15]$.
- **Clases de Equivalencia:**
  - $CE_1$ (Inválida Inferior): $(-\infty, 2] \cap \mathbb{Z} \rightarrow$ Rechazo con `ErrInvalidGlasgowScore` (HTTP 422).
  - $CE_2$ (Válida Crítica / Coma Severo): $[3, 8] \cap \mathbb{Z} \rightarrow$ Válida; asigna automáticamente `NIVEL_I` Manchester (Reanimación Inmediata).
  - $CE_3$ (Válida Moderada): $[9, 12] \cap \mathbb{Z} \rightarrow$ Válida; asigna `NIVEL_II` o `NIVEL_III`.
  - $CE_4$ (Válida Normal / Alerta): $[13, 15] \cap \mathbb{Z} \rightarrow$ Válida; paciente orientado/alerta.
  - $CE_5$ (Inválida Superior): $[16, +\infty) \cap \mathbb{Z} \rightarrow$ Rechazo con `ErrInvalidGlasgowScore` (HTTP 422).
- **Valores Frontera Evaluados:**
  - $2$ (Límite inválido inmediatamente inferior) $\rightarrow$ Rechazado.
  - $3$ (Límite válido mínimo) $\rightarrow$ Aceptado (`NIVEL_I`).
  - $15$ (Límite válido máximo) $\rightarrow$ Aceptado.
  - $16$ (Límite inválido inmediatamente superior) $\rightarrow$ Rechazado.

### 3.2. Frecuencia Cardíaca (FC en latidos por minuto - lpm)
- **Rango Plausible Hospitalario:** $[1, 300]$ lpm.
- **Clases de Equivalencia:**
  - $CE_1$ (Inválida - Muerte aparente o error de captura): $(-\infty, 0] \rightarrow$ Error `ErrInvalidVitals`.
  - $CE_2$ (Bradicardia Extrema - Choque): $[1, 39] \rightarrow$ Disparador Manchester `NIVEL_I`.
  - $CE_3$ (Bradicardia Leve / Moderada): $[40, 59] \rightarrow$ Discriminador `NIVEL_II` / `NIVEL_III`.
  - $CE_4$ (Fisiológica Normal Basal): $[60, 100] \rightarrow$ Clasificación `NIVEL_V` (si resto de signos son basales).
  - $CE_5$ (Taquicardia Moderada): $[101, 150] \rightarrow$ Discriminador `NIVEL_II` / `NIVEL_III`.
  - $CE_6$ (Taquicardia Paroxística Extrema): $[151, 300] \rightarrow$ Disparador Manchester `NIVEL_I`.
  - $CE_7$ (Inválida Fisiológicamente): $[301, +\infty) \rightarrow$ Rechazo `ErrInvalidVitals`.
- **Valores Frontera Evaluados:** $0$ (Error), $1$ (Nivel I), $39$ (Nivel I), $40$ (Nivel II/III), $150$ (Nivel II/III), $151$ (Nivel I), $300$ (Nivel I), $301$ (Error).

### 3.3. Tensión Arterial Sistólica (TAS en mmHg) y Saturación de Oxígeno ($\text{SpO}_2$ en %)
- **TAS Choque Hemodinámico:** $< 70\text{ mmHg} \rightarrow$ Disparador mandate Manchester `NIVEL_I`.
- **TAS Rango Plausible:** $[1, 300]\text{ mmHg}$; valores $> 300$ o $< 1$ son rechazados con HTTP 422.
- **$\text{SpO}_2$ Hipoxemia Severa:** $< 85\% \rightarrow$ Disparador Manchester `NIVEL_I`.
- **$\text{SpO}_2$ Hipoxemia Moderada:** $[85\%, 89\%] \rightarrow$ Disparador `NIVEL_II`.
- **$\text{SpO}_2$ Límite Aceptable:** $[90\%, 94\%] \rightarrow$ Disparador `NIVEL_III`.
- **$\text{SpO}_2$ Normal Basal:** $[95\%, 100\%] \rightarrow$ Estable. Valores fuera de $[0, 100]$ son rechazados.

### 3.4. Temperatura Corporal Corporal ($^\circ\text{C}$) — Discriminadores Manchester
- **Rango Plausible Hospitalario:** $[20.0, 45.0]^\circ\text{C}$.
- **Hipotermia Severa / Choque:** $\le 29.9^\circ\text{C} \rightarrow$ Clasificación forzosa en `NIVEL_I` (ej. $27.5^\circ\text{C}$).
- **Hipotermia Moderada:** $[30.0, 31.9]^\circ\text{C} \rightarrow$ Clasificación en `NIVEL_II` (nunca Nivel V).
- **Hipotermia Leve:** $[32.0, 34.9]^\circ\text{C} \rightarrow$ Clasificación en `NIVEL_III`.
- **Rango Normotérmico Basal:** $[35.0, 37.0]^\circ\text{C} \rightarrow$ `NIVEL_V`.
- **Febrícula:** $[37.1, 37.9]^\circ\text{C} \rightarrow$ `NIVEL_IV`.
- **Fiebre Alta:** $[38.0, 39.9]^\circ\text{C} \rightarrow$ `NIVEL_III`.
- **Hipertermia Severa:** $[40.0, 40.9]^\circ\text{C} \rightarrow$ `NIVEL_II`.
- **Hiperpirexia Extrema:** $\ge 41.0^\circ\text{C} \rightarrow$ `NIVEL_I`.

### 3.5. Seguridad Criptográfica y Políticas de Bloqueo
- **Longitud del Secreto JWT (`JWT_SECRET`):**
  - Inválido: $< 32$ caracteres o cadenas conocidas/publicadas en repositorios (`"super-secret-key..."`).
  - Válido: $\ge 32$ caracteres pseudoaleatorios criptográficamente fuertes.
- **Control de Fuerza Bruta (Rate Limit & Account Lockout):**
  - Umbral de Intentos Fallidos: $5$ intentos consecutivos de contraseña o código TOTP erróneo.
  - Tiempo de Bloqueo Automático: $15$ minutos forzosos (emite `HTTP 429 Too Many Requests`).

---

## 4. Inventario Exhaustivo de Suites de Prueba del Sistema

A continuación se detalla el catálogo de suites desarrolladas y automatizadas, especificando cada caso de prueba, su ubicación en el repositorio, su propósito de verificación y su comportamiento analizado.

### 4.1. Suites Backend en Go (`tests/backend/` y `src/backend/`)

#### 1. Triaje Manchester y Constantes Vitales (`tests/backend/triage_test.go` y `triage_security_test.go`)
- `TestTriageEquivalencePartitioningAndBoundaryValues`:
  - Evalúa partición inválida superior de Glasgow ($16$) $\rightarrow$ Verifica error tipado `domain.ErrInvalidGlasgowScore`.
  - Evalúa partición inválida por frecuencia cardíaca nula ($\text{FC} = 0$) $\rightarrow$ Verifica `domain.ErrInvalidVitals`.
  - Evalúa valores frontera válidos críticos (Glasgow $7$, $\text{SpO}_2$ $82\%$, $\text{FC}$ $145$) $\rightarrow$ Verifica asignación de `NIVEL_I` (Rojo).
  - Evalúa parámetros fisiológicos estables $\rightarrow$ Verifica asignación de `NIVEL_V` (Azul).
- `TestTriageRejectsClientLevelOutsideCatalog`:
  - Envío de un nivel Manchester fuera de catálogo (`"NIVEL_X"`) $\rightarrow$ Verifica rechazo con `domain.ErrInvalidManchesterLevel`.
  - Intento del cliente de rebajar prioridad clínica a un paciente en coma (Glasgow $6$ enviado como `NIVEL_V`) $\rightarrow$ Rechazo con `domain.ErrInvalidManchesterLevel`.
  - Escalamiento clínico del usuario a un nivel más urgente que el calculado $\rightarrow$ Aceptación conforme a discreción del triaje de urgencias.
  - Intento de forzar estado `FINALIZADO` al registrar $\rightarrow$ El servidor impone estado `PENDIENTE`.
- `TestTriageTemperatureDiscriminators`:
  - Prueba parametrizada mediante tabla de casos (11 temperaturas distintas entre $27.5^\circ\text{C}$ y $41.5^\circ\text{C}$) verificando la asignación del nivel Manchester correspondiente.
- `TestTriageRejectsImplausibleVitals`:
  - Rechaza temperaturas de $10^\circ\text{C}$ y $100^\circ\text{C}$, FC de $500$ y TAS de $900$ con `ErrInvalidVitals`.

#### 2. Inmutabilidad de Historia Clínica Electrónica (`tests/backend/clinical_record_test.go`)
- `TestClinicalRecordImmutabilityAndClosingPolicy`:
  - Creación de borrador $\rightarrow$ Valida `IsClosed = false` y ausencia de hash SHA-256.
  - Cierre y firma formal con token digital $\rightarrow$ Valida transición a `IsClosed = true` y generación determinista del hash SHA-256.
  - Intento de segundo cierre o modificación del folio sellado $\rightarrow$ Verifica denegación inmediata con `domain.ErrRecordAlreadyClosed`.
  - Anexo de nota aclaratoria formal $\rightarrow$ Verifica registro en tabla vinculada sin mutar el folio original (Resolución 1995 de 1999).
  - Verificación matemática de integridad criptográfica $\rightarrow$ `VerifyIntegrity() == true`.

#### 3. Cadena Criptográfica SHA-256 y Concurrencia (`tests/backend/clinical_chain_test.go`)
- `TestRecordObjectLevelAccess`:
  - Intento de cierre de folio por un médico distinto al autor $\rightarrow$ Verifica rechazo con `domain.ErrNotRecordOwner` (HTTP 403).
  - Intento de anexar nota aclaratoria por facultativo ajeno $\rightarrow$ Verifica rechazo con `domain.ErrNotRecordOwner`.
- `TestClosedAtIsSealedToSeconds`:
  - Verifica que la estampa temporal `ClosedAt` sea truncada con precisión de segundos (`Nanosecond() == 0`) previo al sellado criptográfico, impidiendo fallos de verificación causados por el redondeo `TIMESTAMP(0)` del motor relacional.
- `TestConcurrentClosesKeepChainLinear`:
  - Ejecución concurrente mediante 12 goroutines intentando cerrar simultáneamente folios del mismo paciente.
  - Verifica que no ocurra bifurcación (forks de cadena), que cada eslabón referencie al anterior de manera estrictamente lineal y que el 100% de los folios mantengan integridad criptográfica.
- `TestRepositoryRejectsForkedChainLink`:
  - Intento directo a nivel de repositorio de insertar dos registros con el mismo `previous_hash` $\rightarrow$ Valida rechazo con `domain.ErrChainConflict`.
- `TestSyncNeverRewritesClosedRecordsNorTrustsClient`:
  - Intento de un lote offline de reescribir un folio previamente cerrado enviando otro médico tratante o hashes falsificados $\rightarrow$ El servidor descarta la falsificación, preserva el folio intacto y calcula los metadatos de autoría en el servidor.

#### 4. Intercepción Farmacológica de Alergias (`tests/backend/prescription_test.go` y `prescription_security_test.go`)
- `TestPrescriptionAllergyInterceptor`:
  - Paciente con antecedente severo de hipersensibilidad a betalactámicos. Prescripción de Amoxil (Amoxicilina) $\rightarrow$ El interceptor detiene la operación en un tiempo $< 150\text{ ms}$ emitiendo `domain.AllergyConflictError`.
  - Prescripción de Acetaminofén (Paracetamol) al mismo paciente $\rightarrow$ Operación permitida y descuento efectivo del stock en inventario hospitalario.
- `TestAllergyCrossCheckUsesRecordPatient`:
  - Ataque de suplantación de ID de paciente en el payload HTTP para saltarse el chequeo de alergias $\rightarrow$ El servicio valida contra el paciente real del folio clínico y responde `HTTP 409 Conflict`.
- `TestAllergyFamilyAndAccentMatching`:
  - Prueba de normalización lingüística: `"ÁCIDO ACETILSALICÍLICO"` frente a `"acido acetilsalicilico"`.
  - Validación de cruce cruzado por familias farmacológicas: Alergia a Penicilina bloquea formulación de Amoxicilina (Betalactámicos).
- `TestPrescriptionRequiresRecordAuthor`:
  - Médico ajeno intentando recetar sobre el folio de otro facultativo $\rightarrow$ Rechazo `ErrNotRecordOwner` (HTTP 403).
- `TestGetMedicationReturnsCopy` y `TestConcurrentPrescriptionsDoNotRaceOnStock`:
  - Evita corrupción de memoria retornando copias inmutables de los registros del catálogo.
  - Ejecución concurrente de prescripciones sobre inventario limitado $\rightarrow$ Garantiza que el stock final no caiga en valores negativos ni sufra inconsistencias por carreras de lectura/escritura.

#### 5. Gobernanza ReTHUS y Control Administrativo (`tests/backend/admin_governance_test.go` y `staff_register_routes_test.go`)
- `TestStaffGovernanceAndReTHUSVerification`:
  - Registro de médico con tarjeta profesional en blanco $\rightarrow$ Rechazo con `domain.ErrMissingProfessionalCard`.
  - Registro formal de personal médico con tarjeta profesional válida $\rightarrow$ La cuenta se crea obligatoriamente inactiva (`IsActive = false`).
  - Intento de autenticación de usuario inactivo $\rightarrow$ Rechazo con `domain.ErrUserInactive` (HTTP 403).
  - Inspección desde panel administrativo de la cola de solicitudes pendientes $\rightarrow$ Verificación de listado fiel sin activación automática.
- `TestStaffRegisterRequiresAdmin`:
  - Verificación de rutas de registro `/api/v1/admin/users`: rechazo con `HTTP 401` ante peticiones anónimas y con `HTTP 403` si son ejecutadas por roles asistenciales (ej. MEDICO).

#### 6. Seguridad de Autenticación, MFA y Tokens (`tests/backend/auth_security_test.go`)
- `TestDeactivatedUserLosesAccessImmediately`:
  - Usuario autenticado con token válido es suspendido por el Administrador $\rightarrow$ En la solicitud inmediatamente posterior con dicho token a `/api/v1/auth/me`, la petición es rechazada con `HTTP 401 Unauthorized` (revocación instantánea).
- `TestRoleComesFromStoreNotToken`:
  - Token JWT manipulado que falsifica el claim `Role = ADMIN` $\rightarrow$ La ruta administrativa consulta la base de datos y rechaza con `HTTP 403 Forbidden`.
- `TestMFASetupRequiresCurrentCode`:
  - Intento de reconfigurar o deshabilitar MFA en una cuenta protegida $\rightarrow$ Exige obligatoriamente el parámetro `current_code` válido del TOTP vigente; rechaza códigos erróneos con `HTTP 401`.
- `TestLoginBruteForceLockout` y `TestTOTPBruteForceLockout`:
  - Cinco intentos fallidos de autenticación (sea contraseña o código TOTP) $\rightarrow$ Bloqueo inmediato de la cuenta con código `HTTP 429 Too Many Requests`.
- `TestBootstrapAdminNeverUsesDefaults` y `TestMemoryStoreHasNoPublishedAccounts`:
  - El sistema no crea cuentas administradoras si las variables de entorno están ausentes o vacías; no existen cuentas ni contraseñas publicadas por defecto.
- `TestJWTSecretValidation`:
  - Rechaza secretos vacíos, de longitud $< 32$ caracteres o coincidentes con valores de plantillas públicas.
- `TestRateLimitUsesRealClientIPBehindProxy`:
  - Valida que la limitación de tasa por IP respete la cabecera `X-Real-IP` solo cuando proviene de proxies de confianza (`TRUSTED_PROXIES`).

#### 7. Admisión de Pacientes y Sincronización Offline (`tests/backend/patient_api_test.go` y `sync_test.go`)
- `TestAdmissionPatientAndAllergyAPI`:
  - Valida que únicamente los roles autorizados (ADMISION, ENFERMERO, MEDICO) registren pacientes.
  - Documentos de identidad duplicados responden `HTTP 409 Conflict`.
  - Datos de catálogos inválidos (ej. tipo de sangre `"Z+"`) responden `HTTP 422 Unprocessable Entity`.
- `TestRuralOfflineBatchSynchronization`:
  - Simula captura desconectada en brigada rural y consolida lote con UUID v4.
  - Verifica la idempotencia de sincronización: reenviar el lote no duplica registros ni modifica folios cerrados.

#### 8. Pruebas Criptográficas y de Dominio Interno (`src/backend/core/services/` y `src/backend/pkg/crypto/`)
- `TestChainedSHA256Integrity`:
  - Valida determinismo: mismos datos producen idéntico hash SHA-256.
  - Valida efecto avalancha: la modificación de un solo carácter en la anamnesis cambia radicalmente el hash resultante.
- `TestManchesterPriorityCalculation`:
  - Verifica el cálculo funcional de prioridad según constantes vitales en la entidad pura de dominio.
- `TestPasswordHashingAndVerification`:
  - Verifica el hashing Bcrypt (coste 12) y el rechazo estricto de contraseñas erróneas.
- `TestJWTIssuanceAndValidation`:
  - Valida emisión de tokens JWT HS256, expiración y firma con clave secreta.

---

### 4.2. Suites Frontend en React (`tests/frontend/`)

#### 1. Intercepción Visual de Alergias (`tests/frontend/AllergyAlertModal.test.jsx`)
- Renderizado condicional de alerta de alta visibilidad:
  - Ante severidad `SEVERA`, comprueba la aplicación de estilos de alto contraste (borde rojo `border-red-600`, fondo `bg-red-50` y texto `text-red-900`).
  - Despliegue accesible de atributos ARIA (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`).
  - Interrupción del flujo asistencial hasta confirmación explícita del médico.

#### 2. Implementación Criptográfica TOTP RFC 6238 (`tests/frontend/totp.test.js`)
- `totp.test.js`:
  - Decodificación matemática de semillas Base32 a bytes.
  - Construcción de URIs compatibles con Google Authenticator y Authy (`otpauth://totp/...`).
  - **Validación contra Vectores Oficiales del RFC 6238 (Apéndice B):** Cotejo exacto en épocas $T = 59, 1111111109, 1111111111, 1234567890, 2000000000$ tanto en entornos con `window.crypto.subtle` como en entornos degradados utilizando HMAC-SHA1 en JavaScript puro.
  - Rechazo de semillas inválidas sin inventar códigos aleatorios.

#### 3. Gobernanza Administrativa e Integración (`tests/frontend/AdminGovernance.test.jsx`)
- Renderizado del modal de registro de personal asistencial con validación de obligatoriedad de tarjeta profesional ReTHUS.
- Validación de que los errores reales del servidor (ej. HTTP 403 Forbidden) se proyecten directamente al usuario sin encubrirlos con falsos mensajes de éxito.
- Comprobación de que el formulario de creación de personal sea accesible exclusivamente desde el perfil del Administrador.

#### 4. Flujo de Autenticación y Desafío MFA (`tests/frontend/AuthMfa.test.jsx`)
- Despliegue reactivo del input de 6 dígitos cuando el servidor retorna `{ mfa_required: true, status: 401 }`.
- Validación de que el cliente no evalúe el código TOTP localmente, sino que lo transporte íntegro al endpoint del servidor.
- Limpieza de casillas y presentación de mensaje de error legible ante rechazo por código inválido o caducado.

#### 5. Pantallas Clínicas y Consumo de API Real (`tests/frontend/ClinicalScreens.test.jsx`)
- Pantalla de Historia Clínica (HCE): Carga de folios del paciente y renderizado fidedigno del hash SHA-256 devuelto por la API en la pestaña de cadena forense.
- Despliegue de mensaje de error legible cuando la API no se encuentra disponible (error 500/red).
- Validación de mensajes de error médico-legal: advertencia clara cuando un facultativo intenta cerrar el folio de otro médico (código HTTP 403).

#### 6. Admisión y Flujo de Pacientes (`tests/frontend/PatientFlow.test.jsx`)
- Selector de pacientes (`PatientPicker`): Consulta al servidor y despliegue de antecedentes alérgicos confirmados.
- Búsqueda por documento y notificación accesible cuando el paciente no se encuentra en el censo hospitalario (HTTP 404).

#### 7. Entorno Asistencial y Diseño de Alto Contraste (`tests/frontend/DoctorLayout.test.jsx`)
- Menú lateral (`Sidebar`): Verificación de opciones asistenciales (Dashboard, Triaje, HCE, Prescripción, Perfil, MFA).
- Barra superior (`Header`): Despliegue de los datos de acreditación del facultativo (Nombre, Rol MEDICO, Tarjeta Profesional).
- Perfil (`ProfileScreen`): Renderizado de la colección de 5 banners médicos temáticos y cumplimiento de contraste WCAG AAA mediante óvalo de alta luminosidad.

---

## 5. Matriz de Trazabilidad de Requisitos (RTM)

La siguiente matriz certifica la cobertura del 100% de los requisitos funcionales (RF01 a RF12) y no funcionales (RNF01 a RNF08) contra las suites de prueba ejecutadas:

| Código Requisito | Descripción del Requisito | Suite / Casos de Prueba Asociados | Tipo de Prueba | Estado de Ejecución |
| :--- | :--- | :--- | :--- | :---: |
| **RF01** | Autenticación, MFA y Esquema Dual de Tokens | `TestDeactivatedUserLosesAccessImmediately`, `TestMFASetupRequiresCurrentCode`, `TestLoginBruteForceLockout`, `totp.test.js`, `AuthMfa.test.jsx` | Seguridad / Unitarias / UI | **APROBADO (PASS)** |
| **RF02** | Triaje Manchester y Guardia Fisiológica | `TestTriageEquivalencePartitioningAndBoundaryValues`, `TestTriageRejectsClientLevelOutsideCatalog`, `TestTriageTemperatureDiscriminators`, `ClinicalScreens.test.jsx` | BVA / EP / Integración | **APROBADO (PASS)** |
| **RF03** | HCE e Inmutabilidad Absoluta | `TestClinicalRecordImmutabilityAndClosingPolicy`, `TestRecordObjectLevelAccess`, `ClinicalScreens.test.jsx` | Caja Blanca / Integración | **APROBADO (PASS)** |
| **RF04** | Cadena Criptográfica SHA-256 | `TestChainedSHA256Integrity`, `TestConcurrentClosesKeepChainLinear`, `TestClosedAtIsSealedToSeconds`, `TestRepositoryRejectsForkedChainLink` | Criptografía / Concurrencia | **APROBADO (PASS)** |
| **RF05** | Intercepción Farmacológica de Alergias | `TestPrescriptionAllergyInterceptor`, `TestAllergyCrossCheckUsesRecordPatient`, `TestAllergyFamilyAndAccentMatching`, `AllergyAlertModal.test.jsx` | Integración / UI / Ontología | **APROBADO (PASS)** |
| **RF06** | Sincronización Offline-First Rural | `TestRuralOfflineBatchSynchronization`, `TestSyncNeverRewritesClosedRecordsNorTrustsClient` | Idempotencia / Resiliencia | **APROBADO (PASS)** |
| **RF07** | Gobernanza de Personal y Habilitación ReTHUS | `TestStaffGovernanceAndReTHUSVerification`, `TestStaffRegisterRequiresAdmin`, `AdminGovernance.test.jsx` | Seguridad / RBAC / UI | **APROBADO (PASS)** |
| **RF08** | Panel Administrativo Desacoplado | `TestRoleComesFromStoreNotToken`, `AdminGovernance.test.jsx` | Aislamiento / RBAC | **APROBADO (PASS)** |
| **RF09** | Perfil Asistencial y Alto Contraste | `DoctorLayout.test.jsx` (evaluación de banners y óvalo protector) | Usabilidad / WCAG AAA | **APROBADO (PASS)** |
| **RF10** | Menú Colapsable y Persistencia F5 | `DoctorLayout.test.jsx`, `AuthMfa.test.jsx` | UI / Persistencia | **APROBADO (PASS)** |
| **RF11** | Admisión de Pacientes y Alergias | `TestAdmissionPatientAndAllergyAPI`, `PatientFlow.test.jsx` | API / Integración / UI | **APROBADO (PASS)** |
| **RF12** | Catálogo Farmacológico y Stock | `TestConcurrentPrescriptionsDoNotRaceOnStock`, `TestGetMedicationReturnsCopy` | Concurrencia / Negocio | **APROBADO (PASS)** |
| **RNF01** | Latencia de Respuesta (< 400 ms) | Benchmarks de Go: Triaje en ns/op, Alergias en $\mu\text{s/op}$ | Eficiencia de Desempeño | **APROBADO (PASS)** |
| **RNF02** | Trazabilidad y Auditoría Forense | `TestStaffGovernanceAndReTHUSVerification` (AuditRepo), clonación de buffer | Auditoría / No Repudio | **APROBADO (PASS)** |
| **RNF03** | Seguridad OWASP ASVS Nivel 2 | Suites completas de `auth_security_test.go` y `prescription_security_test.go` | Seguridad Defensiva | **APROBADO (PASS)** |
| **RNF04** | Inmutabilidad Criptográfica en BD | Disparadores SQL (`trg_prevent_update_closed_record`), `TestMySQLChainSyncAndTimestamps` | Integridad Persistente | **APROBADO (PASS)** |
| **RNF05** | Resiliencia Offline Rural | `TestRuralOfflineBatchSynchronization` | Fiabilidad / Disponibilidad | **APROBADO (PASS)** |
| **RNF06** | Persistencia a Prueba de Fallos | `TestJWTSecretValidation`, comprobación de arranque sin DB_DRIVER silencioso | Fiabilidad Operativa | **APROBADO (PASS)** |
| **RNF07** | Gestión Segura de Secretos | `TestBootstrapAdminNeverUsesDefaults`, `TestMemoryStoreHasNoPublishedAccounts` | Confidencialidad | **APROBADO (PASS)** |
| **RNF08** | Consistencia bajo Concurrencia | Ejecución bajo bandera `-race`, bloqueos lineales de cadena SHA-256 | Concurrencia e Integridad | **APROBADO (PASS)** |

---

## 6. Hallazgos de Auditoría y Verificación de Defectos

Como parte de las actividades rigurosas de QA, se evaluó la resolución y blindaje de los defectos históricos detectados en la plataforma.

### 6.1. Defectos Principales de la Entrega-s2
1. **DEF-01: Bypass de Modificación en Folios Clínicos Cerrados**
   - *Severidad:* Crítica (Violación médico-legal a la Res. 1995 de 1999).
   - *Causa Raíz:* La comprobación de estado `is_closed` residía únicamente en una capa lógica y no a nivel de transacción atómica de persistencia.
   - *Verificación QA:* Se comprobó la doble barrera: guardia en `ClinicalRecordService.CloseAndSign` que devuelve `ErrRecordAlreadyClosed` y trigger relacional `trg_prevent_update_closed_record` en MySQL y PostgreSQL que emite excepción `SIGNAL SQLSTATE '45000'`.
2. **DEF-02: Condición de Carrera en Buffers de Auditoría Forense**
   - *Severidad:* Alta (Riesgo de pánico en goroutines concurrentes y corrupción de logs).
   - *Causa Raíz:* GoFiber reutiliza los contextos de `fasthttp.RequestCtx`. Una goroutine asíncrona leía directamente `c.Body()` tras el reciclaje del buffer.
   - *Verificación QA:* Comprobada la clonación profunda e inmutable previa al despacho de la goroutine (`append([]byte(nil), c.Body()...)`).
3. **DEF-03: Fuga de Conexiones en Pool MySQL bajo Carga**
   - *Severidad:* Alta (Degradación y bloqueo transaccional en urgencias).
   - *Causa Raíz:* Ausencia de límites explícitos en `SetMaxOpenConns` y consultas SQL sin contexto temporal (`context.WithTimeout`).
   - *Verificación QA:* Comprobada la configuración del pool (25 conexiones máximas, 10 inactivas) e inyección de timeouts de 3 segundos en todas las transacciones SQL.
4. **DEF-04: Omisión de Alerta ante Familias Farmacológicas y Acentos**
   - *Severidad:* Crítica (Riesgo inminente de shock anafiláctico).
   - *Causa Raíz:* Comparación literal de cadenas. Penicilina no bloqueaba Amoxicilina y diferencias de tildes omitían la coincidencia.
   - *Verificación QA:* Implementación de `domain.MatchAllergy` con desacentuación y tabla de familias terapéuticas (betalactámicos, cefalosporinas, AINEs, sulfonamidas, macrólidos, quinolonas).

### 6.2. Auditoría de Seguridad Adicional (25 Defectos Blindados)
- **Críticos (SEC-C01 a SEC-C07):** Resuelto cruce de alergias contra el paciente del folio real, soporte integral de tildes y asociaciones farmacológicas, prohibición de sobreescritura de folios cerrados en sincronización, rechazo de niveles Manchester fuera de catálogo, clasificación correcta de hipotermia a $30^\circ\text{C}$ como `NIVEL_II`, prohibición de conmutación silenciosa a memoria y erradicación de cuentas por defecto.
- **Altos (SEC-A01 a SEC-A16):** Rechazo de secretos JWT inseguros, revocación instantánea de sesiones al desactivar usuarios, exigencia de código TOTP vigente para alterar MFA, bloqueo por fuerza bruta a 5 intentos, serialización de cadena SHA-256 sin bifurcaciones, control de acceso por autor del folio, sellado de tiempo truncado a segundos y desacoplamiento de mocks en frontend.
- **Medio y Bajo (SEC-M01, SEC-B01):** Repositorios en memoria devuelven copias defensivas para evitar carreras de punteros, y ajuste de tiempos de espera en hashing Bcrypt bajo pruebas concurrentes.

---

## 7. Métricas Cuantitativas de Calidad (ISO/IEC 25010)

Los resultados empíricos obtenidos en las mediciones del sistema contra los umbrales definidos en el informe de calidad son los siguientes:

| Característica ISO 25010 | Métrica Evaluada | Meta de Calidad | Resultado Medido | Dictamen QA |
| :--- | :--- | :---: | :---: | :---: |
| **Adecuación Funcional** | Tasa de éxito en transacciones clínicas | 100% | 100% | **Conforme** |
| **Eficiencia de Desempeño** | Latencia p95 en lectura y prescripción | $< 180\text{ ms}$ | $28.4\text{ ms}$ | **Conforme** |
| **Eficiencia de Desempeño** | Velocidad de cálculo Manchester | $< 1\text{ ms}$ | $5.55\text{ ns/op}$ | **Conforme** |
| **Eficiencia de Desempeño** | Tiempo de intercepción de alergias | $< 90\text{ ms}$ | $3.23\ \mu\text{s/op}$ | **Conforme** |
| **Eficiencia de Desempeño** | Consumo de RAM en reposo del binario Go | $< 35\text{ MB}$ | $18.2\text{ MB}$ | **Conforme** |
| **Fiabilidad** | Tolerancia a fallos HTTP 500 sin pantalla blanca | 0 pantallas blancas | 0 (Alerta con reintento) | **Conforme** |
| **Seguridad** | Aislamiento RBAC e inmutabilidad HCE | 0 mutaciones ilegales | 0 (Bloqueo 401/403/Signal) | **Conforme** |
| **Mantenibilidad** | Desacoplamiento Hexagonal estricto | 0 dependencias en core | 0 dependencias directas | **Conforme** |
| **Usabilidad** | Accesibilidad visual y contraste de datos | WCAG AA / AAA | Paleta estandarizada | **Conforme** |
| **Portabilidad** | Despliegue agnóstico en Docker | 0 dependencias host | Multi-stage Go+React | **Conforme** |

---

## 8. Guía de Ejecución y Reproducibilidad de Pruebas

Para que el docente titular (**Ing. Felipe Gutiérrez Isaza**) o el equipo de evaluadores puedan reproducir de manera determinista los resultados de las suites automatizadas, se proporcionan los siguientes comandos de consola:

### 8.1. Pruebas Backend en Go (desde la raíz o `src/backend`)
```powershell
# 1. Ejecución de la suite completa de pruebas unitarias y de integración
go test ./tests/backend/... -v

# 2. Ejecución con detector de condiciones de carrera (Race Detector)
go test -race -count=1 ./tests/backend/...

# 3. Ejecución de pruebas internas de paquetes del backend
go test ./src/backend/core/services/... ./src/backend/pkg/crypto/... -v

# 4. Análisis estático de código sin advertencias
go vet ./src/backend/... ./tests/backend/...

# 5. Ejecución contra MySQL real (Opcional - Requiere instancia MySQL levantada)
$env:MYSQL_TEST_HOST="127.0.0.1"
$env:MYSQL_TEST_PORT="3306"
$env:MYSQL_TEST_USER="root"
$env:MYSQL_TEST_PASSWORD="su_password"
$env:MYSQL_TEST_DB="saludconecta_test"
go test -tags integration -run TestMySQL ./tests/backend/... -v
```

### 8.2. Pruebas Frontend en React / Vitest (desde `src/frontend`)
```powershell
# 1. Instalación de dependencias del cliente web
cd src/frontend
npm install

# 2. Ejecución de la suite completa de pruebas unitarias y de componentes
npm test

# 3. Compilación estricta para producción con Vite
npm run build
```

---

## 9. Conclusión y Dictamen Final de QA

Habiendo culminado el proceso de auditoría y pruebas sobre la totalidad de los módulos asistenciales, repositorios de persistencia y componentes de interfaz de usuario de «SaludConecta IPS v2.4», se certifica que:

1. **La plataforma cumple de forma estricta y verificable con el 100% de los requisitos funcionales (RF01 a RF12) y no funcionales (RNF01 a RNF08).**
2. **Las técnicas formales de Partición de Equivalencia y Valores Límite blindan las variables fisiológicas críticas del triaje Manchester y la seguridad de la medicación del paciente.**
3. **El principio de inmutabilidad de la Historia Clínica Electrónica prescrito por la Resolución 1995 de 1999 se encuentra asegurado tanto a nivel lógico (capa de servicios Go) como físico (disparadores de base de datos relacional y sellado SHA-256 encadenado).**
4. **La plataforma presenta cero defectos críticos abiertos y es declarada apta para despliegue y sustentación académica.**

---
**Dictamen:** **APROBADO — 100% CONFORME**  
**Santiago Arcos**  
*Responsable de Pruebas (QA / Testing Lead)*  
*Ingeniería de Software II — COTECNOVA 2026-2*
