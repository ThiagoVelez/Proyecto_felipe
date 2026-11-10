# 06. Plan de mantenimiento (ISO/IEC 14764)

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

**Acciones nuevas de R3.** M-49 (fechas de citas con zona horaria, DEF-85), M-50 (parser y normalización del PDF417, DEF-86), M-51 (validar video en el servidor, DEF-87), M-52 (probar el modal real con axe-core, DEF-90), M-53 (retirar el dictamen de conformidad y rehacer la RTM, DEF-91) y M-54 (bitácora única con equivalencias SEC -> DEF, DEF-92). Prioridades vigentes y las 5 acciones de mayor retorno: `informe-revision-r3.md`, sección 8.

## 1. Convenciones

- **Tipo (ISO/IEC 14764):** *Correctiva* (corrige un defecto), *Preventiva* (evita defectos latentes), *Adaptativa* (ajusta a cambios del entorno: dependencias, motores, plataformas) y *Perfectiva* (mejora la mantenibilidad o agrega capacidades).
- **Esfuerzo:** S ≤ 1 día-persona, M 2–4 días, L ≥ 5 días.
- **Responsable sugerido** según los roles del README: **LT** = Líder técnico / Arquitecto (Santiago Vélez), **RP** = Responsable de Pruebas (Santiago Arcos), **RC** = Responsable de Calidad (Juan José Sánchez), **EQ** = equipo completo (documentación).
- **Estado:** `Hecho (rama)` = implementado y probado en `calidad/auditoria-iso25010`, pendiente de revisión y fusión; `Propuesto` = no implementado.
- **Decisión del equipo:** la acción cambia el esquema, el contrato de la API, la arquitectura o un comportamiento documentado, por lo que Calidad no la implementa sin aprobación.

## 2. Acciones

| ID | Origen | Tipo | Descripción | Esfuerzo | Riesgo de no hacerla | Responsable | Prioridad | Estado |
|---|---|---|---|---|---|---|---|---|
| M-01 | DEF-05 | Correctiva | Validar que el paciente de la prescripción coincida con el del folio | S | Prescripción peligrosa permitida | RC | P1 | Hecho (rama) |
| M-02 | DEF-05 | Preventiva | Eliminar `patient_id` del contrato de prescripción y derivarlo del folio | S | Reintroducir DEF-05 desde otro cliente | LT | P2 | Propuesto (API) |
| M-03 | DEF-06 | Correctiva | Normalización Unicode de principios activos y tabla de reactividad cruzada por familia | M | Reacción alérgica grave | LT + RP | P1 | Propuesto (esquema) |
| M-04 | DEF-07, DEF-19 | Correctiva | Contrato de idempotencia por UUID en los tres adaptadores (igual -> ignorar; distinto y cerrado -> conflicto) | M | Pérdida o alteración de folios firmados; lotes rurales bloqueados | LT | P1 | Propuesto (API) |
| M-05 | DEF-08 | Correctiva | Rechazar niveles Manchester fuera del catálogo | S | Pacientes sin prioridad válida | RC | P1 | Hecho (rama) |
| M-06 | DEF-08 | Preventiva | Exigir y auditar la justificación al asignar un nivel menos urgente que el sugerido | S | Subtriaje sin trazabilidad | LT + líder clínico | P2 | Propuesto (decisión clínica) |
| M-07 | DEF-09, DEF-27 | Correctiva | Completar los discriminadores Manchester (hipotermia, FR) y las cotas superiores de signos, validados clínicamente | M | Subtriaje de pacientes graves | LT + líder clínico + RP | P1 | Propuesto |
| M-08 | DEF-10 | Correctiva | Fallar al arrancar si el motor configurado no responde, salvo `ALLOW_MEMORY_FALLBACK=true` en desarrollo | S | Pérdida silenciosa de registros clínicos | LT | P1 | Propuesto (comportamiento documentado) |
| M-09 | DEF-11, DEF-42 | Correctiva | Semillas de demostración solo con `APP_ENV=development`; `ADMIN_INITIAL_PASSWORD` obligatorio; cambio de contraseña en el primer ingreso; `crypto.HashPassword` en el seeder; rotar credenciales | S | Toma de cuentas clínicas | LT | P1 | Propuesto |
| M-10 | DEF-12 | Correctiva | Bloquear el arranque con `JWT_SECRET` ausente, corto o publicado | S | Tokens forjables | RC | P1 | Hecho (rama) |
| M-11 | DEF-13 | Correctiva | Verificar `is_active` (o `token_version`) en el middleware; TTL de 15–60 min con *refresh token* | M | Personal suspendido con acceso | LT | P1 | Propuesto (API) |
| M-12 | DEF-14 | Correctiva | Rotación de MFA con el TOTP actual; MFA obligatorio para MEDICO, ADMIN y AUDITOR | M | Segundo factor eludible | LT | P2 | Propuesto (API) |
| M-13 | DEF-15 | Correctiva | Límite por cuenta en login y TOTP con espera exponencial; `ProxyHeader` y proxies de confianza | S | Fuerza bruta; denegación de servicio a toda la IPS | LT | P2 | Propuesto |
| M-14 | DEF-16 | Correctiva | Operación atómica `CloseRecordChained` con `SELECT … FOR UPDATE` o un mutex por paciente | M | No repudio inválido ante auditorías | LT | P2 | Propuesto (puerto) |
| M-15 | DEF-17 | Correctiva | Control de propiedad en `CloseAndSign` y `AddClarification`; hash con `record.DoctorID` | S | Firma de folios ajenos | LT | P2 | Propuesto |
| M-16 | DEF-18 | Correctiva | DTO de sincronización, autoría derivada del token, hash previo resuelto por el servidor y firma por dispositivo | L | Suplantación de autoría clínica | LT | P1 | Propuesto (API) |
| M-17 | DEF-20 | Correctiva | Truncar `closed_at` a segundos antes de calcular y persistir el hash | S | Verificaciones falsas negativas en MySQL | LT | P2 | Propuesto |
| M-18 | DEF-21, DEF-22, DEF-23 | Correctiva | Integrar las pantallas clínicas con la API; `strict: true` en gobierno y auditoría; quitar la validación TOTP del cliente | L | El usuario cree registrar lo que no se registra | LT + RP | P1 | Propuesto |
| M-19 | DEF-44 | Perfectiva | Adaptador `database/sql` común parametrizado por dialecto (elimina la duplicación del 14,46 %) | L | Correcciones aplicadas a un solo motor | LT | P4 | Propuesto (arquitectura) |
| M-20 | DEF-24 | Adaptativa | Actualizar Fiber (≥ 2.52.9), `x/crypto` y la imagen Go del Dockerfile; volver bloqueante govulncheck | S | Caída del proceso explotable | LT | P2 | Propuesto |
| M-21 | DEF-25 | Correctiva / adaptativa | DDL de PostgreSQL con triggers; triggers en aclaraciones; usuario de aplicación sin DDL | M | Inmutabilidad solo nominal | LT | P2 | Propuesto (esquema) |
| M-22 | DEF-26 | Correctiva | Endpoints de admisión de pacientes y alergias para ADMISION y MEDICO | M | Flujo clínico no operable | LT | P2 | Propuesto (API) |
| M-23 | DEF-27 | Correctiva | Rechazar FC > 300 lpm | S | Datos fisiológicos imposibles | RC | P3 | Hecho (rama) |
| M-24 | DEF-28 | Correctiva | Copiar las cadenas de Fiber antes de la goroutine de auditoría | S | Bitácora forense corrupta | RC | P2 | Hecho (rama) |
| M-25 | DEF-29 | Correctiva | Serialización canónica del hash con `hash_version` | M | Colisiones de integridad | LT | P3 | Propuesto (esquema) |
| M-26 | DEF-30 | Perfectiva | Verificación de la cadena completa por paciente para AUDITOR | M | No repudio no demostrable | LT | P2 | Propuesto (API) |
| M-27 | DEF-31 | Correctiva | Validar la contraseña antes del estado y usar un hash ficticio para usuarios inexistentes | S | Enumeración de cuentas | LT | P3 | Propuesto |
| M-28 | DEF-32 | Preventiva | `/health/live` y `/health/ready` con ping a la base de datos | S | Orquestador ciego ante caídas de MySQL | LT | P3 | Propuesto |
| M-29 | DEF-33 | Correctiva | `GET /auth/me` al cargar; *cookie* `HttpOnly` a mediano plazo; corregir el diagrama 12 | M | Robo de sesión por XSS | LT | P3 | Propuesto (API) |
| M-30 | DEF-34 | Preventiva | Quitar los puertos de MySQL y del backend; secretos en `.env` no versionado; rotación | S | Acceso directo a la base | LT | P2 | Propuesto |
| M-31 | DEF-35 | Preventiva | Cabeceras de seguridad por `include` en cada `location`, CSP, TLS y HSTS | S | XSS con exfiltración del token | LT | P3 | Propuesto |
| M-32 | DEF-36 | Correctiva | Fondos sólidos detrás de los textos del banner; auditoría con axe-core | S | Exclusión de usuarios con baja visión | LT | P3 | Propuesto |
| M-33 | DEF-37 | Correctiva | Devolver copias en `GetByID` del adaptador en memoria | S | Carreras de datos y mutaciones externas | LT | P3 | Propuesto |
| M-34 | DEF-38 | Correctiva | Descuento atómico de inventario dentro de la transacción | S | Stock negativo | LT | P3 | Propuesto |
| M-35 | DEF-39 | Correctiva (documental) | Alinear especificación, README y diagramas con el código; tildes en `docs/` | M | Decisiones basadas en afirmaciones falsas | EQ | P2 | Parcial: `informe-calidad.md` y README (Trello, RF, badge) hechos en la rama |
| M-36 | DEF-40 | Preventiva | *Fixtures* con principios activos reales; reubicar la prueba de `core/services`; `@vitest/coverage-v8` como devDependency; RTM con nombres de prueba | S | Pruebas en verde que no detectan defectos | RP | P2 | Propuesto (a RP) |
| M-37 | DEF-41 | Correctiva | Aceptar solo un UUID canónico como *correlation id* | S | Datos arbitrarios en la bitácora | RC | P4 | Hecho (rama) |
| M-38 | DEF-42 | Correctiva | Usar `crypto.HashPassword` en el seeder | S | Hashes más débiles | LT | P4 | Propuesto (incluido en M-09) |
| M-39 | DEF-43 | Correctiva | Reemplazar datos personales por datos sintéticos o registrar la autorización del titular | S | Incumplimiento de la Ley 1581 | EQ | P3 | Propuesto |
| M-40 | DEF-44 | Perfectiva | Dividir `AdminDashboardScreen.jsx` y `SuggestManchesterPriority` (tabla de reglas); corregir la regla `api` de `.gitignore`; mapear 404 en `/verify` y `/mfa/setup` | M | Mantenimiento lento y propenso a errores | LT | P4 | Propuesto |
| M-41 | DEF-45 | Adaptativa | Migrar Vite y Vitest a versiones vigentes | M | Herramientas de desarrollo vulnerables | LT + RP | P4 | Propuesto |
| M-42 | Auditoría | Preventiva | Pipeline `calidad.yml`, `.golangci.yml`, ESLint y plantillas de PR y de defecto | S | Regresiones sin detectar | RC | P1 | Hecho (rama) |
| M-43 | Auditoría | Preventiva | Lista «En revisión de calidad» en Trello (ver `trello-tarjetas-defectos.md`) | S | Tarjetas cerradas sin verificación | RC | P2 | Propuesto (Trello) |
| M-44 | Auditoría | Preventiva | Volver bloqueantes gosec, govulncheck, staticcheck y `npm audit` completo cuando se cierren DEF-11, 24, 44 y 45; subir el umbral de cobertura del 60 % al 70 % | S | Deuda de seguridad aceptada indefinidamente | RC | P3 | Propuesto |
| M-45 | DEF-46 | Correctiva | Devolver copias del catálogo de medicamentos en el adaptador en memoria | S | Carrera de datos en prescripciones concurrentes | RC | P2 | Hecho (rama) |
| M-46 | DEF-47 | Correctiva | HMAC-SHA1 local para TOTP cuando Web Crypto no está disponible | S | Códigos MFA falsos fuera de contexto seguro | RC | P2 | Hecho (rama) |
| M-47 | DEF-48 | Preventiva | Usar `app.Test(req, -1)` en `staff_register_routes_test.go` y retirar el `-skip` del paso `-race` de `calidad.yml` | S | Prueba excluida del detector de carreras | RP | P3 | Propuesto (a RP) |

## 3. Matriz impacto x esfuerzo

El impacto se deriva de la severidad del defecto de origen (Crítica o Alta = alto).

| | **Esfuerzo S** | **Esfuerzo M** | **Esfuerzo L** |
|---|---|---|---|
| **Impacto alto** | M-01 (H), M-05 (H), M-08, M-09, M-10 (H), M-13, M-15, M-17, M-20, M-24 (H), M-42 (H), M-46 (H) | M-03, M-04, M-07, M-11, M-12, M-14, M-21, M-22 | M-16, M-18 |
| **Impacto medio** | M-02, M-06, M-23 (H), M-27, M-28, M-30, M-31, M-32, M-33, M-34, M-36, M-45 (H) | M-25, M-26, M-29, M-35 | — |
| **Impacto bajo** | M-37 (H), M-38, M-39, M-43, M-44, M-47 | M-40, M-41 | M-19 |

(H) = hecho en la rama.

## 4. Las 5 acciones de mayor retorno antes de la entrega final

Criterio: impacto alto, esfuerzo S o M, sin dependencia de otras acciones y reducción directa de defectos Críticos o Altos.

1. **M-09: retirar las credenciales sembradas y rotarlas** (S, DEF-11 y DEF-42). Elimina la vía más simple de comprometer una cuenta clínica.
2. **M-08: fallar de forma visible sin base de datos** (S, DEF-10). Evita la pérdida silenciosa de registros; es un cambio de unas pocas líneas en `main.go`, pero requiere que el equipo acepte modificar un comportamiento documentado.
3. **M-15 + M-17: control de propiedad en el cierre y truncado de `closed_at`** (S + S, DEF-17 y DEF-20). Restablece el no repudio de RF04 sin tocar el esquema.
4. **M-11: rechazar tokens de usuarios inactivos** (M, DEF-13). Da efecto real a la gobernanza ReTHUS de RF07.
5. **M-04: idempotencia de la sincronización** (M, DEF-07 y DEF-19). Cierra el único defecto Crítico que altera folios ya firmados.

Siguiente candidata, por su bajo esfuerzo: **M-18 parcial**, es decir, solo `strict: true` en `api.js` para las operaciones de gobierno (S). Requiere coordinar con RP el ajuste de `AdminGovernance.test.jsx`.

## 5. Estado de la rama `calidad/auditoria-iso25010`

| Hecho por Calidad | Propuesto (requiere al equipo) |
|---|---|
| M-01, M-05, M-10, M-23, M-24, M-37, M-42, M-45, M-46, parte de M-35 | El resto. Las que requieren decisión del equipo por esquema, API, arquitectura o comportamiento documentado son M-02, M-03, M-04, M-06, M-08, M-11, M-12, M-14, M-16, M-19, M-21, M-22, M-25, M-26 y M-29. |
