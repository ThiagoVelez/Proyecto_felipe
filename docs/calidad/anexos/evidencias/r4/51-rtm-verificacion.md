# comando: sed -n 369,395p README.md | grep -oE 'Test[A-Za-z0-9_]+|[A-Za-z0-9]+\.test\.jsx?' ; por cada prueba Go: grep -rnE "^func <Prueba>\(" tests src --include=*_test.go y head -3 <archivo> | grep go:build ; por cada archivo frontend: test -f tests/frontend/<archivo> (origin/main 6a51bb8)
# fecha: 2026-11-24

# H-R4-21 (parte documental). Verificación de la RTM (README §4.5)

RTM revisada: `README.md:369-395` (25 filas: RF01 a RF16, la fila «RF03 · Kit» y RNF01 a RNF08). Se evalúan 24 requisitos; la fila «RF03 · Kit» se integra en RF03.

## Criterios

- **Sostenido:** las pruebas citadas existen, se ejecutan en la suite normal (`go test ./...` en `tests/backend` y `src/backend`, y Vitest) y, según la lectura del código, cubren el núcleo del requisito.
- **Parcial:** las pruebas existen y se ejecutan, pero una parte de la evidencia citada no se ejecuta (`//go:build integration`, `-race` en local, benchmarks, revisión manual) o una parte central del requisito no tiene prueba.
- **No sostenido:** la evidencia citada no puede demostrar el requisito tal como está redactado.

Base de ejecución (mediciones R4): `tests/backend` 154 pruebas de nivel superior pasan (0 fallan, 0 omitidas); `src/backend` 9 pasan; Vitest 147 en 20 archivos pasan. Las pruebas con `-tags integration` no se ejecutan ni en local ni en el pipeline (`.github/workflows/calidad.yml` no usa la etiqueta). `-race` no se puede ejecutar en local (sin cgo).

## Existencia de las pruebas citadas

- **Pruebas Go:** 43 nombres distintos en la RTM y los 43 existen. 39 están en `tests/backend` o `src/backend` sin etiqueta de compilación y se ejecutan en la suite normal (entre ellas `TestChainedSHA256Integrity`, en `src/backend/core/services/clinical_record_service_test.go:12`). 4 tienen `//go:build integration` y **no se ejecutan**:
  - `TestMySQLChainSyncAndTimestamps` (`tests/backend/mysql_integration_test.go:24`): RNF04.
  - `TestMySQLCitasSimultaneasNoSeDuplican` (`tests/backend/mysql_entrega_integration_test.go:270`): RF13.
  - `TestMySQLFarmaciaV2ConvivenConRecetasV1` (`mysql_entrega_integration_test.go:214`): RF15.
  - `TestMySQLLaboratorioEnfermeriaYSedes` (`mysql_entrega_integration_test.go:122`): RF16.
- **Archivos frontend:** se citan 14 y los 14 existen en `tests/frontend/`: `AdminGovernance`, `AllergyAlertModal`, `AuthMfa`, `CedulaPdf417`, `ClinicalScreens`, `DoctorAppointmentsView`, `DoctorLayout`, `MedicalKit`, `NurseModules`, `PatientFlow`, `PharmacyDashboard`, `ServerBackedModules`, `TreatmentFollowUpView` y `totp`. Todos forman parte de los 20 archivos que pasan.
- **Evidencia que no es una prueba:** RNF01 («Benchmarks de Go»), RNF02 («clonación de buffer»), RNF04 (disparadores SQL), RNF06 («comprobación de arranque»), RNF08 («bandera `-race`»).

## Tabla

| Requisito | Pruebas citadas (existen / total) | De integración | Clasificación R4 | Motivo |
|---|---|---|---|---|
| RF01 Autenticación, MFA y tokens | 3 Go + 2 frontend (5/5) | No | **Sostenido** | Desactivación, MFA, bloqueo por fuerza bruta, TOTP y desafío MFA en la interfaz pasan. DEF-49 y DEF-50 (motivo de R3) están cerrados con prueba. La rotación del *refresh token* tiene prueba (`TestDualTokenLoginAndRefreshFlow`, `auth_security_test.go:297`), aunque la RTM no la cita. |
| RF02 Triaje Manchester | 3 Go + 1 frontend (4/4) | No | **Sostenido** | Cálculo en el servidor, catálogo y discriminadores de temperatura. Hueco: ningún caso evalúa la frontera Glasgow 8/9 (ver M1). |
| RF03 HCE e inmutabilidad (y «RF03 · Kit») | 2 Go + 1 frontend; Kit: 3 Go + 1 frontend (8/8) | No | **Parcial** | La inmutabilidad en el servicio y el Kit (licencia, cierre y autoría) están cubiertos. La parte «protegida por triggers a nivel de base de datos (MySQL y PostgreSQL)» del requisito (README:519) no tiene prueba ejecutada: `TestMySQLDisparadoresDeInmutabilidad` es de integración y la RTM no la cita. |
| RF04 Cadena SHA-256 | 4 Go (4/4) | No | **Sostenido** | Determinismo, linealidad concurrente, sellado a segundos y rechazo de bifurcación (repositorio en memoria). |
| RF05 Intercepción de alergias | 3 Go + 1 frontend (4/4) | No | **Sostenido** | Familia, tildes, paciente del folio y modal real. El «< 150 ms» se mide en memoria (`prescription_test.go:112`). |
| RF06 Sincronización por lotes | 2 Go (2/2) | No | **Sostenido** | Idempotencia y autoría calculada en el servidor. Solo cubre el lado servidor: el cliente *offline* no existe (ver RNF05). |
| RF07 Gobernanza ReTHUS | 2 Go + 1 frontend (3/3) | No | **Sostenido** | Cuenta inactiva al crearse, tarjeta obligatoria y RBAC de la ruta. |
| RF08 Panel administrativo desacoplado | 1 Go + 1 frontend (2/2) | No | **Sostenido** | Rol desde la base de datos y errores reales en el panel. |
| RF09 Perfil con contraste WCAG AAA | 1 frontend (1/1) | No | **No sostenido** | `DoctorLayout.test.jsx:63` solo comprueba que se rendericen los 5 banners; no mide contraste. Dentro del óvalo, `text-slate-500` (`ProfileScreen.jsx:383`) da 4,57:1, por debajo de 7:1 (`53-wcag.md`). |
| RF10 Menú colapsable y persistencia F5 | 2 frontend (2/2) | No | **Sostenido** | `DoctorLayout.test.jsx:90` (colapsar y expandir); la persistencia por pestaña tiene además `SessionPerTab.test.js`, que la RTM no cita. |
| RF11 Admisión y alergias | 1 Go + 1 frontend (2/2) | No | **Sostenido** | Roles, documento duplicado 409 y catálogos 422. |
| RF12 Catálogo y stock | 2 Go (2/2) | No | **Parcial** | Las pruebas cubren el descuento concurrente y las copias, pero no el «rechaza stock insuficiente (HTTP 409)» del requisito: ninguna prueba de `tests/backend` usa `ErrInsufficientStock`. `TestConcurrentPrescriptionsDoNotRaceOnStock` dice «ejecutar con -race», y eso no se puede hacer en local. |
| RF13 Agendamiento | 5 Go + 1 frontend (6/6) | Sí: 1 (`TestMySQLCitasSimultaneasNoSeDuplican`) | **Parcial** | Las 4 pruebas en memoria pasan; la garantía de citas simultáneas en MySQL no se ejecuta. |
| RF14 Tratamiento y receta tripartita | 3 Go + 1 frontend (4/4) | No | **Sostenido** | Cruce de alergias v2, cantidad positiva y códigos de receta. Hallazgo revisado: `treatment_service.go:94` descarta el error de `GetPatientAllergies` (`allergies, _ :=`). Si el repositorio falla, la receta se emite sin cruzar alergias (falla abierta), y ninguna prueba lo cubre. |
| RF15 Farmacia y dispensación PDF417 | 4 Go + 2 frontend (6/6) | Sí: 1 (`TestMySQLFarmaciaV2ConvivenConRecetasV1`) | **Parcial** | Documento obligatorio, normalización y doble dispensación pasan en memoria. «ACID en MySQL con `SELECT ... FOR UPDATE`» (README:531) no se ejecuta. |
| RF16 Enfermería | 2 Go + 2 frontend (4/4) | Sí: 1 (`TestMySQLLaboratorioEnfermeriaYSedes`) | **Parcial** | `TestEnfermeriaRecibeLaOrdenYRegistraDeberesYNotas` pasa; la persistencia MySQL no se ejecuta. La descripción del RF16 (README:532) dice además `localStorage`, en contra del código. |
| RNF01 Latencia p95 < 400 ms | Benchmarks (sin nombre) | No | **No sostenido** | Los benchmarks no se ejecutan en la suite normal y no miden p95 HTTP. README:437 reconoce «Pendiente de medición». |
| RNF02 Trazabilidad y auditoría | 1 Go + «clonación de buffer» | No | **Parcial** | La prueba citada solo toca `AuditRepo` de forma indirecta. Hay pruebas específicas que la RTM no cita (`TestDEF41CorrelationIDSoloAceptaUUID`, `TestDEF28AuditoriaConservaDatosTrasFinalizarPeticion`, `TestDEF71LecturasV2QuedanAuditadas`). «Clonación de buffer» no es una prueba. |
| RNF03 OWASP ASVS Nivel 2 | 2 archivos Go | No | **No sostenido** | Las pruebas pasan, pero ninguna suite puede demostrar ASVS L2; la última medición ASVS es 34,0 % (v1) y no hay auditoría nueva. |
| RNF04 Inmutabilidad en la base de datos | Disparadores + `TestMySQLChainSyncAndTimestamps` | Sí: la única prueba citada | **No sostenido** | Toda la evidencia exige un motor real; no se ejecuta en ningún entorno (igual que en R3). |
| RNF05 Resiliencia *offline* rural | 1 Go (1/1) | No | **No sostenido** | La prueba cubre la idempotencia del servidor, pero el requisito es «operación autónoma sin conexión mediante almacenamiento local PWA». No hay *service worker*, manifiesto ni IndexedDB, y `syncOfflineBatch` (`api.js:464`) no se usa. |
| RNF06 Configuración a prueba de fallos | 1 Go + revisión de arranque | No | **Parcial** | `TestJWTSecretValidation` pasa; la parte «nunca conmuta en silencio a memoria» solo se verifica por revisión, según la propia RTM. |
| RNF07 Gestión de secretos | 2 Go (2/2) | No | **Sostenido** | Sin cuentas por defecto ni cuentas publicadas. |
| RNF08 Consistencia bajo concurrencia | `-race` + bloqueos de cadena | No | **Parcial** | Las pruebas concurrentes de cadena y stock pasan, pero la evidencia citada («bandera `-race`») no se puede ejecutar en local y R4 no tiene el resultado del pipeline. |

## Conteo

| Clasificación | Requisitos | Cantidad |
|---|---|---|
| Sostenido | RF01, RF02, RF04, RF05, RF06, RF07, RF08, RF10, RF11, RF14, RNF07 | 11 |
| Parcial | RF03, RF12, RF13, RF15, RF16, RNF02, RNF06, RNF08 | 8 |
| No sostenido | RF09, RNF01, RNF03, RNF04, RNF05 | 5 |

```text
11 de 24 requisitos sostenidos (R3: 5 de 21)
```

La comparación con R3 no es homogénea. R3 evaluó 21 requisitos (RF01-RF13 y RNF01-RNF08) y contaba como «no se sostiene» cualquier requisito con un defecto abierto en contra. En R4 la RTM tiene 24 requisitos y la bitácora declara cerrados esos defectos (las 22 reproducciones de R3 pasan, `31-reproducciones-r3-hoy.txt`). Los 5 «No sostenido» de R4 dependen de evidencia que ninguna prueba puede dar (contraste, p95, ASVS, motor real y PWA), no de defectos abiertos.

## Propuesta de mutación manual (5 requisitos críticos para la seguridad del paciente)

No se ejecutó ninguna mutación. Procedimiento sugerido para cada caso: aplicar el cambio en una rama temporal, ejecutar `go test -count=1 ./...` en `tests/backend` y en `src/backend`, anotar qué pruebas fallan y revertir.

| Id | Requisito | Archivo:línea | Línea actual → mutante | Pruebas de la RTM que deberían detectarlo | Predicción por lectura |
|---|---|---|---|---|---|
| M1 | RF02 (Glasgow crítico → Nivel I) | `src/backend/core/domain/triage.go:120` | `if t.GlasgowScore <= 8 \|\| ...` → `if t.GlasgowScore < 8 \|\| ...` | `TestTriageEquivalencePartitioningAndBoundaryValues` (`tests/backend/triage_test.go:13`), `TestTriageRejectsClientLevelOutsideCatalog` (`triage_security_test.go:34`), `TestTriageTemperatureDiscriminators` (`triage_security_test.go:67`) | **Probable superviviente**: los casos citados usan Glasgow 7 y 6, y ninguna prueba del repositorio evalúa Glasgow 8. Un paciente con Glasgow 8 pasaría de Nivel I a Nivel II. |
| M2 | RF03 (folio cerrado no se vuelve a firmar) | `src/backend/core/services/clinical_record_service.go:93` | `if !record.CanModify() {` → `if false && !record.CanModify() {` | `TestClinicalRecordImmutabilityAndClosingPolicy` (`tests/backend/clinical_record_test.go:13`), `TestRecordObjectLevelAccess` (`clinical_chain_test.go:65`) | Debería detectarse: la prueba espera `domain.ErrRecordAlreadyClosed` en el segundo cierre. |
| M3 | RF05 (alergias del paciente del folio, no del cliente) | `src/backend/core/services/prescription_service.go:43` | `if prescription.PatientID != "" && prescription.PatientID != record.PatientID {` → `if false {` | `TestAllergyCrossCheckUsesRecordPatient` (`tests/backend/prescription_security_test.go:77`) | Debería detectarse (se espera `ErrPatientMismatch` / 409). Nota: la línea 49 vuelve a asignar el paciente del folio, así que el cruce alérgico seguiría siendo correcto aunque desaparezca el rechazo explícito. |
| M4 | RF05 (familia penicilina → amoxicilina) | `src/backend/core/domain/allergy.go:116` | `case strings.Contains(component, "CILINA") \|\| strings.HasPrefix(component, "PENICILIN"):` → `case strings.HasPrefix(component, "PENICILIN"):` | `TestPrescriptionAllergyInterceptor` (`tests/backend/prescription_test.go:15`), `TestAllergyFamilyAndAccentMatching` (`prescription_security_test.go:104`) | Debería detectarse: con el mutante, amoxicilina deja de pertenecer a PENICILINA/BETALACTAMICOS. |
| M5 | RF14 (receta v2 cruza alergias, DEF-51) | `src/backend/core/services/treatment_service.go:100` | `if conflict := domain.MatchAllergy(allergies, it.MedicationName); conflict != nil {` → `...; conflict != nil && false {` | `TestDEF51PrescripcionV2CruzaAlergias` (`tests/backend/calidad_defectos_abiertos_regression_test.go:175`) | Debería detectarse. Variante complementaria: en la línea 94 devolver un error desde `GetPatientAllergies`. Hoy se ignora (`allergies, _ :=`) y ninguna prueba lo detectaría. |

Reserva (RF15): `src/backend/core/services/pharmacy_service.go:149`, `if req.PatientDocument == "" {` → `if false {`. Prueba: `TestDEF53DispensacionExigeDocumentoDelPaciente` (`calidad_defectos_abiertos_regression_test.go:211`).
