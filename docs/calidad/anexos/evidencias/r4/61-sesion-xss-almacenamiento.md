# comando: revisión manual de la sesión, la CSP, los sumideros XSS y el almacenamiento del navegador del frontend contra origin/main 6a51bb8
# fecha: 2026-11-24

# H-R4-17 (sesión y XSS) y H-R4-16 (datos clínicos en el navegador)

Código evaluado: `origin/main` = `HEAD` = `6a51bb8`. Rutas relativas a la raíz del repositorio. Formulación usada para cada hipótesis:

- **H-R4-16:** «el frontend todavía guarda datos clínicos en `localStorage` o `sessionStorage`» (el README, RF16, afirma que las notas de enfermería se guardan en `localStorage`).
- **H-R4-17:** «la sesión del frontend es robable o reutilizable: los tokens están al alcance de un XSS y la configuración no lo impide».

Búsquedas ejecutadas (todas sobre `src/frontend/src`, sin `node_modules`):

- `localStorage|sessionStorage` y `setItem` (lista completa en la sección 4).
- `dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|eval\(|new Function|document\.write`: **0 resultados**.
- `indexedDB|caches\.|serviceWorker|workbox`: 0 resultados de código (solo un texto descriptivo en `src/frontend/src/services/branches.js:36`).
- `href=\{|window\.open\(|location\.href\s*=|\.href\s*=`: 1 resultado, `src/frontend/src/utils/clinical.js:141` (descarga de un *blob* generado por la propia aplicación).

## 1. Dónde se guardan los tokens y cuánto duran

| Elemento | Ubicación | Evidencia |
|---|---|---|
| Token de acceso (`saludconecta_token`) | `sessionStorage` (por pestaña) | `src/frontend/src/services/session.js:10-51`; escritura en `src/frontend/src/services/api.js:34` |
| Token de renovación (`saludconecta_refresh_token`) | `sessionStorage` | `api.js:36-40` |
| Usuario (`saludconecta_user`: id, nombre, documento, correo, teléfono, rol, sede, MFA) | `sessionStorage` | `api.js:35`, `src/frontend/src/App.jsx:105`; contenido en `src/backend/adapters/http/handlers/auth_handler.go:151-167` |
| Sesión antigua en `localStorage` | Se migra a la pestaña una vez y se borra | `session.js:55-68` |
| Envío al servidor | Cabecera `Authorization: Bearer` (no hay *cookies*) | `api.js:55-56` |

Vigencias en el backend:

- `JWT_ACCESS_TTL_MINUTES`: por defecto **15 min** (`src/backend/pkg/config/config.go:125,145-150`; `.env.example:14`).
- `JWT_REFRESH_TTL_HOURS`: por defecto **168 h = 7 días** (`config.go:126,151-155`; `.env.example:15`).
- `docker-compose.yml` no pasa ninguna de las dos variables al contenedor del backend (`docker-compose.yml:41-59`), así que en el despliegue documentado rigen los valores por defecto. No hay tope superior: un operador puede fijar cualquier valor positivo.
- Rotación: cada `POST /auth/refresh` consume el `jti` y emite otro token de renovación con **7 días nuevos** (`src/backend/core/services/auth_service.go:181-228`); la reutilización de un token ya rotado revoca todas las sesiones del usuario (`auth_service.go:187-191`, `src/backend/core/services/refresh_token_tracker.go:69-97`). Consecuencia: mientras la pestaña haga al menos una petición cada 7 días, la sesión no expira nunca (sin límite absoluto ni cierre por inactividad; en el cliente no existe temporizador de inactividad).
- El registro de tokens de renovación vive en memoria del proceso (`refresh_token_tracker.go:13-21`): un reinicio del backend invalida todas las renovaciones (falla cerrado).

### Qué pasa al cerrar la pestaña

1. El navegador descarta el `sessionStorage` de la pestaña: token de acceso, de renovación y usuario desaparecen del cliente. No hay manejador `pagehide`/`beforeunload` que llame a `/auth/logout` (búsqueda sin resultados), así que el token de renovación **sigue activo en el servidor** hasta 7 días o hasta el próximo reinicio del backend. Solo es aprovechable por quien ya lo hubiera copiado.
2. Lo que queda en el equipo tras cerrar la pestaña: las claves de `localStorage` de la sección 4 (perfil y foto del funcionario, preferencia de la barra lateral). Ningún token.
3. Comportamiento de los navegadores (documentado por los fabricantes; **no ejecutado** en esta revisión): «reabrir pestaña cerrada» y la restauración de sesión del navegador pueden restaurar el `sessionStorage`, y «duplicar pestaña» lo copia. En el segundo caso ambas pestañas comparten el mismo token de renovación: la primera que renueva lo rota y la segunda, al presentarlo, dispara la detección de reutilización y se revocan todas las sesiones del usuario (`auth_handler.go:110-115`). Es un efecto funcional (cierre inesperado), no una fuga.

### Cierre de sesión explícito

- Cliente: `App.jsx:269-281` llama `apiClient.logout()` (sin `await`), borra las cinco claves de sesión y ejecuta `purgeClinicalStorage()`.
- Servidor: `POST /auth/logout` revoca solo el token de renovación (`auth_handler.go:139-148`, ruta sin autenticación ni límite propio en `src/backend/adapters/http/router.go:83`). El token de acceso sigue aceptado hasta su expiración. Reproducido en R4 con una prueba temporal fuera del repositorio (ver `60-asvs-l2-muestra-53.md`, sección 5): `GET /api/v1/auth/me` con el token de acceso después del *logout* -> **200**; `POST /auth/refresh` con el token revocado -> 401.

## 2. CSP real de la configuración nginx

Archivo `src/frontend/security-headers.conf:12`, copiado a `/etc/nginx/snippets/security-headers.conf` (`src/frontend/Dockerfile:31`) e incluido en el nivel `server` (`src/frontend/nginx.conf:16`) y en la `location` de activos estáticos (`nginx.conf:37`). Las `location /api/` y `location /` no definen `add_header`, por lo que heredan el conjunto del nivel `server`. Texto literal:

```
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'" always;
```

Resto de cabeceras del mismo archivo: `X-Content-Type-Options: nosniff` (`:3`), `X-Frame-Options: SAMEORIGIN` (`:4`), `Referrer-Policy: strict-origin-when-cross-origin` (`:5`), `X-XSS-Protection: 0` (`:7`), `Permissions-Policy: camera=(self), geolocation=(self), microphone=()` (`:9`), `Strict-Transport-Security: max-age=31536000; includeSubDomains` (`:15`).

Evaluación:

| Directiva | Valor | Evaluación |
|---|---|---|
| `script-src` | `'self'` | **No permite `'unsafe-inline'` ni `'unsafe-eval'`.** Sin *nonces* ni *hashes*, pero no hacen falta: el `index.html` compilado solo carga `<script type="module" crossorigin src="/assets/index-….js">` (`src/frontend/dist/index.html`). Un `<script>` inyectado o un manejador `onerror=` en línea quedarían bloqueados. |
| `object-src` / `base-uri` / `form-action` / `frame-ancestors` | `'none'` / `'self'` / `'self'` / `'self'` | Correctos. |
| `connect-src` | `'self'` | Un script inyectado no podría exfiltrar el token por `fetch` a otro dominio. |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | `'unsafe-inline'` en estilos: permite inyección CSS (riesgo bajo, sin ejecución de código). |
| `img-src` | `'self' data: blob: https:` | Acepta imágenes de cualquier dominio HTTPS: un canal de exfiltración por URL de imagen y de seguimiento (píxel) si alguien controla una URL renderizada; el muro de salud permite URL de imagen arbitrarias. |
| `media-src` | `'self' data: blob:` | Bloquea videos externos: un `video_url` https del muro no se reproducirá (efecto funcional, no de seguridad). |
| `frame-src` | YouTube | Coincide con la URL de *embed* reconstruida en el cliente. |

Límites de la evaluación: la CSP solo existe cuando el frontend se sirve con el nginx del contenedor. En `vite dev` (puerto 5173 en desarrollo) y si el backend se expone directamente, no hay CSP. nginx solo escucha en HTTP (`nginx.conf:2`) y el repositorio no incluye TLS: la HSTS se ignora por HTTP. No hay prueba automatizada de estas cabeceras ni se ejecutó nginx en vivo.

## 3. Sumideros XSS y contenido escrito por usuarios

- `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, `document.write`: **ninguno** en `src/frontend/src`.
- Muro de educación en salud (`src/frontend/src/screens/MedicalKitScreen.jsx`):
  - Título, resumen y contenido se renderizan como texto JSX (`{post.title}` en `:569`, `{post.summary}`, `{post.content}` en `:581`, con `whitespace-pre-line`). React los escapa: **no hay HTML crudo**.
  - YouTube: `getYoutubeEmbedUrl` (`MedicalKitScreen.jsx:43-68`) extrae solo un ID de 11 caracteres `[a-zA-Z0-9_-]` y reconstruye `https://www.youtube.com/embed/<ID>`; cualquier otra entrada devuelve `null` y no se crea el `iframe` (`:600-610`). Una URL `javascript:` no llega al `iframe`.
  - Imagen: `post.image_url` va directo a `<img src>` (`:588-597`); video: `post.video_url` a `<source src>` (`:613-634`). **No se valida el esquema** ni en el cliente ni en el servidor: `HealthEducationPost.Validate` solo revisa título, categoría, contenido, duración y que un `data:` de video sea `data:video/` (`src/backend/core/domain/health_education.go:59-80`). Un valor `javascript:` se guarda, pero los navegadores actuales no ejecutan `javascript:` en `img src` ni en `source src`, y la CSP (`script-src 'self'`) lo bloquearía de todas formas. Riesgo residual: URL externas `https:` para seguimiento o contenido inapropiado (`img-src https:`), y `data:` arbitrarios de imagen de gran tamaño (límite por defecto de Fiber de 4 MB por cuerpo).
  - Solo los MEDICO publican y solo los autenticados leen (`router.go:206-213`); el autor es el único que edita (DEF-70 cerrado).
- Otros textos de usuarios (observaciones del portal público, notas de enfermería, resultados de laboratorio) se muestran también como texto JSX; la búsqueda de sumideros no encontró excepciones.

## 4. Datos en `localStorage` y `sessionStorage` (H-R4-16)

Escrituras (`setItem`) encontradas en `src/frontend/src`:

| Clave | Almacén | Escritura (archivo:línea) | Contenido | ¿Datos clínicos? | ¿Se borra al cerrar sesión? |
|---|---|---|---|---|---|
| `saludconecta_token` | session | `services/api.js:34` | JWT de acceso | No | Sí (`App.jsx:273`, `api.js:43`) |
| `saludconecta_refresh_token` | session | `services/api.js:37` | JWT de renovación (7 días) | No | Sí (`App.jsx:274`) |
| `saludconecta_user` | session | `services/api.js:35`; `App.jsx:105`; `components/UserProfileModal.jsx:257`; `screens/ProfileScreen.jsx:187,226` | Datos del funcionario: documento, correo, teléfono, rol, sede, tarjeta profesional, foto (*data URL*) | No (datos personales del funcionario) | Sí (`App.jsx:272`) |
| `saludconecta_session_active` | session | `App.jsx:242` | Indicador `true` | No | Sí (`App.jsx:271`) |
| `saludconecta_current_view` | session | `App.jsx:222,228,234,255,258,261,264,301,312` | Nombre de la vista | No | Sí (`App.jsx:275`) |
| (migración) claves de sesión | session | `services/session.js:61` | Copia única desde `localStorage` heredado | No | Sí |
| `saludconecta_sidebar_collapsed` | local | `App.jsx:368` | `true`/`false` | No | No (preferencia de interfaz) |
| `saludconecta_profile_<usuario>` | local | `components/UserProfileModal.jsx:240,648`; `screens/ProfileScreen.jsx:210,656` | Portada, foto, **teléfono**, biografía, horario de turno, especialidad, sede del funcionario | No (datos personales del funcionario) | **No**: no está en `CLINICAL_LEGACY_KEYS` (`session.js:72-74`) |
| `saludconecta_avatar_<usuario>` | local | `components/UserProfileModal.jsx:242`; `screens/ProfileScreen.jsx:182,212` | Foto del funcionario (*data URL* de hasta 5 MB) | No | **No** |

Además, `screens/admin/AdminOrgChartView.jsx:38-41` lee las fotos `saludconecta_avatar_*` de otros funcionarios guardadas en el mismo navegador, y `App.jsx:74-77,85-88` busca el perfil por id, correo y número de documento.

Purga de datos clínicos heredados: `purgeClinicalStorage()` borra al cargar la aplicación y al cerrar sesión `saludconecta_lab_orders`, `saludconecta_nurse_orders`, `saludconecta_admin_branches`, `saludconecta_admin_medicines`, `saludconecta_pharmacy_reports`, `saludconecta_profile_custom`, `saludconecta_avatar` y todo `saludconecta_nurse_checklist_*` (`session.js:70-88`, invocada en `App.jsx:277`). No hay prueba automatizada de esta purga (búsqueda en `tests/frontend` sin resultados).

Contraste con el README:

- `README.md:532` (RF16) afirma que las notas de evolución de enfermería tienen «almacenamiento persistente en `localStorage`». **El código lo contradice**: `screens/NurseChecklistView.jsx:49,101,107,179` y `screens/NurseSummaryView.jsx:52` usan `apiClient.getNursingRecords`, `saveNursingDuties`, `getNursingRecord` y `addNursingNote`, que llaman a `/api/v2/nursing` (`services/api.js:558-583`); el backend las guarda (`router.go:249-257`). Ninguno de los dos archivos escribe en el almacenamiento del navegador. La RTM del mismo README (`README.md:387`) ya cita `TestEnfermeriaRecibeLaOrdenYRegistraDeberesYNotas` y `ServerBackedModules.test.jsx`, coherentes con el código.
- `README.md:1334,1387` (diagrama de secuencia) ya describe `sessionStorage` por pestaña y la purga DEF-76, coherente con el código.
- `README.md:2403` (DEF-76) dice que la purga está «en `handleLogout` dentro de `App.jsx`»; hoy está en `services/session.js` y `handleLogout` la invoca. Diferencia menor de ubicación.

## 5. Conclusiones

### H-R4-16: **Refutada**

Justificación:

1. Ninguna clave escrita hoy en `localStorage` ni en `sessionStorage` contiene datos clínicos (tabla de la sección 4). Enfermería, laboratorio, farmacia y sedes se guardan en el servidor, y las claves clínicas de versiones anteriores se borran al cargar y al cerrar sesión (`session.js:70-88`).
2. No hay IndexedDB, Cache Storage ni *service worker* que guarden respuestas clínicas.
3. La afirmación de RF16 (`README.md:532`) está desactualizada: describe un comportamiento que el código ya no tiene. Es un defecto de documentación, no de almacenamiento.

Residuos que no son datos clínicos pero sí datos personales (relevantes para ASVS 8.2.2 y 8.2.3, ver `60-asvs-l2-muestra-53.md`):

- `saludconecta_profile_<usuario>` y `saludconecta_avatar_<usuario>` (teléfono, biografía, turno, sede y foto del funcionario) **persisten en `localStorage` después de cerrar sesión** y quedan visibles para el siguiente usuario de una estación compartida. Severidad sugerida: **Baja**.
- `saludconecta_user` en `sessionStorage` incluye el número de documento del funcionario; se borra al cerrar sesión o la pestaña.
- Sin `Cache-Control: no-store` en las respuestas de la API (ASVS 8.2.1); no se observó almacenamiento en caché HTTP de respuestas clínicas, pero no está impedido explícitamente.

### H-R4-17: **Dividida**

Se confirma la parte de exposición del token; se refuta la existencia de un vector XSS que la aproveche.

Confirmado:

1. El token de acceso **y el de renovación de 7 días** están en `sessionStorage`, legibles por cualquier JavaScript que se ejecute en el origen (no son *cookies* `HttpOnly`). Un XSS, una extensión maliciosa o una dependencia comprometida en el *bundle* podrían copiarlos; con el de renovación y la rotación deslizante, la sesión robada se prolonga sin límite (`auth_service.go:213-219`).
2. El cierre de sesión no invalida el token de acceso: sigue aceptado hasta 15 min (reproducido: 200 en `/auth/me` tras el *logout*). Cerrar la pestaña no revoca nada en el servidor.
3. La CSP solo protege cuando el frontend se sirve con el nginx del contenedor, y sin TLS en el repositorio los tokens viajan en claro por HTTP.

Refutado:

1. No hay sumideros de HTML crudo en `src/frontend/src` (`dangerouslySetInnerHTML`, `innerHTML`, `eval` y similares: 0).
2. El contenido del muro de salud y del resto de módulos se renderiza como texto escapado por React; el `iframe` de YouTube solo acepta un ID reconstruido; las URL de imagen y video sin validar terminan en `img`/`source`, que no ejecutan `javascript:`.
3. La CSP desplegada no permite `'unsafe-inline'` ni `'unsafe-eval'` en `script-src` y limita `connect-src` a `'self'`, lo que bloquea tanto la inyección de *scripts* en línea como la exfiltración por `fetch`.

Hallazgos y severidad sugerida:

| # | Hallazgo | Evidencia | Severidad |
|---|---|---|---|
| S1 | Sesión sin límite absoluto ni cierre por inactividad (renovación deslizante de 7 días). | `auth_service.go:213-219`, `config.go:125-126` | Media |
| S2 | Token de renovación de 7 días accesible por JavaScript (`sessionStorage`); combinado con S1, un robo único da acceso indefinido. | `api.js:36-40`, `session.js:10-16` | Media |
| S3 | Token de acceso válido hasta 15 min tras el cierre de sesión; cerrar la pestaña no revoca el de renovación. | `auth_handler.go:139-148`, `App.jsx:269-281` | Baja |
| S4 | URL de imagen y video del muro sin lista de esquemas en el servidor; `img-src https:` permite imágenes de seguimiento externas. | `health_education.go:59-80`, `MedicalKitScreen.jsx:588-634`, `security-headers.conf:12` | Baja |
| S5 | Datos personales del funcionario en `localStorage` que sobreviven al cierre de sesión. | `UserProfileModal.jsx:240-242`, `ProfileScreen.jsx:182,210-212`, `session.js:72-74` | Baja |
| S6 | `style-src 'unsafe-inline'` en la CSP. | `security-headers.conf:12` | Baja |
| S7 | README RF16 afirma almacenamiento de notas de enfermería en `localStorage`, contrario al código. | `README.md:532` frente a `NurseChecklistView.jsx:179`, `api.js:583` | Baja (documentación) |
| S8 | «Duplicar pestaña» comparte el token de renovación y termina revocando todas las sesiones del usuario por detección de reutilización (inferido del código; no ejecutado en navegador). | `refresh_token_tracker.go:69-97`, `auth_service.go:187-191` | Baja (funcional) |
