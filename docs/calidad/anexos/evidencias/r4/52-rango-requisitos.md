# comando: grep -n "RF[0-9]" README.md docs/especificacion.md (origin/main 6a51bb8); git show origin/QA:README.md | grep -n "RF[0-9]"; git show origin/QA:docs/especificacion.md | grep -oE "RF[0-9]+"; git merge-base origin/QA origin/main; git ls-tree -r --name-only origin/QA tests/backend
# fecha: 2026-11-24

# H-R4-24. Rango de requisitos funcionales: `main` frente a `origin/QA`

## Referencias

| Referencia | Commit | Fecha | Observación |
|---|---|---|---|
| `origin/main` | `6a51bb8` | 2026-11-23 | Rama evaluada en R4. |
| `origin/QA` | `bad040b` | 2026-11-24 | Mensaje: «Revise README for RF13-RF20 updates and QA alignment». Base común con `main`: `702f794` (2026-11-04). No contiene el cierre R3 ni la Entrega Final: `git diff --stat origin/main origin/QA` da 428 archivos (3.012 inserciones y 46.977 eliminaciones). |

## Qué RF define cada documento

| Documento | Rango de RF | Ubicación |
|---|---|---|
| `main`: README §5.1 (tabla oficial MoSCoW) | RF01-RF16 | README:517-532 |
| `main`: README §4.5 (RTM) | RF01-RF16, más la fila «RF03 · Kit» | README:371-387 |
| `main`: README §3 (Trello) y §10 | «RF01 a RF16» | README:56, 1792 |
| `main`: `docs/especificacion.md` | **RF01-RF12** | `docs/especificacion.md:17-28` |
| `origin/QA`: README §4.1 (tabla oficial MoSCoW) | **RF01-RF12** | `origin/QA:README.md:65-76` |
| `origin/QA`: README §3 (Trello) y §9 | «RF01 a RF12» | `origin/QA:README.md:52, 582` |
| `origin/QA`: README, bloque añadido al final | RF13-RF20 (propuesta de especificación) y RTM RF01-RF20 | `origin/QA:README.md:892-902` (especificación) y `:915-944` (RTM) |
| `origin/QA`: `docs/especificacion.md` | RF01-RF12 | Sin cambios frente a `main` |

En `origin/QA`, RF13-RF20 **no** están en la tabla oficial de requisitos (§4.1). Solo aparecen en un bloque final (desde la línea 866 aproximadamente) con forma de notas de trabajo: «Hallazgos documentales que debes actualizar antes de subir a Git», un mensaje de commit sugerido y un texto para el PR. Ninguna de las dos ramas tiene RF13-RF20 en `docs/especificacion.md`.

## Comparación por código

| Código | `main` (README §5.1 / RTM) | `origin/QA` (§4.1 / bloque RF13-RF20 / RTM del bloque) | Diferencia |
|---|---|---|---|
| RF01 | Autenticación, MFA y Esquema Dual de Tokens; **8 roles** (README:517) | Mismo nombre en §4.1, pero con **5 roles** (MEDICO, ENFERMERO, ADMISION, AUDITOR, ADMIN). RTM del bloque: «Auth, JWT Dual, MFA TOTP, RBAC» | El alcance de roles difiere (faltan FARMACIA, LABORATORIO y TI). |
| RF02-RF08 | Igual | Mismo nombre en §4.1 | Sin diferencia de nombre en la tabla oficial. La RTM del bloque abrevia los nombres (p. ej., RF08 «Panel Admin y Bitácora Forense»). |
| RF09 | Perfil Asistencial y Administrativo con Alto Contraste | Igual en §4.1; RTM del bloque: «Perfil Alto Contraste WCAG AAA», sin prueba backend y «validado por script `def36-contraste-banners.mjs`» | `origin/QA` mantiene la afirmación AAA. |
| RF10-RF12 | Igual | Igual en §4.1 | RF12: RTM del bloque «Catálogo Farmacológico y Stock». |
| RF13 | Agendamiento y Calendario Médico Interactivo | Bloque: «Agendamiento y Calendario Médico»; RTM: «Citas Médicas y Calendario» | Mismo requisito con otro nombre. |
| RF14 | Seguimiento de Tratamiento y Prescripción Tripartita | «Seguimiento de Tratamiento y Prescripción Tripartita»; RTM: «Seguimiento y Receta Tripartita» | Mismo requisito. `origin/QA` agrega de forma explícita la validación previa de alergias. |
| RF15 | Farmacia, Inventario por Concentración y Dispensación PDF417 | «Farmacia V2, Lector PDF417 y **Reportes de Stock Bajo**» | `origin/QA` amplía el alcance con los reportes de desabastecimiento, que en `main` solo están en la sección 1.6 de la Entrega Final, sin código RF. |
| RF16 | Módulo Asistencial de Enfermería: Resumen Clínico HCE y Lista de Chequeo (texto con notas en `localStorage`, README:532) | «Enfermería Asistencial **en Servidor** (Resumen y Chequeo)» | Mismo número, persistencia distinta: `origin/QA` coincide con el código actual (`/api/v2/nursing`) y `main` está desactualizado. |
| RF17 | No existe (el laboratorio aparece en la sección 1.1 de la Entrega Final, sin código) | Laboratorio Clínico y Órdenes Paraclínicas (Rol ID 7) | Solo en `origin/QA`. |
| RF18 | No existe (portal del paciente en la sección 1.18, sin código) | Portal Público del Paciente y Solicitud de Primera Cita | Solo en `origin/QA`. |
| RF19 | No existe (Encargado de TI en la sección 1.16, sin código) | Encargado de TI (Rol ID 8) y Registro Inicial Controlado | Solo en `origin/QA`. |
| RF20 | No existe | Sedes Dinámicas en Servidor, **Kit Médico 3D/EVA** y UI Responsive | Solo en `origin/QA`. Además, el Kit Médico va como RF20 en `origin/QA` y como «RF03 · Kit» en `main`: la misma funcionalidad tiene dos códigos distintos. |

## Otras inconsistencias

1. **`origin/QA` cita pruebas que no están en su propio árbol.** Su RTM RF01-RF20 menciona `lab_nursing_branch_test.go`, `ti_setup_test.go`, `appointment_request_test.go` y `mysql_entrega_integration_test.go`, pero `git ls-tree origin/QA tests/backend` solo tiene 15 archivos `*_test.go` y ninguno de esos cuatro. La RTM describe el árbol de `main`, no el de la rama donde está publicada.
2. **Inventario de pruebas en `origin/QA`:** «158 funciones Test* y 3 Benchmark*», «149 Test*» en `tests/backend` (9 de integración) y «147 ejecuciones» en el frontend. La cifra frontend coincide con la medición R4 (147). La backend no es comparable de forma directa: R4 mide 154 pruebas de nivel superior en ejecución, mientras que el conteo de `origin/QA` cuenta funciones por texto.
3. **`main` se contradice sobre la especificación:** README:1792 dice que `docs/especificacion.md` documenta RF01-RF16, pero el archivo solo llega a RF12 (`docs/especificacion.md:17-28`). Esto ya lo señaló R3 (sección 4.4) y sigue abierto.
4. **Ninguna de las dos ramas tiene una fuente única del rango de RF:** `main` usa RF01-RF16 en el README y RF01-RF12 en la especificación; `origin/QA` usa RF01-RF12 en sus tablas y RF01-RF20 en un bloque de notas.

## Resumen

| Fuente | RF definidos |
|---|---|
| `main`: README (tabla y RTM) | RF01-RF16 (16) |
| `main`: `docs/especificacion.md` | RF01-RF12 (12) |
| `origin/QA`: README, tabla §4.1 | RF01-RF12 (12) |
| `origin/QA`: README, bloque final | RF01-RF20 (20; RF13-RF20 propuestos) |
| `origin/QA`: `docs/especificacion.md` | RF01-RF12 (12) |

- RF que difieren de nombre o de alcance con el mismo número: RF01 (roles), RF13 (solo el nombre), RF15 (agrega reportes de stock) y RF16 (persistencia en el navegador frente al servidor).
- RF que existen en una sola rama: RF17, RF18, RF19 y RF20 (solo `origin/QA`, y solo en el bloque de notas).
- Funcionalidad con dos códigos distintos: Kit Médico (EVA y notas anatómicas), «RF03 · Kit» en `main` y parte de RF20 en `origin/QA`.
