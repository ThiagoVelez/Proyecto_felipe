# comando: revisión manual de README.md (origin/main 6a51bb8) contra mediciones r4 y código
# fecha: 2026-11-24

# H-R4-20. Afirmaciones publicadas del README: R3 frente a R4

Fuente R3: `docs/calidad/informe-revision-r3.md`, sección 4.1 (48 afirmaciones: 7 V / 24 P / 2 NV / 15 F).
Fuente R4: `README.md` de `origin/main` 6a51bb8 (3340 líneas). Las líneas citadas (`README:N`) son de ese archivo.

## Criterios

- **Verificada (V):** hay evidencia que la sostiene. Se indica la base: **[M]** medición R4 (archivo de esta carpeta) o **[R]** revisión de código o del repositorio (solo lectura, sin ejecución).
- **Parcial (P):** cierta en parte, con alcance menor que el publicado o con una parte sin evidencia.
- **No verificada (NV):** no hay medición ni forma de comprobarla con lo disponible en R4.
- **Falsa (F):** la medición o el código la contradicen.
- **Retirada (Ret):** el README actual ya no la contiene (o la reemplazó por una declaración de «no medido»).

Mediciones R4 usadas (no se recalcularon): `tests/backend` 154 pruebas de nivel superior pasan, 0 fallan, 0 omitidas (+32 subpruebas); `src/backend` 9 pasan; cobertura backend 52,1 % con `-coverpkg=saludconecta-backend/...` y 72,7 % sin los adaptadores MySQL/PostgreSQL; Vitest 147 pruebas en 20 archivos, todas pasan; cobertura frontend: sentencias 61,02 %, ramas 51,88 %, funciones 51,35 %, líneas 62,78 %; ESLint 0 errores y 128 avisos; `npm audit` 0 prod / 0 dev; golangci-lint 0, staticcheck 0, gosec 0; govulncheck 1 vulnerabilidad alcanzable (GO-2026-6859, `net/http` de go1.27.3, corregida en 1.27.4); gocyclo 21 funciones > 15 (12 en `src`); `go test -race` no ejecutable en local (sin cgo, `14-go-test-race.txt`, código de salida 2); las pruebas con `-tags integration` (MySQL/PostgreSQL) no se ejecutan ni en local ni en el pipeline (`.github/workflows/calidad.yml` no usa `-tags integration`). Los benchmarks no se volvieron a ejecutar en R4.

Las fuentes de R3 marcadas como «tarjeta» eran tarjetas de Trello. En R4 solo se evalúa si el README las repite; si no las repite, se marcan como Retiradas del README.

## 1. Tabla R3 → R4 (48 afirmaciones comparables)

| N | Afirmación resumida | Veredicto R3 | Veredicto R4 | Evidencia R4 |
|---|---|---|---|---|
| 1 | Listas del tablero Trello | F (corregida) | V [R] | README:53-60 enumera las 6 listas que R3 encontró en el tablero. El tablero no se reconsultó en R4. |
| 2 | Valores de ejemplo de `JWT_SECRET` y `ADMIN_INITIAL_PASSWORD` | F (corregida) | V [M] | README:1770 usa `defina_un_secreto_aleatorio_de_32_o_mas`; `TestDEF63EjemploDelREADMENoEsSecretoValido` (`tests/backend/calidad_revision_r3_regression_test.go:242`) pasa dentro de las 154. |
| 3 | Seguridad OWASP ASVS Nivel 2 | F | F | Se mantiene en README:26, 75, 111, 390 y 540. La última medición ASVS (v1) dio 34,0 %; R4 no hizo una nueva auditoría ASVS y no hay evidencia de L2. Cerrar DEF-49 y DEF-50 no equivale a cumplir L2. |
| 4 | Contraste WCAG AAA de banners y óvalo (RF09) | F | F | README:350, 379, 525 y 2084. El texto sobre el banner ya cumple (16,55:1, DEF-36), pero el óvalo «que garantiza AAA sobre cualquier fondo» tiene `text-slate-500` (`ProfileScreen.jsx:383`): 4,57:1 sobre el óvalo y 4,76:1 sobre blanco, por debajo de 7:1. Ver `53-wcag.md`. |
| 5 | RTM al 100 % de RF01 a RF12 y RNF01 a RNF08 | F | P | Corregida a RF01-RF16 y se retira «100 %» (README:365-367). Todas las filas siguen como «APROBADO (PASS)» y 4 de las pruebas citadas son `//go:build integration`, que no se ejecutan. Según `51-rtm-verificacion.md`, se sostienen 11 de 24 requisitos. |
| 6 | «Cumple de forma estricta y verificable el 100 %» (§4.7) | F | Ret | La frase ya no está en el README; «verificable» solo aparece en README:545 (RNF08). Las demás afirmaciones de «100 %» se evalúan en N7 y en las nuevas. |
| 7 | «Aprobado 100 % conforme a ISO/IEC 25010 e ISO/IEC/IEEE 29119» | F | F | Sigue en README:1936 («100% Conforme»), 2151 («Conformidad 100%»), 2367-2368 («100% de conformidad», «cumple a cabalidad» 25010, 27001, 29119, 40500), 3326-3327. La contradicen N3 y N4 de esta tabla y las nuevas N22-N23. README:504 aclara que «no es una certificación», pero las secciones 14.9.9 y 6 de la Entrega Final siguen certificando. |
| 8 | Triaje en 5,55 ns/op | P | P | Sigue en README:438, 1940, 1957, 2041, 2177 y 2212. R4 no volvió a ejecutar benchmarks; R3 midió de 9,47 a 9,97 ns/op y solo `SuggestManchesterPriority()`. Sin cambios. |
| 9 | Alergias en 3,23 µs/op | P | P | Sigue en README:439, 1940, 1958, 2177 y 2213. Sin remedición en R4; R3 midió de 5,3 a 5,8 µs/op. |
| 10 | Latencia p95 de 28,4 ms | NV | Ret | No está en el README. README:437 y 1955 dicen ahora «No medido» o «Pendiente de medición». |
| 11 | Memoria de 18,2 MB | P | P | Sigue en README:440, 1956 y 2177, atribuida a `runtime.MemStats`, sin comando en el repositorio. Sin remedición en R4. |
| 12 | `QA.md` en la raíz | F | Ret | El README ya no lo menciona. |
| 13 | Tag `entrega-s2` | P | P | README:1930 y 2130-2136 («tag inmutable `entrega-s2`» con «toda la implementación»). El tag apunta a `16eb08f` (4 nov 2026), anterior a los módulos y al cierre R3 descritos. |
| 14 | Clonación de buffers con `append([]byte(nil), c.Body()...)` | F | F | README:412 lo sigue afirmando. El propio README:1998 (S2-02) lo corrige, y el código usa `strings.Clone` sin registrar el cuerpo (`src/backend/adapters/http/middlewares/audit_middleware.go:83-88`). No hay `append([]byte(nil), c.Body()...)` en `src/backend`: es una contradicción interna. |
| 15 | Pool MySQL MaxOpen 25 y MaxIdle 10 | V | P [R] | README:416 dice 25/10 y README:2008 dice 30/10. El valor efectivo es 30 (`src/backend/cmd/api/main.go:46`); 25 es solo el valor por defecto de `mysql/connection.go:41-43`. |
| 16 | Timeouts de 3 s en los repositorios SQL | F | F | Sigue en README:416, 2035 y 2180. Solo hay `context.WithTimeout` de 10 s en el ping (`mysql/connection.go:62`) y de 2 s en `/health/ready` (`router.go:62`). README:2009 lo corrige, pero las otras tres líneas no. |
| 17 | Suite limpia con `-race` | NV | NV | README:112, 2799, 2819 y 3256. En local no se puede ejecutar (sin cgo, `14-go-test-race.txt`). El pipeline lo ejecuta, pero R4 no tiene el resultado. |
| 18 | 105 pruebas en 14 archivos de Vitest, todas en verde | V | P [M] | Es cierto como registro histórico (README:2316, 2419, 2603), pero se usa como evidencia vigente en README:2090, 2182 y 3154. La cifra actual medida es 147 pruebas en 20 archivos. |
| 19 | Build de producción limpio | V | V [M] | `21-npm-build.txt`: código de salida 0, con un aviso de tamaño de *chunk* (1.254 kB). |
| 20 | Contraste AAA en el modal de alergias | P | V [M] | La prueba usa ahora el componente real (`tests/frontend/AllergyAlertModal.test.jsx:5`, `:57`). `text-red-900` sobre `bg-red-50` da 9,16:1 y `text-red-800` sobre `bg-white/80`+`red-50`, 8,14:1 (`53-wcag.md`). README:310 solo dice «alto contraste». |
| 21 | HTTP 500 con alerta y reintento, sin pantallas en blanco | P | P [R] | README:441 y 1962 («0 pantallas blancas»). `ResilienceQuality.test.jsx` pasa (entre las 147), pero solo cubre la HCE; ninguna prueba cubre todas las vistas. |
| 22 | «Sin mocks falsos» / «API real» | P | P [R] | README:86 y 335. Las pruebas siguen simulando `fetch` con `tests/frontend/helpers/mockApi.js`; no usan una API real. |
| 23 | TOTP validado con los vectores del RFC 6238 | V | V [M] | `totp.test.js` pasa (entre las 147). |
| 24 | SEC-C01, C04, C05, A02 y A05 corregidos | V | V [M] | Las pruebas citadas en la sección 13 existen y pasan (entre las 154). |
| 25 | SEC-A04: bloqueo tras 5 intentos e IP real | P | V [M] | DEF-15 cerrado. `TestLoginBruteForceLockout`, `TestTOTPBruteForceLockout` y `TestRateLimitUsesRealClientIPBehindProxy` pasan. |
| 26 | «7 críticos blindados» (README:424, SEC-C01 a C07) | P | P [R] | 6 de 7 tienen prueba que pasa; SEC-C06 solo se verifica por revisión de `cmd/api/main.go` (README:1890). |
| 27 | «16 altos corregidos y probados» (README:425) | P | P [R] | SEC-A08 y SEC-A14 se verifican por revisión o con `TestMySQLChainSyncAndTimestamps`, de integración y no ejecutada (README:1907, 1913). |
| 28 | TOTP validado exclusivamente en el servidor | P | V [M] | README:517. DEF-50 cerrado: `TestDEF50SemillaMFANoSeExponeSinAutenticacion` pasa. |
| 29 | Cuentas asistenciales nacen inactivas (ReTHUS) | P | V [M] | README:523. `TestStaffGovernanceAndReTHUSVerification` y `TestDEF49RegistroDeAdministradorRequiereAutenticacion` pasan. |
| 30 | Citas: rechazo de fechas pasadas con un código HTTP declarado | P | P [R] | README:1835 dice ahora «409 por traslape o fecha pasada»; el código responde **400** a la fecha pasada (`appointment_handler.go:71-72`) y 409 solo al traslape. El rechazo existe, pero el código publicado no coincide. |
| 31 | Citas: separación mínima de 20 minutos | P | P [M] | DEF-69 cerrado: `TestDEF69CitasSimultaneasNoSeDuplican` pasa en memoria. La garantía en MySQL (`TestMySQLCitasSimultaneasNoSeDuplican`) es de integración y no se ejecuta. |
| 32 | Citas: PDF y correo | P | P [R] | README:529 y 2215 (TC-BB-05: «Entrega SMTP confirmada en `smtp.gmail.com:587`»). No hay medición ni prueba automatizada del envío real. |
| 33 | Notas 3D solo para MEDICO con tarjeta | V | V [M] | `TestAnatomicalNotesCreationAndDoctorLicensing` pasa. |
| 34 | Notas 3D inmutables tras el cierre | P | V [M] | DEF-66 cerrado: la comprobación falla cerrada (`clinical_record_service.go:272-280`, `:307-315`) y `TestAnatomicalNotesImmutabilityOnClosedRecord` pasa. El README no afirma que haya trigger para esta tabla. |
| 35 | Notas 3D anti-IDOR | P | V [M] | DEF-57 cerrado: `TestDEF57NotaAnatomicaCoincideConPacienteDelFolio` pasa. |
| 36 | Notas 3D con EVA de 0 a 10 | F | V [M] | DEF-89 cerrado: `TestDEF89NotaAnatomicaRechazaEVAFueraDeRango` pasa. |
| 37 | Farmacia: cotejo de la cédula PDF417 | F | V [M] | `pharmacy_service.go:149-154` exige y normaliza el documento. `TestDEF53DispensacionExigeDocumentoDelPaciente` y `TestDEF86DocumentoDeCedulaNormalizado` pasan. |
| 38 | Farmacia: bloqueo de doble dispensación (409) | P | P [M] | DEF-58 cerrado y `TestR3DispensacionConcurrenteEntregaUnaSolaVez` pasa en memoria. La versión «ACID en MySQL con `SELECT ... FOR UPDATE`» (README:531) solo la cubren pruebas de integración no ejecutadas. |
| 39 | Farmacia: descuento atómico sin saldos negativos | P | P [M] | DEF-52 cerrado: `TestDEF52RecetaV2RechazaCantidadNoPositiva` pasa. La atomicidad en MySQL no se ejecuta (misma razón que N38). |
| 40 | Muro: el backend rechaza videos de más de 120 s | P | V [M] | DEF-87 cerrado: `TestDEF87MuroNoConfiaEnLaDuracionDeclaradaPorElCliente` pasa. |
| 41 | Muro: solo publica el MEDICO | P | V [M] | DEF-70 cerrado: `TestDEF70PublicacionSoloLaEditaSuAutor` pasa. |
| 42 | Muro: persistencia de la EVA en el triaje | P | V [M] | DEF-67 cerrado: `TestDEF67EscalaEVAFueraDeRangoSeRechaza` pasa. |
| 43 | Resumen clínico de enfermería | F | V [R] | DEF-74 cerrado. `NurseChecklistView.jsx` y `NurseSummaryView` consumen la API (`NurseChecklistView.jsx:45-49`, `:101`) y `NurseModules.test.jsx` pasa. |
| 44 | Registro de sedes en caliente | P | V [R] | README:2081. Las sedes se crean en el servidor (`StaffRegisterModal.jsx:68`, `AdminDashboardScreen.jsx:212`). Queda un texto obsoleto en la interfaz: «Catálogo de sedes de este navegador (no se sincroniza con el servidor)» (`AdminDashboardScreen.jsx:722`). |
| 45 | Mitigación de DEF-01 a DEF-04 y SEC-C01 a SEC-B01 | P | P [R] | README:113 sigue llamando DEF-01 a DEF-04 a los registros que README:1972-1979 (DEF-92) renombró como S2-01 a S2-04. Para los SEC, ver N26 y N27. |
| 46 | RTM con los módulos nuevos | F | P [R] | La RTM ya tiene filas RF13 a RF16 (README:384-387), pero los módulos de la Entrega Final (laboratorio, portal del paciente, Encargado de TI, sedes) no tienen código RF ni fila. |
| 47 | Casos BVA y EP de Glasgow, FC y temperatura | V (salvo `QA.md`) | P [R] | Las pruebas existen y pasan, pero las clases publicadas en README:136-168 no coinciden con el algoritmo (`domain/triage.go:120-141`). Ejemplos: temperatura Nivel I en README ≤ 29,9 °C y ≥ 41,0 °C, en el código < 28,0 °C y ≥ 41,5 °C; febrícula Nivel IV en README desde 37,1 °C, en el código desde 37,5 °C; fiebre Nivel III en README desde 38,0 °C, en el código desde 38,5 °C; FC 50-59 sin otros signos da Nivel V en el código, no «II/III»; SpO2 94 % no es Nivel III en el código (`< 94`). |
| 48 | `/health` informa «ISO/IEC 25010 Evaluated» | F | Ret | `router.go:44-47`: `/health` responde `{"status":"UP","system":...}` y el comentario cita DEF-91. README:1819-1820 lo describe como prueba de vida. |

## 2. Afirmaciones nuevas verificables del README actual

Afirmaciones que R3 no evaluó o que aparecieron después (secciones 1.11 a 1.25, 3 y 4 de la Entrega Final, entre otras). No se repiten las que ya están en la tabla anterior.

| N | Afirmación (README:línea) | Veredicto R4 | Evidencia |
|---|---|---|---|
| N1 | Frontend con «Vite 5» (README:24, 86, 1805) | F [R] | `src/frontend/package.json`: `"vite": "^6.4.6"`, `"vitest": "^4.1.12"`; el propio README:2812 dice Vite 6.4.6. |
| N2 | Go 1.22+ y GoFiber v2.52.16 (README:23) | V [R] | `src/backend/go.mod:3` (`go 1.22`) y `:7` (`fiber/v2 v2.52.16`). |
| N3 | Soporte PWA y operación *offline* en brigadas rurales (README:24, 542 RNF05, 1062-1064, 1689) | F [R] | No hay *service worker* ni manifiesto (`src/frontend/public` solo tiene íconos; `index.html` y `vite.config.js` no registran PWA) ni uso de IndexedDB. `apiClient.syncOfflineBatch` (`src/frontend/src/services/api.js:464`) no se llama desde ningún componente. Solo existe el endpoint de lotes en el servidor. |
| N4 | Bcrypt con coste 12 (README:299, 540) | V [R] | `src/backend/pkg/crypto/crypto.go:38`. |
| N5 | Cobertura backend medida de 70,3 % con un umbral de 60 % (README:2770) | P [M] | R4 mide 72,7 % sin los adaptadores MySQL/PostgreSQL (el mismo método del pipeline, `calidad.yml:133-137`) y 52,1 % con todo `saludconecta-backend/...`. El README no aclara que excluye los adaptadores. |
| N6 | Frontend con 147 pruebas en 20 archivos y `npm audit` en 0 (README:2820) | V [M] | Vitest: 147 en 20 archivos, todas pasan; `npm audit` 0 prod / 0 dev. |
| N7 | golangci-lint en 0 sobre todo el código (README:2812, 2819, 3256-3257) | V [M] | golangci-lint 0 (también staticcheck 0 y gosec 0). |
| N8 | ESLint sin errores (README:2799) | V [M] | 0 errores; el README no menciona los 128 avisos. |
| N9 | Vite 6.4.6 y Vitest 4; `npm audit` en 0 y bloqueante (README:2812) | V [M] | `package.json` y `22-npm-audit-prod.txt`. |
| N10 | «Resultados actuales»: 135 de 135 en 18 archivos y «129 pruebas en `tests/backend`» (README:2799, 3249, 3253) | F [M] | Desactualizada: hoy son 147 en 20 archivos y 154 pruebas de nivel superior en `tests/backend`. |
| N11 | Pruebas contra MariaDB y PostgreSQL: «4 pruebas» (README:2799), «8 contra MariaDB y 2 contra PostgreSQL 16» (README:2821), registro PASS (README:3263-3270) | NV | Las pruebas `-tags integration` no se ejecutan ni en local ni en el pipeline; no hay registro reproducible en el repositorio. |
| N12 | «Todas pasan en el pipeline» para cada RF y RNF de la RTM (README:497) | F [R] | La RTM cita 4 pruebas `//go:build integration` (`TestMySQLChainSyncAndTimestamps`, `TestMySQLCitasSimultaneasNoSeDuplican`, `TestMySQLFarmaciaV2ConvivenConRecetasV1`, `TestMySQLLaboratorioEnfermeriaYSedes`) que `calidad.yml` no ejecuta. |
| N13 | «No quedan defectos críticos ni altos abiertos» (README:500) | V [M] | `docs/calidad/defectos-abiertos.txt` vacío; las 22 reproducciones de R3 existen, no se omiten y pasan (`31-reproducciones-r3-hoy.txt`). |
| N14 | «97 de 98 defectos cerrados» (README:2815) | P [M] | Solo se volvieron a ejecutar las 22 reproducciones automatizadas de R3; el resto de cierres no se reverificó uno por uno en R4. |
| N15 | «Se acepta la complejidad ciclomática de 12 funciones» (DEF-44, README:2815) | V [M] | gocyclo: 21 funciones > 15, de ellas 12 en `src`. |
| N16 | SEC-A13: «`govulncheck` ya no la reporta» (README:1912) | P [M] | GO-2025-3845 ya no aparece, pero govulncheck R4 reporta 1 vulnerabilidad alcanzable (GO-2026-6859, biblioteca estándar `net/http` de go1.27.3, corregida en 1.27.4). |
| N17 | `/health/ready` consulta la base de datos (README:1820, 2809) | V [R] | `src/backend/adapters/http/router.go:52-71`. |
| N18 | DEF-98: Fiber con `Immutable: true` (README:2815) | V [R] | `src/backend/adapters/http/server.go:38`. |
| N19 | `CalculateTriageLevel` con V(G) = 5 y 100 % de cobertura de sentencias y ramas (README:2254, 2261) | F [M] | La función no existe. La clasificación real es `SuggestManchesterPriority` (`domain/triage.go:115`), con V(G) = 39 según gocyclo (`08-gocyclo.txt:3`). Además, ninguna prueba evalúa Glasgow 8 (ver `51-rtm-verificacion.md`, M1). |
| N20 | `Sidebar.jsx` con V(G) = 6 (README:3208) | NV | No hay medición de complejidad para JS en R4. |
| N21 | «100 % de cobertura de ramas y decisiones» en la prescripción paraclínica (README:3218) | NV | El reporte de Vitest es solo un resumen global (ramas 51,88 %); no hay dato por archivo. |
| N22 | Tabla de la sección 3 de la Entrega Final: 8 normas «CONFORME (100%)» y «cobertura al 100 % de los requerimientos» con «105 pruebas» (README:3154-3161) | F | La contradicen N3 (offline), N23 (WCAG), N3 de la tabla R3 (ASVS) y la RTM (11 de 24 sostenidos). La cifra de 105 pruebas está desactualizada. |
| N23 | WCAG 2.1 AA: «contraste superior a 4.5:1» (README:3161), «superior a 7:1 en datos vitales» (README:2179) y «WCAG AA / AAA Conforme» (README:444, 1963) | F [M] | `text-outline` (#6e7977), la clase de color de texto más usada (427 usos), da 4,27:1 sobre `bg-background` (#faf8ff), por debajo de 4,5:1. `text-slate-500` da 4,44:1 sobre el óvalo del perfil en la parada #0F766E. Ver `53-wcag.md`. |
| N24 | Recorridos automatizados con Playwright: 29 pantallas, TI, portal, sesión por pestaña, MariaDB con dos navegadores, CSP sin violaciones (README:2562, 2643, 2726, 2764, 2789, 2822) | NV | No hay scripts de Playwright ni dependencia de Playwright en el repositorio, así que no son reproducibles. |
| N25 | Intercepción de alergias en «< 150 ms» (README:19, 521) | P [M] | La única medición es `TestPrescriptionAllergyInterceptor` (`prescription_test.go:112`), en memoria a nivel de servicio, y pasa. No hay medición HTTP. |
| N26 | Benchmark del *pipeline* de prescripción en 2,96 µs/op (README:1959, 2064, 2177) | NV | Los benchmarks no se ejecutaron en R4. |
| N27 | `docs/especificacion.md` contiene RF01 a RF16 (README:1792) | F [R] | `docs/especificacion.md:17-28` solo define RF01 a RF12. |
| N28 | RF16: notas de enfermería con «almacenamiento persistente en `localStorage`» (README:532) | F [R] | Contradice README:2738-2752 (sección 1.19) y el código: `NurseChecklistView.jsx:49`, `:101` usa `/api/v2/nursing`. |
| N29 | Versión entregada con el tag `entrega-final-v2` (README:11) | P [R] | El tag apunta a `1c8ca3f` (19 nov 2026, igual a `origin/prueba`); `origin/main` tiene 10 commits más (cierre R3, sección 1.25) que no están en el tag. |
| N30 | Las pruebas Go citadas en el README existen | V [R] | 78 identificadores `Test...` distintos: 59 coinciden exactamente y 19 abreviados (`TestDEF49`, `TestDEF28`, etc.) corresponden a una función con ese prefijo. |
| N31 | Res. 2275/2023: «generación de facturación electrónica y RIPS JSON», «CONFORME (100%)» (README:3160) | P [R] | `adapters/interoperability/rips_generator.go` genera RIPS JSON con `numFactura`. No hay validación contra el esquema oficial ni facturación electrónica. El README cita `interoperability/rips.go`, que no existe. |
| N32 | RNF01 (p95 < 400 ms) «APROBADO (PASS)» en la RTM (README:388) | NV | README:437 y 1955 reconocen que no hay medición HTTP; los benchmarks citados no miden p95. |
| N33 | Registro de TI «verificado con 8 solicitudes concurrentes y el detector de carreras» (README:2623) | P [M] | La prueba concurrente de `ti_setup_test.go` pasa sin `-race`; con `-race` no se puede ejecutar en local. |
| N34 | Disparadores «probados en MySQL y PostgreSQL» (README:2810) | NV | `TestMySQLDisparadoresDeInmutabilidad` y las pruebas de PostgreSQL son de integración y no se ejecutan. |

## 3. Conteo

Comparables (48 de R3), por veredicto R4:

| Veredicto | N de la tabla 1 | Cantidad |
|---|---|---|
| Verificada | 1, 2, 19, 20, 23, 24, 25, 28, 29, 33, 34, 35, 36, 37, 40, 41, 42, 43, 44 | 19 |
| Parcial | 5, 8, 9, 11, 13, 15, 18, 21, 22, 26, 27, 30, 31, 32, 38, 39, 45, 46, 47 | 19 |
| No verificada | 17 | 1 |
| Falsa | 3, 4, 7, 14, 16 | 5 |
| Retirada | 6, 10, 12, 48 | 4 |

Nuevas (34):

| Veredicto | N de la tabla 2 | Cantidad |
|---|---|---|
| Verificada | N2, N4, N6, N7, N8, N9, N13, N15, N17, N18, N30 | 11 |
| Parcial | N5, N14, N16, N25, N29, N31, N33 | 7 |
| No verificada | N11, N20, N21, N24, N26, N32, N34 | 7 |
| Falsa | N1, N3, N10, N12, N19, N22, N23, N27, N28 | 9 |

```text
Comparables (48 de R3): V=19, P=19, NV=1, F=5, Retiradas=4
Total R4 (comparables vigentes + nuevas): V=30, P=26, NV=8, F=14
```

(44 comparables vigentes + 34 nuevas = 78 afirmaciones evaluadas.)
