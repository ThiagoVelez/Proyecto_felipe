# comando: reevaluación manual de la muestra de 53 requisitos de docs/calidad/05-auditoria-owasp-asvs-l2.md contra origin/main 6a51bb8
# fecha: 2026-11-24

# H-R4-25. Reevaluación de la muestra OWASP ASVS 4.0.3 nivel 2 (R1 -> R4)

## 1. Método

- **Base comparable:** exactamente las mismas filas de la sección 2 de `docs/calidad/05-auditoria-owasp-asvs-l2.md` (mismos ID, mismo orden, mismo resumen). No se agregó ni se quitó ningún requisito de la muestra.
- **Código evaluado:** `origin/main` = `HEAD` = `6a51bb8` (rama local `calidad/revision-r4`). Las rutas `archivo:línea` son relativas a la raíz del repositorio.
- **Escala (la del documento R1):** Cumple, Parcial, No cumple, N/A.
- **Fórmula (la del documento R1, sección 3):**
  - La muestra tiene **54 filas**; una es N/A (4.2.2). El documento llama «53 requisitos» a los aplicables (54 - 1 N/A). Se comprobó contando las filas: 18 Cumple + 18 Parcial + 17 No cumple + 1 N/A = 54.
  - **Cumplimiento estricto** = Cumple / 53 (aplicables). R1: 18 / 53 = 34,0 %.
  - **Cumplimiento ponderado** = (Cumple + 0,5 x Parcial) / 53. R1: (18 + 9) / 53 = 50,9 %.
  - En la tabla por capítulo de R1, «Evaluados» excluye el N/A (V4 = 7 aplicables con 8 filas). Se mantiene ese criterio.
- **Tipo de evidencia:**
  - **Verificado:** existe una prueba automatizada en `tests/backend` o `tests/frontend` que demuestra el estado (o la parte cumplida, cuando el estado es Parcial). Se cita la prueba.
  - **Revisado:** solo lectura de código o configuración. Cuando se indica «reproducido R4», el incumplimiento se confirmó además con una prueba temporal ejecutada fuera del repositorio (copia de `tests/backend` en un directorio temporal; no se agregó al repositorio). Salida de esas reproducciones en la sección 5.
- **Límites:** nginx, Docker y TLS no se ejecutaron en vivo; los estados de V14.4 se basan en la configuración (`src/frontend/nginx.conf`, `src/frontend/security-headers.conf`, `src/frontend/Dockerfile`), igual que en R1.

## 2. Tabla comparable (53 aplicables + 1 N/A)

### V2 Autenticación

| ID | Requisito (resumen) | R1 | R4 | Evidencia R4 (archivo:línea) | Tipo |
|---|---|---|---|---|---|
| 2.1.1 | Contraseñas de al menos 12 caracteres | No cumple | No cumple | `RegisterStaff` solo exige que no esté vacía (`src/backend/adapters/http/handlers/auth_handler.go:205`); TI y administradores, mínimo 8 (`auth_handler.go:289`). Solo el administrador inicial exige 12 (`src/backend/core/services/bootstrap.go:17,46`). | Revisado; reproducido R4 (alta de personal con contraseña de 1 carácter -> 201; administrador de sede con `12345678` -> 201) |
| 2.1.7 | Contraseñas contrastadas con listas de filtradas | No cumple | No cumple | No existe el control (ninguna lista ni consulta en `auth_service.go` ni en `auth_handler.go`). | Revisado |
| 2.2.1 | Controles contra fuerza bruta y automatización | No cumple | **Cumple** | Bloqueo por cuenta: 5 fallos en 15 min -> 15 min (`src/backend/core/services/attempt_tracker.go:9-11,55-75`), aplicado a contraseña y TOTP (`auth_service.go:128-155,461-472`). Límites por IP por ruta (`src/backend/adapters/http/router.go:76-111`); IP real solo desde proxies de confianza (`src/backend/pkg/config/config.go:164-169`, `src/backend/adapters/http/server.go:45-47`). | Verificado: `TestLoginBruteForceLockout`, `TestTOTPBruteForceLockout` (`tests/backend/auth_security_test.go:173,194`), `TestRateLimitUsesRealClientIPBehindProxy` (`:266`), `TestDEF15ProxiesDeConfianzaPorDefectoSoloLoopback` (`calidad_r3_cierre_backend_test.go:38`), `TestPortalLimitaEnviosPorIP` (`appointment_request_test.go:166`) |
| 2.3.1 | Contraseña inicial aleatoria y de vida corta | No cumple | **Parcial** | Ya no hay contraseña por defecto: el administrador inicial solo se crea con credenciales del operador y rechaza las de la plantilla (`bootstrap.go:27-48`). Pero la contraseña que fija el operador o el administrador al dar de alta personal se convierte en la definitiva: no se genera aleatoriamente ni se obliga a cambiarla (`auth_handler.go:197-263`). | Verificado (parte cumplida): `TestBootstrapAdminNeverUsesDefaults` (`auth_security_test.go:216`) |
| 2.4.1 | Almacenamiento con función unidireccional aprobada | Cumple | Cumple | Bcrypt (`src/backend/pkg/crypto/crypto.go:37-49`). | Revisado |
| 2.4.4 | Factor de trabajo de bcrypt adecuado | Cumple | Cumple | Coste 12 (`crypto.go:38`); el seeder ya no crea cuentas (único `GenerateFromPassword` del código: `crypto.go:38`). | Revisado |
| 2.5.4 | Sin cuentas compartidas ni por defecto | No cumple | **Cumple** | El almacén en memoria no siembra cuentas (`src/backend/adapters/storage/memory/memory_repos.go:52-77`); MySQL no inserta usuarios (`src/backend/database/schema.sql` sin `INSERT INTO users`); el administrador inicial exige credenciales propias (`bootstrap.go:36-48`). | Verificado: `TestMemoryStoreHasNoPublishedAccounts` (`auth_security_test.go:237`), `TestBootstrapAdminNeverUsesDefaults` (`:216`) |
| 2.8.1 | OTP basado en tiempo con vida definida | Cumple | Cumple | Paso de 30 s, ventana ±1 (`crypto.go:229-243`). | Verificado: `TestMFASetupRequiresCurrentCode` (`auth_security_test.go:139`, genera el TOTP con `crypto.GenerateTOTP`) |
| 2.8.4 | OTP de un solo uso dentro de su vigencia | No cumple | No cumple | `VerifyTOTP` no registra el último intervalo usado (`crypto.go:229-243`); un código vale ~90 s y puede reutilizarse. | Revisado |
| 2.10.4 | Secretos fuera del código fuente | Parcial | **Cumple** | `JWT_SECRET` obligatorio, ≥32 caracteres y distinto de los valores publicados (`config.go:16-25,66-79,157-159`); `docker-compose.yml:11,14,49,51` exige las credenciales por entorno (`${VAR:?}`); sin cuentas sembradas (DEF-11 y DEF-34 cerrados); SMTP por entorno (`src/backend/cmd/api/main.go:83-87`). | Verificado: `TestJWTSecretValidation` (`auth_security_test.go:244`), `TestDEF63PlantillaEnvNoEsSecretoValido` (`calidad_defectos_corregidos_v2_regression_test.go:269`), `TestDEF63EjemploDelREADMENoEsSecretoValido` (`calidad_revision_r3_regression_test.go:242`) |

### V3 Gestión de sesiones

| ID | Requisito (resumen) | R1 | R4 | Evidencia R4 (archivo:línea) | Tipo |
|---|---|---|---|---|---|
| 3.2.3 | Token almacenado en el navegador de forma segura | No cumple | **Cumple** | Token de acceso, de renovación y usuario en `sessionStorage` por pestaña (`src/frontend/src/services/session.js:10-51`, `src/frontend/src/services/api.js:27-46`); la sesión antigua de `localStorage` se migra y se borra (`session.js:55-68`). ASVS 3.2.3 admite expresamente *HTML5 session storage*. El riesgo residual ante XSS se trata en H-R4-17 (`61-sesion-xss-almacenamiento.md`). | Verificado: `tests/frontend/SessionPerTab.test.js:11,21,34`, `AuthMfa.test.jsx:204,237` |
| 3.3.1 | El cierre de sesión invalida el token | Parcial | Parcial | El *logout* revoca el token de renovación en el servidor (`auth_handler.go:139-148`, `src/backend/core/services/refresh_token_tracker.go:116-133`) y el cliente borra ambos (`api.js:165-178`, `src/frontend/src/App.jsx:269-281`). El token de acceso JWT sigue aceptado hasta que expira (15 min, `config.go:125`): no hay lista de revocación. | Verificado (parte cumplida): `AuthMfa.test.jsx:237`; reproducido R4: `GET /auth/me` con el token de acceso después del *logout* -> 200, y el *refresh* revocado -> 401 |
| 3.3.2 | Reautenticación periódica e invalidación por inactividad | Parcial | **No cumple** | Acceso 15 min + renovación 7 días (`config.go:125-126`, `.env.example:14-15`). Cada renovación emite un token nuevo con otros 7 días (`auth_service.go:213-219`), por lo que una pestaña abierta mantiene la sesión sin límite absoluto; la inactividad tolerada en el servidor es de 7 días. ASVS L2 exige reautenticación a las 12 h o a los 30 min de inactividad. No hay temporizador de inactividad en el cliente (búsqueda sin resultados en `src/frontend/src`). En R1 había al menos una expiración absoluta de 8 h. | Revisado |
| 3.3.4 | El usuario puede ver y cerrar sus sesiones activas | No cumple | No cumple | No existe la función; `RevokeAllForUser` solo se invoca internamente (`refresh_token_tracker.go:99-113`, `auth_service.go:189,199,204`). | Revisado |
| 3.5.2 | Tokens de sesión en lugar de secretos estáticos | Cumple | Cumple | JWT por usuario con `jti` aleatorio (`crypto.go:98-135`). | Verificado: `TestDualTokenLoginAndRefreshFlow` (`auth_security_test.go:297`) |
| 3.5.3 | Tokens sin estado firmados contra manipulación | Cumple | Cumple | HS256 con verificación del algoritmo y del tipo de token (`crypto.go:143-184`); secreto validado (`config.go:66-79`). | Verificado: `TestDualTokenLoginAndRefreshFlow` (`auth_security_test.go:297`), `TestJWTSecretValidation` (`:244`) |
| 3.7.1 | Sesión completa o reautenticación antes de operaciones sensibles | No cumple | **Parcial** | La rotación del MFA exige el código vigente (`auth_service.go:480-488`, DEF-14 cerrado). Pero `GET /api/v1/auth/mfa-seed?email=` entrega, sin reautenticación ni comprobación de titularidad, la semilla TOTP vigente de cualquier cuenta (`auth_handler.go:417-436`, `auth_service.go:410-421`). | Verificado (parte cumplida): `TestMFASetupRequiresCurrentCode` (`auth_security_test.go:139`), `TestDEF14SetupMFANoDesactivaSegundoFactor` (`calidad_defectos_corregidos_v2_regression_test.go:114`); reproducido R4 (incumplimiento) |

### V4 Control de acceso

| ID | Requisito (resumen) | R1 | R4 | Evidencia R4 (archivo:línea) | Tipo |
|---|---|---|---|---|---|
| 4.1.1 | Control de acceso aplicado en el servidor | Cumple | Cumple | `RequireRoles` en cada ruta protegida (`router.go:105-290`). | Verificado: `TestRBACMatrizRutasPorRol` (`rbac_matrix_regression_test.go:19`), `TestPanelTIRestringidoAlRolTI` (`ti_setup_test.go:232`) |
| 4.1.2 | Atributos de control de acceso no manipulables | Cumple | Cumple | El rol efectivo es el almacenado, no el del token (`src/backend/adapters/http/middlewares/auth_middleware.go:49-66`). | Verificado: `TestRoleComesFromStoreNotToken` (`auth_security_test.go:128`), `TestDeactivatedUserLosesAccessImmediately` (`:103`) |
| 4.1.3 | Mínimo privilegio | Parcial | Parcial | RBAC por ruta correcto, pero el usuario de base de datos conserva DDL (la migración ejecuta `ALTER TABLE` al arrancar: `src/backend/adapters/storage/mysql/seeder.go:84,103`; `MYSQL_USER` recibe todos los privilegios sobre la base en `docker-compose.yml:13-14`), y cualquier rol autenticado consulta semillas MFA ajenas (`router.go:109`). | Revisado |
| 4.1.5 | Fallo seguro del control de acceso | Cumple | Cumple | 403 si falta el rol (`src/backend/adapters/http/middlewares/rbac_middleware.go:10-35`); sin validador de sesión se rechaza todo (`auth_middleware.go:45-47`). | Verificado: `TestRBACMatrizRutasPorRol` (`rbac_matrix_regression_test.go:19`) |
| 4.2.1 | Protección contra IDOR | No cumple | **Parcial** | Corregido: cierre de folios ajenos (DEF-17), agenda propia (DEF-69), órdenes de laboratorio propias (`src/backend/core/services/lab_nursing_service.go:258-260`), notas anatómicas y publicaciones del autor. Persisten: cualquier MEDICO lee la historia de cualquier paciente sin relación asistencial (`src/backend/adapters/http/handlers/clinical_record_handler.go:179-186`) y cualquier usuario autenticado lee la semilla TOTP de otra cuenta por correo (`auth_handler.go:424-425`). | Verificado (parte cumplida): `TestDEF17MedicoNoCierraFolioAjeno` (`calidad_defectos_corregidos_v2_regression_test.go:186`), `TestRecordObjectLevelAccess` (`clinical_chain_test.go:65`), `TestDEF69AgendaSoloDelMedicoDeLaSesion` (`calidad_r3_cierre_backend_test.go:346`), `TestAnatomicalNotesDoctorOwnership` (`anatomical_notes_test.go:164`), `TestDEF70PublicacionSoloLaEditaSuAutor` (`calidad_defectos_abiertos_regression_test.go:387`); reproducido R4 (semilla ajena) |
| 4.2.2 | Protección CSRF | N/A | N/A | Sigue siendo `Authorization: Bearer` desde `sessionStorage` (`api.js:55-56`); no hay *cookies* de sesión. | Revisado |
| 4.3.1 | MFA en interfaces administrativas | No cumple | **Parcial** | TI y administradores registrados por el flujo nuevo nacen con MFA activo (`auth_service.go:280-295,368-378`). Pero el administrador inicial se crea sin MFA (`bootstrap.go:56-69`), el inicio de sesión no exige MFA por rol (`auth_service.go:148-156`) y `SetupMFA` deja `MFAEnabled=false` hasta confirmar (`auth_service.go:495`). | Verificado (parte cumplida): `TestRegistroTIUnicoDesdeElLogin` (`ti_setup_test.go:104`, comprueba `MFAEnabled` en `:111`) |
| 4.3.2 | Sin listado de directorios ni metadatos | Cumple | Cumple | nginx sin `autoindex`, SPA con `try_files` (`src/frontend/nginx.conf:42-44`); el *build* no publica *source maps* (sin `sourcemap` en `src/frontend/vite.config.js`). | Revisado (configuración, no en ejecución) |

### V5 Validación, saneamiento y codificación

| ID | Requisito (resumen) | R1 | R4 | Evidencia R4 (archivo:línea) | Tipo |
|---|---|---|---|---|---|
| 5.1.3 | Validación positiva de todas las entradas | Parcial | Parcial | Portal público con validación completa (longitudes, catálogos, correo, teléfono: `src/backend/core/services/appointment_request_service.go:68-102`); signos vitales y Manchester validados. Sin validar el formato del correo ni la longitud máxima de la contraseña en el registro de personal, TI y administradores (`auth_handler.go:205,281-317`); URL del muro sin lista de esquemas (`src/backend/core/domain/health_education.go:59-80`). | Verificado (parte cumplida): `TestSolicitudValidaDatosYConsentimiento` (`appointment_request_test.go:143`), `TestTriageRejectsImplausibleVitals` (`triage_security_test.go:94`), `TestDEF08NivelManchesterFueraDelCatalogo` |
| 5.1.4 | Datos estructurados con tipado y validación | Parcial | Parcial | La sincronización ya usa un DTO propio (`src/backend/adapters/http/handlers/sync_handler.go:21,48-62`, DEF-18 cerrado). Sigue sin esquema con longitudes ni patrones para los textos clínicos y de registro. | Verificado (parte cumplida): `TestDEF18SincronizacionUsaMedicoAutenticado` (`calidad_defectos_corregidos_v2_regression_test.go:202`) |
| 5.3.3 | Codificación de salida contextual (XSS) | Cumple | Cumple | Sin `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function` ni `document.write` en `src/frontend/src`; el muro renderiza texto con React (`src/frontend/src/screens/MedicalKitScreen.jsx:569-581`). | Revisado |
| 5.3.4 | Consultas parametrizadas | Cumple | Cumple | Repositorios con `?` / `$n`; el único `Sprintf` en SQL usa un nombre de índice constante (`seeder.go:103`). | Revisado |

### V7 Manejo de errores y registro

| ID | Requisito (resumen) | R1 | R4 | Evidencia R4 (archivo:línea) | Tipo |
|---|---|---|---|---|---|
| 7.1.1 | No registrar credenciales ni tokens | Cumple | Cumple | El registro HTTP no incluye cabeceras ni cuerpos ni la consulta (`src/backend/adapters/http/middlewares/audit_middleware.go:45-52`). | Revisado |
| 7.1.2 | No registrar otros datos sensibles | Cumple | **Parcial** | El backend no registra datos clínicos y enmascara correos (DEF-62). Pero las rutas nuevas llevan datos personales en la consulta: `GET /patients/lookup?document_type=&document_number=` (`src/backend/adapters/http/handlers/patient_handler.go:113-114`, llamada en `api.js:302-304`), `GET /pharmacy/prescriptions/lookup?term=` con documento (`pharmacy_handler.go:108-113`) y `GET /auth/mfa-seed?email=`. nginx no redefine `access_log` (`nginx.conf`), así que el formato `combined` registra la URI completa con la cédula. | Verificado (parte cumplida): `TestDEF62RetencionDeDocumentosYCorreoEnmascarado` (`calidad_r3_cierre_backend_test.go:165`); incumplimiento revisado |
| 7.1.3 | Registrar eventos de seguridad | Parcial | Parcial | Se persisten mutaciones y lecturas sensibles exitosas, incluidas v2 (`audit_middleware.go:54-110`); las lecturas rechazadas (401/403 en GET) solo van a la salida estándar (`audit_middleware.go:57`). | Verificado (parte cumplida): `TestDEF71LecturasV2QuedanAuditadas` (`calidad_r3_cierre_backend_test.go:362`) |
| 7.1.4 | Información suficiente para la línea de tiempo | Cumple | Cumple | UTC, usuario, rol, IP, recurso y *correlation id* (`audit_middleware.go:79-92`). | Verificado: `TestDEF28AuditoriaConservaDatosTrasFinalizarPeticion` (`auditoria_concurrencia_regression_test.go:49`) |
| 7.2.1 | Registrar todas las decisiones de autenticación | Parcial | Parcial | El *login* se persiste como acción LOGIN con el código HTTP (`auth_handler.go:45`); sin motivo del rechazo ni cuenta intentada en los fallos (`user_id` nulo). | Revisado |
| 7.3.1 | Codificación que impida la inyección en registros | Cumple | Cumple | JSON y `X-Correlation-ID` validado como UUID (`audit_middleware.go:17-31`). | Verificado: `TestDEF41CorrelationIDSoloAceptaUUID` (`correlacion_id_regression_test.go:15`) |
| 7.3.3 | Registros protegidos contra modificación | Parcial | Parcial | Disparadores de inmutabilidad solo en `clinical_records` y aclaraciones (`seeder.go:110-147`); `audit_logs` sigue sin protección. | Revisado (`TestMySQLDisparadoresDeInmutabilidad` cubre folios, no la bitácora) |
| 7.3.4 | Fuente de tiempo UTC | Cumple | Cumple | `time.Now().UTC()` (`audit_middleware.go:91`). | Revisado |
| 7.4.1 | Mensaje genérico con identificador ante errores | Parcial | Parcial | `ErrorHandler` devuelve `err.Error()` junto al `correlation_id` (`server.go:48-57`). | Revisado |

### V8 Protección de datos

| ID | Requisito (resumen) | R1 | R4 | Evidencia R4 (archivo:línea) | Tipo |
|---|---|---|---|---|---|
| 8.2.1 | Cabeceras anti-caché en datos sensibles | No cumple | No cumple | Ni el backend ni nginx envían `Cache-Control: no-store` (búsqueda `no-store` sin resultados en `src/` fuera de `node_modules`); `location /api/` no añade cabeceras de caché (`nginx.conf:19-32`). | Revisado |
| 8.2.2 | Sin datos sensibles en el almacenamiento del navegador | No cumple | **Parcial** | Ya no quedan datos clínicos (enfermería, laboratorio y farmacia en el servidor; claves heredadas purgadas: `session.js:72-88`). Persisten datos personales del funcionario: objeto usuario con `document_number`, `phone`, `email` en `sessionStorage` (`api.js:35`, `App.jsx:105`) y perfil (teléfono, biografía, turno, sede, foto) en `localStorage` (`src/frontend/src/components/UserProfileModal.jsx:240-242`, `src/frontend/src/screens/ProfileScreen.jsx:182,210-212`). Detalle en `61-sesion-xss-almacenamiento.md`. | Verificado (parte cumplida): `SessionPerTab.test.js:11`; incumplimiento revisado |
| 8.2.3 | Datos del cliente borrados al cerrar sesión | Parcial | Parcial | El *logout* borra las claves de sesión y purga las clínicas heredadas (`App.jsx:269-281`, `session.js:76-85`); quedan `saludconecta_profile_<usuario>` y `saludconecta_avatar_<usuario>` en `localStorage`, que no están en la lista de purga (`session.js:72-74`). | Verificado (parte cumplida): `AuthMfa.test.jsx:237` |
| 8.3.1 | Datos sensibles en el cuerpo o cabeceras, no en la URL | Cumple | **Parcial** | Rutas nuevas con número de documento o correo en la consulta: `patient_handler.go:113-114` (`api.js:302-304`), `pharmacy_handler.go:108-113` (`api.js:714-715`), `auth_handler.go:424` (`api.js:205-206`). | Revisado |
| 8.3.4 | Datos sensibles identificados y con política | Parcial | Parcial | Hay retención de copias locales de PDF y correos (`config.go:138-143`, DEF-62) y consentimiento Ley 1581 en el portal; sigue sin clasificación de datos ni política de retención de la base clínica. | Verificado (parte cumplida): `TestDEF62RetencionDeDocumentosYCorreoEnmascarado` (`calidad_r3_cierre_backend_test.go:165`) |

### V14 Configuración

| ID | Requisito (resumen) | R1 | R4 | Evidencia R4 (archivo:línea) | Tipo |
|---|---|---|---|---|---|
| 14.1.1 | Build y despliegue seguros y repetibles | Parcial | Parcial | Dockerfiles multietapa y pipeline `.github/workflows/calidad.yml`; sin despliegue automatizado. La imagen del backend usa `golang:1.22-alpine` sin versión de parche (`src/backend/Dockerfile:7`). | Revisado |
| 14.2.1 | Componentes sin vulnerabilidades conocidas | No cumple | No cumple | govulncheck: 1 vulnerabilidad alcanzable de la biblioteca estándar (GO-2026-6859, `net/http`, corregida en go1.27.4) con el *toolchain* local go1.27.3 (`docs/calidad/anexos/evidencias/r4/07-govulncheck.txt`, salida 3). La imagen de producción compila con Go 1.22 (`src/backend/Dockerfile:7`), rama sin soporte. `npm audit --omit=dev`: 0 (`r4/22-npm-audit-prod.txt`). | Revisado (evidencia de herramienta r4/07 y r4/22) |
| 14.2.2 | Funciones, ejemplos y datos de demostración eliminados | No cumple | **Parcial** | Sin cuentas de demostración (DEF-11 cerrado). Persisten el modo `DB_DRIVER=memory` sin bloqueo en producción (solo un aviso: `main.go:67-69`) y el catálogo e inventario de demostración sembrados (`seeder.go:242-264`, `memory_repos.go:79-91`, `src/backend/adapters/storage/catalog/demo_medications.go`). | Verificado (parte cumplida): `TestMemoryStoreHasNoPublishedAccounts` (`auth_security_test.go:237`) |
| 14.3.2 | Modos de depuración desactivados | Parcial | Parcial | PostgreSQL mixto exige autorización explícita (`src/backend/adapters/storage/factory.go:160-166`, DEF-10); el modo memoria sigue seleccionable con `APP_ENV=production`. | Verificado (parte cumplida): `TestDEF10PostgresNoArrancaEnModoMixtoSinAutorizacion` (`calidad_r3_cierre_backend_test.go:107`) |
| 14.3.3 | Sin versión detallada en las respuestas | Parcial | Parcial | `/health` publica «SaludConecta IPS v2.4» (`router.go:46-48`); nginx no declara `server_tokens off` (`nginx.conf`), por lo que la cabecera `Server` del *frontend* muestra la versión de nginx. | Revisado |
| 14.4.3 | Content-Security-Policy | No cumple | **Cumple** | CSP en todas las respuestas de nginx (`src/frontend/security-headers.conf:12`, incluida en el nivel `server` y en la `location` de activos: `nginx.conf:16,37`): `script-src 'self'` sin `'unsafe-inline'` ni `'unsafe-eval'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`. El `index.html` compilado solo carga un *script* externo (`src/frontend/dist/index.html`). Residual: `style-src 'unsafe-inline'` e `img-src https:`. | Revisado (configuración, no en ejecución; sin prueba automatizada) |
| 14.4.4 | `X-Content-Type-Options: nosniff` | Parcial | **Cumple** | `security-headers.conf:3`, en el nivel `server` (heredado por `/api/` y `/`) y repetido en la `location` de activos (`nginx.conf:16,37`), que era la que lo anulaba (DEF-35). | Revisado (configuración) |
| 14.4.5 | HSTS | No cumple | **Parcial** | La cabecera existe (`security-headers.conf:15`), pero nginx solo escucha en HTTP (`nginx.conf:2`) y el repositorio no incluye terminación TLS; por HTTP el navegador la ignora. | Revisado (configuración) |
| 14.4.6 | `Referrer-Policy` | Parcial | **Cumple** | `security-headers.conf:5`, mismo alcance que 14.4.4. | Revisado (configuración) |
| 14.4.7 | Protección contra *framing* | Parcial | **Cumple** | `X-Frame-Options: SAMEORIGIN` (`security-headers.conf:4`) y `frame-ancestors 'self'` en la CSP (`:12`), en todas las respuestas. | Revisado (configuración) |
| 14.5.3 | CORS con lista de orígenes | Cumple | Cumple | Lista explícita (`server.go:64-73`, `docker-compose.yml:52`). | Revisado |

## 3. Cumplimiento calculado R4 (misma fórmula que R1)

| Capítulo | Evaluados (aplicables) | Cumple | Parcial | No cumple | N/A | Estricto R1 | Estricto R4 |
|---|---|---|---|---|---|---|---|
| V2 | 10 | 6 | 1 | 3 | 0 | 30,0 % | 60,0 % |
| V3 | 7 | 3 | 2 | 2 | 0 | 28,6 % | 42,9 % |
| V4 | 7 | 4 | 3 | 0 | 1 | 57,1 % | 57,1 % |
| V5 | 4 | 2 | 2 | 0 | 0 | 50,0 % | 50,0 % |
| V7 | 9 | 4 | 5 | 0 | 0 | 55,6 % | 44,4 % |
| V8 | 5 | 0 | 4 | 1 | 0 | 20,0 % | 0,0 % |
| V14 | 11 | 5 | 5 | 1 | 0 | 9,1 % | 45,5 % |
| **Total** | **53** | **24** | **22** | **7** | **1** | **34,0 %** | **45,3 %** |

- Comprobación: 24 + 22 + 7 + 1 = 54 filas; 54 - 1 N/A = 53 aplicables.
- **Cumplimiento estricto R4** = 24 / 53 = **45,3 %** (45,28 %).
- **Cumplimiento ponderado R4** = (24 + 0,5 x 22) / 53 = 35 / 53 = **66,0 %** (R1: 50,9 %).
- **Comparación: R1 34,0 % -> R4 45,3 %** (+11,3 puntos; +6 requisitos «Cumple» netos).

### Requisitos que cambiaron de estado (19)

| ID | R1 -> R4 | Sentido | Causa |
|---|---|---|---|
| 2.2.1 | No cumple -> Cumple | Mejora | Bloqueo por cuenta y límites por IP con IP real |
| 2.3.1 | No cumple -> Parcial | Mejora | Sin contraseña por defecto; falta forzar el cambio |
| 2.5.4 | No cumple -> Cumple | Mejora | Sin cuentas sembradas (DEF-11) |
| 2.10.4 | Parcial -> Cumple | Mejora | Secretos solo por entorno (DEF-11, DEF-34) |
| 3.2.3 | No cumple -> Cumple | Mejora | `sessionStorage` por pestaña |
| 3.3.2 | Parcial -> No cumple | **Regresión** | Renovación deslizante de 7 días sin límite absoluto |
| 3.7.1 | No cumple -> Parcial | Mejora | Rotación del MFA exige el factor vigente; queda `mfa-seed` |
| 4.2.1 | No cumple -> Parcial | Mejora | DEF-17 y propiedad de recursos v2; queda historia sin relación y `mfa-seed` |
| 4.3.1 | No cumple -> Parcial | Mejora | MFA obligatorio al registrar TI y administradores; no para el administrador inicial |
| 7.1.2 | Cumple -> Parcial | **Regresión** | Cédula y correo en la consulta de rutas nuevas, registrados por nginx |
| 8.2.2 | No cumple -> Parcial | Mejora | Sin datos clínicos en el navegador; quedan datos personales del funcionario |
| 8.3.1 | Cumple -> Parcial | **Regresión** | Rutas nuevas con documento o correo en la URL |
| 14.2.2 | No cumple -> Parcial | Mejora | Sin cuentas demo; quedan modo memoria y catálogo de demostración |
| 14.4.3 | No cumple -> Cumple | Mejora | CSP sin `unsafe-inline` en `script-src` |
| 14.4.4 | Parcial -> Cumple | Mejora | `nosniff` en todas las `location` (DEF-35) |
| 14.4.5 | No cumple -> Parcial | Mejora | Cabecera HSTS presente; sin TLS en el repositorio |
| 14.4.6 | Parcial -> Cumple | Mejora | `Referrer-Policy` en todas las respuestas |
| 14.4.7 | Parcial -> Cumple | Mejora | `X-Frame-Options` y `frame-ancestors` en todas las respuestas |
| 4.1.3, 5.1.4, 3.3.1 | sin cambio de estado | - | Evidencia actualizada, mismo estado |

(16 mejoras y 3 regresiones; la última fila no cuenta como cambio.)

- Verificados (con prueba automatizada que respalda el estado o su parte cumplida): 26 de 54 filas. Revisados solo por lectura (algunos con reproducción temporal R4): 28. Ningún «Cumple» de V14.4 tiene prueba automatizada: todo el capítulo depende de la configuración de nginx sin ejecución.

## 4. Requisitos ASVS L2 adicionales para los módulos nuevos (fuera del porcentaje comparable)

No forman parte de la muestra de R1 y **no se suman** al 45,3 %. Módulos: registro del Encargado de TI y de administradores de sede desde el *login*, portal público del paciente y `POST /api/v1/public/appointment-requests`, envío de resultados de laboratorio por correo.

| ID ASVS | Requisito (resumen) | Módulo | Estado R4 | Evidencia (archivo:línea) | Tipo |
|---|---|---|---|---|---|
| 2.1.2 | Se permiten contraseñas de al menos 64 caracteres y se rechazan las de más de 128 | Registro TI y administrador de sede | Parcial | No hay longitud máxima validada (`auth_handler.go:286-291`); bcrypt de `golang.org/x/crypto v0.24.0` rechaza más de 72 bytes y el servicio responde 500 genérico (`auth_handler.go:348-349`). Una contraseña de 64 caracteres ASCII se acepta; una de 100 no. | Revisado; reproducido R4 (100 caracteres -> 500 «No fue posible registrar al administrador de la sede») |
| 2.8.3 | Algoritmos aprobados para generar y sembrar OTP | Registro TI / administradores | Parcial | Semillas de alta con `crypto/rand` de 160 bits (`crypto.go:187-193`). Pero `GetMFASeed` deriva una semilla determinista del SHA-256 del correo para cuentas inexistentes (`auth_service.go:431-441`) y entrega la semilla vigente de cuentas existentes a cualquier usuario autenticado (`auth_service.go:418-421`). | Revisado; reproducido R4 (ENFERMERO obtiene la semilla de un ADMIN: 200) |
| 4.3.3 | Segregación de funciones en operaciones de alto valor | Registro de administradores | Cumple | El administrador de sede registrado desde el *login* nace pendiente y solo lo aprueba el Encargado de TI (`auth_service.go:384-406`); los adicionales solo los crea TI (`router.go:108`); un administrador no suspende a TI. | Verificado: `TestRegistroAdministradorPorSedeQuedaPendienteDeAprobacion` (`ti_setup_test.go:178`), `TestAdministradoresAdicionalesSoloLosRegistraTI` (`:214`), `TestAdministradorNoPuedeSuspenderAlEncargadoDeTI` (`:280`) |
| 5.2.3 | Saneamiento de la entrada hacia el sistema de correo (inyección SMTP) | Envío de resultados de laboratorio | Cumple | El destinatario debe coincidir exactamente con su forma analizada por `mail.ParseAddress` (`lab_nursing_service.go:248-251`); asunto con el ID generado por el servidor (`:264`). | Revisado (`TestLaboratorioGuardaAvanceSellaYEnviaPorCorreo`, `lab_nursing_branch_test.go:102`, cubre el envío, no la inyección) |
| 8.3.3 | Información clara y consentimiento para datos personales | Portal público | Cumple | Consentimiento Ley 1581 obligatorio (`appointment_request_service.go:78-80`, mensaje en `appointment_request_handler.go`). | Verificado: `TestSolicitudValidaDatosYConsentimiento` (`appointment_request_test.go:143`) |
| 8.3.5 | Acceso a datos sensibles auditado | Solicitudes de cita y laboratorio | Cumple | `/appointment-requests` y `/lab-orders` en los marcadores de lectura sensible (`audit_middleware.go:106-110`); las mutaciones se registran siempre. | Verificado: `TestDEF71LecturasV2QuedanAuditadas` (`calidad_r3_cierre_backend_test.go:362`) |
| 9.1.1 | TLS en toda la conectividad del cliente | Portal público (datos personales sin sesión) | No cumple | nginx solo escucha en `80` (`nginx.conf:2`); el repositorio no incluye certificado ni terminación TLS; la HSTS se ignora por HTTP. | Revisado (configuración) |
| 9.2.2 | Conexiones cifradas a sistemas externos (BD, correo) | Todos; correo de resultados | No cumple | MySQL sin parámetro `tls` en el DSN (`src/backend/adapters/storage/mysql/connection.go:27`); PostgreSQL con `sslmode` fijo `disable` (`factory.go:182`, `src/backend/adapters/storage/postgres/connection.go:28-31`); SMTP con `smtp.SendMail`, STARTTLS solo oportunista (`src/backend/adapters/email/smtp.go:118-120`). | Revisado |
| 11.1.4 | Controles anti-automatización contra abuso de la lógica de negocio | Portal público y registros públicos | Parcial | Límite por IP: 5/min para solicitudes de cita (`router.go:102`), 10/min para registros (`router.go:88-91`). Sin CAPTCHA, cuota global ni deduplicación por documento: desde varias IP se puede llenar la bandeja de los médicos o la lista de administradores pendientes de TI. `setup-status` es público y revela si existe TI y qué sedes no tienen administrador (`router.go:89`). | Verificado (parte cumplida): `TestPortalLimitaEnviosPorIP` (`appointment_request_test.go:166`) |
| 11.1.6 | Sin problemas de concurrencia en flujos de negocio | Registro TI y administrador de sede | Cumple | `setupMu` serializa los registros públicos (`auth_service.go:30-32,357-358,394-395`). Límite: es un mutex de proceso; con varias réplicas no protege. | Verificado: `TestRegistroTIConcurrenteCreaSoloUno` (`ti_setup_test.go:153`) |

Conteo de la tabla adicional (informativo, no comparable): 5 Cumple, 3 Parcial, 2 No cumple.

## 5. Reproducciones temporales R4 (fuera del repositorio)

Se copió `tests/backend` a un directorio temporal, se agregó un archivo de prueba propio con el mismo entorno `newCalidadEnv` (cableado de `cmd/api/main.go` sobre memoria) y se ejecutó `go test -count=1 -run TestR4 -v` con `GOWORK=off`. No se modificó `tests/` ni `src/`. Salida relevante:

```
zz_r4_repro_test.go:48: estado=200 contiene_semilla_del_admin=true
zz_r4_repro_test.go:64: login estado=200
zz_r4_repro_test.go:66: logout estado=200
zz_r4_repro_test.go:68: GET /auth/me con el token de acceso tras logout: estado=200
zz_r4_repro_test.go:70: refresh con el token de renovacion tras logout: estado=401
zz_r4_repro_test.go:82: alta de personal con contrasena de 1 caracter: estado=201
zz_r4_repro_test.go:86: setup-status publico: {"ti_registered":false,"ti_setup_enabled":true,"branches":[{"name":"Sede Cartago - Hospital Central","has_admin":false}, ...]}
zz_r4_repro_test.go:90: alta publica de administrador de sede con contrasena 12345678: estado=201 devuelve_mfa_secret=true
zz_r4_repro_test.go:99: contrasena de 100 caracteres: estado=500 cuerpo={"error":"No fue posible registrar al administrador de la sede"}
ok  	saludconecta-tests	2.292s
```

- R4-A (semilla ajena): un ENFERMERO autenticado llama `GET /api/v1/auth/mfa-seed?email=<correo del ADMIN>` y recibe la semilla TOTP vigente del ADMIN.
- R4-B (*logout*): el token de renovación queda revocado (401), el de acceso sigue aceptado (200).
- R4-C/D (contraseñas): 1 carácter aceptado en el alta de personal; 8 en el registro público; 100 caracteres -> 500.

## 6. Hallazgos de seguridad nuevos o no cubiertos por defectos cerrados

| # | Hallazgo | Evidencia | Severidad sugerida |
|---|---|---|---|
| N1 | Semilla TOTP de cualquier cuenta legible por cualquier usuario autenticado (IDOR residual de DEF-50: la corrección solo exigió sesión). Anula el segundo factor de ADMIN y TI ante una contraseña filtrada. | `auth_handler.go:417-436`, `auth_service.go:410-421`, `router.go:109` | Alta |
| N2 | Sesión sin límite absoluto: cada renovación emite otros 7 días; sin cierre por inactividad. | `auth_service.go:213-219`, `config.go:125-126` | Media |
| N3 | Longitud mínima de contraseña: 1 carácter en el alta de personal, 8 en TI y administradores (ASVS pide 12). | `auth_handler.go:205,289` | Media |
| N4 | Resultados de laboratorio enviados a cualquier correo que indique quien llama, sin contrastarlo con el correo registrado del paciente. | `lab_nursing_service.go:247-251,269` | Media |
| N5 | Solicitud pública con la cédula de otra persona: al agendar, si el paciente existente no tiene correo, se le asigna el correo del solicitante, que recibirá las comunicaciones posteriores. | `appointment_request_service.go:228-243` | Media |
| N6 | Cédula y correo en la cadena de consulta (registrados por nginx). | `patient_handler.go:113-114`, `pharmacy_handler.go:108-113`, `api.js:302-304,714-715` | Media |
| N7 | El administrador inicial nace sin MFA y el *login* no exige MFA por rol. | `bootstrap.go:56-69`, `auth_service.go:148-156` | Media |
| N8 | Conexiones a la base de datos sin TLS (MySQL sin `tls`, PostgreSQL `sslmode=disable` fijo). | `mysql/connection.go:27`, `factory.go:182` | Media |
| N9 | Token de acceso válido hasta 15 min tras el *logout*. | `auth_handler.go:139-148`, `crypto.go:143-152` | Baja |
| N10 | `setup-status` público revela si existe TI y qué sedes carecen de administrador; registro de administradores pendientes sin CAPTCHA. | `router.go:87-91`, `auth_service.go:327-345` | Baja |
| N11 | Imagen de Go de producción en una rama sin soporte (`golang:1.22-alpine`). | `src/backend/Dockerfile:7` | Media |
