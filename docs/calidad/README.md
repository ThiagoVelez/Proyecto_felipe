# Paquete de aseguramiento de calidad: SaludConecta IPS v2.4

- **Responsable de Calidad:** Juan José Sánchez.
- **Curso:** Ingeniería de Software II, COTECNOVA, periodo 2026-2.
- **Base auditada:** commit `6492f07` de `main`.
- **Rama de trabajo:** `calidad/auditoria-iso25010`.
- **Fecha:** 2026-11-01.

Este paquete convierte cada afirmación de calidad del proyecto en un hecho verificado con evidencia o en un defecto registrado. Ninguna cifra aparece sin el comando que la produjo; lo que no se pudo medir figura como **No medido**, con su motivo.

## 1. Cómo leer el paquete

| Si necesita… | Lea | Tiempo |
|---|---|---|
| El estado en una página para la sustentación | [`07-resumen-ejecutivo.md`](07-resumen-ejecutivo.md) | 3 min |
| Qué falla, cómo reproducirlo y su estado | [`04-bitacora-defectos.md`](04-bitacora-defectos.md) | 20 min |
| Qué hacer y en qué orden | [`06-plan-mantenimiento.md`](06-plan-mantenimiento.md), sección 4 | 5 min |
| El resultado de cada hipótesis de revisión (H01–H33) | [`03-informe-revision-codigo.md`](03-informe-revision-codigo.md) | 15 min |
| Métricas ISO/IEC 25010:2023 y el semáforo | [`02-modelo-calidad-iso25010-2023.md`](02-modelo-calidad-iso25010-2023.md) | 10 min |
| El cumplimiento de OWASP ASVS L2 | [`05-auditoria-owasp-asvs-l2.md`](05-auditoria-owasp-asvs-l2.md) | 10 min |
| Qué afirmaciones de la documentación son ciertas | [`verificacion-documental.md`](verificacion-documental.md) | 10 min |
| Cómo trabaja Calidad (roles, ciclo de defectos, *Definition of Done*) | [`01-plan-aseguramiento-calidad.md`](01-plan-aseguramiento-calidad.md) | 10 min |
| Tarjetas listas para Trello | [`trello-tarjetas-defectos.md`](trello-tarjetas-defectos.md) | — |

Anexos:

- [`anexos/linea-base.md`](anexos/linea-base.md): Fase 0, con versiones, inventario y el estado inicial y final.
- [`anexos/analisis-estatico.md`](anexos/analisis-estatico.md): Fase 1, con 10 herramientas y la clasificación de cada advertencia.
- [`anexos/matriz-rbac.md`](anexos/matriz-rbac.md): matriz ruta x rol ejecutada contra el router real.
- [`anexos/evidencias/`](anexos/evidencias/): salidas de los comandos (`.txt`) numeradas por fase. Se eliminaron los fragmentos de código que contenían credenciales de semilla y las rutas locales del equipo de trabajo.

## 2. Cómo reproducir las mediciones

```bash
cd src/backend && go build ./... && go vet ./... && go test -count=1 ./...
```

```bash
cd tests/backend && go test -count=1 -coverpkg=saludconecta-backend/... -coverprofile=coverage.out ./... && go tool cover -func=coverage.out | tail -1
```

```bash
cd tests/backend && CALIDAD_DEFECTOS_ABIERTOS=1 go test -count=1 -v -run TestDEF ./...
```

```bash
cd tests/backend && CALIDAD_MATRIZ_SALIDA=matriz.md go test -count=1 -run TestRBACMatrizRutasPorRol ./...
```

```bash
cd src/frontend && npm ci && npm i --no-save @vitest/coverage-v8@2.1.9 && npx vitest run --coverage
```

La tercera orden ejecuta las pruebas de los defectos abiertos, que **deben fallar** mientras el defecto exista. Sin la variable se omiten, para no romper el pipeline. El pipeline [`.github/workflows/calidad.yml`](../../.github/workflows/calidad.yml) ejecuta todo lo anterior en Linux, incluido `go test -race`.

## 3. Cambios de código realizados por Calidad

Todos están en archivos nuevos o son correcciones pequeñas, una por commit:

- **Correcciones (`fix(DEF-XX)`):** DEF-05, DEF-08, DEF-12, DEF-27, DEF-28 y DEF-41. Cada una tiene una prueba de regresión que falla antes y pasa después (evidencias `50` a `60`).
- **Pruebas nuevas (archivos `*_regression_test.go`):** matriz RBAC, defectos abiertos, H21, H23 y rendimiento RNF01.
- **Automatización:** `calidad.yml`, `.golangci.yml`, `src/frontend/eslint.config.js`, `.github/PULL_REQUEST_TEMPLATE.md` y `.github/ISSUE_TEMPLATE/defecto.yml`.
- **Documentación:** este paquete, `docs/informe-calidad.md` (reescrito) y, en `README.md`, solo las listas de Trello, el rango de requisitos y el badge.

## 4. Criterios de aceptación del trabajo de Calidad

| Criterio | Resultado | Evidencia |
|---|---|---|
| [x] Cada cifra de los entregables tiene comando y evidencia, o está marcada como «No medido» | Cumplido | Columnas «Evidencia» de cada documento; `anexos/evidencias/` |
| [x] Las 33 hipótesis tienen veredicto | Cumplido: 22 confirmadas (3 parcialmente), 10 refutadas y 1 dividida | `03-informe-revision-codigo.md`, sección 2 |
| [ ] Cada defecto nuevo es reproducible y trazable a un RF/RNF y a una característica ISO 25010:2023 | **Parcial.** Los 41 tienen pasos, RF/RNF y característica. 17 se reproducen con una prueba automatizada; DEF-19 y DEF-20 (requieren MySQL) y DEF-37 (requiere `-race`) quedan como «Nuevo» hasta reproducirse en CI o Docker | `04-bitacora-defectos.md` |
| [x] Las correcciones aplicadas tienen una prueba de regresión que falla antes y pasa después | Cumplido para las 6 | `evidencias/50-…` a `60-…` |
| [ ] `go test -race ./...` y `vitest` pasan en la rama al finalizar | **Parcial.** `go test` sin `-race` pasa en ambos módulos y `vitest` pasa (28 de 28). `-race` **no es ejecutable** en el entorno del agente (sin compilador C); el job `backend-pruebas` lo ejecuta en Linux. No hay fallos preexistentes | `evidencias/81-gate-final.txt` |
| [x] No se modificaron pruebas existentes del Responsable de Pruebas | Cumplido: `git diff --stat 6492f07` sobre los 13 archivos de prueba originales está vacío | `evidencias/80-verificacion-roles-secretos.txt` |
| [x] No hay secretos nuevos en el historial | Cumplido. Las dos coincidencias son un secreto de prueba (`calidadJWTSecret`) y el valor por defecto que ya era público en `main.go:39`, conservado solo para rechazarlo. Las evidencias no reproducen credenciales | `evidencias/80-verificacion-roles-secretos.txt` |
| [x] Ortografía revisada en todos los documentos nuevos | Cumplido | Este paquete |
| [x] El resumen ejecutivo cabe en una página | Cumplido | `07-resumen-ejecutivo.md` |

## 5. Limitaciones del entorno de evaluación

| Recurso | Disponible | Efecto |
|---|---|---|
| Compilador C (cgo) | No | `go test -race` no medido en local; delegado a CI |
| MySQL | No | DEF-19 y DEF-20 analizados, no reproducidos; latencia con BD no medida |
| Docker | No | Healthchecks de Compose y cabeceras de nginx evaluados por configuración |
| Navegador automatizado | No | axe-core y Lighthouse no ejecutados; contraste calculado con un script |
| Acceso a Trello | No | Tarjetas entregadas como texto para copiar |
