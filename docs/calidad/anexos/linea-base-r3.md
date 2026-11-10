# Línea base de la revisión R3 (10 nov 2026)

Todas las salidas están en `evidencias/r3/` con el comando, la fecha y el código de salida. Script de reproducción: `tests/backend/herramientas/linea-base-r3.sh` (ejecutar desde la raíz con Git Bash).

Código medido: `origin/main` `9bacb0a` integrado en `calidad/revision-r3`. `src/` y `tests/` del equipo no cambiaron desde la base de la revisión 2 (`658472a`).

## 1. Entorno y versiones (`00-versiones.txt`)

| Componente | Versión |
|---|---|
| Go | go1.27.3 windows/amd64 (`go.mod` declara go 1.22) |
| Node / npm | v24.21.0 / 11.19.0 (CI usa Node 20.18.1) |
| Fiber | v2.52.16 |
| golang-jwt / mysql / pq / x/crypto | v5.3.1 / v1.8.1 / v1.12.3 / v0.24.0 |
| brotli (indirecta) | v1.1.0 (vulnerable, DEF-83) |
| React / Vite / Vitest | 18.3 / 5.4 / 2.1 |
| golangci-lint / staticcheck / govulncheck | 2.15.0 / 2026.2.2 (0.8.2) / 1.9.0 |
| gcc (requerido por `-race`) | **No disponible**: `-race` **No medido** en local; se ejecuta en CI |
| Docker | **No disponible**: despliegue con Compose **No medido** |
| hey / k6 | No disponibles: se usó un generador de carga propio (`evidencias/r3/42-generador-carga.go.txt`) |
| MySQL / PostgreSQL | No disponibles: pruebas de integración con motor **No medidas** |

## 2. Inventario de líneas (`01b-inventario.txt`)

`git ls-tree` + `wc -l` sobre `origin/main` (líneas físicas).

| Lenguaje | Archivos | Líneas |
|---|---|---|
| Go | 98 | 16 497 |
| JSX | 50 | 18 156 |
| JavaScript | 10 | 1 308 |
| SQL | 3 | 689 |
| HTML | 6 | 2 616 |
| CSS | 1 | 154 |
| YAML | 1 | 101 |
| Markdown | 5 | 2 768 |
| **Código productivo** (`src/`, Go + JSX + JS sin pruebas) | | **30 157** (30,157 KLOC) |

Frente a la v1 (14,779 KLOC) el código productivo se duplicó.

## 3. Compilación y pruebas

| Comando | Resultado | Evidencia |
|---|---|---|
| `go build ./...` (src/backend) | OK | `02-go-build.txt` |
| `go vet ./...` (src/backend y tests/backend) | 0 hallazgos | `03-go-vet-src.txt`, `03b-go-vet-tests.txt` |
| `go test ./...` en `src/backend` | 6 pruebas, todas pasan; cobertura propia 0,7 % (casi no hay pruebas dentro de `src/`) | `10-go-test-src.txt`, `11-cover-func-src.txt` |
| `go test -coverpkg=saludconecta-backend/... ./...` en `tests/backend` | **91 pruebas pasan, 0 fallan, 22 omitidas** (las reproducciones de defectos abiertos, que solo se ejecutan con `CALIDAD_DEFECTOS_ABIERTOS=1`) | `12-go-test-tests.txt` |
| Cobertura backend (sentencias de `src/backend` ejercitadas por `tests/backend`) | **68,9 %** (66,6 % antes de las pruebas nuevas de R3; umbral de CI 60 %) | `13-cover-func-tests.txt` |
| `go test -race` | **No medido** en local (`-race requires cgo`) | `14-go-test-race.txt` |
| Reproducciones de defectos abiertos | 22 de 22 fallan por el defecto declarado; herramienta de control en verde | `30-defectos-abiertos-reproduccion.txt`, `32-control-defectos-local.txt` |
| `TestMySQLChainSyncAndTimestamps` | **No se compila** sin `-tags integration` y además necesita MySQL: ni la suite local ni el CI la ejecutan | `tests/backend/mysql_integration_test.go:20-27` |

## 4. Frontend

| Comando | Resultado | Evidencia |
|---|---|---|
| `npm ci` | OK | `20-npm-ci.txt` |
| `npm run build` | OK en 11,15 s; aviso de *chunks* mayores de 500 kB | `21-npm-build.txt` |
| `npx eslint src` | **0 errores, 89 avisos** (con la configuración de la rama) | `23-eslint.txt` |
| `npx vitest run` | **15 archivos, 108 pruebas, todas pasan**: 14 archivos y 105 pruebas del equipo más `totp.regression.test.js` (3 pruebas de Calidad). Duración 27,77 s | `24-vitest.txt` |
| `npx vitest run --coverage` | Sentencias 72,85 %, ramas 65,46 %, funciones 37,62 %, líneas 72,85 % | `25-vitest-coverage.txt` |
| `npm audit --omit=dev` | 0 vulnerabilidades | `22-npm-audit-prod.txt` |
| `npm audit` | 6 vulnerabilidades (2 críticas, 1 alta, 3 moderadas) en dependencias de desarrollo | `22b-npm-audit-completo.txt` |

## 5. Ejecución del backend (`DB_DRIVER=memory`)

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Arranque con `JWT_SECRET` aleatorio y `ADMIN_INITIAL_*` de prueba | Arranca, avisa de que la persistencia es en memoria y crea el administrador inicial | `42-carga-http-real.txt` |
| `GET /api/v1/health` | `{"status":"UP","system":"SaludConecta IPS v2.4","iso_quality":"ISO/IEC 25010 Evaluated"}`: no consulta la base de datos (DEF-32) y declara una evaluación ISO (DEF-91) | `42-carga-http-real.txt` |
| Inicio de sesión del administrador | 200 **sin MFA** (el administrador inicial no tiene segundo factor configurado) | — |
| Memoria del proceso | WorkingSet 11,5–16,3 MB; memoria privada 49,0–52,7 MB | `43-memoria-proceso.txt` |
| Docker Compose | **No medido** (Docker no disponible) | — |

## 6. Rendimiento (H38)

| Medición | R3 (3 corridas) | Cifra publicada | Evidencia |
|---|---|---|---|
| `BenchmarkTriageCalculation` | 9,47–9,97 ns/op, 0 asignaciones | 5,55 ns/op | `40-benchmarks.txt` |
| `BenchmarkAllergyInterception` | 5 275–5 792 ns/op (5,3–5,8 µs/op) | 3,23 µs/op | `40-benchmarks.txt` |
| `BenchmarkPrescriptionPipelineService` | 5 156–6 468 ns/op | — | `40-benchmarks.txt` |
| p95 en proceso (`TestRNF01LatenciaBajoConcurrencia`, pila HTTP completa sobre memoria) | prescripción 6,77–7,86 ms; alergia 3,92–4,97 ms; lectura de HCE 4,11–4,89 ms | 28,4 ms | `41-rnf01-latencia-3-corridas.txt` |
| p95 HTTP real (`cmd/api`, 110 peticiones autenticadas, concurrencia 5) | 1,38 ms (p99 5,78 ms) | 28,4 ms | `42-carga-http-real.txt` |
| Memoria del proceso Go | 11,5–16,3 MB (WorkingSet) | 18,2 MB | `43-memoria-proceso.txt` |

**Límite de la medición:** `cmd/api/main.go:119` fija 120 peticiones por minuto por IP para todo el API. Desde una sola IP la carga HTTP real no puede superar ese valor (las 18 000 peticiones de la primera corrida recibieron casi todas 429), así que el p95 bajo carga alta solo se midió en proceso.

**Qué mide cada benchmark:** `BenchmarkTriageCalculation` llama solo a `SuggestManchesterPriority()` sobre cinco registros ya construidos: no incluye validación, HTTP, JSON ni persistencia. Por eso la cifra de nanosegundos es correcta como medida de esa función, pero no como «triaje completo».

## 7. Scripts usados en esta línea base

- Inventario, RTM (H39) y mapa SEC: scripts de Python en línea cuya salida incluye la cabecera con el comando (`01b-inventario.txt`, `50-rtm-verificacion.txt`).
- Contraste WCAG: fórmula de luminancia relativa de WCAG 2.x sobre la paleta de Tailwind 3 (`44-contraste-modal-alergias.txt`).
- Carga HTTP: `42-generador-carga.go.txt` (N peticiones GET con C trabajadores; p50/p95/p99).
