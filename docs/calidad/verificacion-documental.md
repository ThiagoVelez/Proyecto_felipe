# Verificación de consistencia documental (Fase 3)

Documentos contrastados: `README.md`, `docs/especificacion.md`, `docs/plan-de-pruebas.md` y `docs/informe-calidad.md` (versión `6492f07`), contra el código, las pruebas y las mediciones de `anexos/`.

Veredictos: **Verificada** (la evidencia la respalda), **Parcial** (cierta solo en parte o sin medición suficiente), **Falsa** (la evidencia la contradice) y **No verificable** (no hay forma de comprobarla con los medios disponibles; se indica el motivo).

## 1. Matriz

| # | Afirmación | Fuente | Evidencia | Veredicto |
|---|---|---|---|---|
| 1 | El producto está «evaluado, asegurado y documentado» bajo ISO/IEC 25010 | `README.md:20` | Había un informe cualitativo sin métricas, umbrales ni mediciones, con el modelo de 2011 (fila 10). | Parcial |
| 2 | Cumple los lineamientos OWASP ASVS nivel 2 | `README.md:20`, RNF03 | 34,0 % de cumplimiento estricto sobre 53 requisitos (`05-auditoria-owasp-asvs-l2.md`). | Falsa |
| 3 | La especificación cubre RF01–RF08 y RNF01–RNF05 | `README.md:47,1071` | `docs/especificacion.md` define RF01–RF06 (`:17-22`) y RNF01–RNF03 (`:27-29`); la tabla del README llega a RF10 (`README.md:60-69`) y a RNF05 (`:75-79`). Las tres fuentes difieren. | Falsa |
| 4 | Las listas de Trello son «Por hacer / En curso / En revisión / Hecho» | `README.md:45-50` | Según la asignación del equipo, el tablero usa «Avisos / Tareas por realizar / Tareas realizadas / Bugs encontrados para solucionar». El agente no tiene acceso a Trello; la fuente es la información del propio equipo. | Falsa |
| 5 | Lo «Hecho» tiene 100 % de pruebas aprobadas y ningún defecto crítico abierto | `README.md:50` | 7 defectos críticos abiertos o en verificación (`04-bitacora-defectos.md`). Las pruebas pasaban, pero varias de forma trivial (DEF-40). | Falsa |
| 6 | El sistema cumple el 100 % de las funciones clínicas de las resoluciones 1995 y 2275 | `informe-calidad.md:8` | Sin matriz de cumplimiento normativo; no hay API de admisión (DEF-26), las pantallas clínicas no usan la API (DEF-21) y el cruce de alergias no cubre familias (DEF-06). | Falsa |
| 7 | Latencia de verificación de alergias < 10 ms en memoria y < 35 ms con base de datos indexada | `informe-calidad.md:11` | En memoria y en proceso, p95 de 1,91–2,22 ms (`evidencias/74-rendimiento-corrida*.txt`), compatible con < 10 ms. Con base de datos: **No medido** (sin MySQL). No existía medición previa que respaldara la cifra. | Parcial |
| 8 | Intercepción de alergias en < 150 ms | RF05, `README.md:64` | p95 ≤ 2,22 ms en proceso; sin red ni MySQL. | Parcial |
| 9 | p95 < 400 ms en lectura y emisión de prescripciones (RNF01) | `especificacion.md:27` | p95 ≤ 2,99 ms con 20 clientes concurrentes en proceso; no se midió con red, MySQL ni la concurrencia real de una sede. | Parcial |
| 10 | La calidad se evalúa con las 8 características de ISO/IEC 25010 | `informe-calidad.md:3-26` | Corresponde a ISO/IEC 25010:2011, reemplazada por ISO/IEC 25010:2023 (9 características: incorpora Seguridad operacional, renombra Usabilidad como Capacidad de interacción y Portabilidad como Flexibilidad). Para un sistema clínico, la ausencia de *Safety* deja sin evaluar justo los defectos más graves (DEF-05, 06, 08 y 09). | Parcial (versión obsoleta) |
| 11 | El backend conmuta automáticamente a memoria si el motor SQL no responde | `informe-calidad.md:19`, README | Comportamiento confirmado (`evidencias/59-def12-antes.txt`), pero es un defecto, no una cualidad (DEF-10). | Verificada (es un defecto) |
| 12 | El sellado SHA-256 y los disparadores impiden físicamente la eliminación de registros | `informe-calidad.md:21` | Triggers solo en MySQL (DEF-25); cadena bifurcable (DEF-16); colisiones (DEF-29); sin verificación de cadena (DEF-30). | Parcial |
| 13 | Autenticación robusta con Bcrypt, JWT firmado y TOTP | `informe-calidad.md:22` | Los mecanismos existen (fortalezas 4 y 5 del informe de revisión), pero hay credenciales sembradas (DEF-11), tokens no revocables (DEF-13), MFA desactivable (DEF-14) y sin límite de intentos (DEF-15). | Parcial |
| 14 | Arquitectura hexagonal pura; cambiar de motor no toca el *core* | `informe-calidad.md:24` | `go list` de `core/*` sin dependencias de adaptadores (`evidencias/41-arquitectura.txt`). | Verificada |
| 15 | Portable a Linux, Windows y Docker | `informe-calidad.md:26` | Compila, pasa las pruebas y arranca en Windows (línea base). Docker: **No medido** en el entorno del agente. | Parcial |
| 16 | La autenticación multifactor es obligatoria | RF01, `README.md:60` | Las cuentas nacen con `mfa_enabled=false` y nada lo exige por rol; se puede desactivar (DEF-14). | Falsa |
| 17 | Toda mutación de un folio cerrado se rechaza con 403 y los triggers la protegen | RF03, `README.md:62` | No existe endpoint de edición; cerrar un folio ya cerrado devuelve 409; la sincronización lo sobrescribe en memoria (DEF-07). | Falsa |
| 18 | La sincronización usa lotes idempotentes con validación de firmas | RF06, `README.md:65` | DEF-07, DEF-18 y DEF-19. | Falsa |
| 19 | El rol ADMIN está aislado de las historias clínicas | RF08, diagrama 10 | 16 de 16 rutas clínicas responden 403 a ADMIN (`anexos/matriz-rbac.md`). | Verificada |
| 20 | El óvalo garantiza contraste WCAG AAA «sobre cualquier fondo» | RF09, `README.md:68` | El óvalo sí, pero el resto de textos del banner llega a un mínimo de 1,85:1 (`evidencias/40-contraste-banners.txt`). | Falsa |
| 21 | La sesión persiste tras recargar (F5) | RF10 | `App.jsx:15-23`. La función existe, aunque de forma insegura (DEF-33). | Verificada |
| 22 | Cada petición propaga un `X-Correlation-ID` UUID v4 | RNF02 | Antes aceptaba cualquier cadena (DEF-41); corregido en esta rama (`evidencias/58-def41-despues.txt`). | Verificada (tras la corrección) |
| 23 | Bcrypt con coste 12 | RNF03 | 12 en `crypto.go:35`; 10 en el seeder (DEF-42). | Parcial |
| 24 | Disparadores `BEFORE UPDATE` y `BEFORE DELETE` en el motor relacional | RNF04 | Existen en MySQL; no en PostgreSQL ni en las aclaraciones (DEF-25). | Parcial |
| 25 | nginx aplica «cabeceras de seguridad (ISO 27001)» | Diagrama 11, `README.md:746` | 4 cabeceras en documentos HTML; sin CSP ni HSTS; se pierden en los activos (DEF-35). | Parcial |
| 26 | El backend corre como usuario sin privilegios (`appuser`) | Diagrama 11, `README.md:751` | `src/backend/Dockerfile:40-48`. | Verificada |
| 27 | Token en «LocalStorage cripto-protegido» | Diagrama 12, `README.md:804` | El token se guarda en texto claro (`api.js:96`). | Falsa |
| 28 | Priorización MoSCoW de los requisitos | `README.md:56-69` | Conteo verificado: 9 de 10 RF son *Must Have* y solo RF06 es *Should Have*. Ver la sección 3. | Verificada (conteo); priorización deficiente |
| 29 | El plan de pruebas cubre la dosificación pediátrica | `plan-de-pruebas.md:33`, `README.md:1075` | Ningún RF la define, no hay lógica de dosis en `prescription_service.go` y no existe ninguna prueba. | Falsa |
| 30 | La RTM tiene cobertura del 100 % por requisito | `plan-de-pruebas.md:58-65` | Los `TC-*` están descritos en el plan (`:41-52`) con su archivo, pero el porcentaje no se midió; la RTM omite RF07–RF10 y no hay cobertura de requisitos no funcionales. | Parcial |
| 31 | «Se anonimizaron todos los ejemplos en la documentación pública» | `informe-calidad.md:52` | El README publica la contraseña inicial del administrador, la cuenta médica de prueba y datos personales de apariencia real (DEF-11, DEF-43). | Falsa |
| 32 | DEF-01: guardia de dominio más triggers en MySQL y PostgreSQL | `informe-calidad.md:34` | Guardia sin uso; triggers solo en MySQL. | Parcial |
| 33 | DEF-02: caché en memoria de las alergias del paciente | `informe-calidad.md:35` | No existe caché en el código (`grep -rni cache` sin resultados). | Falsa |
| 34 | DEF-03: clonación profunda de los datos de auditoría | `informe-calidad.md:36` | No había copia de cadenas; se corrompían (DEF-28, corregido). | Parcial |
| 35 | DEF-04: `Validate()` restringe Glasgow a [3, 15] | `informe-calidad.md:37` | `triage.go:56-58` y pruebas de los límites 2, 3, 15 y 16. | Verificada |
| 36 | DEF-02: la latencia original superaba los 600 ms | `informe-calidad.md:35` | No hay registro de la medición original ni del comando usado. | No verificable (sin datos históricos) |
| 37 | Los datos personales de las semillas son ficticios | Implícito en `informe-calidad.md:52` | No es posible confirmar si los números de documento y teléfono pertenecen a personas reales (DEF-43). | No verificable (requiere al titular) |

## 2. Resumen de veredictos

| Veredicto | Cantidad |
|---|---|
| Verificada | 8 |
| Parcial | 14 |
| Falsa | 13 |
| No verificable | 2 |
| **Total** | **37** |

## 3. Priorización MoSCoW

Nueve de diez requisitos funcionales son *Must Have*. Una priorización en la que casi todo es imprescindible no ayuda a decidir qué recortar cuando falta tiempo, que es justamente su propósito.

- **RF09 (perfil con 5 banners temáticos y foto)** no protege ni habilita ninguna función clínica: es una mejora de experiencia. Debería ser *Could Have*.
- **RF10 (menú colapsable y persistencia tras F5)**: el menú colapsable es *Could Have*; la persistencia de sesión es *Should Have* y debería implementarse con revalidación en el servidor (DEF-33).
- **RF06 (sincronización rural)** es *Should Have*, pero contiene los defectos de integridad más graves de la sincronización (DEF-07, DEF-18, DEF-19). Si se mantiene en el alcance, su calidad debe exigirse como la de un *Must Have*; si no, conviene retirarla del alcance de la entrega.
- **Propuesta:** *Must* RF01–RF05, RF07 y RF08; *Should* RF06 y la persistencia de sesión; *Could* RF09 y el menú colapsable. Esto reduce los *Must Have* de 9 a 7 y libera esfuerzo para los defectos Críticos.

## 4. Ortografía

Los documentos de `docs/` se escribieron sin tildes. Muestra contada con `grep -oiE` sobre 14 palabras frecuentes (*evaluacion, bitacora, modulo, especificacion, autenticacion, validacion, caracteristicas, codigo, metodo, tecnica, clinica, farmacologica, criptografica, diseno*): 20 apariciones en `especificacion.md`, 10 en `informe-calidad.md` y 8 en `plan-de-pruebas.md`. Ejemplos: «Evaluacion» (`informe-calidad.md:3`), «Bitacora» (`:30`), «Modulo» (`:32`).

- `docs/informe-calidad.md` se corrigió en esta rama.
- `especificacion.md` y `plan-de-pruebas.md` pertenecen al Responsable de Pruebas y al Líder técnico: se recomienda su corrección (M-35), pero no se modificaron.
- Todos los documentos nuevos de `docs/calidad/` se redactaron con ortografía completa.

## 5. Acciones derivadas

Corregido en esta rama (DEF-39):

- `docs/informe-calidad.md`: actualizado a ISO/IEC 25010:2023, con cifras medidas o marcadas como no medidas, ortografía corregida y enlace a este paquete.
- `README.md`: listas de Trello, rango de requisitos y badge del pipeline.

Pendiente para el equipo (M-35):

- Completar `especificacion.md` con RF07–RF10 y RNF04–RNF05.
- Corregir los diagramas 11 y 12 (filas 25 y 27).
- Eliminar del README las credenciales por defecto (fila 31) y la afirmación ASVS (fila 2).
- Retirar del README la conmutación a memoria presentada como virtud (fila 11).
