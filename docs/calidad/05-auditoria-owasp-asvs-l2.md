# 05. Auditoría OWASP ASVS 4.0.3, nivel 2

<!-- cifras-r3 -->
> **Cifras vigentes de la revisión R3 (10 nov 2026).** Fuente única: `anexos/cifras-r3.json`; coherencia comprobada con `anexos/verificar_cifras_r3.py`. Detalle en `informe-revision-r3.md`.
>
> - Defectos registrados: 92 (DEF-01 a DEF-92). Verificación de DEF-01 a DEF-48: 26 verificados, 9 corregidos parcialmente, 12 siguen abiertos, 1 sin ejecución medible, 0 regresiones.
> - Abiertos en `main` (DEF-05 a DEF-92): 63 (18 críticos, 9 altos, 28 medios, 8 bajos). Nuevos de R3: 8 (1 crítico, 1 alto, 6 medios).
> - Pruebas backend: 91 pasan, 0 fallan, 22 reproducciones omitidas (evidencias/r3/12-go-test-tests.txt). Cobertura backend: 68,9 %. Vitest: 108 pruebas en 15 archivos (105 en 14 archivos del equipo), todas pasan. Cobertura frontend: 72,85 %. Reproducciones de defectos abiertos: 22 de 22.
> - Análisis estático: golangci-lint 62 hallazgos (21 nuevos desde la v1); gocyclo 16 funciones con complejidad mayor de 15; govulncheck 1 vulnerabilidad alcanzable (GO-2026-6888); npm audit 0 en producción; 6 en desarrollo; ESLint 0 errores, 89 avisos.
> - Rendimiento: p95 1,38 ms HTTP real; 3,92 a 7,86 ms en proceso; memoria 11,5 a 16,3 MB.
> - Afirmaciones publicadas: 48 evaluadas: 7 verificadas, 24 parciales, 2 no verificadas, 15 falsas. RTM: 5 de 21 requisitos se sostienen. Dictamen: **No conforme con ISO/IEC 25010:2023**.
<!-- /cifras-r3 -->

**Impacto de R3 en ASVS L2.** No se repitió la auditoría completa. Dos hallazgos nuevos de la revisión 2, verificados en R3, afectan a requisitos de autenticación ya evaluados en la v1: el alta pública de administradores (DEF-49, V2/V4) y la exposición de la semilla TOTP (DEF-50, V2.8). La cifra de cumplimiento de la v1 (34,0 %) no se recalcula; la afirmación «ASVS Nivel 2» del README sigue sin sostenerse.

## 1. Alcance y método

- **Capítulos:** V2 Autenticación, V3 Gestión de sesiones, V4 Control de acceso, V5 Validación, V7 Errores y registro, V8 Protección de datos, V14 Configuración.
- **Selección:** requisitos de nivel 2 aplicables a una API REST con JWT Bearer y una SPA React. Se excluyen los que dependen de funciones inexistentes (recuperación de contraseña, carga de archivos, *cookies* de sesión, servicios web SOAP), salvo un N/A explícito que documenta una decisión de diseño.
- **Evidencia:** revisión de código (commit `6492f07` más las correcciones de esta rama), pruebas de regresión y la matriz RBAC. Cuando un control no pudo ejecutarse (Docker y nginx en vivo), el estado se basa en la configuración y se indica.
- **Estados:** Cumple, Parcial, No cumple, N/A.

## 2. Checklist

### V2 Autenticación

| ID ASVS | Requisito (resumen) | Estado | Evidencia |
|---|---|---|---|
| 2.1.1 | Contraseñas de al menos 12 caracteres | No cumple | `RegisterStaff` solo exige que no esté vacía (`auth_handler.go:113`). |
| 2.1.7 | Contraseñas contrastadas con listas de contraseñas filtradas | No cumple | No existe el control. |
| 2.2.1 | Controles contra fuerza bruta y automatización | No cumple | DEF-15. |
| 2.3.1 | Contraseña inicial generada aleatoriamente y de vida corta | No cumple | Valor por defecto fijo en `seeder.go:94-97` (DEF-11). |
| 2.4.1 | Almacenamiento con función unidireccional aprobada | Cumple | Bcrypt (`crypto.go:33-39`). |
| 2.4.4 | Factor de trabajo de bcrypt adecuado | Cumple | 12 en la aplicación; 10 en el seeder, que es el mínimo aceptable (DEF-42). |
| 2.5.4 | Sin cuentas compartidas ni por defecto | No cumple | Administrador y médico de demostración con credenciales publicadas (DEF-11). |
| 2.8.1 | OTP basado en tiempo con vida definida | Cumple | Paso de 30 s con ventana ±1 (`crypto.go:119-154`). |
| 2.8.4 | OTP de un solo uso dentro de su vigencia | No cumple | No se registra el último intervalo usado; un código puede reutilizarse durante unos 90 s. |
| 2.10.4 | Secretos fuera del código fuente | Parcial | DEF-12 corregido en esta rama; persisten DEF-11 y las credenciales de `docker-compose.yml` (DEF-34). |

### V3 Gestión de sesiones

| ID ASVS | Requisito (resumen) | Estado | Evidencia |
|---|---|---|---|
| 3.2.3 | Token almacenado en el navegador de forma segura | No cumple | `localStorage` en texto claro (DEF-33). |
| 3.3.1 | El cierre de sesión invalida el token | Parcial | El cliente borra el token (`App.jsx:64-73`), pero el JWT sigue siendo válido en el servidor hasta expirar. |
| 3.3.2 | Reautenticación periódica e invalidación por inactividad | Parcial | Expiración absoluta de 8 h (`main.go:71`); sin expiración por inactividad. |
| 3.3.4 | El usuario puede ver y cerrar sus sesiones activas | No cumple | No existe la función. |
| 3.5.2 | Tokens de sesión en lugar de secretos estáticos | Cumple | JWT por usuario. |
| 3.5.3 | Tokens sin estado firmados contra manipulación | Cumple | HS256 con verificación del algoritmo (`crypto.go:91-108`); el secreto ya no puede ser el por defecto (DEF-12). |
| 3.7.1 | Sesión completa o reautenticación antes de operaciones sensibles | No cumple | La rotación del MFA no exige el factor actual (DEF-14). |

### V4 Control de acceso

| ID ASVS | Requisito (resumen) | Estado | Evidencia |
|---|---|---|---|
| 4.1.1 | Control de acceso aplicado en el servidor | Cumple | `RequireRoles` en cada ruta (`router.go`). |
| 4.1.2 | Atributos de control de acceso no manipulables por el usuario | Cumple | El rol proviene del JWT firmado; editar `localStorage` no concede acceso (H05). |
| 4.1.3 | Mínimo privilegio | Parcial | RBAC correcto, pero el usuario de base de datos tiene privilegios DDL (DEF-25). |
| 4.1.5 | Fallo seguro del control de acceso | Cumple | 403 si falta el rol (`rbac_middleware.go:18-31`). |
| 4.2.1 | Protección contra acceso directo a objetos de otros (IDOR) | No cumple | Un médico cierra folios ajenos (DEF-17) y cualquier MEDICO lee la historia de cualquier paciente sin relación asistencial. |
| 4.2.2 | Protección CSRF | N/A | Autenticación por cabecera `Authorization: Bearer`, no por *cookie*. |
| 4.3.1 | MFA en interfaces administrativas | No cumple | El MFA no es obligatorio para ADMIN (DEF-14). |
| 4.3.2 | Sin listado de directorios ni metadatos expuestos | Cumple | nginx sin `autoindex` y SPA con `try_files` (`nginx.conf:44-46`); verificado por configuración, no en ejecución. |

### V5 Validación, saneamiento y codificación

| ID ASVS | Requisito (resumen) | Estado | Evidencia |
|---|---|---|---|
| 5.1.3 | Validación positiva de todas las entradas | Parcial | Signos vitales y nivel Manchester validados (DEF-08, DEF-27 corregidos); correo, contraseña y campos clínicos sin validar. |
| 5.1.4 | Datos estructurados con tipado y validación | Parcial | La sincronización usa la entidad de dominio como DTO (DEF-18). |
| 5.3.3 | Codificación de salida contextual (XSS) | Cumple | React escapa por defecto; no hay `dangerouslySetInnerHTML`, `innerHTML` ni `eval` en `src/frontend/src`. |
| 5.3.4 | Consultas parametrizadas | Cumple | H08 refutada. |

### V7 Manejo de errores y registro

| ID ASVS | Requisito (resumen) | Estado | Evidencia |
|---|---|---|---|
| 7.1.1 | No registrar credenciales ni tokens | Cumple | El registro HTTP no incluye cabeceras ni cuerpos (`audit_middleware.go:41-48`). |
| 7.1.2 | No registrar otros datos sensibles | Cumple | `details` sin datos clínicos (H13). |
| 7.1.3 | Registrar eventos de seguridad (autenticación y fallos de acceso) | Parcial | Las operaciones mutantes se persisten con su código, incluidos los login fallidos (POST); los 403 en GET solo van a la salida estándar. |
| 7.1.4 | Información suficiente para reconstruir la línea de tiempo | Cumple | Marca UTC, usuario, rol, IP y *correlation id*. |
| 7.2.1 | Registrar todas las decisiones de autenticación | Parcial | Sin motivo del rechazo (contraseña, MFA, inactivo) en la bitácora persistida. |
| 7.3.1 | Codificación que impida la inyección en registros | Cumple | Registro JSON y `X-Correlation-ID` validado como UUID (DEF-41 corregido). |
| 7.3.3 | Registros protegidos contra modificación | Parcial | `audit_logs` no tiene triggers de inmutabilidad; el almacén en memoria es mutable. |
| 7.3.4 | Fuente de tiempo sincronizada en UTC | Cumple | `time.Now().UTC()` en registros y en la bitácora. |
| 7.4.1 | Mensaje genérico con identificador ante errores inesperados | Parcial | `ErrorHandler` incluye `correlation_id`, pero devuelve `err.Error()` (`server.go:43`). |

### V8 Protección de datos

| ID ASVS | Requisito (resumen) | Estado | Evidencia |
|---|---|---|---|
| 8.2.1 | Cabeceras anti-caché en datos sensibles | No cumple | Las respuestas clínicas no envían `Cache-Control: no-store` (`grep -rn no-store` sin resultados). |
| 8.2.2 | Sin datos sensibles en el almacenamiento del navegador | No cumple | Token y datos personales del usuario (documento, teléfono) en `localStorage`. |
| 8.2.3 | Datos del cliente borrados al cerrar sesión | Parcial | Se borran token, usuario y vista; quedan `saludconecta_profile_custom` y `saludconecta_admin_medicines`. |
| 8.3.1 | Datos sensibles en el cuerpo o en cabeceras, no en la URL | Cumple | Los identificadores clínicos van en la ruta, sin datos personales en la consulta. |
| 8.3.4 | Datos sensibles identificados y con política de tratamiento | Parcial | Se cita la Ley 1581 sin una clasificación de datos ni una política de retención. |

### V14 Configuración

| ID ASVS | Requisito (resumen) | Estado | Evidencia |
|---|---|---|---|
| 14.1.1 | Build y despliegue seguros y repetibles | Parcial | Dockerfiles multietapa y, desde esta rama, el pipeline `calidad.yml`; sin despliegue automatizado. |
| 14.2.1 | Componentes actualizados y sin vulnerabilidades conocidas | No cumple | DEF-24 (Fiber); DEF-45 (desarrollo). |
| 14.2.2 | Funciones, ejemplos y datos de demostración eliminados | No cumple | Semillas (DEF-11) y modos de contingencia (DEF-22, DEF-23). |
| 14.3.2 | Modos de depuración desactivados en producción | Parcial | Sin modo de depuración, pero con conmutación de demostración a memoria (DEF-10). |
| 14.3.3 | Sin versión detallada de componentes en las respuestas | Parcial | `/health` expone «SaludConecta IPS v2.4»; la cabecera `Server` muestra el producto, no la versión. |
| 14.4.3 | Content-Security-Policy | No cumple | DEF-35. |
| 14.4.4 | `X-Content-Type-Options: nosniff` | Parcial | Solo en documentos HTML servidos por nginx; falta en activos y en la API (DEF-35). |
| 14.4.5 | HSTS | No cumple | Sin TLS ni HSTS. |
| 14.4.6 | `Referrer-Policy` | Parcial | Igual que 14.4.4. |
| 14.4.7 | Protección contra *framing* | Parcial | `X-Frame-Options` solo en documentos HTML. |
| 14.5.3 | CORS con lista de orígenes permitidos | Cumple | H09. |

## 3. Cumplimiento calculado

| Capítulo | Evaluados | Cumple | Parcial | No cumple | N/A |
|---|---|---|---|---|---|
| V2 | 10 | 3 | 1 | 6 | 0 |
| V3 | 7 | 2 | 2 | 3 | 0 |
| V4 | 7 | 4 | 1 | 2 | 1 |
| V5 | 4 | 2 | 2 | 0 | 0 |
| V7 | 9 | 5 | 4 | 0 | 0 |
| V8 | 5 | 1 | 2 | 2 | 0 |
| V14 | 11 | 1 | 6 | 4 | 0 |
| **Total** | **53** | **18** | **18** | **17** | **1** |

- **Cumplimiento estricto** (solo «Cumple»): 18 / 53 = **34,0 %**.
- **Cumplimiento ponderado** (Parcial = 0,5): (18 + 9) / 53 = **50,9 %**.
- El estado ya incluye las correcciones de esta rama (DEF-12 y DEF-41). Sobre `6492f07` habrían quedado como No cumple 3.5.3 y 7.3.1, y 2.10.4 habría sido No cumple: 16 cumplen, 17 parciales y 20 no cumplen (30,2 % estricto).

## 4. Comparación con la afirmación del README

`README.md:20` afirma que el sistema está «evaluado, asegurado y documentado bajo … lineamientos de seguridad OWASP ASVS Nivel 2», y RNF03 lo usa como criterio de aceptación. Con la muestra de 53 requisitos aplicables, el cumplimiento estricto es del 34,0 %; ningún capítulo alcanza el 100 %. Los más débiles en cumplimiento estricto son V14 Configuración (9,1 %), V8 Protección de datos (20 %) y V2 Autenticación (30 %). **Veredicto: afirmación falsa.**

Para declarar ASVS L2 de forma defendible se requiere, como mínimo, cerrar los «No cumple» de V2, V3 y V4 (DEF-11, DEF-13, DEF-14, DEF-15, DEF-17 y DEF-33) y documentar una auditoría completa del nivel, no una muestra.
