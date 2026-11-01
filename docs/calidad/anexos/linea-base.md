# Anexo A. Línea base del repositorio (Fase 0)

- **Commit evaluado:** `6492f07` (rama `main` al iniciar la auditoría, 2026-11-01).
- **Entorno de la revisión:** Windows 10 Pro 10.0.19045, AMD Ryzen 5 3500U (8 hilos), Git Bash.
- **Regla aplicada:** cada cifra remite a un archivo de `evidencias/` con el comando y su salida.

## A.1 Versiones exactas

| Componente | Versión | Evidencia |
|---|---|---|
| Go (toolchain local) | go1.27.3 windows/amd64, `CGO_ENABLED=0` | `evidencias/00-versiones.txt` |
| Go declarado en `go.mod` / `go.work` | 1.22 | `evidencias/00-versiones.txt` |
| Node.js / npm | v24.21.0 / 11.19.0 | `evidencias/00-versiones.txt` |
| GoFiber | v2.52.5 | `src/backend/go.mod` |
| golang-jwt | v5.3.1 | `src/backend/go.mod` |
| golang.org/x/crypto | v0.24.0 | `src/backend/go.mod` |
| go-sql-driver/mysql / lib/pq | v1.8.1 / v1.12.3 | `src/backend/go.mod` |
| React / React DOM | 18.3.1 | `evidencias/00-versiones.txt` (`npm ls --depth=0`) |
| Vite / Vitest | 5.4.21 / 2.1.9 | `evidencias/00-versiones.txt` |
| Tailwind CSS / lucide-react | 3.4.19 / 0.460.0 | `evidencias/00-versiones.txt` |

Observación: el Dockerfile del backend compila con `golang:1.22-alpine` y el del frontend con `node:20-alpine`; las mediciones de este anexo se hicieron con Go 1.27.3 y Node 24. El pipeline `calidad.yml` fija Go 1.27.3 y Node 20.18.1.

## A.2 Inventario de archivos y líneas

No hay `cloc` ni `tokei` en el entorno; se usó `git ls-files` + `wc -l` (líneas físicas, incluye comentarios y líneas en blanco). Evidencia: `evidencias/01-inventario.txt`.

| Lenguaje | Archivos | Líneas |
|---|---|---|
| Go | 57 | 7 124 |
| JSX | 22 | 8 423 |
| JavaScript | 8 | 649 |
| CSS | 1 | 57 |
| SQL | 1 | 254 |
| HTML | 6 | 2 613 |
| YAML | 1 | 99 |
| Markdown | 5 | 1 471 |
| **Total de archivos versionados** | **163** | |

Distribución de Go: `core/` 1 238, `adapters/` 4 753, `cmd/` 141, `pkg/` 315, `tests/backend` 677.

**Tamaño del código productivo** (base para la densidad de defectos): 6 314 líneas Go sin pruebas (coincide con el recuento de gosec, `evidencias/23-gosec-sin-codigo.txt`) + 8 465 líneas JS/JSX/CSS en `src/frontend/src` = **14,779 KLOC**.

Archivos de más de 500 líneas: `AdminDashboardScreen.jsx` (2 233), `UserProfileModal.jsx` (786), `ProfileScreen.jsx` (741), `memory_repos.go` (556).

## A.3 Resultados de los pasos de la Fase 0

| Paso | Comando | Resultado | Evidencia |
|---|---|---|---|
| Compilar backend | `go build ./...` | Correcto (exit 0) | `02-go-build.txt` |
| Pruebas con detector de carreras | `go test -race -coverprofile=coverage.out ./...` | **No medido:** `-race requires cgo` (no hay compilador C en el entorno). Se delega al pipeline en Linux. | `03-…`, `05-…` |
| Pruebas `src/backend` sin `-race` | `go test -coverprofile ./...` | 2 paquetes con pruebas, todas pasan. Cobertura **0,8 %**. `core/services` tiene pruebas pero 0,0 % de cobertura propia (solo prueban `pkg/crypto` y `domain`). | `04-…`, `07-…` |
| Pruebas `tests/backend` sin `-race` | `go test -coverpkg=saludconecta-backend/... ./...` | 6 pruebas, todas pasan. Cobertura **38,7 %** sobre los paquetes reales. | `06-…`, `08-…`, `09-…` |
| Instalar frontend | `npm ci` | Correcto. Informa 6 vulnerabilidades (3 moderadas, 1 alta, 2 críticas), todas en dependencias de desarrollo. | `10-npm-ci.txt`, `30-npm-audit.txt` |
| Build frontend | `npm run build` | Correcto. Bundle JS 424,69 kB (106,74 kB gzip). | `11-npm-build.txt` |
| Cobertura frontend | `npx vitest run --coverage` | **Falla:** falta `@vitest/coverage-v8`. | `12-vitest-coverage.txt` |
| Pruebas frontend | `npx vitest run` | 4 archivos, 28 pruebas, todas pasan. `AdminGovernance.test.jsx` registra `Failed to parse URL`: la pantalla usa los datos simulados de respaldo, no la API. | `13-vitest.txt` |
| Backend en memoria | `DB_DRIVER=memory` + `GET /api/v1/health` | HTTP 200 `{"status":"UP"}`. El handler no consulta la base de datos (H27). | `14-backend-memory.txt`, `15-health.txt` |
| Docker Compose | `docker compose up --build -d` | **No medido:** el ejecutable `docker` no existe en el entorno. Los healthchecks se evaluaron por lectura de `docker-compose.yml`. | — |

## A.4 Estado al cierre de la auditoría (rama `calidad/auditoria-iso25010`)

| Medida | Línea base | Cierre | Evidencia |
|---|---|---|---|
| Pruebas `tests/backend` | 6 pasan | 14 pasan, 12 omitidas (defectos abiertos reproducibles con `CALIDAD_DEFECTOS_ABIERTOS=1`) | `71-final-go-test-tests.txt`, `43-defectos-abiertos.txt` |
| Cobertura backend (`-coverpkg`) | 38,7 % | 60,3 % | `08-…`, `71-final-go-test-tests.txt`, `72-final-cover-por-paquete.txt` |
| Cobertura `src/backend` (pruebas internas) | 0,8 % | 1,4 % | `07-…`, `70-final-go-test-src.txt` |
| Cobertura frontend (sentencias / ramas / funciones) | No medible | 40,9 % / 58,42 % / 25,86 % (con `@vitest/coverage-v8@2.1.9` instalado con `--no-save`) | `34-vitest-coverage.txt` |
| Latencia p95 en proceso (memoria, 20 concurrentes, 1 000 peticiones) | No medido | 1,81–2,99 ms según escenario y corrida | `74-rendimiento-corrida{1,2,3}.txt` |

Nota sobre la cobertura: el aumento de 38,7 % a 60,3 % se debe a las pruebas de regresión que añadió Calidad (matriz RBAC, DEF-05, DEF-08, DEF-27, DEF-28, DEF-41, H23 y RNF01); no se modificó ninguna prueba existente.
