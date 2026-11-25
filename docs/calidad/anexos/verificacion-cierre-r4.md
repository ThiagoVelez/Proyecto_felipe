# Verificación del cierre de defectos: revisión R4 (H-R4-01)

- **Base auditada:** `origin/main` `6a51bb8` (merge del PR #13, 23 nov 2026). Fecha de la verificación: 24 nov 2026.
- **Qué se comprobó:** para cada defecto DEF-01 a DEF-98, el estado declarado en la bitácora de `main` frente a la evidencia que hoy se puede ejecutar.
- **Cómo:** `python -X utf8 docs/calidad/anexos/verificar_cierre_r4.py <go-tests.json> <go-src.json> <vitest.json> <salida.md>`, con `go test -count=1 -json ./...` en `tests/backend` y `src/backend` y `npx vitest run --reporter=json` en `src/frontend`. El script cruza cada prueba citada en la ficha (bloque «Cierre v2» o «Verificación R3») con su resultado real, detecta las pruebas con etiqueta `integration` (no las ejecuta nadie, DEF-102) y comprueba que los commits citados existan. Los ajustes manuales están en la última columna y salen de la revisión de código, de la caja negra (`evidencias/r4/42-caja-negra.txt`) o de las herramientas (`evidencias/r4/07`, `22b`, `45`).

## Categorías

| Categoría | Significado |
|---|---|
| Verificado | Hay una prueba o medición que hoy pasa y demuestra el cierre. |
| Verificado parcialmente | Una parte se demuestra ejecutando; otra depende de pruebas que no se ejecutan o quedó un resto del defecto. |
| Revisado sin prueba | La ficha no cita prueba ni commit; el cierre se aceptó leyendo el código o la documentación. |
| No verificable | La única evidencia citada son pruebas con MySQL o PostgreSQL reales (`-tags integration`), que no se ejecutan en local ni en el pipeline. |
| Reabierto | Hay una prueba que hoy falla por el defecto. |

## Resultado

| Categoría | Defectos |
|---|---|
| Verificado | 67 |
| Verificado parcialmente | 7 |
| Revisado sin prueba | 18 |
| No verificable | 3 |
| Reabierto | 3 |
| **Total** | **98** |

## Tabla por defecto

| ID | Severidad | Estado declarado | Estado verificado R4 | Evidencia automática | Ajuste por revisión |
|---|---|---|---|---|---|
| DEF-01 | Crítica | Verificado — corregido | **Verificado** | `TestRegression_ClosedRecordImmutability` pasa; `TestDEF07SincronizacionNoSobrescribeFolioCerrado` pasa |  |
| DEF-02 | Alta | Cerrado | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-03 | Media | Cerrado | **Verificado** | `TestDEF28AuditoriaConservaDatosTrasFinalizarPeticion` pasa; `TestDEF28AuditoriaConservaDatosTrasFinalizarPeticion` pasa |  |
| DEF-04 | Media | Verificado — corregido | **Verificado** | `TestH23LimitesGlasgowNoCubiertos` pasa; `TestRegression_GlasgowBoundaryValidation` pasa |  |
| DEF-05 | Crítica | Cerrado (verificado en R3) | **Verificado** | `TestDEF05PrescripcionRechazaPacienteDistintoAlFolio` pasa |  |
| DEF-06 | Crítica | Cerrado (verificado en R3) | **Verificado** | `TestDEF06CruceAlergiasReactividadCruzadaYTildes` pasa |  |
| DEF-07 | Crítica | Cerrado (verificado en R3) | **Verificado** | `TestDEF07SincronizacionNoSobrescribeFolioCerrado` pasa |  |
| DEF-08 | Crítica | Cerrado (verificado en R3) | **Verificado** | `TestDEF08NivelManchesterFueraDelCatalogo` pasa |  |
| DEF-09 | Crítica | Cerrado (verificado en R3) | **Verificado** | `TestDEF09HipotermiaSeveraNoEsNoUrgente` pasa |  |
| DEF-10 | Crítica | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestDEF10PostgresNoArrancaEnModoMixtoSinAutorizacion` pasa; `TestDEF32HealthReadyConsultaLaBaseDeDatos` pasa |  |
| DEF-11 | Crítica | Cerrado (verificado en R3) | **Verificado parcialmente** | La ficha no cita prueba ni commit | Caja negra (evidencias/r4/42): el backend en memoria arranca sin cuentas sembradas; el seeder MySQL no se ejecutó (sin motor). |
| DEF-12 | Alta | Cerrado (verificado en R3) | **Verificado** | `TestDEF12ResolveJWTSecret` no existe | La ficha cita `TestDEF12ResolveJWTSecret`, nombre que ya no existe; la prueba equivalente `TestDEF12ValidateJWTSecret` (src/backend/pkg/config) pasa (DEF-104). |
| DEF-13 | Alta | Cerrado (verificado en R3) | **Verificado** | `TestDEF13TokenDeUsuarioDesactivadoEsRechazado` pasa |  |
| DEF-14 | Alta | Cerrado (verificado en R3) | **Verificado** | `TestDEF14SetupMFANoDesactivaSegundoFactor` pasa |  |
| DEF-15 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestDEF15ProxiesDeConfianzaPorDefectoSoloLoopback` pasa |  |
| DEF-16 | Alta | Cerrado (verificado en R3) | **Verificado** | `TestDEF16CierreConcurrenteNoBifurcaCadena` pasa |  |
| DEF-17 | Alta | Cerrado (verificado en R3) | **Verificado** | `TestDEF17MedicoNoCierraFolioAjeno` pasa |  |
| DEF-18 | Alta | Cerrado (verificado en R3) | **Verificado** | `TestDEF18SincronizacionUsaMedicoAutenticado` pasa |  |
| DEF-19 | Alta | Cerrado (verificado en R3) | **Verificado** | `TestDEF07SincronizacionNoSobrescribeFolioCerrado` pasa |  |
| DEF-20 | Alta | Cerrado (verificado en R3) | **Verificado** | `TestClosedAtIsSealedToSeconds` pasa |  |
| DEF-21 | Alta | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `MedicalKit.test.jsx` (9 pruebas) pasa |  |
| DEF-22 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `AdminOrgChartAndBranches.test.jsx` (6 pruebas) pasa |  |
| DEF-23 | Alta | Cerrado (verificado en R3) | **Verificado** | `AuthMfa.test.jsx` (13 pruebas) pasa |  |
| DEF-24 | Alta | Cerrado (verificado en R3) | **Verificado** | La ficha no cita prueba ni commit | govulncheck R4 no reporta vulnerabilidades de Fiber v2.52.16 (evidencias/r4/07). |
| DEF-25 | Alta | Cerrado (corregido y verificado contra MySQL y PostgreSQL reales, v2 23 nov 2026) | **No verificable** | `TestMySQLDisparadoresDeInmutabilidad` solo con `-tags integration` (no ejecutada); `TestPostgresTriajeContactoEInmutabilidad` solo con `-tags integration` (no ejecutada) |  |
| DEF-26 | Alta | Cerrado (verificado en R3) | **Verificado** | `TestAdmissionPatientAndAllergyAPI` pasa; `TestRBACMatrizRutasPorRol` pasa |  |
| DEF-27 | Media | Cerrado (verificado en R3) | **Verificado** | `TestDEF27FrecuenciaCardiacaLimiteSuperior` pasa |  |
| DEF-28 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestDEF28AuditoriaConservaDatosTrasFinalizarPeticion` pasa |  |
| DEF-29 | Media | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF29HashSinColisionPorDelimitador` pasa |  |
| DEF-30 | Media | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF30VerificacionValidaEnlaceConFolioAnterior` pasa |  |
| DEF-31 | Media | Cerrado (verificado en R3) | **Verificado** | `TestDEF31LoginNoRevelaCuentaInactivaConClaveErronea` pasa |  |
| DEF-32 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestDEF32HealthReadyConsultaLaBaseDeDatos` pasa |  |
| DEF-33 | Media | Cerrado (corregido y verificado, v2 23 nov 2026; riesgo residual aceptado) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-34 | Media | Cerrado (verificado en R3) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-35 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-36 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-37 | Media | Cerrado (verificado en R3) | **Verificado** | `TestDEF37LecturaConcurrenteDeFolioSinCarrera` pasa |  |
| DEF-38 | Baja | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado parcialmente** | `TestDEF38RecetaYDescuentoDeStockSonAtomicos` pasa; `TestMySQLRecetaSinStockSeRevierteCompleta` solo con `-tags integration` (no ejecutada); `TestPostgresRecetaSinStockSeRevierteCompleta` solo con `-tags integration` (no ejecutada) |  |
| DEF-39 | Media | Cerrado (corregido, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-40 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `MedicalKit.test.jsx` (9 pruebas) pasa |  |
| DEF-41 | Baja | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestDEF41CorrelationIDSoloAceptaUUID` pasa |  |
| DEF-42 | Baja | Cerrado (verificado en R3) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-43 | Baja | Cerrado (corregido, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-44 | Baja | Corregido parcialmente (v2 23 nov 2026; complejidad aceptada y planificada) | **Verificado parcialmente** | commit `6492f07` existe | golangci-lint 0 y gofmt 0, pero gocyclo da 21 funciones >15 (12 en src) y la lista aceptada no está enumerada (evidencias/r4/08, H-R4-07). |
| DEF-45 | Baja | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | La ficha no cita prueba ni commit | npm audit completo: 0 vulnerabilidades (evidencias/r4/22b). |
| DEF-46 | Media | Cerrado (verificado en R3) | **Verificado** | `TestDEF46CatalogoNoExponePunteroInterno` pasa; `TestDEF46PrescripcionesConcurrentesSinCarrera` pasa |  |
| DEF-47 | Alta | Cerrado (verificado en R3) | **Verificado** | `totp.regression.test.js` (3 pruebas) pasa |  |
| DEF-48 | Baja | Cerrado (corregido en v2 19 nov 2026: las pruebas usan app.Test(req, -1)) | **Verificado** | `TestDualTokenLoginAndRefreshFlow` pasa; `TestRefreshTokenRevocationOnUserDeactivation` pasa | La suite tests/backend pasa con -race en el run 45183473187 de main (evidencias/r4/45). |
| DEF-49 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF49RegistroDeAdministradorRequiereAutenticacion` pasa |  |
| DEF-50 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Reabierto** | `TestDEF50SemillaMFANoSeExponeSinAutenticacion` pasa | Cualquier usuario autenticado obtiene la semilla TOTP de otra cuenta: `TestDEF50R4SemillaMFASoloDelPropioUsuario` falla por el defecto (evidencias/r4/32). La prueba citada solo cubría el acceso sin sesión. |
| DEF-51 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF51PrescripcionV2CruzaAlergias` pasa |  |
| DEF-52 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF52RecetaV2RechazaCantidadNoPositiva` pasa |  |
| DEF-53 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF53DispensacionExigeDocumentoDelPaciente` pasa |  |
| DEF-54 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF54NoDispensaMedicamentoVencido` pasa |  |
| DEF-55 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF55EliminarPacienteNoPierdeAntecedentesAlergicos` pasa |  |
| DEF-56 | Crítica | Cerrado (corregido y verificado contra MySQL real, v2 23 nov 2026) | **No verificable** | `TestMySQLFarmaciaV2ConvivenConRecetasV1` solo con `-tags integration` (no ejecutada) |  |
| DEF-57 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF57NotaAnatomicaCoincideConPacienteDelFolio` pasa |  |
| DEF-58 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF58RecetaDispensadaNoSeReactiva` pasa |  |
| DEF-59 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF59NoDispensaRecetaCancelada` pasa |  |
| DEF-60 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF60AlergiaAFarmacoSeExtiendeASuFamilia` pasa |  |
| DEF-61 | Alta | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF61PDFNoSaleDelDirectorioDeDocumentos` pasa |  |
| DEF-62 | Alta | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado parcialmente** | `TestDEF62RetencionDeDocumentosYCorreoEnmascarado` pasa | Permisos y retención verificados, pero el fallo SMTP registra el correo sin enmascarar (DEF-101). |
| DEF-63 | Alta | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestDEF12ValidateJWTSecret` pasa |  |
| DEF-64 | Alta | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado parcialmente** | `TestDEF64CodigosDeRecetaYBusquedaAmbigua` pasa; `TestMySQLFarmaciaV2ConvivenConRecetasV1` solo con `-tags integration` (no ejecutada) |  |
| DEF-65 | Alta | Cerrado (corregido y verificado contra PostgreSQL real, v2 23 nov 2026) | **No verificable** | `TestPostgresTriajeContactoEInmutabilidad` solo con `-tags integration` (no ejecutada) |  |
| DEF-66 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestDEF66NotaAnatomicaFallaCerradaSiNoSePuedeLeerElFolio` pasa; `TestDEF66SelloIncluyeDolorYMapeo` pasa |  |
| DEF-67 | Media | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF67EscalaEVAFueraDeRangoSeRechaza` pasa |  |
| DEF-68 | Media | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF68ActualizacionParcialConservaContacto` pasa |  |
| DEF-69 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado parcialmente** | `TestDEF69CitasSimultaneasNoSeDuplican` pasa; `TestDEF69AgendaSoloDelMedicoDeLaSesion` pasa; `TestMySQLCitasSimultaneasNoSeDuplican` solo con `-tags integration` (no ejecutada) |  |
| DEF-70 | Media | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF70PublicacionSoloLaEditaSuAutor` pasa |  |
| DEF-71 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestDEF71LecturasV2QuedanAuditadas` pasa |  |
| DEF-72 | Media | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Reabierto** | `TestDEF72AuditorConsultaNotasAnatomicasDelPaciente` pasa | Solo se corrigió la parte de AUDITOR; ADMIN sigue en recetas, bandeja de farmacia y dispensación: `TestDEF72R4AdminNoAccedeARecetasNiDispensa` y caja negra (evidencias/r4/32 y 42). |
| DEF-73 | Baja | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestRefreshTrackerPodaIdentificadoresRotados` pasa; `TestRefreshTrackerPodaSesionesVencidas` pasa |  |
| DEF-74 | Crítica | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `NurseModules.test.jsx` (3 pruebas) pasa |  |
| DEF-75 | Crítica | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado parcialmente** | `TestEnfermeriaRecibeLaOrdenYRegistraDeberesYNotas` pasa; `TestMySQLLaboratorioEnfermeriaYSedes` solo con `-tags integration` (no ejecutada) |  |
| DEF-76 | Alta | Cerrado (corregido y verificado, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-77 | Alta | Cerrado (verificado, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-78 | Crítica | Cerrado (corregido, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-79 | Crítica | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `PatientFlow.test.jsx` (10 pruebas) pasa |  |
| DEF-80 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `MedicalKit.test.jsx` (9 pruebas) pasa |  |
| DEF-81 | Media | Cerrado (corregido, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-82 | Baja | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `NurseModules.test.jsx` (3 pruebas) pasa |  |
| DEF-83 | Media | Cerrado (corregido, v2 23 nov 2026) | **Verificado** | La ficha no cita prueba ni commit | govulncheck R4 ya no reporta GO-2026-6888 (brotli) como alcanzable (evidencias/r4/07). |
| DEF-84 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-85 | Crítica | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF85CitaConservaLaHoraLocalDeColombia` pasa |  |
| DEF-86 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `TestDEF86DocumentoDeCedulaNormalizado` pasa; `CedulaPdf417.test.js` (3 pruebas) pasa |  |
| DEF-87 | Media | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF87MuroNoConfiaEnLaDuracionDeclaradaPorElCliente` pasa |  |
| DEF-88 | Media | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF88CitaExigePacienteExistente` pasa |  |
| DEF-89 | Media | Cerrado (verificado por prueba automatizada, v2 19 nov 2026) | **Verificado** | `TestDEF89NotaAnatomicaRechazaEVAFueraDeRango` pasa |  |
| DEF-90 | Media | Cerrado (corregido y verificado, v2 23 nov 2026) | **Verificado** | `AllergyAlertModal.test.jsx` (5 pruebas) pasa |  |
| DEF-91 | Alta | Cerrado (corregido, v2 23 nov 2026) | **Reabierto** | La ficha no cita prueba ni commit | README.md:2151 y 2367 siguen publicando un dictamen «100 % de conformidad» (evidencias/r4/50-afirmaciones-readme.md). |
| DEF-92 | Media | Cerrado (corregido, v2 23 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-93 | Crítica | Cerrado (corregido y verificado contra MySQL real, v2 19 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-94 | Alta | Cerrado (corregido y verificado, v2 19 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-95 | Baja | Cerrado (corregido, v2 19 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-96 | Alta | Cerrado (corregido y verificado contra MySQL real, v2 20 nov 2026) | **Revisado sin prueba** | La ficha no cita prueba ni commit |  |
| DEF-97 | Alta | Cerrado (corregido y verificado con Playwright, v2 20 nov 2026) | **Verificado** | La ficha no cita prueba ni commit | `SessionPerTab.test.js` (3 pruebas) pasa; el recorrido con Playwright citado en el README no está versionado. |
| DEF-98 | Media | Cerrado (corregido y verificado con -race, v2 23 nov 2026) | **Verificado** | La ficha no cita prueba ni commit | `TestParametrosDeRutaNoSeCorrompenEntrePeticiones` pasa en local y con -race en CI (evidencias/r4/45). |

