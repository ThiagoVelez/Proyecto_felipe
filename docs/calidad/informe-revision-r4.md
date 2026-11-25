# Informe de la revisión de calidad R4 (24 nov 2026)

<!-- cifras-r4 -->
> **Cifras vigentes de la revisión R4 (24 nov 2026, base `6a51bb8`).** Fuente única: `anexos/cifras-r4.json`; coherencia comprobada con `anexos/verificar_cifras_r4.py`. Detalle en `informe-revision-r4.md`.
>
> - Verificación del cierre (DEF-01 a DEF-98): 67 verificados, 7 verificados parcialmente, 18 revisados sin prueba, 3 no verificables, 3 reabiertos (DEF-50, DEF-72, DEF-91). Reproducciones de R3 que hoy pasan: 22 de 22.
> - Defectos registrados: 110. Nuevos de R4: 12 (0 críticos, 2 altos, 8 medios, 2 bajos). Abiertos: 16 (1 crítico, 3 altos, 9 medios, 3 bajos). Reproducciones de defectos abiertos: 6 de 6.
> - Pruebas backend (pasan / fallan / omitidas): 154 / 0 / 0. Cobertura backend: 52,1 % con el comando de R3 y 72,7 % sin adaptadores MySQL/PostgreSQL. Vitest (pruebas / archivos): 147 / 20. Cobertura frontend: 61,02 %.
> - Análisis estático: golangci-lint 0; staticcheck 0; gosec 0; gocyclo 21 funciones mayores de 15 (12 en src); govulncheck 1 alcanzable (GO-2026-6859); npm audit prod-dev 0-0; ESLint 0 / 128.
> - Rendimiento: p95 3,45 ms; memoria 15,07 MB. OWASP ASVS L2 (muestra de 53): 34,0 % en R1 -> 45,3 %. Mutaciones detectadas: 4 de 7.
> - Afirmaciones del README (V / P / NV / F): 19 / 19 / 1 / 5 en las 48 de R3 (4 retiradas); 30 / 26 / 8 / 14 en total. RTM: 11 de 24 requisitos sostenidos. Dictamen: **No conforme con ISO/IEC 25010:2023**.
<!-- /cifras-r4 -->

- **Proyecto:** SaludConecta IPS v2.4 (Ingeniería de Software II, COTECNOVA, 2026-2).
- **Responsable:** Juan José Sánchez, Responsable de Calidad.
- **Modelo:** ISO/IEC 25010:2023. Clasificación de defectos: IEEE 1044. Mantenimiento: ISO/IEC 14764. Seguridad: OWASP ASVS 4.0.3 nivel 2.
- **Base auditada:** `origin/main` `6a51bb8` (merge del PR #13, 23 nov 2026). Rama de trabajo: `calidad/revision-r4`.
- **Evidencia:** `docs/calidad/anexos/evidencias/r4/` (cada archivo empieza con `# comando:` y `# fecha:`). Cifras: `anexos/cifras-r4.json`, comprobadas con `anexos/verificar_cifras_r4.py`.
- **Pregunta central:** ¿es cierto que los defectos están cerrados, y el cierre se hizo sin debilitar las pruebas ni introducir defectos nuevos?

---

## 1. Resumen ejecutivo

**Estado en una frase:** el cierre de R3 es real en su gran mayoría (67 de 98 defectos verificados ejecutando pruebas, sin pruebas debilitadas y con los 25 críticos históricos de seguridad del paciente en verde), pero tres cierres no se sostienen (DEF-50, DEF-72 y DEF-91) y los módulos nuevos traen 12 defectos, ninguno crítico; el producto sigue **No conforme** con ISO/IEC 25010:2023 porque queda un crítico abierto que anula el segundo factor de cualquier cuenta (DEF-50).

### 1.1 Semáforo ISO/IEC 25010:2023

| Característica | R3 | R4 | Motivo principal en R4 |
|---|---|---|---|
| Adecuación funcional | Rojo | Verde | Los críticos de prescripción, farmacia, citas y enfermería siguen corregidos (pruebas y caja negra); 4 de 7 mutaciones detectadas, 2 cubiertas por una segunda barrera y 1 sin prueba (Glasgow 8, DEF-110) |
| Eficiencia de desempeño | Verde | Verde | p95 3,45 ms con cliente Python (RNF01: 400 ms); `Immutable` cuesta 1 % (`evidencias/r4/48`) |
| Compatibilidad | Amarillo | Amarillo | PostgreSQL sigue con 9 módulos en memoria (bloqueado por defecto); pruebas con motores reales fuera del pipeline (DEF-102) |
| Capacidad de interacción | Amarillo | Amarillo | Se sigue afirmando WCAG AAA; `text-outline` da 4,27:1 (no llega ni a AA) |
| Fiabilidad | Rojo | Amarillo | Pérdidas de datos de R3 corregidas; persistencia real sin pruebas automáticas en CI (DEF-102) |
| Seguridad | Rojo | Rojo | Semilla TOTP de otra cuenta con cualquier sesión (DEF-50, crítico), BD sin TLS (DEF-100), portal que cambia el correo de un paciente (DEF-99) |
| Mantenibilidad | Amarillo | Amarillo | Lint en 0 real; cobertura comparable 72,7 %; gocyclo sube a 21 funciones; DEF-93 a 98 sin ficha |
| Flexibilidad | Amarillo | Amarillo | Versiones de Go distintas en CI (1.27.3) y en la imagen (1.22) (DEF-103) |
| Seguridad operacional (*Safety*) | Rojo | Verde | Los 25 críticos de R1 y R3 en verde; alergias, hipotermia, folio e inmutabilidad confirmados también en caja negra |

### 1.2 Cifras clave R1 -> R3 -> R4

| Indicador | R1 | R3 | R4 | Evidencia R4 |
|---|---|---|---|---|
| Pruebas backend (pasan / fallan / omitidas) | 17 / 0 / 12 | 91 / 0 / 22 | 154 / 0 / 0 | `12-go-test-tests.txt` |
| Cobertura backend, comando de R3 (`-coverpkg=saludconecta-backend/...`) | 60,3 % | 68,9 % | 52,1 % | `13-cover-func-tests.txt` |
| Cobertura backend sin adaptadores MySQL/PostgreSQL (comparable, ver 3.4) | — | — | 72,7 % | `13c-cover-func-sin-adaptadores.txt` |
| Vitest (pruebas / archivos) | 31 | 108 / 15 | 147 / 20 | `24-vitest.txt` |
| Cobertura frontend (sentencias) | — | 72,85 % | 61,02 % | `25-vitest-coverage.txt` |
| golangci-lint ; staticcheck ; gosec ; gocyclo > 15 | — | 62 ; — ; — ; 16 | 0 ; 0 ; 0 ; 21 | `05`, `04`, `06`, `08` |
| govulncheck alcanzables ; npm audit prod-dev | — | 1 ; 0-6 | 1 ; 0-0 | `07`, `22`, `22b` |
| ESLint errores / avisos | — | 0 / 89 | 0 / 128 | `23-eslint.txt` |
| p95 HTTP real ; memoria | — | 1,38 ms ; 11,5-16,3 MB | 3,45 ms ; 15,07 MB | `42-caja-negra.txt` |
| OWASP ASVS L2 (muestra de 53) | 34,0 % | — | 45,3 % | `60-asvs-l2-muestra-53.md` |
| Afirmaciones (V / P / NV / F) | — | 7 / 24 / 2 / 15 | 19 / 19 / 1 / 5 (las 48 comparables; 4 retiradas) | `50-afirmaciones-readme.md` |
| RTM: requisitos sostenidos | — | 5 de 21 | 11 de 24 | `51-rtm-verificacion.md` |
| Defectos abiertos (C / A / M / B) | — | 18 / 9 / 28 / 8 | 1 / 3 / 9 / 3 | bitácora, sección 2 |

Valores de R1 tomados de `anexos/linea-base.md` (sección «estado final») y `05-auditoria-owasp-asvs-l2.md`; de R3, de `anexos/cifras-r3.json`. Lo no medido en esa revisión figura con «—».

### 1.3 Principales hallazgos

1. **DEF-50 reabierto (crítico).** `GET /api/v1/auth/mfa-seed?email=` entrega la semilla TOTP de cualquier cuenta a cualquier usuario con sesión. Un enfermero obtiene la del administrador. El cierre solo exigió sesión.
2. **DEF-99 (alto).** Una solicitud anónima del portal con el documento de un paciente existente sin correo deja el correo del solicitante en la ficha real al agendarla; desde ahí le llegan citas, recetas y resultados.
3. **DEF-72 reabierto y DEF-100.** ADMIN sigue leyendo la bandeja de farmacia (200 en caja negra) y puede dispensar; la conexión a MySQL y PostgreSQL no usa TLS, aunque el equipo declara trabajar con la base en la nube.

### 1.4 Principales aciertos

- Las **22 reproducciones de R3 siguen existiendo, no se omiten y pasan** con las mismas aserciones (`31-reproducciones-r3-hoy.txt`): se cerraron por la razón correcta.
- **No se debilitaron pruebas**: ninguna aserción eliminada sin reemplazo, ningún `t.Skip` nuevo fuera de las pruebas de integración, y la configuración de lint se endureció (se quitó `new-from-rev`).
- **golangci-lint, staticcheck y gosec en 0** de verdad, con solo 5 supresiones, todas justificadas.
- **Seguridad del paciente**: alergias por familia y con tildes (422), hipotermia de 30 °C (Nivel II), receta en folio ajeno (409) e inmutabilidad del folio cerrado en la sincronización, comprobadas además contra el backend en marcha.
- **Encargado de TI y registro de administradores bien diseñados**: código comparado en tiempo constante, un solo uso, no aparece en los registros, rol no manipulable, administradores de sede nacen inactivos.
- **Sin datos clínicos en el navegador** y CSP sin `unsafe-inline` en `script-src`.

---

## 2. Alcance y método

- **Código:** `src/backend` (Go 1.27.3 local; `go.mod` declara 1.22), `src/frontend` (React, Vite 6, Vitest 4), `tests/`, pipeline `.github/workflows/calidad.yml`, `docker-compose.yml`.
- **Herramientas con las versiones del pipeline:** golangci-lint 2.15.0, staticcheck 0.8.2, gosec 2.30.0, govulncheck 1.9.0, gocyclo 0.6.0; gitleaks 8.30.1 (`01-versiones.txt`, `46-gitleaks.txt`).
- **Ejecución:** mismos comandos de R3 (`anexos/linea-base-r4.sh`), caja negra contra `cmd/api` con `DB_DRIVER=memory` y secretos generados al vuelo (`anexos/caja_negra_r4.py`), mutaciones sobre una copia exportada (`anexos/mutaciones_r4.py`), y verificación automática del cierre (`anexos/verificar_cierre_r4.py`).
- **Verificado** significa que se ejecutó algo que lo demuestra; **revisado**, que solo se leyó el código o el documento.
- **Apoyo:** la reevaluación de afirmaciones del README, RTM, rango de requisitos y WCAG (`50` a `53`), y la de ASVS y sesión (`60`, `61`), se hicieron con subagentes de Claude Code bajo las mismas reglas de evidencia; Calidad comprobó por sí misma los hallazgos que pasaron a la bitácora (DEF-50 y DEF-107 con prueba propia).

## 3. Verificación del cierre (hipótesis A)

### 3.1 Resultado por defecto (H-R4-01): Dividida

Tabla completa en [`anexos/verificacion-cierre-r4.md`](anexos/verificacion-cierre-r4.md).

| Categoría | Defectos |
|---|---|
| Verificado | 67 |
| Verificado parcialmente | 7 |
| Revisado sin prueba | 18 |
| No verificable | 3 |
| Reabierto | 3 |

- **Reabiertos:** DEF-50 (semilla TOTP), DEF-72 (ADMIN en recetas y farmacia) y DEF-91 (el README sigue publicando «Aprobado con distinción de excelencia (100 % de conformidad)», `README.md:2151` y `:2367`).
- **No verificables:** DEF-25, DEF-56 y DEF-65, cuya única evidencia son pruebas con `-tags integration` que nadie ejecuta (DEF-102).
- **Revisados sin prueba:** 18, la mayoría de documentación o configuración (DEF-34, 35, 39, 43, 92) y defectos de frontend sin prueba citada (DEF-76, 77, 78, 81). DEF-93 a DEF-96 no tienen ficha (DEF-104).

### 3.2 Reproducciones de R3 (H-R4-02): Refutada

Las 22 pruebas de `defectos-abiertos.txt` de R3 existen en `main`, ya no llaman a `requireDefectoAbierto` ni a `t.Skip` y pasan. Su cuerpo no cambió salvo el constructor de farmacia en DEF-59 (nuevo parámetro). Una prueba que fallaba por el defecto y hoy pasa con la misma aserción demuestra el cierre (`31-reproducciones-r3-hoy.txt`).

### 3.3 Pruebas debilitadas (H-R4-03): Refutada, con observaciones

`git diff calidad/revision-r3..origin/main -- tests/` (41 archivos, +2 983 / -312):

| Cambio | Valoración |
|---|---|
| 22 llamadas a `requireDefectoAbierto` retiradas | Justificado: los defectos se cerraron y las pruebas pasan a regresión permanente |
| `app.Test(req)` -> `app.Test(req, -1)` en `auth_security_test.go` (sin límite de tiempo) | Justificado por DEF-48; las aserciones no cambian |
| `AuthMfa.test.jsx`: se eliminan 2 pruebas del modal de registro de administrador | La funcionalidad se trasladó al Encargado de TI; `TiSetup.test.jsx` (245 líneas nuevas) cubre el registro nuevo |
| `AdminOrgChartAndBranches`, `AdminGovernance`, `DoctorLayout`, `NurseModules`: se quitan aserciones con nombres reales | Justificado por DEF-43 (datos personales de apariencia real) |
| `controldefectos`: se quita el caso «lista solo con comentarios es inválida» | Justificado: la lista vacía pasó a ser válida; ver H-R4-05 |
| `dirPDFConMargen`: el borrado del directorio de PDF espera 300 ms | Oculta en la prueba una goroutine que sobrevive a la petición (DEF-95); aceptable como prueba, pero el servicio no ofrece forma de esperar el envío |
| `t.Skip` nuevos | Solo en pruebas de integración sin motor (`MYSQL_TEST_HOST`, `PG_TEST_HOST`) |

No se encontraron tolerancias ampliadas ni umbrales bajados (el umbral de cobertura del pipeline sigue en 60 %).

### 3.4 Cobertura y denominador (H-R4-04): Refutada

El commit `337e31e` excluye los adaptadores MySQL y PostgreSQL. La medición muestra que es la decisión correcta para comparar:

- Con el comando de R3 la cobertura da **52,1 %**, pero no porque se perdieran pruebas: `calidad_r3_cierre_backend_test.go` importa la fábrica `adapters/storage` y eso enlaza por primera vez los adaptadores MySQL (1 222 sentencias) y PostgreSQL (549) al binario de prueba, con 0 % (`13d-cobertura-por-paquete.txt`). El perfil de R3 no contenía esos paquetes (`r3/13-cover-func-tests.txt`).
- Sin adaptadores, la cifra comparable con 60,3 % -> 68,9 % es **72,7 %** (`13c`), la misma que publica el pipeline de `main` (`45-ci-main-race.txt`).
- Lo que sí queda al descubierto: el 28 % del backend (la persistencia real) no se prueba en ningún paso automático (DEF-102).

### 3.5 Control de defectos abiertos (H-R4-05): Dividida

Con la lista vacía de `main`, `controldefectos -regex` devuelve `^$`, `go test` ejecuta **0 pruebas** y el job pasa en vacío; lo único que comprueba es que ninguna prueba de dos archivos fijos llame a `requireDefectoAbierto` (`33-control-defectos-lista-vacia.txt`). R4 agrega 6 reproducciones (DEF-50, 72, 99, 100, 101, 107), amplía `-fuente` para incluir `calidad_r4_regression_test.go` y el control local da **6 de 6** fallos esperados, código 0 (`32-control-defectos-local.txt`). Recomendación: que `-fuente` lea todos los `*_test.go` para que ninguna prueba abierta quede invisible.

### 3.6 Lint sin trampas (H-R4-06): Refutada

Desde R3 se agregaron 2 `#nosec`, 1 `//nolint` y 1 `eslint-disable`, cada uno con su motivo (`30-supresiones-lint.txt`), y `.golangci.yml` dejó de filtrar por `new-from-rev`: hoy analiza todo el código. El 0 es real.

### 3.7 DEF-44 parcial (H-R4-07): Dividida

gocyclo da 21 funciones > 15: 12 en `src` (coincide con las 12 aceptadas) y 9 en pruebas (`08-gocyclo.txt`). La aceptación está justificada (refactorizar lógica clínica tiene más riesgo que beneficio), pero la lista no está enumerada, no hay plan y la complejidad creció: `DispatchTreatment` 22 -> 30, `RegisterPatient` 18 -> 21, `MarkAsDispensedTx` 16 -> 19, y entran `SetupRoutes` (24) y `labOrderService.Create` (22).

### 3.8 Vulnerabilidades (H-R4-08): Confirmada

- GO-2026-6888 (brotli) ya no es alcanzable (DEF-83 verificado).
- Aparece **GO-2026-6859** en `net/http` de Go 1.27.3 (corregida en 1.27.4), alcanzable según govulncheck en local y en el pipeline de `main`, que la reporta en un paso informativo. La imagen Docker compila con Go 1.22, sin soporte (DEF-103).
- `npm audit`: 0 en producción y 0 en desarrollo (DEF-45 verificado).

## 4. Regresión de los críticos históricos (hipótesis B)

### 4.1 Críticos de R1 y R3 (H-R4-09): Refutada

Las pruebas de regresión de DEF-05 a DEF-11 y de los 18 críticos de R3 pasan (`12-go-test-tests.txt`), y con `-race` en el run `45183473187` (`45-ci-main-race.txt`). Caja negra contra el backend real (`42-caja-negra.txt`):

| Caso | Resultado |
|---|---|
| Alergia «Penicilína» (tilde, familia) y receta de amoxicilina | 422, bloqueada |
| Receta en el folio de A con `patient_id` de B (DEF-05) | 409, rechazada |
| Triaje con 30,0 °C (DEF-09) | Nivel II |
| Lote de sincronización sobre folio cerrado (DEF-07) | Anamnesis intacta |

### 4.2 Módulos en memoria con PostgreSQL (H-R4-10): Refutada

`ALLOW_POSTGRES_MEMORY_MODULES` vale `false` en `.env.example`, `docker-compose.yml` no la pasa y sin ella el arranque falla con un mensaje que lista los 9 módulos que se perderían (citas, inventario, recetas v2, educación, reportes de farmacia, solicitudes de cita, laboratorio, enfermería, sedes; `factory.go:50`). Con `true`, `/health/ready` declara la persistencia mixta. El riesgo está documentado y desactivado por defecto.

### 4.3 Contexto de Fiber (H-R4-11): Refutada, con una observación

Las cuatro goroutines (`audit_middleware.go:94`, `appointment_service.go:99`, `treatment_service.go:154`, `appointment_request_service.go:325`) reciben copias de los datos, y `Immutable: true` está activo en producción (`server.go:38`) y en las pruebas de Calidad. Observación: `appointment_service.go` crea el contexto de la goroutine con `context.WithoutCancel(ctx)` sobre el `RequestCtx` de fasthttp, que se recicla; hoy solo se usa como plazo y no se leen valores, pero conviene partir de `context.Background()`. Costo de `Immutable`: de 18,0-18,5 µs a 18,2-18,7 µs por petición y 6 asignaciones más (`48-benchmark-immutable.txt`).

## 5. Funcionalidades nuevas (hipótesis C)

| Hipótesis | Veredicto | Evidencia y defectos |
|---|---|---|
| H-R4-12 Código de instalación de TI | Refutada | Lo define el operador (`TI_SETUP_CODE`, mínimo 12 caracteres, rechaza el ejemplo de la plantilla), comparación en tiempo constante, un solo uso (409 al segundo registro), 10 intentos por minuto por IP y ausente de los registros (caja negra). Observación: no expira mientras no exista un TI |
| H-R4-13 Registro de administradores desde el login | Refutada | `role`, `role_id`, `is_active` y `mfa_secret` enviados por el cliente se ignoran; el administrador de sede nace inactivo y su login da 403. Defecto relacionado: contraseñas de 8 caracteres (DEF-107) |
| H-R4-14 Portal del paciente | Confirmada | No hay cuenta de paciente, así que no hay IDOR posible; 5 solicitudes por minuto por IP; correo validado. Pero la solicitud anónima cambia el correo de un paciente real (DEF-99) |
| H-R4-15 Matriz RBAC | Confirmada | TI y LABORATORIO no acceden a datos clínicos (`43-matriz-rbac-r4.md`, 32 rutas x 8 roles). ADMIN sí lee recetas y la bandeja de farmacia y puede dispensar (DEF-72 reabierto) |
| H-R4-16 Datos clínicos en el navegador | Refutada | No quedan datos clínicos en `localStorage` ni `sessionStorage`; solo perfil y foto del funcionario. El README (RF16) está desactualizado (`61-sesion-xss-almacenamiento.md`) |
| H-R4-17 Sesión por pestaña | Dividida | Tokens en `sessionStorage`, acceso 15 min y renovación 168 h; CSP sin `unsafe-inline` en `script-src` y sin `dangerouslySetInnerHTML`. Pero la renovación no tiene límite absoluto y el token de acceso sigue válido tras cerrar sesión (DEF-109) |
| H-R4-18 Retención y health | Refutada | `RETENCION_DOCUMENTOS_DIAS` borra solo copias locales de PDF y correos; la historia clínica vive en la base de datos y no se toca (no choca con la conservación exigida por la Resolución 1995). `/health/ready` solo devuelve `status` y `persistence` |
| H-R4-19 Correo y PDF | Dividida | Sin inyección de cabeceras (destinatarios validados con `mail.ParseAddress`, asuntos generados por el servidor). Pero los resultados van en texto plano al correo que indique quien despacha (DEF-108) y el fallo SMTP registra el correo sin enmascarar (DEF-101) |

## 6. Documentación y afirmaciones (hipótesis D)

| Hipótesis | Veredicto | Evidencia |
|---|---|---|
| H-R4-20 Afirmaciones del README | Confirmada | De las 48 de R3: 19 verificadas, 19 parciales, 1 no verificada, 5 falsas y 4 retiradas. Con las 34 nuevas: 30 / 26 / 8 / 14. Falsas relevantes: dictamen «100 %» (DEF-91), PWA y modo sin conexión (no hay *service worker*), umbrales de triaje distintos del código, `CalculateTriageLevel` inexistente, WCAG AAA (`50-afirmaciones-readme.md`) |
| H-R4-21 RTM y mutaciones | Dividida | 11 de 24 requisitos sostenidos (R3: 5 de 21); 4 pruebas citadas son de integración y no se ejecutan. Mutaciones: 4 de 7 detectadas; M4 y M5 sobreviven porque el adaptador repite la barrera (memoria y MySQL); M6 (Glasgow 8) sobrevive sin ninguna prueba (DEF-110). Copia restaurada y `git status` limpio en `src` (`54-mutaciones.txt`) |
| H-R4-22 `QA-actualizado.md` | Confirmada | Publica 14 suites y 105 pruebas; en `main` hay 20 archivos y 147 pruebas. Benchmarks publicados 5,55 ns/op y 3,23 µs/op; medidos 12,99-15,82 ns/op y 5,85-6,46 µs/op en este equipo (DEF-105, asignado a Pruebas; no se editó el archivo) |
| H-R4-23 Rama `QA` | Dividida | 69 commits detrás de `main`, base del 4 nov. El diff entre puntas muestra 46 977 líneas borradas, pero la fusión simulada con `git merge-tree` solo trae `QA-actualizado.md` y deja `README.md` en conflicto (DEF-106, Media; ver «Decisiones») |
| H-R4-24 Rango de requisitos | Confirmada | README y RTM de `main`: RF01-RF16; `docs/especificacion.md`: RF01-RF12; README de `QA`: RF01-RF12 en la tabla y RF13-RF20 en las notas finales, con RF13, RF15 y RF16 de distinto alcance (`52-rango-requisitos.md`) |
| H-R4-25 OWASP ASVS L2 | Confirmada | Misma muestra de 53: 24 cumplen, 22 parcial, 7 no cumplen; **34,0 % -> 45,3 %** (ponderado 50,9 % -> 66,0 %). 16 mejoras y 3 regresiones (3.3.2, 7.1.2, 8.3.1). Los 10 requisitos de módulos nuevos van en tabla aparte (`60-asvs-l2-muestra-53.md`) |
| H-R4-26 Accesibilidad | Confirmada | El README sigue afirmando AAA (líneas 350, 379, 525, 2084, 2811). El modal de alergias cumple 7:1, pero `text-outline` sobre fondo da 4,27:1 (427 usos) y `text-slate-500` del perfil 4,44:1 (`53-wcag.md`) |

## 7. Proceso y entorno (hipótesis E)

| Hipótesis | Veredicto | Evidencia |
|---|---|---|
| H-R4-27 Pipeline | Dividida | Los dos runs de `main` están en verde y los PR #12 y #13 se fusionaron con el último run en verde (los rojos previos se corrigieron antes). Pero `main` no tiene protección de rama (`protected: false`): el pipeline no es obligatorio (`44-pipeline-github.txt`) |
| H-R4-28 Secretos en el historial | Refutada | gitleaks sobre 205 commits: 18 coincidencias, todas sintéticas o marcadores, salvo un `JWT_SECRET` literal histórico en `docker-compose.yml` (commit `4bb8b54`), que el servidor actual rechaza al arrancar porque está en `knownInsecureSecrets` (`46-gitleaks.txt`; valores no copiados) |
| H-R4-29 Despliegue | Dividida | **No medido**: Docker no está instalado en el equipo de evaluación. Revisado por configuración: `docker-compose.yml` exige `DB_ROOT_PASSWORD`, `DB_PASSWORD` y `JWT_SECRET` con `:?` (no arranca sin `.env`), los 3 servicios tienen *healthcheck*, MySQL y backend solo escuchan en `127.0.0.1` |
| H-R4-30 Trazabilidad | Dividida | 11 de 36 commits del cierre citan un DEF; 24 defectos cerrados no aparecen en ningún mensaje del rango. 25 commits llevan coautoría «Claude Opus 5.5», mientras el README declara «Claude Code con Sonnet 5.5» y Gemini (`47-trazabilidad-commits.txt`). Se informa sin juzgar: conviene declarar el modelo real y citar el DEF en cada commit de cierre |

Las 30 hipótesis tienen veredicto: 12 refutadas (el problema no existe), 8 confirmadas y 10 divididas.

## 8. Defectos nuevos y reabiertos

| ID | Título | Severidad | Verificado / revisado | Responsable sugerido |
|---|---|---|---|---|
| DEF-50 | Reabierto: semilla TOTP de otra cuenta con cualquier sesión | Crítica | Verificado (prueba) | Santiago Vélez |
| DEF-91 | Reabierto: el README sigue publicando un dictamen «100 %» | Alta | Revisado | Santiago Vélez |
| DEF-72 | Reabierto: ADMIN en recetas, bandeja de farmacia y dispensación | Media | Verificado (prueba y caja negra) | Santiago Vélez |
| DEF-99 | El portal asigna a un paciente existente el correo de una solicitud anónima | Alta | Verificado (prueba y caja negra) | Santiago Vélez |
| DEF-100 | Conexión a MySQL y PostgreSQL sin TLS | Alta | Verificado (prueba) | Santiago Vélez |
| DEF-101 | El fallo SMTP registra el correo en claro | Baja | Verificado (prueba) | Santiago Vélez |
| DEF-102 | Pruebas con MySQL/PostgreSQL reales fuera del pipeline | Media | Verificado (cobertura) | Santiago Arcos |
| DEF-103 | Go 1.22 en la imagen y 1.27.3 con GO-2026-6859 en CI | Media | Verificado (govulncheck) | Santiago Vélez |
| DEF-104 | DEF-93 a DEF-98 sin ficha y pruebas citadas con nombres inexistentes | Baja | Verificado | Juan José Sánchez |
| DEF-105 | `QA-actualizado.md` con cifras que no corresponden a `main` | Media | Verificado | Santiago Arcos |
| DEF-106 | Rama `QA` 69 commits detrás con el README en conflicto | Media | Verificado | Santiago Arcos |
| DEF-107 | Contraseñas de 8 caracteres en cuentas privilegiadas y de 1 en personal | Media | Verificado (prueba) | Santiago Vélez |
| DEF-108 | Resultados de laboratorio al correo que indique quien despacha | Media | Revisado | Santiago Vélez |
| DEF-109 | Sesión sin límite absoluto y token de acceso vigente tras el cierre | Media | Revisado | Santiago Vélez |
| DEF-110 | Frontera Glasgow 8 del Nivel I sin prueba (mutación sobreviviente) | Media | Verificado (mutación) | Santiago Arcos |

Fichas completas en `04-bitacora-defectos.md`. Las seis reproducciones automatizadas están en `tests/backend/calidad_r4_regression_test.go` y en `defectos-abiertos.txt`; `TestR4GlasgowOchoEsNivelI` y `TestR4MatrizRBACRutasNuevasYRolesTI` quedan como regresión permanente.

## 9. Dictamen

**No conforme con ISO/IEC 25010:2023.**

La condición mínima fijada en R3 para un dictamen favorable era cerrar los 18 críticos y DEF-91 con pruebas de regresión en el pipeline. Los 18 críticos de R3 están cerrados y verificados, pero DEF-91 se reabre y aparece un crítico reabierto, DEF-50, que permite anular el segundo factor de un administrador o del Encargado de TI desde cualquier cuenta. Mientras exista, la característica Seguridad no puede ser conforme.

El avance es real: de 63 defectos abiertos (18 críticos) se pasa a 16 (1 crítico), y la Seguridad operacional pasa de rojo a verde. **Condición para «Conforme con observaciones» en una R5:** cerrar DEF-50, DEF-91, DEF-99 y DEF-100 con sus pruebas en verde en el pipeline (las cuatro primeras acciones de la sección 10) y proteger la rama `main`.

## 10. Acciones de mantenimiento (ISO/IEC 14764)

| Prioridad | Acción | Tipo | Defectos | Responsable sugerido |
|---|---|---|---|---|
| 1 | `mfa-seed` solo para el usuario de la sesión (o retirarlo) y rotar las semillas emitidas | Correctivo | DEF-50 | Santiago Vélez |
| 2 | Verificar identidad (nombre y fecha de nacimiento) antes de asociar una solicitud del portal y no escribir contacto desde el portal | Correctivo | DEF-99 | Santiago Vélez |
| 3 | TLS obligatorio hacia la base de datos (`DB_TLS`) | Correctivo | DEF-100 | Santiago Vélez |
| 4 | Retirar los dictámenes «100 %» y las afirmaciones falsas del README | Correctivo | DEF-91 | Santiago Vélez |
| 5 | Quitar ADMIN de recetas, bandeja de farmacia y dispensación | Correctivo | DEF-72 | Santiago Vélez |
| 6 | Proteger `main` exigiendo el pipeline `calidad` y una revisión | Preventivo | H-R4-27 | Santiago Vélez |
| 7 | Job de integración con servicios MySQL y PostgreSQL en el pipeline | Preventivo | DEF-102 | Santiago Arcos |
| 8 | Política única de contraseñas (12 caracteres) y límite absoluto de sesión | Correctivo | DEF-107, DEF-109 | Santiago Vélez |
| 9 | Go 1.27.4 en CI y en el Dockerfile; govulncheck bloqueante | Adaptativo | DEF-103 | Santiago Vélez |
| 10 | Correo de resultados solo al de la ficha; enmascarar el correo en los fallos SMTP | Correctivo | DEF-108, DEF-101 | Santiago Vélez |
| 11 | Pruebas de valores límite del triaje (adoptar `TestR4GlasgowOchoEsNivelI`) | Preventivo | DEF-110 | Santiago Arcos |
| 12 | Actualizar `QA-actualizado.md` y la rama `QA` sobre `main` | Preventivo | DEF-105, DEF-106 | Santiago Arcos |
| 13 | Completar fichas DEF-93 a DEF-98; `controldefectos -fuente` con todos los `*_test.go` | Preventivo | DEF-104, H-R4-05 | Juan José Sánchez |
| 14 | Plan de reducción de complejidad para las 12 funciones aceptadas | Perfectivo | DEF-44 | Santiago Vélez |

**Las 5 de mayor retorno:** 1, 2, 3, 4 y 6. Las cuatro primeras eliminan el crítico y los tres altos con cambios pequeños; la 6 impide que un cierre vuelva a entrar sin pasar el pipeline.

**Correcciones recomendadas al README raíz** (documento del equipo; Calidad no lo edita): retirar el dictamen «100 %» (líneas 2151 y 2367), las afirmaciones de PWA y modo sin conexión, la referencia a `CalculateTriageLevel`, los umbrales de triaje que no coinciden con `triage.go`, WCAG AAA, la mención de RF16 en `localStorage` (línea 532) y las cifras de pruebas antiguas (líneas 2799, 3249 y 3253); declarar el modelo de IA que firmó los commits.

## 11. Decisiones tomadas

- **Base y comparabilidad:** se auditó `origin/main` `6a51bb8`. Para la cobertura se publican las dos cifras; la comparable con R3 es la de 72,7 %, porque el perfil de R3 no incluía los adaptadores (ver 3.4).
- **Severidad de DEF-106 (rama QA):** la tarea pedía «riesgo Alto» si fusionarla borraría trabajo. La simulación con `git merge-tree` muestra que una fusión de tres vías no borra archivos; el riesgo real está en resolver el conflicto del README. Se registra como Media.
- **DEF-91 reabierto en lugar de defecto nuevo:** el README de `main` sigue publicando el dictamen que DEF-91 describe.
- **DEF-110 con prueba de Calidad que pasa:** el defecto es la ausencia de prueba; Calidad agrega `TestR4GlasgowOchoEsNivelI` como propuesta (archivo nuevo, sin tocar pruebas del equipo) y deja el defecto abierto hasta que Pruebas lo adopte.
- **`controldefectos`:** se agregó `calidad_r4_regression_test.go` a la lista `-fuente` por defecto (herramienta de Calidad); sin ese cambio el job declararía incoherentes las reproducciones nuevas.
- **Tag `entrega-final`:** el tag local del equipo de evaluación apunta a `1799d72` y el remoto a `e2740d1`; `git fetch` se negó a sobrescribirlo. No se modificó (acción irreversible); se informa en `00-refs.txt`.
- **gofmt:** la copia de trabajo usa CRLF (`core.autocrlf=true`) y gofmt marcaba todos los archivos; se midió sobre el árbol exportado de `origin/main` (0 sin formato).
- **Subagentes:** las revisiones documentales extensas (afirmaciones, RTM, ASVS) se delegaron; los hallazgos que pasaron a la bitácora se comprobaron con prueba propia.
- **Prueba de caja negra:** el primer intento se bloqueó porque el script no vaciaba la salida del servidor; se corrigió el script (registro a archivo temporal) y se repitió.

## 12. Limitaciones

| Recurso | Efecto |
|---|---|
| Compilador C | `go test -race` **No medido** en local; se toma del run verde `45183473187` de `main` |
| Docker | Despliegue con Compose, pruebas con MySQL y PostgreSQL reales (`-tags integration`) y govulncheck sobre Go 1.22: **No medidos** |
| Generador de carga | El p95 de R4 (3,45 ms) se midió con un cliente Python, más lento que el generador Go de R3: sirve frente al límite de 400 ms, no para comparar milisegundo a milisegundo con 1,38 ms |
| Herramienta de cobertura frontend | R3 usó Vitest 2 con `@vitest/coverage-v8` 2.1.9; `main` usa Vitest 4 y v8 4.1.12. La caída de 72,85 % a 61,02 % mezcla código nuevo sin pruebas (pantallas de TI y portal) y el cambio de herramienta |
| Navegador | Playwright y axe no ejecutados; contraste calculado con la fórmula WCAG |
| Hardware | Los benchmarks dependen del equipo; la diferencia con `QA-actualizado.md` se informa sin atribuirla a un error de medición |
| `verificar_cifras_r3.py` | Queda como historia: la tabla de la bitácora ya tiene DEF-93 en adelante y su comprobación de rango falla por diseño |
