# 03. Informe de revisión de código

## 1. Metodología

| Aspecto | Detalle |
|---|---|
| Alcance | `src/backend` (48 archivos Go, 6 314 líneas sin pruebas), `src/frontend/src` (8 465 líneas), `tests/`, `docker-compose.yml`, Dockerfiles, `nginx.conf`, `schema.sql` y documentación. Commit base `6492f07`. |
| Enfoque | Revisión dirigida por hipótesis (H01–H33, derivadas de las afirmaciones del README y de `informe-calidad.md`), complementada con el análisis estático del anexo B. Cada hipótesis termina en `Confirmada (DEF-XX)`, `Refutada (evidencia)` o `No verificable (motivo)`. |
| Lista de comprobación | OWASP ASVS 4.0.3 nivel 2 (V2, V3, V4, V5, V7, V8, V14), características de ISO/IEC 25010:2023, reglas de concurrencia de Go (estado compartido, ciclo de vida de `fiber.Ctx`) y reglas de inmutabilidad de la Resolución 1995 de 1999. |
| Archivos revisados línea a línea | `cmd/api/main.go`, `adapters/http/{router,server}.go`, los 4 middlewares, los 6 handlers, los 6 servicios de `core/services`, `core/domain/*`, `pkg/crypto/crypto.go`, `adapters/storage/{factory.go, memory/memory_repos.go, mysql/{seeder,connection,clinical_record_repo,user_repo}.go}`, `schema.sql`, `App.jsx`, `services/api.js`, `AuthScreen.jsx`, `SecurityMfaScreen.jsx`, `HceScreen.jsx`, `PrescriptionScreen.jsx`, `ProfileScreen.jsx`, infraestructura. Revisión por muestreo: adaptador PostgreSQL, interoperabilidad RIPS/FHIR y el resto de pantallas. |
| Herramientas | go vet, staticcheck, golangci-lint, gosec, govulncheck, gocyclo, ESLint, npm audit, jscpd y actionlint (anexo B); pruebas de regresión propias en `tests/backend/*_regression_test.go` y `src/backend/cmd/api/main_regression_test.go`; cálculo de contraste WCAG con un script reproducible (`evidencias/40-contraste-banners.txt`). |
| Tiempo | Una sesión de trabajo continua el 2026-11-01 (sin registro de horas por actividad). |
| Limitaciones | Sin MySQL, Docker, compilador C (`-race`) ni navegador automatizado en el entorno de la revisión. Las hipótesis que dependen de ellos se marcan como no reproducidas o se delegan al pipeline. |

## 2. Resultado de las hipótesis

| ID | Hipótesis (resumen) | Resultado | Evidencia principal |
|---|---|---|---|
| H01 | Contraseña inicial del admin por defecto y sin cambio obligatorio | **Confirmada (DEF-11)** | `seeder.go:94-97` usa un valor por defecto publicado; no existe flujo de cambio en el primer ingreso. |
| H02 | El servidor arranca sin `JWT_SECRET` o con el de ejemplo | **Confirmada (DEF-12)**, corregida | Token forjado aceptado con 200 (`evidencias/59-def12-antes.txt`); tras la corrección, código de salida 1 (`60-…`). |
| H03 | JWT en `localStorage` «cripto-protegido» | **Confirmada (DEF-33)** | Texto claro (`api.js:96`); no hay cifrado; sin CSP (DEF-35). |
| H04 | TOTP decisivo validado en el cliente | **Refutada** | El servidor valida el TOTP antes de emitir el token (`auth_service.go:42-49`). Hallazgo colateral: la validación previa en el cliente bloquea a usuarios legítimos (DEF-23). |
| H05 | Rol editable en `localStorage` tras F5 | **Confirmada (DEF-33)** | La UI muestra `AdminLayout` (`App.jsx:100`); el backend niega con 403 porque usa el rol del JWT (`anexos/matriz-rbac.md`). |
| H06 | Sin limitación específica en login y TOTP | **Confirmada (DEF-15)** | Límite global de 120/min por IP; detrás de nginx la IP es la del proxy. |
| H07 | Bcrypt coste 12 en el código | **Confirmada parcialmente (DEF-42)** | 12 en `crypto.go:35`; 10 (`DefaultCost`) en `seeder.go:100,123,142`. |
| H08 | Inyección SQL por concatenación | **Refutada** | Los 7 `fmt.Sprintf` de `adapters/storage` son DSN, un `ALTER TABLE` con lista constante (`seeder.go:37`) y cláusulas `WHERE` formadas por fragmentos constantes con marcadores `?`/`$n` (`mysql/user_repo.go:125-148`). Todos los valores van como parámetros (`evidencias/77-h08-sprintf.txt`). |
| H09 | CORS con `*` y credenciales | **Refutada** | Orígenes leídos de `CORS_ALLOWED_ORIGINS` (`main.go:40`, `server.go:57-62`); no se usa `*`. |
| H10 | Errores HTTP que filtran detalles internos | **Refutada, con observación** | Los handlers devuelven mensajes de dominio y textos genéricos en los 500. Observaciones (DEF-44): `server.go:43` devuelve `err.Error()` de errores no controlados; `/verify` responde 500 con un folio inexistente. No se observaron trazas ni SQL en las respuestas de la matriz RBAC. |
| H11 | `X-Correlation-ID` del cliente sin validar | **Confirmada (DEF-41)**, corregida | `evidencias/57-…` y `58-…`. |
| H12 | Matriz ruta x rol; ADMIN sin acceso clínico | **Refutada** | 110 combinaciones correctas; las 16 rutas clínicas dan 403 a ADMIN (`anexos/matriz-rbac.md`). Hallazgos colaterales: DEF-26 y DEF-17. |
| H13 | Datos clínicos en `details` de la auditoría | **Refutada** | `details` contiene solo `status_code`, `method` y `latency_ms` (`audit_middleware.go:74-78`). |
| H14 | Usuario inactivo obtiene token | **Confirmada (DEF-13)** | El login lo bloquea (`auth_service.go:34`), pero los tokens emitidos antes siguen siendo válidos; la sincronización no emite tokens. |
| H15 | Datos personales de apariencia real | **Confirmada (DEF-43)** | Nombre de un integrante real asociado a cédula, teléfono y registro médico plausibles. |
| H16 | Hash SHA-256 no determinista | **Refutada** en cuanto a determinismo | Orden fijo y fecha UTC RFC 3339 (`crypto.go:56-68`, `clinical_record_service.go:83`). Defectos de unicidad (DEF-29) y de precisión al persistir (DEF-20). |
| H17 | Bifurcación de la cadena por concurrencia | **Confirmada (DEF-16)** | Prueba con barrera determinista. |
| H18 | No existe verificación de la cadena completa | **Confirmada (DEF-30)** | Solo se verifica cada folio con su propio `previous_hash`. |
| H19 | Triggers en MySQL y PostgreSQL, y en aclaraciones | **Confirmada (DEF-25)** | Solo MySQL y solo `clinical_records`. Limitación: el usuario de aplicación tiene privilegios para eliminar triggers. |
| H20 | DEF-01 implementado como se describe | **Confirmada parcialmente** | Ver bitácora, DEF-01. |
| H21 | Caché de alergias obsoleta permite prescripción peligrosa | **Refutada** | No existe caché (`grep -rni cache` sin resultados) y una alergia nueva bloquea de inmediato (`TestH21…`, `evidencias/76-h21-alergia-vigente.txt`). |
| H22 | Cruce de alergias por igualdad exacta | **Confirmada (DEF-06)** | Mayúsculas y espacios de los extremos se normalizan; tildes y familias no. |
| H23 | Valores límite de triaje | **Confirmada (DEF-27)**, corregida para FC | Glasgow 2/3/15/16 correctos (`TestH23…` y `triage_test.go`); FC 0 rechazada, FC 1 y 300 aceptadas, FC 301 aceptada antes de la corrección. Hallazgo colateral: DEF-09. |
| H24 | Conmutación silenciosa a memoria | **Confirmada (DEF-10)** | Registro de arranque real en `evidencias/59-def12-antes.txt`. |
| H25 | Idempotencia, atomicidad, conflictos y firma en lotes | **Confirmada (DEF-07, DEF-18, DEF-19)** | Reenvío destructivo en memoria y fallido en MySQL; los registros con paciente inexistente se omiten en silencio (`sync_service.go:40-42`) y la respuesta solo informa el total; en conflictos entre dispositivos gana la última escritura; no hay validación de firma. Atomicidad: transacción única en MySQL (`clinical_record_repo.go:210`). |
| H26 | DEF-03: la goroutine ya no lee `fiber.Ctx` | **Confirmada parcialmente (DEF-28)**, corregida | La goroutine no recibe `Ctx`, pero las cadenas apuntaban a búferes reciclados. `-race` en CI (run `41361540450`) no reportó carreras en el middleware de auditoría, pero sí dos carreras reales del adaptador en memoria: DEF-37 y DEF-46 (`evidencias/89-…`). |
| H27 | Healthcheck sin base de datos | **Confirmada (DEF-32)** | `router.go:24-30`. |
| H28 | `core/` importa adaptadores o drivers | **Refutada** | `go list` muestra que `core/*` importa solo `domain`, `ports`, `pkg/crypto`, `uuid` y la biblioteca estándar. `database/sql/driver` entra como dependencia transitiva de `google/uuid` (solo interfaces), no por uso directo (`evidencias/41-arquitectura.txt`). |
| H29 | `tests/backend` usa copias o *mocks* triviales | **Refutada**, con observación | Importa los paquetes reales mediante `replace ../../src/backend`; sin embargo, algunos *fixtures* hacen pasar los casos de forma trivial (DEF-40). |
| H30 | Complejidad > 15, archivos > 500 líneas, código muerto, duplicación | **Confirmada (DEF-44)** | 1 función con complejidad 17, 4 archivos de más de 500 líneas, `CanModify()` sin uso, 65 variables sin uso en JSX, duplicación Go del 14,46 %. |
| H31 | MySQL expuesto, credenciales en claro, backend sin privilegios | **Confirmada (DEF-34)** en exposición y credenciales; **Refutada** en privilegios | El backend corre como `appuser` (`Dockerfile:40-48`). |
| H32 | Cabeceras de seguridad de nginx | **Confirmada (DEF-35)** | Sin CSP ni HSTS; las cabeceras se pierden en los activos estáticos. |
| H33 | Contraste WCAG AAA en banners | **Confirmada (DEF-36)** | Mínimo 1,85:1. axe-core y Lighthouse: **No medido** (sin navegador automatizado). |

Totales: 22 confirmadas (3 de ellas parcialmente: H07, H20 y H26), 10 refutadas (2 con observación) y 1 dividida (H31: confirmada en exposición y credenciales, refutada en privilegios); ninguna queda sin veredicto.

## 3. Hallazgos por severidad

El detalle completo (pasos, causa raíz, acción y estado) está en `04-bitacora-defectos.md`. Aquí se muestra el fragmento mínimo y el riesgo de cada hallazgo Crítico y Alto.

### 3.1 Críticos

**DEF-05, Prescripción contra el paciente equivocado** (`core/services/prescription_service.go:38,43`)

```go
if _, err := s.recordRepo.GetByID(ctx, prescription.ClinicalRecordID); err != nil {
...
allergies, err := s.patientRepo.GetPatientAllergies(ctx, prescription.PatientID)
```

Riesgo: basta un `patient_id` incorrecto (por error de la interfaz o de forma deliberada) para recetar un medicamento contraindicado sin alerta. Recomendación aplicada: derivar el paciente del folio y rechazar la discrepancia.

**DEF-06, Cruce de alergias literal** (`prescription_service.go:50,62-63`)

```go
allergyMap[strings.ToUpper(strings.TrimSpace(a.ActiveIngredient))] = a
...
if allergy, exists := allergyMap[normalizedIngredient]; exists {
```

Riesgo: una alergia a penicilina no bloquea la amoxicilina. Recomendación: normalización Unicode y tabla de reactividad cruzada (cambio de esquema).

**DEF-07, Sincronización destructiva** (`adapters/storage/memory/memory_repos.go:425-432`)

```go
for i := range records {
    r.ds.clinicalRecords[records[i].ID] = &records[i]
}
```

Riesgo: se reescribe un folio firmado y se pierde su cierre. Recomendación: idempotencia explícita por UUID.

**DEF-08, Nivel Manchester libre** (`triage_handler.go:55`, `triage_service.go:40`). Riesgo: pacientes en la cola con un nivel inexistente. Corregido con validación de catálogo; queda pendiente la política de reclasificación a la baja.

**DEF-09, Hipotermia como no urgente** (`core/domain/triage.go:69-88`). Riesgo: subtriaje de un paciente con hipotermia severa. Recomendación: completar los discriminadores con validación clínica.

**DEF-10, Conmutación silenciosa a memoria** (`cmd/api/main.go:58-67`)

```go
log.Warn("Conmutando a Adaptador en Memoria para permitir pruebas inmediatas con gobernanza")
storageCfg.Driver = "memory"
```

Riesgo: registros clínicos que «se guardan» y desaparecen al reiniciar. Recomendación: fallar de forma visible.

**DEF-11, Credenciales clínicas sembradas** (`adapters/storage/mysql/seeder.go:119-136`). Riesgo: cualquiera que lea el repositorio puede autenticarse como médico, incluido el segundo factor. Recomendación: semillas solo en desarrollo y rotación inmediata.

### 3.2 Altos

| ID | Ubicación | Riesgo | Recomendación |
|---|---|---|---|
| DEF-12 | `main.go:39` | Tokens forjables con un secreto público | Corregido: arranque bloqueado |
| DEF-13 | `auth_middleware.go:29-39` | Personal suspendido conserva acceso hasta 8 h | Verificar estado o `token_version` |
| DEF-14 | `auth_service.go:98` | Un token robado basta para desactivar el MFA | Rotación con el TOTP actual |
| DEF-15 | `ratelimit_middleware.go:22-24` | Fuerza bruta y denegación de servicio a toda la IPS | Límite por cuenta y `ProxyHeader` |
| DEF-16 | `clinical_record_service.go:76,97` | Cadena bifurcada, no repudio roto | Transacción con `FOR UPDATE` |
| DEF-17 | `clinical_record_service.go:61-97` | Firma de folios ajenos | Control a nivel de objeto |
| DEF-18 | `sync_handler.go:19` | Suplantación de autoría | DTO y autoría derivada del token |
| DEF-19 | `mysql/clinical_record_repo.go:222` + `schema.sql:238` | Lotes rurales que nunca sincronizan | Idempotencia sin `UPDATE` |
| DEF-20 | `schema.sql:136` + `clinical_record_service.go:83` | Verificación falsa negativa | Truncar a segundos |
| DEF-21 | `HceScreen.jsx:47-50`, `PrescriptionScreen.jsx:121-137` | El usuario cree registrar lo que no se registra | Integrar con la API |
| DEF-22 | `api.js:174-232` | Auditoría y suspensiones ficticias | Modo estricto |
| DEF-23 | `AuthScreen.jsx:40,117-129` | Usuarios legítimos bloqueados | Quitar la validación del cliente |
| DEF-24 | `go.mod` (Fiber v2.52.5) | Caída del proceso con cuerpos manipulados | Actualizar dependencias |
| DEF-25 | `schema.sql:224-253` | Inmutabilidad solo en un motor | DDL de PostgreSQL y aclaraciones |
| DEF-26 | `router.go` | Flujo clínico no ejecutable por la API | Endpoints de admisión |
| DEF-47 | `src/frontend/src/utils/totp.js:93-98` | Sin Web Crypto (HTTP en la red local) el cliente calculaba códigos ajenos al secreto | Corregido: HMAC-SHA1 local |

## 4. Fortalezas verificadas

1. **RBAC del backend consistente.** Las 110 combinaciones ruta x rol coinciden con la especificación y ADMIN queda aislado de los datos clínicos (`anexos/matriz-rbac.md`).
2. **Arquitectura hexagonal real.** `core/` no depende de Fiber, `database/sql` ni drivers (`evidencias/41-arquitectura.txt`), y el sistema cambia de motor por configuración (`storage/factory.go`).
3. **SQL parametrizado** en todos los repositorios (H08).
4. **Serialización de usuarios segura:** `PasswordHash` y `MFASecret` llevan `json:"-"` (`core/domain/user.go:36,41`), de modo que el listado de administración no filtra hashes ni secretos.
5. **TOTP decidido en el servidor**, con verificación RFC 6238 propia y ventana de ±1 intervalo (`crypto.go:119-154`).
6. **Inmutabilidad en dos capas en MySQL:** `WHERE is_closed = FALSE` en el repositorio y triggers `BEFORE UPDATE/DELETE`.
7. **Contenedor del backend sin privilegios** (`appuser`) y build multietapa con binario estático.
8. **Validación de Glasgow sin errores de borde** (DEF-04 confirmado).
9. **Higiene estática de partida:** `go vet` limpio, complejidad ciclomática media de 3,42 y una sola función por encima de 15.
10. **0 vulnerabilidades en dependencias de producción del frontend** (`npm audit --omit=dev`).

## 5. Cambios de código aplicados por Calidad en esta rama

| Commit | Defecto | Archivos | Prueba de regresión (falla antes / pasa después) |
|---|---|---|---|
| `fix(DEF-05)` | DEF-05 | `prescription_service.go`, `domain/prescription.go`, `prescription_handler.go` | `tests/backend/prescripcion_paciente_regression_test.go` |
| `fix(DEF-27)` | DEF-27 | `domain/triage.go` | `tests/backend/triaje_limites_regression_test.go` |
| `fix(DEF-08)` | DEF-08 | `domain/triage.go`, `triage_service.go`, `triage_handler.go` | `tests/backend/triaje_manchester_regression_test.go` |
| `fix(DEF-28)` | DEF-28 | `middlewares/audit_middleware.go` | `tests/backend/auditoria_concurrencia_regression_test.go` |
| `fix(DEF-41)` | DEF-41 | `middlewares/audit_middleware.go` | `tests/backend/correlacion_id_regression_test.go` |
| `fix(DEF-12)` | DEF-12 | `cmd/api/main.go`, `.env.example` | `src/backend/cmd/api/main_regression_test.go` |
| `fix(DEF-46)` | DEF-46 | `storage/memory/memory_repos.go` | `tests/backend/catalogo_aliasing_regression_test.go` |
| `fix(DEF-47)` | DEF-47 | `src/frontend/src/utils/totp.js` | `tests/frontend/totp.regression.test.js` |

Ninguna corrección cambia el esquema de base de datos ni la arquitectura. DEF-05 y DEF-08 agregan respuestas 422 nuevas ante entradas que antes se aceptaban por error; el contrato de las peticiones válidas no cambia.
