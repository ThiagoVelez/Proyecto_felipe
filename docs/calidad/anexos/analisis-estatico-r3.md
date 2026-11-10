# Análisis estático de la revisión R3 (10 nov 2026)

Comandos y salidas completas en `evidencias/r3/` (script `tests/backend/herramientas/linea-base-r3.sh`). Configuración de linters: `.golangci.yml` de la rama de calidad (`issues.new-from-rev: 6492f07`, línea base de la v1).

## 1. Resumen

| Herramienta | Resultado R3 | v1 (2 nov) | Evidencia |
|---|---|---|---|
| `go vet` (src y tests) | 0 hallazgos | 0 | `03-go-vet-src.txt`, `03b-go-vet-tests.txt` |
| `staticcheck` | 1 hallazgo: SA4006 en `postgres/user_repo.go:133` (valor de `argIdx` sin usar) | 1 (el mismo) | `04-staticcheck.txt` |
| `golangci-lint` (hallazgos nuevos desde `6492f07`) | **21**: errcheck 1, gosec 9, ineffassign 1, noctx 6, staticcheck 4 | — | `05-golangci-lint-nuevos.txt` |
| `golangci-lint` (total, sin filtro de línea base) | **62**: errcheck 2, gosec 10, ineffassign 2, noctx 29, staticcheck 19 | — | `05c-golangci-lint-total.txt` |
| `golangci-lint` en `tests/backend` | 0 | — | `05b-golangci-lint-tests.txt` |
| `gosec` (excluye G505 y G115, como en CI) | **11**: G301 ×4 (directorios 0755), G306 ×3 (archivos 0644), G104, G118, G304, G404 (`math/rand` en códigos de receta, DEF-64) | — | `06-gosec.txt` |
| `govulncheck` | **1 vulnerabilidad alcanzable**: GO-2026-6888 en `andybalholm/brotli` v1.1.0 (corregida en v1.2.7), dependencia transitiva de Fiber (DEF-83). GO-2025-3845 (DEF-24) ya no aparece. Además 3 vulnerabilidades en paquetes importados y 24 en módulos requeridos sin llamada alcanzable. | 1 (GO-2025-3845) | `07-govulncheck.txt` |
| `gocyclo -over 15` | **16 funciones** (11 en `src/backend`, 5 en pruebas y herramientas); máxima `SuggestManchesterPriority` con 39; media de `src/backend` 3,86 | 1 función | `08-gocyclo.txt`, `08b-gocyclo-media.txt` |
| ESLint | 0 errores, 89 avisos (casi todos `no-unused-vars`) | 3 errores en `App.jsx` (corregidos en la rama, DEF-44) | `23-eslint.txt` |
| `npm audit --omit=dev` | 0 | 0 | `22-npm-audit-prod.txt` |
| `npm audit` completo | 6 (2 críticas, 1 alta, 3 moderadas), solo desarrollo (DEF-45) | 6 | `22b-npm-audit-completo.txt` |

## 2. Funciones con complejidad ciclomática mayor de 15

| Complejidad | Función | Archivo |
|---|---|---|
| 39 | `(*TriageRecord).SuggestManchesterPriority` | `core/domain/triage.go:114` |
| 23 | `(*syncService).processOnce` | `core/services/sync_service.go:50` |
| 22 | `(*treatmentService).DispatchTreatment` | `core/services/treatment_service.go:44` |
| 20 | `(*ClinicalRecordHandler).CreateAnatomicalNote` | `adapters/http/handlers/clinical_record_handler.go:265` |
| 18 | `(*patientService).RegisterPatient` | `core/services/patient_service.go:53` |
| 18 | `(*TriageRecord).Validate` | `core/domain/triage.go:92` |
| 18 | `ingredientClasses` | `core/domain/allergy.go:113` |
| 17 | `(*prescriptionService).IssuePrescription` | `core/services/prescription_service.go:32` |
| 17 | `AuditMiddleware` | `adapters/http/middlewares/audit_middleware.go:35` |
| 16 | `(*prescriptionV2Repository).MarkAsDispensedTx` | `adapters/storage/mysql/prescription_v2_repo.go:238` |
| 16 | `(*PrescriptionHandler).Create` | `adapters/http/handlers/prescription_handler.go:35` |

(Las 5 restantes son pruebas y herramientas: `TestMySQLChainSyncAndTimestamps` 20, `controldefectos.ejecutar` 19, `controldefectos.evaluar` 19, `TestDualTokenLoginAndRefreshFlow` 18, `TestAdmissionPatientAndAllergyAPI` 16.)

## 3. Arquitectura hexagonal (H28)

`core/services/appointment_service.go:10-14` y `treatment_service.go` importan `adapters/email`, `adapters/pdf` y `pkg/logger`: el núcleo depende de adaptadores concretos (DEF-84, registrado en la v2 y verificado por lectura en R3).

## 4. Configuración de los linters y del pipeline

- Los pasos informativos de `calidad.yml` (staticcheck, gosec, govulncheck, gocyclo y `npm audit` completo) siguen con `continue-on-error` porque sus hallazgos de línea base corresponden a defectos registrados y abiertos (DEF-44, DEF-45, DEF-64, DEF-83). Ningún paso bloqueante (compilación, vet, golangci-lint nuevo, pruebas con `-race`, cobertura, control de defectos, ESLint, Vitest, build y `npm audit` de producción) usa `continue-on-error`.
- En R3 se retiró el `-skip` de `TestStaffRegisterRequiresAdmin` del paso con `-race`, porque el equipo ya corrigió DEF-48.
