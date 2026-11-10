# 01. Plan de aseguramiento de la calidad del software

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

**Cambios del plan en R3.** El pipeline `calidad.yml` ejecuta ahora con `-race` la suite completa de `tests/backend` (DEF-48 cerrado) y el control de defectos abiertos lee también `calidad_revision_r3_regression_test.go`. La reproducción local se documenta en `anexos/linea-base-r3.md` (script `tests/backend/herramientas/linea-base-r3.sh`).

Estructura inspirada en IEEE 730 (Software Quality Assurance Processes).

## 1. Propósito y alcance

**Propósito.** Establecer cómo el equipo de SaludConecta IPS v2.4 obtiene evidencia objetiva de que el producto cumple sus requisitos y de que los defectos se detectan, registran, corrigen y verifican de forma trazable.

**Alcance.**

- Código de `src/backend` (Go, GoFiber, arquitectura hexagonal) y `src/frontend` (React, Vite).
- Esquema `schema.sql`, infraestructura (`docker-compose.yml`, Dockerfiles, `nginx.conf`) y documentación (`README.md`, `docs/`).
- Proceso de cambio: tablero Trello y *pull requests* hacia `main`.

Fuera de alcance: la validación clínica de los protocolos (corresponde a un profesional de la salud) y la operación en producción.

## 2. Roles y responsabilidades

Sin solapamiento: quien construye no es quien certifica.

| Rol | Integrante | Responsabilidades | No le corresponde |
|---|---|---|---|
| Líder técnico / Arquitecto | Santiago Vélez | Diseño y decisiones de arquitectura, esquema y contratos de API; implementar las correcciones propuestas; aprobar cambios estructurales. | Certificar su propio trabajo. |
| Responsable de Pruebas | Santiago Arcos | Diseñar y mantener los casos de `tests/` y el plan de pruebas; ejecutar la regresión; mantener la RTM. | Definir los criterios de aceptación de calidad del incremento. |
| Responsable de Calidad | Juan José Sánchez | Revisar el código; ejecutar análisis estático y auditorías (ISO 25010, ASVS); registrar y verificar defectos; proponer el mantenimiento; aprobar el paso de «En revisión de calidad» a «Tareas realizadas». | Reescribir pruebas del Responsable de Pruebas; implementar cambios de arquitectura sin aprobación. Puede añadir pruebas de regresión `*_regression_test.go` que demuestren defectos propios y aplicar correcciones pequeñas con prueba. |
| Documentación | Los tres integrantes | Mantener README, especificación e informes coherentes con el código. | — |

## 3. Estándares y referencias aplicados

| Estándar | Uso en el proyecto |
|---|---|
| ISO/IEC 25010:2023 | Modelo de calidad del producto, con 9 características (`02-modelo-calidad-iso25010-2023.md`). |
| ISO/IEC 25023 | Fórmulas de las métricas (densidad de defectos, cobertura funcional, tiempo de respuesta, cobertura de pruebas). |
| ISO/IEC 25040 | Proceso de evaluación: establecer requisitos, especificar, diseñar, ejecutar y concluir la evaluación (secciones 4 y 5). |
| ISO/IEC 14764 | Clasificación del mantenimiento: correctivo, preventivo, adaptativo y perfectivo (`06-plan-mantenimiento.md`). |
| OWASP ASVS 4.0.3, nivel 2 | Verificación de seguridad (`05-auditoria-owasp-asvs-l2.md`). |
| IEEE 1044 | Clasificación de anomalías por tipo (`04-bitacora-defectos.md`). |
| WCAG 2.x | Accesibilidad, nivel declarado en RF09. |
| Resolución 1995 de 1999, Resolución 2275 de 2023 y Ley 1581 de 2012 | Requisitos regulatorios de historia clínica, RIPS y protección de datos. |
| Conventional Commits | Mensajes de commit con referencia al defecto: `fix(DEF-XX): …`. |

## 4. Revisiones y auditorías

| Actividad | Cuándo | Responsable | Entrada | Salida |
|---|---|---|---|---|
| Revisión de PR (checklist de `.github/PULL_REQUEST_TEMPLATE.md`) | Cada PR hacia `main` | RC (más un par técnico) | Diff y resultado del pipeline | Aprobación o defectos registrados |
| Análisis estático automatizado | Cada *push* y cada PR (`calidad.yml`) | Automático; RC revisa los informativos | Código | Artefactos del pipeline |
| Revisión por hipótesis (como H01–H33) | Al cierre de cada iteración o ante un cambio de alcance | RC | README, especificación, código | `03-informe-revision-codigo.md` |
| Verificación documental | Antes de cada entrega | RC + equipo | Documentación | `verificacion-documental.md` |
| Auditoría ASVS | Antes de la entrega final y ante cambios en autenticación o sesión | RC | Código y configuración | `05-auditoria-owasp-asvs-l2.md` |
| Verificación de correcciones | Al pasar una tarjeta a «En revisión de calidad» | RC | Commit y prueba de regresión | Estado «Cerrado» o devolución |

## 5. Gestión de defectos

### 5.1 Registro

Todo defecto se registra con la plantilla `.github/ISSUE_TEMPLATE/defecto.yml`, que replica los campos de la bitácora, y se refleja en Trello (lista «Bugs encontrados para solucionar») con la tarjeta de `trello-tarjetas-defectos.md`. La numeración es correlativa (`DEF-XX`) y nunca se reutiliza.

### 5.2 Ciclo de vida

```
Nuevo -> Confirmado -> En corrección -> En verificación -> Cerrado
Nuevo | Confirmado -> Rechazado        (con motivo documentado)
En verificación -> En corrección       (si la verificación falla)
```

| Estado | Entra cuando | Quién lo mueve |
|---|---|---|
| Nuevo | Se registra con evidencia, aunque aún no se reproduzca | Cualquiera |
| Confirmado | Se reproduce (prueba, comando o pasos) | RC |
| Rechazado | No es un defecto (falso positivo o comportamiento esperado); se documenta el motivo | RC con el autor |
| En corrección | Hay responsable y rama | LT o quien corrige |
| En verificación | El commit y la prueba de regresión están en un PR | Quien corrige |
| Cerrado | RC verificó que la prueba falla sin el cambio, pasa con él y el pipeline está en verde | RC |

### 5.3 Severidad y prioridad

- **Severidad (impacto técnico):** Crítica, Alta, Media, Baja. Regla de dominio: **todo defecto que pueda causar daño a un paciente es Crítica** (prescripción peligrosa permitida, pérdida de registro clínico, triaje mal clasificado).
- **Prioridad (urgencia):** P1 (antes de la próxima entrega), P2 (en la iteración), P3 (planificada), P4 (cuando haya capacidad). La prioridad puede diferir de la severidad: un defecto Crítico con mitigación operativa puede ser P2.

### 5.4 Control de defectos abiertos (fallos esperados)

Un defecto confirmado y todavía no corregido se demuestra con una prueba que afirma el comportamiento **correcto**, de modo que falla mientras el defecto exista. El job **«Backend - control de defectos abiertos»** de `calidad.yml` ejecuta esas pruebas y es **bloqueante**: el job queda en verde mientras cada prueba falle exactamente por su defecto, y en rojo en cualquier otro caso. Así quien revisa un PR ve verde cuando todo está como se espera y rojo solo cuando hay algo que atender.

**Piezas:**

| Pieza | Ubicación | Función |
|---|---|---|
| Lista de defectos abiertos | `docs/calidad/defectos-abiertos.txt` | Fuente única: `<ID> <prueba> <tipo>` por línea |
| Pruebas de reproducción | `tests/backend/calidad_defectos_abiertos_regression_test.go` | Cada una llama a `requireDefectoAbierto(t, "DEF-XX")` (se omite salvo con `CALIDAD_DEFECTOS_ABIERTOS=1`) |
| Marca de la aserción | Helper `defectoReproducido(t, "DEF-XX", …)` | Prefija el fallo con `DEFECTO-REPRODUCIDO DEF-XX:`; las fallas de preparación (`t.Fatalf`) no llevan marca |
| Herramienta de control | `tests/backend/herramientas/controldefectos` | Lee la salida de `go test -json` y emite el veredicto |

**Tipos de defecto:**

- `marcador`: la prueba debe fallar con la marca de **su** identificador.
- `carrera`: la prueba debe fallar porque el detector `-race` reporta `WARNING: DATA RACE`. Hoy solo es de este tipo DEF-37.

**Veredicto por prueba:**

| Situación | Resultado del job | Mensaje |
|---|---|---|
| Falla por el defecto declarado | Verde | «falla como se espera» |
| Pasa | **Rojo** | «DEF-XX parece corregido: verifícalo y ciérralo en la bitácora» |
| Falla sin la marca del defecto (por ejemplo, la preparación falló) o con la marca de otro defecto | **Rojo** | «falló por una causa distinta al defecto» |
| Pánico, *timeout* o una prueba que no llegó a ejecutarse | **Rojo** | «falló por un pánico» / «no se ejecutó» |
| Error de compilación | **Rojo** | «las pruebas no compilaron» |
| Carrera de datos en un defecto de tipo `marcador` | **Rojo** | «carrera no declarada» |
| Prueba omitida (falta la variable de entorno) | **Rojo** | «la prueba se omitió» |
| Defecto de tipo `carrera` ejecutado sin `-race` (solo en local) | Informativo | «no evaluable» |

**Coherencia:** el job también falla si la lista no concuerda con la bitácora y con el código. Las comprobaciones son tres:

- Cada ID de la lista debe figurar en la tabla resumen de `04-bitacora-defectos.md` con un estado distinto de «En verificación», «Cerrado» o «Rechazado».
- Cada prueba de la lista debe existir y declarar el mismo ID.
- Toda prueba que use `requireDefectoAbierto` debe estar en la lista.

**Procedimiento al corregir un defecto de la lista**, en el mismo PR que la corrección:

1. Quitar su línea de `defectos-abiertos.txt`.
2. Quitar `requireDefectoAbierto` de la prueba, que queda como regresión permanente (opcionalmente se mueve a un archivo propio).
3. Cambiar el estado en la bitácora a «En verificación».
4. Tras la revisión de Calidad y con el pipeline en verde, pasarlo a «Cerrado».

Si el PR corrige el defecto pero omite el paso 1, el job lo señala con «parece corregido».

**Ejecución local** (sin `-race` en Windows; en Linux con cgo se añade `-race` a `go test` y `-con-race` a la herramienta):

```bash
cd tests/backend && CALIDAD_DEFECTOS_ABIERTOS=1 go test -count=1 -json -run "$(go run ./herramientas/controldefectos -regex)" . | go run ./herramientas/controldefectos
```

## 6. Herramientas

| Ámbito | Herramienta | Versión fijada | Modo en CI |
|---|---|---|---|
| Go | go vet | toolchain 1.27.3 | Bloqueante |
| Go | golangci-lint (`.golangci.yml`) | v2.15.0 | Bloqueante (hallazgos nuevos) |
| Go | staticcheck | v0.8.2 | Informativo |
| Go | gosec | v2.30.0 | Informativo hasta cerrar DEF-11 |
| Go | govulncheck | v1.9.0 | Informativo hasta cerrar DEF-24 |
| Go | gocyclo (umbral 15) | v0.6.0 | Informativo |
| Go | `go test -race` y `go test -cover` | — | Bloqueante, umbral de cobertura (el paso `-race` excluye temporalmente la prueba de DEF-48) |
| Go | `controldefectos` (sección 5.4) | código del repositorio | Bloqueante: fallos esperados de los defectos abiertos |
| JS | ESLint (`src/frontend/eslint.config.js`) | 9.17.0 | Bloqueante (errores) |
| JS | Vitest + `@vitest/coverage-v8` | 2.1.9 | Bloqueante |
| JS | `npm audit --omit=dev --audit-level=high` | npm del runner | Bloqueante |
| JS | `npm audit --audit-level=high` | npm del runner | Informativo hasta cerrar DEF-45 |
| CI | actionlint | v1.7.12 | Validación local del workflow |
| Gestión | Trello, GitHub Issues y PR | — | — |

## 7. Métricas objetivo

| Métrica | Valor al cierre de la auditoría | Objetivo de la entrega final | Objetivo a mediano plazo |
|---|---|---|---|
| Cobertura de sentencias del backend | 60,3 % | ≥ 60 % (umbral del pipeline) | ≥ 70 % |
| Cobertura de sentencias del frontend | 41,5 % | ≥ 40 % | ≥ 60 % |
| Defectos Críticos abiertos | 5 abiertos y 2 en verificación | 0 | 0 |
| Defectos Altos abiertos | 14 abiertos y 2 en verificación | ≤ 5, con plan | 0 |
| Densidad de defectos | 2,98 / KLOC | — | ≤ 1,0 / KLOC |
| Cumplimiento estricto ASVS L2 (muestra) | 34,0 % | ≥ 60 % | 100 % |
| Vulnerabilidades alcanzables (govulncheck) | 1 | 0 | 0 |
| Vulnerabilidades de producción (npm) | 0 | 0 | 0 |
| p95 de latencia en prescripción | ≤ 2,99 ms en proceso | < 400 ms medido en el despliegue | < 400 ms con carga real |
| Contraste mínimo de texto | 1,85:1 | ≥ 4,5:1 (AA) | ≥ 7:1 (AAA, si se mantiene en RF09) |

## 8. Criterios de aceptación de un incremento (*Definition of Done* de calidad)

Un incremento pasa de «En revisión de calidad» a «Tareas realizadas» solo si cumple todo lo siguiente:

1. Está trazado a un RF o RNF, o a un `DEF-XX`.
2. El pipeline `calidad` está en verde: compilación, `go vet`, golangci-lint sin hallazgos nuevos, `go test -race` con cobertura sobre el umbral, ESLint sin errores, Vitest y `npm audit` de producción.
3. Hay pruebas nuevas o actualizadas; en una corrección, la prueba falla sin el cambio y pasa con él.
4. No baja la cobertura ni se desactivan reglas del linter sin una justificación escrita en el PR.
5. No introduce secretos (revisión del diff y gosec); toda variable nueva figura en `.env.example`.
6. La documentación afectada se actualiza y no contiene cifras sin evidencia.
7. Ningún defecto Crítico nuevo queda abierto.
8. El Responsable de Calidad lo aprueba en el PR.
