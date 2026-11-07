# Anexo B. Análisis estático automatizado (Fase 1)

Clasificación usada: **Defecto real** (se registra en la bitácora), **Falso positivo justificado** o **Deuda técnica** (se agrupa en DEF-44 o DEF-45 y se planifica).

## B.1 Resumen por herramienta

| Herramienta y versión | Comando | Resultado | Clasificación | Evidencia |
|---|---|---|---|---|
| `go vet` (go1.27.3) | `go vet ./...` en `src/backend` y `tests/backend` | 0 hallazgos | — | `evidencias/20-go-vet.txt` |
| staticcheck 2026.2.2 (v0.8.2) | `staticcheck ./...` | 1: `postgres/user_repo.go:133` SA4006, valor de `argIdx` sin uso | Deuda técnica (sin efecto funcional) -> DEF-44 | `21-staticcheck.txt` |
| golangci-lint v2.15.0, configuración por defecto | `golangci-lint run ./...` | 12: errcheck 11, ineffassign 1 | 10 errcheck sobre `defer rows.Close()/tx.Rollback()/stmt.Close()` = falso positivo justificado; `main.go:68` y `logger.go:70` = deuda; ineffassign = el mismo SA4006 | `22-golangci-lint.txt` |
| golangci-lint v2.15.0 con `.golangci.yml` | `golangci-lint run --config ../../.golangci.yml ./...` | 0 hallazgos nuevos respecto de `6492f07` en ambos módulos | — | `26-golangci-config-proyecto.txt` |
| gosec v2.30.0 | `gosec ./...` | 4: G101 x2, G115 x1, G505 x1 | G101 `seeder.go:126` y `memory_repos.go:50` = **defecto real** (credenciales y secreto TOTP de semilla) -> DEF-11; G505 `crypto/sha1` = falso positivo (RFC 6238 exige HMAC-SHA1); G115 `crypto.go:135` = falso positivo (el contador TOTP es positivo) | `23-gosec-sin-codigo.txt` |
| govulncheck v1.9.0 | `govulncheck ./...` | 1 vulnerabilidad alcanzable desde el código: GO-2025-3845 en Fiber v2.52.5 (corregida en v2.52.9), traza `auth_handler.go:195` -> `BodyParser`. Además, 6 en paquetes importados y 23 en módulos requeridos sin llamada alcanzable. | Defecto real -> DEF-24 | `24-govulncheck.txt`, `24b-govulncheck-verbose.txt` |
| gocyclo v0.6.0 | `gocyclo -over 15 .` | 1 función: `SuggestManchesterPriority` (17), `core/domain/triage.go`. Promedio 3,42 (línea base) y 3,5 (cierre). | Deuda técnica -> DEF-44 | `25-gocyclo.txt`, `73-final-analisis.txt` |
| ESLint 9.17.0 (recommended + react + react-hooks) | `npx eslint src` | Línea base: 69 problemas (67 errores, 2 advertencias): `no-unused-vars` 65, `react/no-unescaped-entities` 2, `react-hooks/exhaustive-deps` 2 | `no-unused-vars` y `no-unescaped-entities` = deuda; `exhaustive-deps` en `AuthScreen.jsx:70` y `SecurityMfaScreen.jsx:68` = deuda con riesgo de estado obsoleto | `31-eslint.txt`, `33-eslint-config-proyecto.txt` |
| npm audit | `npm audit --omit=dev` | 0 vulnerabilidades en dependencias de producción | — | `30-npm-audit.txt` |
| npm audit (completo) | `npm audit` | 6 (2 críticas: tinypool; 1 alta; 3 moderadas: esbuild, vite, @vitest/mocker), todas de desarrollo | Deuda de seguridad en la cadena de desarrollo -> DEF-45 | `30-npm-audit.txt` |
| jscpd 4.0.5 (`--min-tokens 70`) | `npx jscpd src` | Frontend: 12 clones, 318 líneas (3,26 %). Backend Go: 39 clones, 920 líneas (14,46 %), concentrados entre `adapters/storage/mysql` y `adapters/storage/postgres` | Deuda técnica -> DEF-44 | `32-jscpd.txt` |
| actionlint v1.7.12 | `actionlint .github/workflows/calidad.yml` | 0 hallazgos | — | `35-actionlint.txt` |

## B.2 Decisiones sobre las advertencias

1. **errcheck en cierres diferidos.** `defer rows.Close()` y `defer tx.Rollback()` después de `Commit` no producen errores accionables; se excluyen en `.golangci.yml` con un comentario. Sí se exigen los errores de `Exec`, `Query` y `Commit`.
2. **gosec G505/G115.** Se excluyen en el pipeline solo esas dos reglas, con su justificación en `.golangci.yml`. G101 sigue activo porque detecta DEF-11.
3. **Duplicación del 14,46 % en Go.** No es un error de copia: los adaptadores MySQL y PostgreSQL implementan el mismo puerto con SQL casi idéntico. Se propone extraer un adaptador `database/sql` común parametrizado por dialecto (acción M-19 del plan de mantenimiento).
4. **ESLint.** El proyecto no tenía configuración. Se añadió `src/frontend/eslint.config.js`: las reglas que indican defectos bloquean y las de deuda (`no-unused-vars`, `no-unescaped-entities`) quedan como advertencia. Las dependencias de ESLint se instalan en CI con `npm i --no-save` para no alterar `package.json`; incorporarlas como `devDependencies` es una decisión del equipo.
5. **Regla `api` de `.gitignore`.** La línea 19 ignora cualquier ruta llamada `api`, incluido el directorio `src/backend/cmd/api`. `main.go` estaba versionado de antes, pero cualquier archivo nuevo en ese directorio se ignora sin aviso (lo detectó la auditoría al agregar `main_regression_test.go`). Se registra en DEF-44.
