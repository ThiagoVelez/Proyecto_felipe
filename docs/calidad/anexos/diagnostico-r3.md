# Diagnóstico inicial de la revisión R3 (10 nov 2026)

Responsable: Juan José Sánchez (Responsable de Calidad). Ejecutado en `C:\Users\juan\Documents\Proyecto_felipe` (Windows 10, Git Bash).

## 1. Estado local

| Comprobación | Resultado |
|---|---|
| `git status` | Rama `calidad/auditoria-v2`, sin cambios en archivos versionados. Dos archivos sin seguimiento (`tarea-responsable-calidad-codex.md`, `tarea-revision-calidad-r3.md`), que son las instrucciones de las tareas. No hizo falta `git stash`. |
| `git fetch origin --prune --tags` | Actualizó `origin/QA` (`229311a`) y `origin/prueba` (`aea446e`) y trajo el tag nuevo `entrega-final`. |
| Ramas remotas | `origin/main`, `origin/QA`, `origin/prueba`, `origin/calidad/auditoria-iso25010`. |
| Ramas locales | `main` (`6492f07`, 38 commits por detrás de `origin/main`), `calidad/auditoria-iso25010` (`1644921`, igual al remoto), `calidad/auditoria-v2` (`d416415`, 29 commits por delante y 1 por detrás de `origin/main`; **no está publicada**). |
| Tags | `entrega-s1`, `entrega-s2`, `entrega-final`. |

## 2. ¿Se ejecutó la revisión 2?

**Parcialmente.** La rama local `calidad/auditoria-v2` contiene la integración de la auditoría v1 sobre `main`, la reaplicación de DEF-28 y DEF-41, la corrección de DEF-63, la limpieza de errores de ESLint (DEF-44), las pruebas de reproducción de DEF-49 a DEF-72 y la matriz RBAC ampliada. Faltaba lo demás:

- La bitácora seguía terminando en DEF-48: las fichas DEF-49 a DEF-84 estaban solo en `anexos/borrador-reverificacion-v2.py`, sin volcar.
- `defectos-abiertos.txt` listaba DEF-49 a DEF-72, que no figuraban en la tabla de la bitácora, así que el job «control de defectos abiertos» habría fallado.
- Las evidencias citadas en `evidencias/v2/` no existen en el disco.
- No hubo push, pull request ni publicación en Trello.

**Número de defecto más alto usado:** DEF-84 (borrador v2). Los defectos nuevos de R3 empiezan en **DEF-85**.

## 3. Comparación con `main`

| Comprobación | Resultado |
|---|---|
| `git merge-base calidad/auditoria-v2 origin/main` | `658472a` |
| `git diff --stat 658472a..origin/main` | 4 archivos: `README.md` (+226 líneas) y el diagrama 15 (`docs/diagrams/15_flujo_caja_blanca_triage.*`). **`src/`, `tests/` y la base de datos no cambiaron desde la v2** (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Último commit de `main` | `9bacb0a docs: consolidar informe de auditoria integral y testing profundo en entrega-s2` |
| Tag `entrega-s2` | Existe. El README indica como rama oficial de entrega `prueba`. |
| `docs/calidad/` en `origin/main` | No existe. |
| `.github/workflows/calidad.yml` en `origin/main` | No existe. |
| `QA.md` en `origin/main` | No existe: el commit `94f7a96` lo eliminó («eliminar qa.md redundante») y su contenido se integró en el README (secciones 4 y 14). |

## 4. Pull requests (`gh pr list --state all`)

La tarea indicaba que el repositorio no tenía pull requests. **No es así** (dato verificado):

| PR | Título | Rama | Estado |
|---|---|---|---|
| #1 | Auditoría de calidad ISO/IEC 25010:2023 | `calidad/auditoria-iso25010` | **Abierto** (desde el 1 nov 2026) |
| #2 a #5 | Prueba / QA | `prueba`, `QA` | Fusionados (4 y 5 nov 2026) |

Se abrió un pull request nuevo desde `calidad/revision-r3` y el PR #1 se dejó sin cambios para que el equipo decida si lo cierra como reemplazado.

## 5. Trello

Herramientas MCP de Trello disponibles. Se leyó el tablero completo (49 tarjetas abiertas):

| Lista | Tarjetas | Observaciones |
|---|---|---|
| Avisos | 3 | — |
| Tareas por realizar | 3 | — |
| Tareas realizadas | 5 | — |
| Bugs encontrados para solucionar | 0 | — |
| Pruebas QA | 13 | 5 completas y 8 sin completar. «Módulo de Enfermería, Sedes Dinámicas y Resiliencia F5» está **duplicada** (una copia vacía, `b2TjJOkt`). Ninguna tiene comentarios. |
| Bugs solucionados | 25 | DEF-05 a DEF-26, DEF-46, DEF-47 y DEF-48, todas marcadas como completas y sin comentarios. Cinco títulos dicen todavía «En verificación». |

Las afirmaciones de las tarjetas de «Pruebas QA» se evalúan en `informe-revision-r3.md`, sección 4.
