# Informe de la revisión de calidad R3 (10 nov 2026)

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

- **Proyecto:** SaludConecta IPS v2.4 (Ingeniería de Software II, COTECNOVA, 2026-2).
- **Responsable:** Juan José Sánchez, Responsable de Calidad.
- **Modelo:** ISO/IEC 25010:2023. Clasificación de defectos: IEEE 1044. Mantenimiento: ISO/IEC 14764.
- **Base evaluada:** `origin/main` `9bacb0a` integrado en la rama `calidad/revision-r3`.
- **Evidencia:** `docs/calidad/anexos/evidencias/r3/` (cada archivo incluye comando, fecha y código de salida). Cifras: `anexos/cifras-r3.json`.

---

## 1. Resumen ejecutivo

**Estado en una frase:** el equipo corrigió de verdad la mayoría de los defectos de la revisión 1 (26 de 48 verificados con prueba), pero los módulos nuevos introdujeron 18 defectos críticos abiertos que pueden afectar a pacientes, por lo que el producto **no es conforme** con ISO/IEC 25010:2023 y el dictamen «Aprobado 100 %» publicado no se sostiene.

### 1.1 Semáforo ISO/IEC 25010:2023

| Característica | Estado | Motivo principal |
|---|---|---|
| Adecuación funcional | Rojo | La prescripción v2, la única que muestra la interfaz, no cruza alergias (DEF-51); recetas con cantidades negativas (DEF-52); citas guardadas con 5 horas de desfase (DEF-85) |
| Eficiencia de desempeño | Verde | p95 medido de 1,38 a 7,86 ms frente al límite de 400 ms del RNF01 |
| Compatibilidad | Amarillo | RIPS y FHIR presentes; con PostgreSQL el triaje falla y los módulos v2 usan memoria (DEF-10, DEF-65) |
| Capacidad de interacción | Amarillo | Contraste de 2,15:1 en banners que se anuncian AAA (DEF-36); errores silenciados (DEF-82) |
| Fiabilidad | Rojo | Borrado físico de pacientes y alergias (DEF-55); migración que borra tablas (DEF-56); administración de medicamentos solo en el navegador (DEF-75) |
| Seguridad | Rojo | Alta anónima de administradores (DEF-49) y semilla TOTP pública (DEF-50) |
| Mantenibilidad | Amarillo | Cobertura backend 68,9 %; 16 funciones con complejidad mayor de 15; el núcleo importa adaptadores (DEF-84) |
| Flexibilidad | Amarillo | El esquema de PostgreSQL no sigue al de MySQL (DEF-65) |
| Seguridad operacional (*Safety*) | Rojo | Dispensación sin documento (DEF-53), de vencidos (DEF-54), datos clínicos inventados en enfermería (DEF-74) y HCE de otro paciente por nombre parcial (DEF-78) |

### 1.2 Cifras clave medidas en R3

| Indicador | Valor | Evidencia |
|---|---|---|
| Defectos registrados | 92 (DEF-01 a DEF-92) | `04-bitacora-defectos.md` |
| Verificación de DEF-01 a DEF-48 | 26 verificados, 9 corregidos parcialmente, 12 siguen abiertos, 1 sin ejecución medible, 0 regresiones | Sección 3 |
| Defectos abiertos en `main` (DEF-05 a DEF-92) | 63: 18 críticos, 9 altos, 28 medios, 8 bajos | `cifras-r3.json` |
| Defectos nuevos de R3 | 8 (DEF-85 a DEF-92): 1 crítico, 1 alto, 6 medios | Sección 6 |
| Pruebas backend (`tests/backend`) | 91 pasan, 0 fallan, 22 reproducciones de defectos abiertos omitidas por diseño | `12-go-test-tests.txt` |
| Reproducciones de defectos abiertos | 22 de 22 fallan por el defecto declarado | `32-control-defectos-local.txt` |
| Cobertura backend | 68,9 % (66,6 % sin las pruebas de R3) | `13-cover-func-tests.txt` |
| Vitest | 108 pruebas en 15 archivos, todas pasan (105 en 14 archivos del equipo) | `24-vitest.txt` |
| Cobertura frontend | 72,85 % de sentencias | `25-vitest-coverage.txt` |
| golangci-lint | 62 hallazgos (21 nuevos desde la v1) | `05c-golangci-lint-total.txt` |
| Vulnerabilidades alcanzables (Go) | 1 (GO-2026-6888, DEF-83) | `07-govulncheck.txt` |
| p95 HTTP | 1,38 ms real (110 peticiones); 3,92 a 7,86 ms en proceso | `41-…`, `42-…` |
| RTM | 5 de 21 requisitos se sostienen sin un defecto abierto que los contradiga | Sección 4.3 |

### 1.3 Principales riesgos

1. **Seguridad del paciente en la vía de prescripción v2 y en farmacia:** la interfaz solo permite prescribir por la vía v2, que no cruza alergias (DEF-51) ni extiende la alergia a la familia del fármaco (DEF-60). Farmacia dispensa sin documento (DEF-53), lotes vencidos (DEF-54) y recetas canceladas o reactivadas (DEF-58, DEF-59).
2. **Autenticación eludible:** cualquiera puede crear un administrador activo (DEF-49) y obtener la semilla TOTP de cualquier cuenta (DEF-50).
3. **Datos clínicos falsos o perdidos en enfermería y admisión:** órdenes, alergias y grupo sanguíneo inventados (DEF-74, DEF-79), administración de medicamentos guardada solo en el navegador (DEF-75) y borrado físico de pacientes con sus alergias (DEF-55).

### 1.4 Principales aciertos

1. **Las correcciones del equipo son reales y están probadas:** los 6 críticos de la v1 corregidos (DEF-05 a 09 y DEF-11) tienen pruebas de regresión que pasan y que fallarían si se revirtiera la corrección.
2. **Rendimiento holgado:** la latencia está entre 50 y 290 veces por debajo del límite del RNF01.
3. **La automatización frontend es real y amplia:** 105 pruebas en 14 archivos, como se afirma, con cobertura medible del 72,85 %.

---

## 2. Alcance y método

- **Alcance:** todo el código de `origin/main` (backend, frontend, despliegue y documentación), las tarjetas de Trello de «Bugs solucionados» y «Pruebas QA», y el README (que desde `94f7a96` incluye el contenido del antiguo `QA.md`).
- **Diagnóstico previo:** `anexos/diagnostico-r3.md`. La revisión 2 se había ejecutado solo en parte; sus hallazgos se reverificaron y se publican aquí (decisión D-02).
- **Línea base y análisis estático:** `anexos/linea-base-r3.md` y `anexos/analisis-estatico-r3.md`.
- **Técnicas:** ejecución de las pruebas existentes; pruebas de reproducción nuevas (fallan mientras el defecto exista); lectura de código con referencias `archivo:línea`; ejecución real del backend en memoria; medición de rendimiento y memoria; cálculo de contraste WCAG; scripts de comprobación de la RTM y del mapa SEC -> DEF.
- **No medido:** `go test -race` en local (sin gcc; se ejecuta en CI), Docker Compose, MySQL y PostgreSQL, axe-core y Lighthouse.
- **Reglas de veredicto:** sección 5 de la tarea (Verificado — corregido / Corregido parcialmente / Sigue abierto / Ya no aplica / Regresión). Se añade «Corrección presente; ejecución No medida» para el caso en que el código corregido existe pero no hay motor de base de datos para ejecutarlo (D-06).

---

## 3. Verificación de correcciones

Detalle de cada defecto con evidencia en la sección «Verificación R3 (10 nov 2026)» de su ficha en `04-bitacora-defectos.md`.

### 3.1 DEF-01 a DEF-48

| Veredicto | Cantidad | Defectos |
|---|---|---|
| Verificado — corregido | 26 | 01, 04, 05, 06, 07, 08, 09, 11, 12, 13, 14, 16, 17, 18, 19, 20, 23, 24, 26, 27, 31, 34, 37, 42, 46, 47 |
| Corregido parcialmente | 9 | 02, 10, 15, 21, 22, 33, 38, 40, 48 |
| Sigue abierto | 12 | 03, 28, 29, 30, 32, 35, 36, 39, 41, 43, 44, 45 |
| Corrección presente; ejecución No medida | 1 | 25 |
| Regresión | 0 | — |
| Ya no aplica | 0 | — |
| **Total** | **48** | |

DEF-48 se reabrió en R3: el equipo corrigió la prueba original, pero el primer run del pipeline mostró la misma causa (timeout de 1 s bajo `-race`) en `TestDualTokenLoginAndRefreshFlow` y `TestRefreshTokenRevocationOnUserDeactivation` (`evidencias/r3/60-ci-run-42922715510-fallos.txt`).

DEF-28 y DEF-41 siguen abiertos en `main` porque sus correcciones son de Calidad y nunca se fusionaron: el PR #1 sigue abierto. Con el código de `main`, la prueba de DEF-28 altera 18 de 20 entradas de auditoría (`31-def28-en-main.txt`). No son regresiones: en `main` nunca estuvieron corregidos.

### 3.2 Los siete críticos de la revisión 1

| ID | Veredicto | Evidencia |
|---|---|---|
| DEF-05 | Verificado | `TestDEF05PrescripcionRechazaPacienteDistintoAlFolio` pasa sobre la corrección del equipo |
| DEF-06 | Verificado | `TestDEF06CruceAlergiasReactividadCruzadaYTildes` pasa. Brechas nuevas aparte: DEF-51 y DEF-60 |
| DEF-07 | Verificado | `TestDEF07SincronizacionNoSobrescribeFolioCerrado` pasa |
| DEF-08 | Verificado | `TestDEF08NivelManchesterFueraDelCatalogo` pasa |
| DEF-09 | Verificado | `TestDEF09HipotermiaSeveraNoEsNoUrgente` pasa: 30 °C ya no es Nivel IV ni V |
| DEF-10 | Corregido parcialmente | Con MySQL el servicio termina si no conecta. Con `DB_DRIVER=postgres`, `factory.go:152-163` usa memoria sin aviso para citas, inventario, recetas v2 y muro |
| DEF-11 | Verificado | No hay cuentas sembradas; el backend arrancado solo crea el administrador definido por el operador |

### 3.3 Casos señalados por la tarea

- **DEF-02 (caché de alergias):** sigue sin existir. El README reutiliza ahora el identificador DEF-02 para otro defecto (DEF-92). Veredicto: corregido parcialmente (solo el índice).
- **DEF-10:** la decisión de diseño pendiente para MySQL se resolvió bien (fallar al arrancar). Queda decidir qué hacer con los módulos v2 en PostgreSQL.

### 3.4 Defectos de la revisión 2 (DEF-49 a DEF-84)

`src/` no cambió entre la revisión 2 y `main`. Las 18 reproducciones automatizadas de la v2 siguen fallando por su defecto. Los demás se verificaron por lectura. Todos siguen abiertos salvo DEF-63, corregido en la rama de calidad y ampliado en R3 al valor de ejemplo del README (`33-…` y `34-def63-readme-despues.txt`).

---

## 4. Verificación de afirmaciones publicadas

Veredictos: **Verificada**, **Parcial**, **No verificada** (no hay evidencia y no se pudo medir) y **Falsa** (la evidencia la contradice).

### 4.1 Tabla

| # | Afirmación | Fuente | Evidencia R3 | Veredicto |
|---|---|---|---|---|
| 1 | Listas de Trello «Por hacer / En curso / En revisión / Hecho» | README §3 | El tablero tiene 6 listas distintas | Falsa (corregida en esta rama, cambio autorizado) |
| 2 | `JWT_SECRET` y `ADMIN_INITIAL_PASSWORD` con valores de ejemplo | README §8 | El ejemplo de `JWT_SECRET` (39 caracteres) se aceptaba como secreto real | Falsa (corregida: README y `fix(DEF-63)`) |
| 3 | Seguridad OWASP ASVS Nivel 2 | README §1, RNF03 | ASVS L2 medido en la v1: 34,0 %; R3 agrega DEF-49 y DEF-50 | Falsa |
| 4 | Contraste WCAG AAA de los banners | README RF09 | 2,15:1 y 3,74:1 en pediatría (`44-…`) | Falsa |
| 5 | RTM: 100 % de RF01 a RF12 y RNF01 a RNF08 | README §4.5, tarjeta «Certificación de Calidad» | 18 de 21 filas citan pruebas que existen; solo 5 requisitos se sostienen sin defecto contrario; el README define RF01 a RF16 | Falsa |
| 6 | «Cumple de forma estricta y verificable el 100 %» | README §4.7 | 63 defectos abiertos, 18 críticos | Falsa |
| 7 | «Aprobado 100 % conforme a ISO/IEC 25010 e ISO/IEC/IEEE 29119» | Tarjeta «Certificación de Calidad», README §14.1 | Dictamen de la sección 7: no conforme | Falsa (DEF-91) |
| 8 | Triaje en 5,55 ns/op | Tarjeta «Certificación», README | 9,47 a 9,97 ns/op en este equipo; el benchmark mide solo `SuggestManchesterPriority()` | Parcial: reproducible como función pura, no como «triaje» |
| 9 | Alergias en 3,23 µs/op | Tarjeta, README | 5,3 a 5,8 µs/op | Parcial: mismo orden de magnitud; depende del equipo |
| 10 | Latencia p95 de 28,4 ms | Tarjeta «Certificación» | Ningún comando del repositorio produce esa cifra; medido 1,38 a 7,86 ms | No verificada (el RNF01 sí se cumple) |
| 11 | Memoria de 18,2 MB | Tarjeta «Certificación» | 11,5 a 16,3 MB de WorkingSet; la fuente no dice qué métrica | Parcial |
| 12 | `QA.md` en la raíz | Tarjeta «Certificación» | Eliminado en `94f7a96`; contenido en el README | Falsa |
| 13 | Tag `entrega-s2` | Tarjeta «Certificación», README | Existe, pero apunta a `16eb08f` (4 nov), anterior a los módulos nuevos y a la consolidación del README | Parcial |
| 14 | Clonación de buffers de auditoría antes de la goroutine | Tarjeta «QA Blindaje», README §14.3 | En `main`, 18 de 20 entradas alteradas; no existe `append([]byte(nil), c.Body()...)` | Falsa (corregido solo en la rama de calidad) |
| 15 | Pool MySQL MaxOpen 25 y MaxIdle 10 | Tarjeta «QA Blindaje» | `mysql/connection.go:39-59` | Verificada |
| 16 | Timeouts de 3 s en los repositorios SQL | Tarjeta «QA Blindaje», README | No hay `context.WithTimeout` en `adapters/storage/mysql` | Falsa |
| 17 | Suite limpia con `-race` | Tarjeta «QA Blindaje» | No medible en local (sin gcc); se ejecuta en el CI de este PR | No verificada |
| 18 | 105 pruebas en 14 archivos de Vitest, todas en verde | Tarjeta «Automatización Integral» | 105 en 14 archivos del equipo (108 en 15 con la de Calidad) | Verificada |
| 19 | Build de producción limpio | Tarjeta «Automatización Integral» | OK; solo un aviso de tamaño de *chunk* | Verificada |
| 20 | Contraste WCAG AAA en el modal de alergias | Tarjeta «Automatización Frontend» | La prueba usa una copia del componente; el real tiene 6,47:1 en el dato de severidad | Parcial (DEF-90) |
| 21 | Manejo de HTTP 500 con alerta y reintento, sin pantallas en blanco | Tarjetas «Automatización Frontend» y «Enfermería» | Cierto en la HCE (`ResilienceQuality.test.jsx`); hay vistas nuevas que silencian errores (DEF-82) | Parcial |
| 22 | «Pruebas sin mocks falsos» / «flujos sobre API real» | Tarjeta «Automatización Frontend» | Las pruebas simulan `fetch` (`helpers/mockApi.js`); no usan una API real, aunque sí simulan errores | Parcial |
| 23 | TOTP validado contra los vectores del RFC 6238 | Tarjeta «Automatización Frontend» | `totp.test.js` (18 pruebas) pasa | Verificada |
| 24 | SEC-C01, C04, C05, A02, A05 corregidos | Tarjeta «Auditoría de Seguridad» | DEF-05, 08, 09, 13 y 16 verificados | Verificada |
| 25 | SEC-A04: bloqueo tras 5 intentos e IP real | Tarjeta «Auditoría de Seguridad» | DEF-15 corregido parcialmente | Parcial |
| 26 | «7 críticos blindados» | Tarjeta «Auditoría de Seguridad» | 6 de 7 verificados (DEF-10 parcial) | Parcial |
| 27 | «16 altos corregidos y probados» | Tarjeta «Auditoría de Seguridad» | 12 de 16 verificados | Parcial |
| 28 | «TOTP validado exclusivamente en el servidor» | Tarjeta «Auditoría de Seguridad» | Lo valida el servidor, pero la semilla es pública (DEF-50) | Parcial |
| 29 | Cuentas asistenciales nacen inactivas (ReTHUS) | Tarjeta «Auditoría de Seguridad» | Cierto para `/admin/users`; `register-admin` crea un ADMIN activo sin autenticación (DEF-49) | Parcial |
| 30 | Citas: rechazo de fechas pasadas con HTTP 422 | Tarjeta «Citas» | Se rechaza en el servidor (`TestR3CitaEnElPasadoSeRechazaEnElServidor`), pero con **400**; tolera 2 minutos | Parcial |
| 31 | Citas: separación mínima de 20 minutos | Tarjeta «Citas» | 19 min solapa; 20 y 21 min no (`TestR3CitaSolapamientoEnLosBordesDe20Minutos`). Sin protección ante citas simultáneas (DEF-69) | Parcial |
| 32 | Citas: PDF y correo simulado | Tarjeta «Citas» | El PDF se genera; el «correo simulado» guarda nombre, documento y observaciones en claro en `storage/outbox` (DEF-62) y, si hay SMTP configurado, se envía de verdad; la interfaz confirma el envío sin esperar al servidor (DEF-21) | Parcial |
| 33 | Notas 3D: solo MEDICO con tarjeta profesional | Tarjeta «Notas Anatómicas» | `User.IsDoctor()` exige rol y tarjeta; ruta solo MEDICO | Verificada |
| 34 | Notas 3D: inmutables tras el cierre | Tarjeta «Notas Anatómicas» | Cierto en el servicio (`TestR3NotaAnatomica…`); no hay trigger en base de datos para `clinical_anatomical_notes` y la comprobación deja pasar la operación si falla la consulta (DEF-66) | Parcial |
| 35 | Notas 3D: anti-IDOR | Tarjeta «Notas Anatómicas» | Editar y borrar notas ajenas se rechaza; crear una nota en el folio de otro paciente se acepta (DEF-57) | Parcial |
| 36 | Notas 3D: EVA de 0 a 10 | Tarjeta «Notas Anatómicas» | −1 y 11 se aceptan (DEF-89) | Falsa |
| 37 | Farmacia: cotejo de la cédula PDF417 | Tarjeta «Farmacia V2» | El documento es opcional (DEF-53), se prellena (DEF-77) y no se normaliza (DEF-86) | Falsa en la práctica |
| 38 | Farmacia: bloqueo de doble dispensación (409) | Tarjeta «Farmacia V2» | 20 dispensaciones simultáneas producen una sola entrega (`TestR3DispensacionConcurrenteEntregaUnaSolaVez`); una receta dispensada se reactiva reenviándola (DEF-58) | Parcial |
| 39 | Farmacia: descuento atómico sin saldos negativos | Tarjeta «Farmacia V2» | Atómico en memoria y MySQL; una cantidad negativa aumenta el stock (DEF-52) | Parcial |
| 40 | Muro: el backend rechaza videos de más de 120 s | Tarjeta «Muro Educativo» | Solo compara el número que envía el cliente; acepta −30 s y contenido HTML (DEF-87) | Parcial |
| 41 | Muro: solo MEDICO publica | Tarjeta «Muro Educativo» | Ruta y servicio exigen MEDICO; un médico puede editar publicaciones de otro (DEF-70) | Parcial |
| 42 | Muro: persistencia de la EVA en el triaje | Tarjeta «Muro Educativo» | Una EVA fuera de rango se guarda como 0 (DEF-67) | Parcial |
| 43 | Resumen clínico de enfermería | Tarjeta «Enfermería» | Diagnósticos, alergias, fármacos y grupo sanguíneo inventados (DEF-74) | Falsa |
| 44 | Registro de sedes en caliente | Tarjeta «Enfermería» | Solo un catálogo local del navegador, sin API (la interfaz lo advierte) | Parcial |
| 45 | Mitigación de DEF-01 a DEF-04 y SEC-C01 a SEC-B01 | Tarjeta «Consolidación Documental» | DEF-01 y 04 verificados, DEF-02 parcial, DEF-03 abierto; 20 de 25 SEC verificados | Parcial |
| 46 | RTM de RF01 a RF12 «más los 5 módulos nuevos» | Tarjeta «Consolidación Documental» | La RTM no tiene filas para RF14 a RF16 (farmacia, tratamiento y enfermería) | Falsa |
| 47 | Casos BVA y EP de Glasgow, FC y temperatura | Tarjeta «Diseño Formal» | Las pruebas existen y pasan; el documento citado `QA.md` ya no existe | Verificada (salvo la referencia a `QA.md`) |
| 48 | `/health` informa «ISO/IEC 25010 Evaluated» | Respuesta del backend | No consulta la base de datos (DEF-32) y declara una evaluación no emitida por Calidad | Falsa |

### 4.2 Resumen

| Veredicto | Cantidad |
|---|---|
| Verificada | 7 |
| Parcial | 24 |
| No verificada | 2 |
| Falsa | 15 |
| **Total** | **48** |

### 4.3 RTM (H39)

Script: `evidencias/r3/50-rtm-verificacion.txt`. Una fila «se sostiene» si cita una prueba real que pasa y ningún defecto abierto contradice el requisito.

| Resultado | Requisitos |
|---|---|
| Se sostiene (5) | RF02, RF06, RF10, RF12, RNF07 |
| Parcial (9) | RF03 (DEF-57, 74, 75), RF04 (DEF-29, 30), RF11 (DEF-55, 68), RF13 (DEF-57, 89), RNF01 (la RTM cita benchmarks que no miden p95), RNF02 (DEF-71), RNF05, RNF06 (DEF-10), RNF08 (DEF-69) |
| No se sostiene (6) | RF01 (DEF-49, 50), RF05 (DEF-51, 60), RF07 (DEF-49), RF08 (DEF-72), RF09 (DEF-36), RNF03 (ASVS) |
| No verificable (1) | RNF04: `TestMySQLChainSyncAndTimestamps` necesita `-tags integration` y MySQL; no la ejecutan ni la suite local ni el CI |

### 4.4 Requisitos RF11 y RF12 (H40)

- RF11 (admisión y alergias) y RF12 (catálogo y prescripción) **coinciden** en `docs/especificacion.md:27-28` y en la sección 5 del README (líneas 485-486).
- El README define además RF13 a RF16 (agendamiento, tratamiento, farmacia y enfermería), que no están en `docs/especificacion.md`. En la RTM, «RF13» es el kit médico (EVA y anatomía), no el agendamiento. El texto del README sigue diciendo «RF01 a RF12» en cuatro sitios.

---

## 5. Revisión de módulos nuevos

| Módulo | Verificado que funciona | Defectos |
|---|---|---|
| **Citas médicas** | Rechazo de fechas pasadas en el servidor; bordes de 19, 20 y 21 minutos correctos; RBAC MEDICO, ADMIN y ENFERMERO | DEF-85 (zona horaria, Crítico), DEF-88 (paciente inexistente), DEF-69 (carrera con citas simultáneas y médico erróneo), DEF-62 (datos personales en claro en PDF y bandeja), DEF-64 (códigos con `math/rand`) |
| **Notas anatómicas 3D** | Solo MEDICO con tarjeta profesional; anti-IDOR en editar **y** borrar; bloqueo tras el cierre en el servicio | DEF-57 (nota en el folio de otro paciente), DEF-66 (fallo abierto y EVA fuera del hash), DEF-89 (EVA −1 y 11 y coordenadas sin validar), DEF-72 (AUDITOR bloqueado); sin trigger en base de datos |
| **Farmacia V2** | Una sola entrega con 20 dispensaciones simultáneas; descuento atómico en memoria y MySQL (`SELECT … FOR UPDATE`) | DEF-51, 52, 53, 54, 58, 59, 60 (críticos), DEF-77 (prellenado), DEF-86 (PDF417 sin normalizar). El rol FARMACIA no figura en el modelo de roles documentado (RF01) |
| **Muro educativo** | Solo MEDICO publica; React escapa el texto; no se reprodujo XSS | DEF-87 (duración declarada por el cliente, video en base64 y límite de 4 MB del servidor frente a 20 MB de la interfaz), DEF-70 (edita otro médico) |
| **Enfermería y sedes** | RBAC del backend aplicado a pacientes y triaje | DEF-74, 75 (críticos), 76, 80, 81, 82; sedes solo en el navegador; ENFERMERO puede borrar pacientes (DEF-55) |

La matriz RBAC de las 70 rutas está en `anexos/matriz-rbac.md` (sección C.R3): 55 ejecutadas por `TestRBACMatrizRutasPorRol` y 15 verificadas por lectura (H34).

### 5.1 Hipótesis

| Hipótesis | Resultado R3 |
|---|---|
| H01 a H33 (revisión 1) | Se reevaluaron las relacionadas con áreas que cambiaron: H12 (RBAC) pasa a H34; H21 (alergia vigente) sigue refutada (`TestH21AlergiaRegistradaSeAplicaDeInmediato` pasa); H23 (límites de Glasgow) sigue confirmada y cubierta; H28 (arquitectura) pasa a **confirmada** por DEF-84. Las demás conservan su veredicto de la v1 porque su código no cambió |
| **H34** Rutas o pantallas nuevas sin RBAC | Confirmada: 2 rutas públicas indebidas (DEF-49, 50), roles inconsistentes (DEF-72) y pantallas sin control de rol (DEF-80) |
| **H35** Dependencias | DEF-24 cerrado (Fiber v2.52.16); nueva vulnerabilidad alcanzable en brotli (DEF-83); `npm audit` de producción en 0 |
| **H36** Afirmaciones sin evidencia | Confirmada: 15 afirmaciones falsas y 2 no verificadas de 48 evaluadas (sección 4) |
| **H37** Las pruebas prueban el código real | Mayormente sí. Excepciones: `AllergyAlertModal.test.jsx` prueba una copia (DEF-90); `MedicalKit.test.jsx` afirma contenido semilla; las pruebas citadas para el «DEF-02» del README no ejercitan la auditoría; la prueba de MySQL nunca se ejecuta |
| **H38** Cifras de rendimiento reproducibles | Parcial: los benchmarks se reproducen en magnitud; el p95 de 28,4 ms no tiene origen; el de triaje mide solo la función de clasificación |
| **H39** RTM con pruebas reales | 18 de 21 filas citan pruebas existentes; 5 de 21 requisitos se sostienen |
| **H40** RF11 y RF12 | Coinciden en especificación y README; el rango real es RF01 a RF16 |

---

## 6. Defectos nuevos (R3)

Fichas completas en `04-bitacora-defectos.md`.

| ID | Título | Severidad | Reproducción |
|---|---|---|---|
| DEF-85 | Interpretar como UTC la hora local de la cita | Crítica | `TestDEF85CitaConservaLaHoraLocalDeColombia` |
| DEF-86 | Extraer el documento del PDF417 con una expresión genérica y compararlo sin normalizar | Media | Lectura |
| DEF-87 | Validar la duración del video con el valor que declara el cliente y aceptar contenido que no es video | Media | `TestDEF87MuroNoConfiaEnLaDuracionDeclaradaPorElCliente` |
| DEF-88 | Agendar citas para pacientes inexistentes | Media | `TestDEF88CitaExigePacienteExistente` |
| DEF-89 | Aceptar EVA y coordenadas fuera de rango en notas anatómicas | Media | `TestDEF89NotaAnatomicaRechazaEVAFueraDeRango` |
| DEF-90 | Probar una copia del modal de alergias en lugar del componente real | Media | Lectura |
| DEF-91 | Publicar un dictamen «Aprobado 100 %» y una RTM al 100 % sin evidencia | Alta | Sección 4 |
| DEF-92 | Reutilizar DEF-01 a DEF-04 y crear identificadores SEC-* paralelos con referencias inexistentes | Media | `mapa-ids-sec-def.md` |

| | Crítica | Alta | Media | Baja | Total |
|---|---|---|---|---|---|
| Nuevos en R3 | 1 | 1 | 6 | 0 | 8 |
| Publicados en R3 desde la revisión 2 (DEF-49 a DEF-84) | 16 | 7 | 11 | 2 | 36 |

**Correcciones de Calidad en esta revisión:** `fix(DEF-63)`, que rechaza como `JWT_SECRET` el valor de ejemplo del README (prueba `TestDEF63EjemploDelREADMENoEsSecretoValido`: falla antes y pasa después). Las demás correcciones exigen cambiar contratos o el comportamiento clínico y se proponen al equipo.

---

## 7. Dictamen de calidad

**No conforme** con ISO/IEC 25010:2023. El dictamen «Aprobado 100 %» no se sostiene con la evidencia disponible.

| Característica | Conformidad | Justificación |
|---|---|---|
| Adecuación funcional | No conforme | Críticos abiertos en prescripción v2, farmacia, citas y enfermería |
| Eficiencia de desempeño | Conforme | RNF01 cumplido con amplio margen (p95 ≤ 7,86 ms) |
| Compatibilidad | Conforme con observaciones | Interoperabilidad RIPS y FHIR presente; PostgreSQL incompleto |
| Capacidad de interacción | Conforme con observaciones | Contraste insuficiente en banners; errores silenciados en vistas nuevas |
| Fiabilidad | No conforme | Pérdida de datos clínicos (DEF-55, 56, 75) y persistencia en memoria con PostgreSQL (DEF-10) |
| Seguridad | No conforme | DEF-49 y DEF-50 permiten tomar una cuenta administrativa y eludir el MFA |
| Mantenibilidad | Conforme con observaciones | Cobertura 68,9 %, complejidad y acoplamiento del núcleo en aumento |
| Flexibilidad | Conforme con observaciones | Esquemas de BD divergentes |
| Seguridad operacional | No conforme | 18 defectos críticos abiertos con impacto potencial en pacientes |

Condición mínima para un dictamen favorable: cerrar los 18 críticos y DEF-91 con pruebas de regresión que pasen en el pipeline.

---

## 8. Acciones de mantenimiento (ISO/IEC 14764)

| Prioridad | Acción | Tipo | Defectos | Responsable sugerido |
|---|---|---|---|---|
| 1 | Eliminar `register-admin` público y `mfa-seed`, y el botón «Pegar código de prueba» | Correctivo | DEF-49, 50 | Arquitecto |
| 2 | Aplicar `MatchAllergy` (con familia del alérgeno) en la prescripción v2 y en la dispensación | Correctivo | DEF-51, 60 | Arquitecto |
| 3 | Reglas de dispensación en el servicio: documento obligatorio y sin prellenar, vencimiento, estado CANCELLED, ID generado por el servidor y cantidades positivas | Correctivo | DEF-52, 53, 54, 58, 59, 77 | Arquitecto |
| 4 | Enfermería y admisión solo con datos del servidor: sin órdenes por defecto, sin «O+» por defecto, administración de medicamentos por API | Correctivo | DEF-74, 75, 79 | Frontend |
| 5 | Eliminación lógica de pacientes y migración v2 sin `DROP` | Correctivo | DEF-55, 56 | Persistencia |
| 6 | Fechas de citas con zona horaria | Correctivo | DEF-85 | Arquitecto |
| 7 | Búsqueda de pacientes con confirmación, sin abrir la HCE por coincidencia parcial | Correctivo | DEF-78 | Frontend |
| 8 | Fusionar las correcciones de Calidad (DEF-28, 41, 63) y cerrar o reemplazar el PR #1 | Correctivo | DEF-28, 41, 63 | Arquitecto |
| 9 | Retirar el dictamen de conformidad y rehacer la RTM con RF01 a RF16 | Preventivo | DEF-91, 92, 39 | Pruebas y Calidad |
| 10 | Actualizar brotli, puertos para PDF y correo, y bajar la complejidad | Perfectivo | DEF-83, 84, 44 | Arquitecto |

**Las 5 de mayor retorno** (menor esfuerzo por riesgo eliminado): 1, 2, 3, 4 y 8. Las cuatro primeras cierran 13 de los 18 críticos; la 8 cierra tres defectos con código ya escrito y probado.
