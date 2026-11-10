# 04. Bitácora de defectos

<!-- cifras-r3 -->
> **Cifras vigentes de la revisión R3 (10 nov 2026).** Fuente única: `anexos/cifras-r3.json`; coherencia comprobada con `anexos/verificar_cifras_r3.py`. Detalle en `informe-revision-r3.md`.
>
> - Defectos registrados: 92 (DEF-01 a DEF-92). Verificación de DEF-01 a DEF-48: 27 verificados, 8 corregidos parcialmente, 12 siguen abiertos, 1 sin ejecución medible, 0 regresiones.
> - Abiertos en `main` (DEF-05 a DEF-92): 62 (18 críticos, 9 altos, 28 medios, 7 bajos). Nuevos de R3: 8 (1 crítico, 1 alto, 6 medios).
> - Pruebas backend: 91 pasan, 0 fallan, 22 reproducciones omitidas (evidencias/r3/12-go-test-tests.txt). Cobertura backend: 68,9 %. Vitest: 108 pruebas en 15 archivos (105 en 14 archivos del equipo), todas pasan. Cobertura frontend: 72,85 %. Reproducciones de defectos abiertos: 22 de 22.
> - Análisis estático: golangci-lint 62 hallazgos (21 nuevos desde la v1); gocyclo 16 funciones con complejidad mayor de 15; govulncheck 1 vulnerabilidad alcanzable (GO-2026-6888); npm audit 0 en producción; 6 en desarrollo; ESLint 0 errores, 89 avisos.
> - Rendimiento: p95 1,38 ms HTTP real; 3,92 a 7,86 ms en proceso; memoria 11,5 a 16,3 MB.
> - Afirmaciones publicadas: 48 evaluadas: 7 verificadas, 24 parciales, 2 no verificadas, 15 falsas. RTM: 5 de 21 requisitos se sostienen. Dictamen: **No conforme con ISO/IEC 25010:2023**.
<!-- /cifras-r3 -->

<!-- R3: actualización del 10 nov 2026 -->
> **Actualización R3 (10 nov 2026).** Base verificada: `origin/main` `9bacb0a` más la rama `calidad/revision-r3`. Se agregan la verificación R3 de DEF-01 a DEF-48, las fichas DEF-49 a DEF-84 (registradas en la revisión 2 y no publicadas hasta ahora) y los defectos nuevos DEF-85 a DEF-92. La historia anterior se conserva sin cambios. Métricas vigentes en la sección 5.

- **Responsable:** Juan José Sánchez (Responsable de Calidad).
- **Base auditada:** commit `6492f07`. Salvo indicación, las líneas citadas corresponden a ese commit.
- **Ciclo de vida:** `Nuevo -> Confirmado -> En corrección -> En verificación -> Cerrado` / `Rechazado` (ver `01-plan-aseguramiento-calidad.md`, sección 6).
- **Severidad** = impacto técnico; **prioridad** = urgencia de corrección (P1 inmediata … P4 cuando haya capacidad). Por definición del plan, todo defecto que pueda causar daño a un paciente es **Crítica**.
- **Reproducción automatizada:** los defectos marcados con «prueba abierta» tienen una prueba en `tests/backend/calidad_defectos_abiertos_regression_test.go` que afirma el comportamiento correcto y por eso **falla mientras el defecto exista**. La lista vigente está en [`defectos-abiertos.txt`](defectos-abiertos.txt) y el job bloqueante «Backend - control de defectos abiertos» comprueba que cada prueba falle por su defecto (`01-plan-aseguramiento-calidad.md`, sección 5.4). Ejecución local:

```bash
cd tests/backend && CALIDAD_DEFECTOS_ABIERTOS=1 go test -count=1 -json -run "$(go run ./herramientas/controldefectos -regex)" . | go run ./herramientas/controldefectos
```

Salidas registradas: `anexos/evidencias/43-defectos-abiertos.txt` (11 fallos reproducidos en local) y `anexos/evidencias/99-control-defectos-local.txt` (veredicto de la herramienta: 11 de 12 reproducidos y DEF-37 no evaluable sin `-race`). DEF-37 se confirmó con `-race` en CI (`anexos/evidencias/89b-ci-defectos-abiertos-race.txt`).

---

## 1. Defectos históricos DEF-01 a DEF-04 (contenido original conservado)

El contenido de las columnas originales se transcribe sin cambios desde `docs/informe-calidad.md` (versión `6492f07`). La columna nueva registra la verificación de la corrección contra el código.

| ID | Módulo | Severidad | Descripción | Causa raíz | Estrategia de solución | Verificación de la corrección |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | HCE / Persistencia | **Critica** | Posibilidad de bypass de modificacion en folios medicos que ya habian sido cerrados y firmados. | La comprobacion residia unicamente en la capa de aplicacion; llamadas directas o scripts SQL podian actualizar la fila en `clinical_records`. | Implementacion de doble barrera: guardia booleana en capa de dominio y creacion de `TRIGGER trg_prevent_update_closed_record` en MySQL/Postgres que emite `SIGNAL SQLSTATE '45000'` impidiendo cualquier mutacion. | **Parcial.** El trigger de MySQL existe (`schema.sql:233-242`, más `trg_prevent_delete_clinical_record` en `:245`). **No existe** script ni trigger para PostgreSQL. La guardia de dominio `CanModify()` (`core/domain/clinical_record.go:50`) no se invoca en ningún punto del código (búsqueda `grep -rn CanModify`: solo la definición). La protección efectiva en aplicación es la cláusula `WHERE ... is_closed = FALSE` de `mysql/clinical_record_repo.go:152`. `clinical_record_clarifications` no tiene protección. Ver DEF-25 y DEF-07. |
| **DEF-02** | Farmacia / Prescripcion | **Alta** | Latencia superior a 600 ms al validar antecedentes alergicos de pacientes con multiples atenciones previas. | Busqueda secuencial completa en la tabla `patient_allergies` sin indices sobre el principio activo y el paciente. | Creacion del indice relacional compuesto `INDEX idx_patient_allergies (patient_id, active_ingredient)` en el esquema DDL y cacheo en memoria de la lista de alergias del paciente durante el ciclo de vida del servicio. | **Parcial.** El índice existe (`schema.sql:69`). La caché en memoria **no se encontró**: `grep -rni cache src/backend` no devuelve resultados y `prescription_service.go:43` consulta las alergias en cada prescripción. Al no existir caché, el riesgo de alergia obsoleta planteado en H21 no aplica. La latencia original de 600 ms y su mejora no tienen medición registrada; la medición de esta auditoría (memoria, en proceso) da p95 de 1,91–2,22 ms en la intercepción (`evidencias/74-rendimiento-corrida*.txt`). |
| **DEF-03** | Auditoria / HTTP | **Media** | Panico intermitente en goroutines de registro de auditoria (`runtime error: invalid memory address or nil pointer dereference`). | GoFiber reutiliza los contextos `fiber.Ctx` y buffers subyacentes de `fasthttp` una vez que la peticion HTTP finaliza. La goroutine asincrona leia punteros reciclados. | Aislamiento y clonacion profunda de los datos primitivos de auditoria (`correlationID`, `userID`, `path`, `ip`) antes del despacho de la goroutine, eliminando condiciones de carrera y dependencias del ciclo de vida del contexto web. | **Parcial.** La goroutine ya no recibe `fiber.Ctx` (`audit_middleware.go:82-84`), pero la «clonación profunda» no existía: `c.Path()` y el `X-Correlation-ID` se asignaban sin copiar y apuntaban a búferes reutilizados. La prueba `TestDEF28…` demostró 18 de 20 entradas corrompidas (`evidencias/55-def28-def41-antes.txt`). Corregido en esta rama como **DEF-28**. `go test -race`: **No medido** en local (sin cgo); se ejecuta en el pipeline. |
| **DEF-04** | Triaje de Urgencias | **Media** | Registro indebido de valores fuera de escala en la variable Glasgow (ej. puntuaciones de 0 o 18 ingresadas por digitacion manual erratica). | La entidad `TriageRecord` carecia de una validacion de invariantes en su metodo de creacion en el dominio. | Incorporacion del metodo `Validate()` en la entidad de dominio `TriageRecord` que verifica que la puntuacion de Glasgow este estrictamente en el intervalo cerrado $[3, 15]$, retornando `ErrInvalidGlasgowScore`. | **Confirmada.** `core/domain/triage.go:56-58` y `triage_service.go:26`. Límites verificados: 16 en `tests/backend/triage_test.go:25`; 2, 3 y 15 en `TestH23LimitesGlasgowNoCubiertos` (`evidencias/75-h23-limites.txt`). |

#### Verificación R3 (10 nov 2026) de DEF-01 a DEF-04

| ID | Veredicto | Evidencia |
|---|---|---|
| DEF-01 | **Verificado — corregido** | Triggers en MySQL y PostgreSQL y guardia `CanModify()` en servicio y sincronización. `TestRegression_ClosedRecordImmutability` (equipo) y `TestDEF07SincronizacionNoSobrescribeFolioCerrado` pasan; `evidencias/r3/12-go-test-tests.txt` (suite `tests/backend` en verde). |
| DEF-02 | **Corregido parcialmente** | El índice existe, pero la caché en memoria declarada no existe. Además, el README de `main` (sección 14.3) reutiliza el identificador DEF-02 para otro defecto (carrera en la auditoría); ver DEF-92. |
| DEF-03 | **Sigue abierto** | La copia de cadenas no está en `main`: con `audit_middleware.go` de `origin/main`, `TestDEF28AuditoriaConservaDatosTrasFinalizarPeticion` altera 18 de 20 entradas en tres corridas (`evidencias/r3/31-def28-en-main.txt`). La corrección está en la rama de calidad (DEF-28). |
| DEF-04 | **Verificado — corregido** | `core/domain/triage.go` rechaza Glasgow fuera de [3, 15]; `TestH23LimitesGlasgowNoCubiertos` y `TestRegression_GlasgowBoundaryValidation` pasan (`evidencias/r3/12-go-test-tests.txt` (suite `tests/backend` en verde)). |

---

## 2. Resumen de defectos nuevos

| ID | Título | Módulo | Severidad | Prioridad | Estado |
|---|---|---|---|---|---|
| DEF-05 | Permitir prescripción contraindicada indicando un `patient_id` distinto al del folio | Backend | Crítica | P1 | Cerrado (verificado en R3) |
| DEF-06 | Omitir la reactividad cruzada y las variantes de escritura en el cruce de alergias | Backend | Crítica | P1 | Cerrado (verificado en R3) |
| DEF-07 | Sobrescribir folios cerrados al reenviar un lote de sincronización (adaptador en memoria) | Backend | Crítica | P1 | Cerrado (verificado en R3) |
| DEF-08 | Aceptar niveles Manchester arbitrarios enviados por el cliente | Backend | Crítica | P1 | Cerrado (verificado en R3) |
| DEF-09 | Clasificar la hipotermia severa como Nivel V (no urgente) | Backend | Crítica | P1 | Cerrado (verificado en R3) |
| DEF-10 | Conmutar en silencio a almacenamiento en memoria cuando falla MySQL | Backend | Crítica | P1 | Reabierto (corregido parcialmente, R3) |
| DEF-11 | Sembrar en cada arranque una cuenta médica con contraseña y secreto TOTP publicados | BD | Crítica | P1 | Cerrado (verificado en R3) |
| DEF-12 | Arrancar con un `JWT_SECRET` por defecto publicado en el código | Backend | Alta | P1 | Cerrado (verificado en R3) |
| DEF-13 | Mantener vigentes los tokens de usuarios desactivados | Backend | Alta | P1 | Cerrado (verificado en R3) |
| DEF-14 | Deshabilitar el MFA mediante `/auth/mfa/setup` sin verificar el factor actual | Backend | Alta | P2 | Cerrado (verificado en R3) |
| DEF-15 | Permitir fuerza bruta en login y TOTP; limitar por la IP del proxy | Backend / Infra | Media | P2 | Reabierto (corregido parcialmente, R3) |
| DEF-16 | Bifurcar la cadena de hashes al cerrar folios concurrentes del mismo paciente | Backend | Alta | P2 | Cerrado (verificado en R3) |
| DEF-17 | Permitir que un médico cierre y firme el folio de otro | Backend | Alta | P2 | Cerrado (verificado en R3) |
| DEF-18 | Aceptar autoría y hash previo declarados por el cliente en la sincronización | Backend | Alta | P1 | Cerrado (verificado en R3) |
| DEF-19 | Abortar el lote completo en MySQL al reenviar un folio cerrado | BD | Alta | P2 | Cerrado (verificado en R3) |
| DEF-20 | Invalidar la verificación de integridad por el redondeo de `closed_at` en MySQL | BD | Alta | P2 | Cerrado (verificado en R3) |
| DEF-21 | Presentar pantallas clínicas desconectadas del backend con datos y hash simulados | Frontend | Alta | P1 | Reabierto (corregido parcialmente, R3) |
| DEF-22 | Mostrar éxito falso y bitácora fabricada en el panel de administración | Frontend | Media | P1 | Reabierto (corregido parcialmente, R3) |
| DEF-23 | Bloquear en el cliente códigos TOTP válidos al validarlos contra un secreto fijo | Frontend | Alta | P2 | Cerrado (verificado en R3) |
| DEF-24 | Usar Fiber v2.52.5 con vulnerabilidad alcanzable GO-2025-3845 | Backend | Alta | P2 | Cerrado (verificado en R3) |
| DEF-25 | Omitir triggers en PostgreSQL y en aclaraciones; guardia de dominio sin uso | BD | Alta | P2 | Corrección presente (ejecución con motor No medida, R3) |
| DEF-26 | Carecer de API de admisión de pacientes y alergias (rol ADMISION sin rutas) | Backend | Alta | P2 | Cerrado (verificado en R3) |
| DEF-27 | Aceptar frecuencia cardíaca superior a 300 lpm | Backend | Media | P3 | Cerrado (verificado en R3) |
| DEF-28 | Corromper la bitácora de auditoría por cadenas no copiadas del contexto Fiber | Backend | Media | P2 | Confirmado en main (corregido en la rama de calidad, pendiente de fusión) |
| DEF-29 | Producir colisiones de hash por separador `\|` sin escapar | Backend | Media | P3 | Confirmado (sigue abierto, R3) |
| DEF-30 | Verificar la integridad sin validar el enlace con el folio anterior | Backend | Media | P2 | Confirmado (sigue abierto, R3) |
| DEF-31 | Revelar cuentas inactivas antes de validar la contraseña | Backend | Media | P3 | Cerrado (verificado en R3) |
| DEF-32 | Responder el healthcheck sin verificar la base de datos | Backend / Infra | Media | P3 | Confirmado (sigue abierto, R3) |
| DEF-33 | Restaurar la sesión desde `localStorage` sin revalidar; cifrado declarado inexistente | Frontend | Media | P3 | Reabierto (corregido parcialmente, R3) |
| DEF-34 | Exponer MySQL y el backend al host con credenciales en texto plano | Infra | Media | P2 | Cerrado (verificado en R3) |
| DEF-35 | Omitir CSP y HSTS y perder cabeceras de seguridad en activos estáticos | Infra | Media | P3 | Confirmado (sigue abierto, R3) |
| DEF-36 | Incumplir el contraste WCAG AAA declarado en los banners de perfil | Frontend | Media | P3 | Confirmado (sigue abierto, R3) |
| DEF-37 | Escribir bajo `RLock` en `ClinicalRecordMemoryRepo.GetByID` | Backend | Media | P3 | Cerrado (verificado en R3) |
| DEF-38 | Ignorar errores del descuento de inventario y validar stock sin atomicidad | Backend | Baja | P3 | Reabierto (corregido parcialmente, R3) |
| DEF-39 | Publicar documentación inconsistente y cifras no medidas | Documentación | Media | P2 | Confirmado (sigue abierto, R3) |
| DEF-40 | Mantener pruebas que pasan de forma trivial y cobertura frontend no ejecutable | Pruebas | Media | P2 | Reabierto (corregido parcialmente, R3) |
| DEF-41 | Aceptar `X-Correlation-ID` arbitrario del cliente | Backend | Baja | P4 | Confirmado en main (corregido en la rama de calidad, pendiente de fusión) |
| DEF-42 | Usar coste Bcrypt 10 en el seeder de MySQL | BD | Baja | P4 | Cerrado (verificado en R3) |
| DEF-43 | Usar datos personales de apariencia real en semillas y simulaciones | Documentación / Datos | Baja | P3 | Confirmado (sigue abierto, R3) |
| DEF-44 | Acumular deuda técnica estática (errcheck, complejidad, duplicación, archivos grandes) | Backend / Frontend | Baja | P4 | Confirmado (sigue abierto, R3) |
| DEF-45 | Mantener vulnerabilidades en dependencias de desarrollo JS | Frontend | Baja | P4 | Confirmado (sigue abierto, R3) |
| DEF-46 | Exponer el puntero interno del catálogo de medicamentos y provocar una carrera de datos | Backend | Media | P2 | Cerrado (verificado en R3) |
| DEF-47 | Calcular un TOTP ajeno al secreto cuando Web Crypto no está disponible | Frontend | Alta | P2 | Cerrado (verificado en R3) |
| DEF-48 | Mantener una prueba con timeout fijo de 1 s que falla bajo `-race` | Pruebas | Baja | P3 | Cerrado (verificado en R3) |
| DEF-49 | Permitir el registro anónimo de administradores activos | Backend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-50 | Exponer sin autenticación la semilla TOTP de cualquier cuenta | Backend / Frontend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-51 | Omitir el cruce de alergias en la prescripción v2, la única que la interfaz permite usar | Backend / Frontend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-52 | Aceptar recetas v2 con cantidades negativas e ítems de inventario no verificados | Backend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-53 | Dispensar sin verificar el documento del paciente | Backend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-54 | Dispensar medicamentos vencidos | Backend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-55 | Eliminar físicamente pacientes y sus antecedentes alérgicos | Backend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-56 | Borrar las tablas de prescripción v1 en la migración v2 | BD | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-57 | Asociar notas anatómicas al folio de otro paciente y de otro médico | Backend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-58 | Reactivar una receta ya dispensada al reenviarla con su ID | Backend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-59 | Dispensar recetas canceladas y dejar stock negativo en el adaptador en memoria | Backend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-60 | No extender la alergia a un fármaco concreto a su familia farmacológica | Backend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-61 | Escribir PDF fuera del directorio de documentos (path traversal) | Backend | Alta | P2 | Confirmado (reverificado en R3) |
| DEF-62 | Guardar datos del paciente en claro en disco y en los registros | Backend / Infra | Alta | P2 | Confirmado (reverificado en R3) |
| DEF-63 | Aceptar los marcadores de `.env.example` como `JWT_SECRET` y contraseña del administrador | Backend | Alta | P1 | Corregido en la rama de calidad (pendiente de fusión a main) |
| DEF-64 | Generar códigos de receta con poca entropía y buscarlos de forma ambigua | Backend | Alta | P2 | Confirmado (reverificado en R3) |
| DEF-65 | Romper el triaje y el contacto de pacientes con `DB_DRIVER=postgres` | BD | Alta | P2 | Confirmado (reverificado en R3) |
| DEF-66 | Permitir editar notas anatómicas si falla la consulta del folio y dejar el dolor fuera del hash | Backend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-67 | Convertir en «sin dolor» una EVA fuera de 0 a 10 | Backend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-68 | Borrar el contacto del paciente en una actualización parcial | Backend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-69 | Agendar citas con condición de carrera y médico erróneo | Backend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-70 | Permitir que un médico edite o borre publicaciones de otro | Backend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-71 | Dejar sin auditar las lecturas de datos de pacientes en `/api/v2` | Backend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-72 | Declarar roles inconsistentes en las rutas nuevas: AUDITOR bloqueado y ADMIN con acceso a recetas | Backend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-73 | Acumular identificadores de *refresh token* sin poda y perder sesiones al reiniciar | Backend | Baja | P4 | Confirmado (reverificado en R3) |
| DEF-74 | Fabricar órdenes, diagnósticos, alergias y grupo sanguíneo en las vistas de enfermería | Frontend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-75 | Registrar la administración de medicación solo en el navegador | Frontend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-76 | Dejar datos de salud en el navegador tras cerrar sesión y mezclar perfiles | Frontend | Alta | P2 | Confirmado (reverificado en R3) |
| DEF-77 | Prellenar en farmacia el documento que debería escanearse | Frontend | Alta | P2 | Confirmado (reverificado en R3) |
| DEF-78 | Abrir la HCE de otro paciente por coincidencia parcial de nombre | Frontend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-79 | Registrar «O+» como grupo sanguíneo por defecto en la admisión | Frontend | Crítica | P1 | Confirmado (reverificado en R3) |
| DEF-80 | Mostrar pantallas sin control de rol e inferir el rol por el nombre o la especialidad | Frontend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-81 | Atribuir órdenes de enfermería a un médico ficticio | Frontend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-82 | Silenciar errores en vistas nuevas | Frontend | Baja | P4 | Confirmado (reverificado en R3) |
| DEF-83 | Usar brotli v1.1.0 con vulnerabilidad alcanzable GO-2026-6888 | Backend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-84 | Importar adaptadores concretos desde el núcleo del dominio | Backend | Media | P3 | Confirmado (reverificado en R3) |
| DEF-85 | Interpretar como UTC la hora local de la cita | Backend / Frontend | Crítica | P1 | Confirmado |
| DEF-86 | Extraer el documento del PDF417 con una expresión genérica y compararlo sin normalizar | Frontend / Backend | Media | P3 | Confirmado |
| DEF-87 | Validar la duración del video con el valor que declara el cliente y aceptar contenido que no es video | Backend / Frontend | Media | P3 | Confirmado |
| DEF-88 | Agendar citas para pacientes inexistentes | Backend | Media | P3 | Confirmado |
| DEF-89 | Aceptar EVA y coordenadas fuera de rango en notas anatómicas | Backend | Media | P3 | Confirmado |
| DEF-90 | Probar una copia del modal de alergias en lugar del componente real | Pruebas | Media | P2 | Confirmado |
| DEF-91 | Publicar un dictamen «Aprobado 100 % conforme a ISO/IEC 25010» y una RTM al 100 % sin evidencia que los sostenga | Documentación | Alta | P1 | Confirmado |
| DEF-92 | Reutilizar los identificadores DEF-01 a DEF-04 y crear identificadores SEC-* paralelos con referencias a archivos inexistentes | Documentación | Media | P3 | Confirmado |

Los defectos DEF-46 a DEF-48 se detectaron en la primera ejecución del pipeline `calidad` sobre el PR (run `41361540450`, `anexos/evidencias/89-ci-run-41361540450.txt`).

---

## 3. Fichas de defectos

### DEF-05. Permitir prescripción contraindicada indicando un `patient_id` distinto al del folio

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF05 |
| Característica ISO 25010:2023 | Seguridad operacional (*Safety*) -> Fallo seguro; Seguridad -> Integridad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | 1. Paciente A con alergia severa a AMOXICILINA y folio `cr` de A. 2. Paciente B sin alergias. 3. `POST /api/v1/prescriptions` con `clinical_record_id = cr`, `patient_id = B` y amoxicilina. |
| Resultado esperado / obtenido | Rechazo de la prescripción / Prescripción emitida sin alerta: el cruce se hacía contra B. |
| Evidencia | `prescription_service.go:38` valida que el folio exista pero descarta el registro; `:43` consulta las alergias de `prescription.PatientID` (dato del cliente). Prueba `TestDEF05PrescripcionRechazaPacienteDistintoAlFolio`: falla antes (`evidencias/50-def05-antes.txt`) y pasa después (`51-def05-despues.txt`). |
| Causa raíz | El servicio confía en un identificador de paciente enviado por el cliente en lugar del paciente del folio. |
| Acción propuesta | M-01 (corregido): rechazar con `ErrPrescriptionPatientMismatch` (HTTP 422) si no coinciden. M-02: eliminar `patient_id` del contrato y derivarlo del folio. |
| Estado | En verificación: commit `fix(DEF-05)` en `calidad/auditoria-iso25010`. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF05PrescripcionRechazaPacienteDistintoAlFolio` pasa sobre el código del equipo (`prescription_service.go:43-49`); `evidencias/r3/12-go-test-tests.txt` (suite `tests/backend` en verde). |

### DEF-06. Omitir la reactividad cruzada y las variantes de escritura en el cruce de alergias

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF05 («bloqueando prescripciones conflictivas, ej. Betalactámicos / Penicilinas») |
| Característica ISO 25010:2023 | Seguridad operacional -> Identificación de riesgos; Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | 1. Alergia «PENICILINA»; prescribir un medicamento cuyo principio activo es «AMOXICILINA». 2. Alergia «ÁCIDO ACETILSALICÍLICO»; prescribir «ACIDO ACETILSALICILICO». |
| Resultado esperado / obtenido | Bloqueo en ambos casos / Ambas prescripciones se emiten. |
| Evidencia | `prescription_service.go:50` y `:62-63`: comparación exacta tras `ToUpper(TrimSpace())`, sin normalizar tildes ni familias. Prueba abierta `TestDEF06…` (`43-defectos-abiertos.txt`). La prueba existente `prescription_test.go` pasa porque define la amoxicilina con `ActiveIngredient: "BETALACTAMICOS"` (ver DEF-40). |
| Causa raíz | El modelo de datos no representa familias farmacológicas ni reactividad cruzada. |
| Acción propuesta | M-03: normalizar (Unicode NFD sin diacríticos, espacios) y añadir la tabla `allergy_cross_reactivity` (familia -> principios activos), alimentada por el catálogo CUM/ATC. Requiere cambio de esquema: decisión del equipo. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF06CruceAlergiasReactividadCruzadaYTildes` pasa (penicilina frente a amoxicilina y tildes). Las brechas que quedan se registran aparte: DEF-51 (vía v2 sin cruce) y DEF-60 (familia del alérgeno). |

### DEF-07. Sobrescribir folios cerrados al reenviar un lote de sincronización (adaptador en memoria)

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF03, RF06, RNF04 |
| Característica ISO 25010:2023 | Seguridad -> Integridad; Seguridad operacional -> Fallo seguro |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 (el adaptador en memoria es el que queda activo en producción por DEF-10) |
| Pasos para reproducir | 1. Crear y cerrar el folio `cr`. 2. `POST /api/v1/sync/batch` con un registro `ID = cr` y otra anamnesis. 3. Consultar `cr`. |
| Resultado esperado / obtenido | El folio cerrado no cambia y el lote informa el conflicto / Anamnesis reemplazada y `IsClosed=false`. |
| Evidencia | `memory_repos.go:425-432` reemplaza el puntero sin comprobar existencia ni cierre. Prueba abierta `TestDEF07…`: `anamnesis="Anamnesis ALTERADA" cerrado=false` (`43-defectos-abiertos.txt`). |
| Causa raíz | La idempotencia de RF06 no está implementada: el reenvío de un UUID se trata como reemplazo. |
| Acción propuesta | M-04: definir el contrato de idempotencia (UUID existente: ignorar si es idéntico; conflicto si difiere y está cerrado) e implementarlo en los tres adaptadores. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF07SincronizacionNoSobrescribeFolioCerrado` pasa; `evidencias/r3/12-go-test-tests.txt` (suite `tests/backend` en verde). |

### DEF-08. Aceptar niveles Manchester arbitrarios enviados por el cliente

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF02 |
| Característica ISO 25010:2023 | Seguridad operacional -> Fallo seguro; Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Datos (validación de entrada) |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | `POST /api/v1/triage` con signos válidos y `manchester_level` = `"NIVEL_VI"`, `"rojo"` o `"NIVEL_I "`. |
| Resultado esperado / obtenido | 422 / Triaje registrado con un nivel inexistente que ninguna cola ni semáforo reconoce. |
| Evidencia | `triage_handler.go:28,55` copia el nivel del cliente; `triage_service.go:40` solo calcula el nivel si viene vacío. Prueba `TestDEF08…`: falla antes (`52-def27-def08-antes.txt`) y pasa después (`54-def08-despues.txt`). |
| Causa raíz | Falta validar el valor contra el catálogo de cinco niveles. |
| Acción propuesta | M-05 (corregido): `ManchesterLevel.IsValid()` y `ErrInvalidManchesterLevel` (HTTP 422). M-06 (pendiente, decisión clínica): cuando el profesional asigna un nivel **menos urgente** que el sugerido por los discriminadores, exigir justificación y registrarla en auditoría. |
| Estado | En verificación (corrección parcial: queda M-06). |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF08NivelManchesterFueraDelCatalogo` pasa; `triage_service.go:41-47` solo acepta niveles del catálogo iguales o más urgentes que el calculado. |

### DEF-09. Clasificar la hipotermia severa como Nivel V (no urgente)

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF02 |
| Característica ISO 25010:2023 | Seguridad operacional -> Identificación de riesgos |
| Tipo (IEEE 1044) | Lógica (cálculo) |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | `SuggestManchesterPriority` con temperatura 30,0 °C y el resto de signos normales (PA 120/80, FC 75, FR 16, SpO2 98 %, Glasgow 15). |
| Resultado esperado / obtenido | Nivel urgente / `NIVEL_V`. |
| Evidencia | `core/domain/triage.go:69-88`: los discriminadores de temperatura solo evalúan fiebre (`>= 37.5`, `>= 38.5`, `>= 40.0`); tampoco se evalúa la frecuencia respiratoria. Prueba abierta `TestDEF09…` (`43-defectos-abiertos.txt`). |
| Causa raíz | Discriminadores incompletos frente al protocolo Manchester. |
| Acción propuesta | M-07: validar con el líder clínico la tabla de discriminadores (hipotermia, FR alta y baja, hipotensión moderada) y documentarla en la especificación antes de implementarla. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF09HipotermiaSeveraNoEsNoUrgente` pasa: 30 °C ya no se clasifica como Nivel IV ni V. |

### DEF-10. Conmutar en silencio a almacenamiento en memoria cuando falla MySQL

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF03, RNF05 |
| Característica ISO 25010:2023 | Fiabilidad -> Tolerancia a fallos; Seguridad operacional -> Fallo seguro |
| Tipo (IEEE 1044) | Lógica / configuración |
| Severidad / Prioridad | Crítica / P1 (pérdida de registros clínicos) |
| Pasos para reproducir | 1. `DB_DRIVER=mysql` con MySQL inaccesible. 2. Arrancar el backend. 3. Registrar folios y reiniciar. |
| Resultado esperado / obtenido | El servicio no arranca (o arranca en modo de solo lectura señalado) / Arranca con `/health` en 200, acepta escrituras en memoria y las pierde al reiniciar. |
| Evidencia | `cmd/api/main.go:58-67`. Registro real: «Conmutando a Adaptador en Memoria…» y servidor en escucha (`evidencias/59-def12-antes.txt`). `/health` no lo refleja (DEF-32). El README e `informe-calidad.md` lo presentan como una virtud. |
| Causa raíz | Se confunde disponibilidad con tolerancia a fallos en un sistema de registro clínico. |
| Acción propuesta | M-08: fallar al arrancar salvo `ALLOW_MEMORY_FALLBACK=true` explícito (solo desarrollo) y exponer el modo en `/health`. Cambia un comportamiento documentado: decisión del equipo. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Corregido parcialmente** | Corregido para MySQL: `cmd/api/main.go:51-58` termina si no conecta. Persiste con `DB_DRIVER=postgres`: `adapters/storage/factory.go:152-163` conecta citas, inventario, recetas v2 y muro de salud al adaptador **en memoria** sin aviso, y esos datos se pierden al reiniciar. Ejecución con PostgreSQL: **No medida** (sin motor). |

### DEF-11. Sembrar en cada arranque una cuenta médica con contraseña y secreto TOTP publicados

| Campo | Contenido |
|---|---|
| Módulo | BD (seeder) |
| Requisito afectado | RF01, RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad |
| Tipo (IEEE 1044) | Configuración / datos |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | 1. Arrancar con MySQL vacío. 2. Iniciar sesión con la cuenta médica sembrada usando la contraseña de `seeder.go:123` y un TOTP generado con el secreto de `seeder.go:126` (es el secreto de ejemplo de la documentación de Google Authenticator). |
| Resultado esperado / obtenido | Ninguna cuenta clínica con credenciales conocidas en producción / Sesión de MEDICO con MFA «válido». |
| Evidencia | `adapters/storage/mysql/seeder.go:119-136` (y la cuenta pendiente en `:139-154`), ejecutado en cada arranque desde `storage/factory.go:89`. El administrador usa `ADMIN_INITIAL_PASSWORD` con un valor por defecto en `seeder.go:94-97`, publicado en el README; no hay cambio obligatorio en el primer ingreso (no existe columna ni flujo para ello). gosec G101 (`23-gosec-sin-codigo.txt`). No se reproducen las credenciales en este informe. |
| Causa raíz | Los datos de demostración se mezclan con la inicialización de producción. |
| Acción propuesta | M-09: sembrar cuentas de demostración solo con `APP_ENV=development`; exigir `ADMIN_INITIAL_PASSWORD` sin valor por defecto, con cambio obligatorio en el primer ingreso; rotar las credenciales de cualquier despliegue existente. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | No hay cuentas sembradas; el administrador inicial se crea con `ADMIN_INITIAL_*`. Comprobado al arrancar el backend en memoria: el registro solo muestra «Administrador inicial creado con las credenciales definidas por el operador» (`evidencias/r3/42-carga-http-real.txt`). |

### DEF-12. Arrancar con un `JWT_SECRET` por defecto publicado en el código

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF01, RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad |
| Tipo (IEEE 1044) | Configuración |
| Severidad / Prioridad | Alta / P1 |
| Pasos para reproducir | 1. Arrancar sin `JWT_SECRET`. 2. Firmar un JWT HS256 con el valor por defecto de `main.go:39`. 3. Llamar a una ruta clínica. |
| Resultado esperado / obtenido | El servidor no arranca / 200 con un token forjado (`evidencias/59-def12-antes.txt`). |
| Evidencia | `cmd/api/main.go:39`. Después de la corrección: proceso terminado con código 1 y el mensaje «JWT_SECRET es obligatorio…» (`60-def12-despues.txt`); prueba `TestDEF12ResolveJWTSecret` en `cmd/api/main_regression_test.go`. |
| Causa raíz | Un valor por defecto «cómodo» para desarrollo quedó en la ruta de producción. |
| Acción propuesta | M-10 (corregido): `resolveJWTSecret` rechaza un valor ausente, menor de 32 caracteres o igual al publicado; en `DB_DRIVER=memory` sin secreto genera uno aleatorio y efímero. `.env.example` actualizado. Pendiente: actualizar la tabla de variables del README (fila `JWT_SECRET`), que fuera de lo autorizado no se modificó. |
| Estado | En verificación: commit `fix(DEF-12)`. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `pkg/config/config.go:55-68` rechaza secretos ausentes, cortos o publicados; `src/backend/pkg/config/config_regression_test.go` pasa (`evidencias/r3/10-go-test-src.txt`). |

### DEF-13. Mantener vigentes los tokens de usuarios desactivados

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF07, RF01 |
| Característica ISO 25010:2023 | Seguridad -> Confidencialidad, Autenticidad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Alta / P1 |
| Pasos para reproducir | 1. El médico obtiene un token. 2. El administrador lo suspende (`PATCH /admin/users/:id/status`). 3. El médico usa el token anterior. |
| Resultado esperado / obtenido | 401/403 / 200 hasta 8 horas después (`jwtTTL`, `main.go:71`). |
| Evidencia | `auth_middleware.go:29-39` valida solo firma y expiración. Prueba abierta `TestDEF13…`: estado 200. La matriz RBAC muestra que los tokens de usuarios inexistentes también se aceptan (`anexos/matriz-rbac.md`, C.3.4). El login sí bloquea `is_active=false` (`auth_service.go:34`), y la sincronización no emite tokens. |
| Causa raíz | Autorización sin estado sin mecanismo de revocación. |
| Acción propuesta | M-11: comprobar `is_active` (con caché corta) en el middleware, o un `token_version` por usuario incluido en el JWT; reducir el TTL a 15–60 minutos con *refresh token*. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF13TokenDeUsuarioDesactivadoEsRechazado` pasa. |

### DEF-14. Deshabilitar el MFA mediante `/auth/mfa/setup` sin verificar el factor actual

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF01 («autenticación multifactor obligatoria») |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad |
| Tipo (IEEE 1044) | Lógica / interfaz |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | 1. Usuario con MFA activo. 2. Con un token de ese usuario, `POST /auth/mfa/setup`. 3. Login con contraseña y sin TOTP. |
| Resultado esperado / obtenido | Se exige el TOTP vigente para rotar el secreto, y el MFA sigue activo / Login sin segundo factor. |
| Evidencia | `auth_service.go:87-103`: `UpdateMFA(ctx, user.ID, secret, false)` en `:98`. Prueba abierta `TestDEF14…`: `err=<nil>`. Además, el MFA no es obligatorio: las cuentas nacen con `mfa_enabled=false` y nada lo exige por rol. |
| Causa raíz | La rotación del secreto reutiliza el flujo de alta inicial. |
| Acción propuesta | M-12: separar alta y rotación; la rotación exige el TOTP actual y conserva `mfa_enabled=true` hasta confirmar el nuevo; volver obligatorio el MFA para MEDICO, ADMIN y AUDITOR. Cambia el contrato de la API. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF14SetupMFANoDesactivaSegundoFactor` pasa. El segundo factor se puede eludir por otra vía, registrada como DEF-50. |

### DEF-15. Permitir fuerza bruta en login y TOTP; limitar por la IP del proxy

| Campo | Contenido |
|---|---|
| Módulo | Backend / Infra |
| Requisito afectado | RNF03, RF01 |
| Característica ISO 25010:2023 | Seguridad -> Resistencia; Fiabilidad -> Disponibilidad |
| Tipo (IEEE 1044) | Configuración |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | 1. Revisar el límite: 120 peticiones por minuto y por IP para toda la API (`main.go:94-95`, `server.go:73`). 2. Revisar la clave del limitador: `c.IP()` (`ratelimit_middleware.go:22-24`). 3. En Docker, todo el tráfico llega desde nginx (`nginx.conf:22-33`) y Fiber no tiene `ProxyHeader` configurado. |
| Resultado esperado / obtenido | Límite específico y bloqueo progresivo por cuenta en login y TOTP / Sin límite por cuenta ni bloqueo; detrás de nginx, los 120/min se comparten entre **todos** los usuarios (un atacante agota la cuota de la IPS completa). |
| Evidencia | Análisis de código y configuración. No se ejecutó una prueba de carga contra nginx (Docker no disponible: **No medido**). |
| Causa raíz | Un limitador global sustituye controles específicos de autenticación. |
| Acción propuesta | M-13: limitador por cuenta y por IP real en `/auth/login` (p. ej. 5 intentos y luego espera exponencial), contador de fallos TOTP por usuario, `ProxyHeader: X-Real-IP` con proxies de confianza. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Corregido parcialmente** | Hay bloqueo por cuenta y límites por ruta, pero por defecto se confía en `X-Real-IP` desde 10/8, 172.16/12 y 192.168/16 (`pkg/config/config.go:144`), así que un equipo de la red local puede rotar la cabecera. Severidad Alta -> Media. |

### DEF-16. Bifurcar la cadena de hashes al cerrar folios concurrentes del mismo paciente

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF04 |
| Característica ISO 25010:2023 | Seguridad -> Integridad, No repudio |
| Tipo (IEEE 1044) | Lógica (concurrencia) |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | Cerrar simultáneamente dos borradores del mismo paciente. |
| Resultado esperado / obtenido | Uno encadena al otro / Ambos toman `GENESIS…` como hash previo. |
| Evidencia | `clinical_record_service.go:76` (lectura) y `:97` (escritura) sin transacción ni bloqueo; no hay `SELECT … FOR UPDATE` en el código (`grep -rn "FOR UPDATE"` sin resultados). Prueba abierta `TestDEF16…` con barrera determinista (`43-defectos-abiertos.txt`). |
| Causa raíz | Lectura-modificación-escritura no atómica. |
| Acción propuesta | M-14: en MySQL/PostgreSQL, transacción con `SELECT … FOR UPDATE` sobre el último folio cerrado o una fila de control por paciente; en memoria, un mutex por paciente. Cambia el puerto del repositorio (operación atómica `CloseRecordChained`). |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF16CierreConcurrenteNoBifurcaCadena` pasa (sin `-race` en local; con `-race` en CI). |

### DEF-17. Permitir que un médico cierre y firme el folio de otro

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF03, RF04 |
| Característica ISO 25010:2023 | Seguridad -> Responsabilidad (*Accountability*), No repudio |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | El médico B ejecuta `POST /clinical-records/{folio de A}/close`. |
| Resultado esperado / obtenido | 403 / Folio cerrado. El hash usa el `doctorID` de B (`clinical_record_service.go:88`) y la verificación recalcula con el de A (`:160`), así que `VerifyIntegrity` devuelve `false` para un folio legítimo. |
| Evidencia | Prueba abierta `TestDEF17…`: «cerró el folio ajeno sin error; VerifyIntegrity posterior=false». |
| Causa raíz | Falta control de acceso a nivel de objeto (ASVS V4.2.1). |
| Acción propuesta | M-15: exigir `record.DoctorID == doctorID` en `CloseAndSign` y `AddClarification` (o una política explícita de cierre delegado) y usar `record.DoctorID` en el hash. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF17MedicoNoCierraFolioAjeno` pasa. |

### DEF-18. Aceptar autoría y hash previo declarados por el cliente en la sincronización

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF06 («garantizando validación de firmas y continuidad de la cadena») |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad, No repudio |
| Tipo (IEEE 1044) | Interfaz |
| Severidad / Prioridad | Alta / P1 |
| Pasos para reproducir | Un MEDICO autenticado envía un lote con `"DoctorID":"usr-suplantado"`. |
| Resultado esperado / obtenido | El folio queda a nombre del médico del token / Queda a nombre de `usr-suplantado`. |
| Evidencia | `sync_handler.go:19` decodifica `domain.ClinicalRecord` completo (sin etiquetas JSON ni DTO) y `:36` lo pasa intacto; `sync_service.go:52-55` toma el `PreviousHash` del cliente y recalcula el hash sin verificar ninguna firma. Prueba abierta `TestDEF18…`. |
| Causa raíz | La entidad de dominio se usa como DTO de entrada. |
| Acción propuesta | M-16: DTO de sincronización; `DoctorID` derivado del token; `PreviousHash` resuelto por el servidor; firma del dispositivo (p. ej. Ed25519 por dispositivo registrado). Cambia el contrato de la API. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF18SincronizacionUsaMedicoAutenticado` pasa. |

### DEF-19. Abortar el lote completo en MySQL al reenviar un folio cerrado

| Campo | Contenido |
|---|---|
| Módulo | BD |
| Requisito afectado | RF06, RNF05 |
| Característica ISO 25010:2023 | Fiabilidad -> Tolerancia a fallos |
| Tipo (IEEE 1044) | Interfaz (aplicación–BD) |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | 1. Sincronizar un lote con un folio cerrado. 2. Reenviar el mismo lote (reintento tras pérdida de conexión). |
| Resultado esperado / obtenido | Reintento idempotente / Por análisis: `ON DUPLICATE KEY UPDATE` (`mysql/clinical_record_repo.go:222`) dispara `trg_prevent_update_closed_record` (`schema.sql:238`), que emite `SIGNAL 45000`; la transacción hace *rollback* y el lote entero se rechaza con 500, incluidos los folios nuevos. |
| Evidencia | Análisis de código. **No reproducido:** MySQL no disponible en el entorno de la revisión. |
| Causa raíz | La idempotencia se implementó con un `UPDATE` que el trigger de inmutabilidad prohíbe. |
| Acción propuesta | M-04 (misma acción que DEF-07): `INSERT IGNORE` o comprobación previa de existencia e igualdad. |
| Estado | Nuevo (pendiente de reproducir con MySQL en CI o en Docker). |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | El reenvío de un folio cerrado se reconoce en el servicio antes de llegar al repositorio (`sync_service.go:91-94`), lógica común a todos los adaptadores; `TestDEF07…` lo ejercita. Ejecución contra MySQL: **No medida**. |

### DEF-20. Invalidar la verificación de integridad por el redondeo de `closed_at` en MySQL

| Campo | Contenido |
|---|---|
| Módulo | BD |
| Requisito afectado | RF04 |
| Característica ISO 25010:2023 | Seguridad -> Integridad; Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | Cerrar un folio en MySQL en un instante con fracción de segundo ≥ 0,5 y llamar a `GET /clinical-records/:id/verify`. |
| Resultado esperado / obtenido | `true` / Por análisis, `false`: el hash se calcula con el segundo truncado por `time.RFC3339` (`clinical_record_service.go:83`), pero `closed_at TIMESTAMP` sin precisión fraccionaria (`schema.sql:136`) **redondea** el valor recibido (comportamiento por defecto de MySQL 8 sin `TIME_TRUNCATE_FRACTIONAL`), y la verificación vuelve a formatear el valor almacenado. |
| Evidencia | Análisis de código y esquema. **No reproducido** (sin MySQL). |
| Causa raíz | El valor hasheado y el valor persistido tienen precisiones distintas. |
| Acción propuesta | M-17: truncar `now` a segundos antes de calcular y persistir (`now.Truncate(time.Second)`), o `TIMESTAMP(6)` con formato `RFC3339Nano`. Un cambio de esquema es decisión del equipo; el truncado en código no lo requiere. |
| Estado | Nuevo (pendiente de reproducir). |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `sealTime` trunca `closed_at` a segundos; `TestClosedAtIsSealedToSeconds` (equipo) pasa. Ejecución contra MySQL: **No medida**. |

### DEF-21. Presentar pantallas clínicas desconectadas del backend con datos y hash simulados

| Campo | Contenido |
|---|---|
| Módulo | Frontend |
| Requisito afectado | RF02, RF03, RF04, RF05 |
| Característica ISO 25010:2023 | Adecuación funcional -> Completitud; Seguridad operacional |
| Tipo (IEEE 1044) | Interfaz |
| Severidad / Prioridad | Alta / P1 |
| Pasos para reproducir | 1. Iniciar sesión como médico. 2. Abrir HCE, Prescripción o Triaje. 3. Observar las peticiones de red. |
| Resultado esperado / obtenido | Las pantallas consumen `/clinical-records`, `/prescriptions` y `/triage` / Ninguna petición: las únicas llamadas a `apiClient` desde pantallas son de login, registro y administración (`grep -rn "apiClient\." src/frontend/src/screens src/frontend/src/components`). |
| Evidencia | `HceScreen.jsx:47-50`: hash previo y hash del folio son constantes. `PrescriptionScreen.jsx:121-137`: «omisión consciente… auditada» solo agrega una fila local, sin auditoría. La alergia del paciente está escrita en el JSX. |
| Causa raíz | El frontend clínico quedó en estado de prototipo visual. |
| Acción propuesta | M-18: integrar las pantallas con la API real (con estados de carga y error) y retirar los datos de ejemplo; mientras tanto, rotular las pantallas como «demostración». |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Corregido parcialmente** | Las pantallas de v1 consumen la API. Las nuevas repiten el patrón: `MedicalKitScreen.jsx` presenta publicaciones semilla como reales si la API falla y `DoctorAppointmentsView.jsx:139-142` afirma que el PDF «ha sido enviado» sin confirmación. Los casos de enfermería se registran como DEF-74 y DEF-75. |

### DEF-22. Mostrar éxito falso y bitácora fabricada en el panel de administración

| Campo | Contenido |
|---|---|
| Módulo | Frontend |
| Requisito afectado | RF07, RF08, RNF02 |
| Característica ISO 25010:2023 | Seguridad -> Responsabilidad; Capacidad de interacción -> Protección contra errores del usuario |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Alta / P1 |
| Pasos para reproducir | 1. Con el backend caído o respondiendo 403/500, suspender un usuario desde el panel. 2. Abrir la bitácora de auditoría. |
| Resultado esperado / obtenido | Error visible / Mensaje «suspendido exitosamente» y tres registros de auditoría inventados (IP, *correlation id* y hash ficticios). |
| Evidencia | `services/api.js:174-189` (`adminUpdateUserStatus` no es `strict` y actualiza `localStaff`), `:191-232` (registros simulados), `:155-172` (personal simulado). La prueba existente `AdminGovernance.test.jsx` pasa usando esos datos (`13-vitest.txt`: `Failed to parse URL`). |
| Causa raíz | El modo «contingencia» de demostración quedó activo en el cliente de producción. |
| Acción propuesta | M-18: `strict: true` en operaciones de gobierno y auditoría, y eliminar los datos fabricados. La prueba `AdminGovernance.test.jsx` deberá ajustarse con *mocks* explícitos de `fetch` (coordinar con el Responsable de Pruebas). |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Corregido parcialmente** | La bitácora y los estados vienen del servidor, pero `AdminOrgChartView.jsx:110-125` inventa una «Gerencia General» con datos personales y `:64-69` silencia el error de carga. Severidad Alta -> Media. |

### DEF-23. Bloquear en el cliente códigos TOTP válidos al validarlos contra un secreto fijo

| Campo | Contenido |
|---|---|
| Módulo | Frontend |
| Requisito afectado | RF01 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | 1. Un usuario con secreto MFA generado por el servidor (`/auth/mfa/setup`). 2. Ingresar su código correcto en el login. |
| Resultado esperado / obtenido | El servidor valida el código / El cliente lo rechaza antes de enviarlo con «Código TOTP incorrecto…». |
| Evidencia | `AuthScreen.jsx:40` fija el secreto de ejemplo y `:117-129` compara contra él antes de llamar a `apiClient.login` (`:135`). Lo mismo ocurre en `SecurityMfaScreen.jsx:30,97`. El servidor sí valida el TOTP de forma decisiva (`auth_service.go:42-49`), así que **H04 se refuta como vulnerabilidad**, pero el control del cliente rompe el flujo de cualquier usuario cuyo secreto no sea el de ejemplo. |
| Causa raíz | Lógica de demostración en el flujo de autenticación. |
| Acción propuesta | M-18: eliminar la validación TOTP del cliente en el login; en la pantalla de MFA, usar el secreto devuelto por el servidor. |
| Estado | Confirmado (por análisis de código; sin prueba de interfaz automatizada). |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | El cliente ya no valida el TOTP; lo decide el servidor (`AuthMfa.test.jsx` pasa). El respaldo de la semilla pública se registra en DEF-50. |

### DEF-24. Usar Fiber v2.52.5 con vulnerabilidad alcanzable GO-2025-3845

| Campo | Contenido |
|---|---|
| Módulo | Backend (dependencias) |
| Requisito afectado | RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Resistencia; Fiabilidad -> Disponibilidad |
| Tipo (IEEE 1044) | Configuración |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | `govulncheck ./...` en `src/backend`. |
| Resultado esperado / obtenido | 0 vulnerabilidades alcanzables / 1 alcanzable (caída de `BodyParser` con índices grandes), traza `auth_handler.go:195`; además, 29 avisos en módulos o paquetes sin llamada alcanzable (incluido `golang.org/x/crypto` v0.24.0). |
| Evidencia | `24-govulncheck.txt`, `24b-govulncheck-verbose.txt`. |
| Causa raíz | Dependencias sin actualizar ni escaneo en CI. |
| Acción propuesta | M-20: actualizar a `fiber/v2 >= 2.52.9` y `x/crypto` a la versión vigente, verificando la versión mínima de Go que exigen y el `golang:1.22-alpine` del Dockerfile. govulncheck pasa a bloqueante en `calidad.yml`. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | Fiber v2.52.16 (`src/backend/go.mod:7`); `govulncheck` ya no reporta GO-2025-3845 (`evidencias/r3/07-govulncheck.txt`). Reporta GO-2026-6888 en brotli v1.1.0 (DEF-83). |

### DEF-25. Omitir triggers en PostgreSQL y en aclaraciones; guardia de dominio sin uso

| Campo | Contenido |
|---|---|
| Módulo | BD |
| Requisito afectado | RF03, RNF04 |
| Característica ISO 25010:2023 | Seguridad -> Integridad; Flexibilidad -> Adaptabilidad |
| Tipo (IEEE 1044) | Configuración / datos |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | 1. Buscar DDL de PostgreSQL: `git ls-files | grep -i sql` devuelve solo `src/backend/database/schema.sql` (sintaxis MySQL). 2. Revisar los triggers de `clinical_record_clarifications`: no existen. 3. `grep -rn CanModify`: solo la definición. |
| Resultado esperado / obtenido | Inmutabilidad en ambos motores y en las aclaraciones / Solo MySQL y solo `clinical_records`. |
| Evidencia | `schema.sql:224-253`. Limitación estructural: el usuario de aplicación `MYSQL_USER` recibe todos los privilegios sobre la base (`docker-compose.yml:12-14`), incluidos `TRIGGER` y `DROP`; además, el seeder ejecuta `ALTER TABLE` en cada arranque (`seeder.go:37-38`). Quien tenga esas credenciales puede eliminar el trigger. |
| Causa raíz | La afirmación «MySQL/Postgres» se documentó sin implementarla. |
| Acción propuesta | M-21: DDL de PostgreSQL con funciones `BEFORE UPDATE/DELETE`; triggers `BEFORE UPDATE/DELETE` en aclaraciones; usuario de aplicación con solo `SELECT/INSERT/UPDATE` y migraciones con un usuario distinto. Cambio de esquema: decisión del equipo. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Corrección presente; ejecución No medida** | Hay triggers de inmutabilidad en `postgres/schema.sql` y en MySQL para aclaraciones, y `CanModify()` se usa en los servicios. Sin MySQL ni PostgreSQL en el entorno la ejecución de los triggers queda **No medida**. |

### DEF-26. Carecer de API de admisión de pacientes y alergias (rol ADMISION sin rutas)

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF01 (rol ADMISION), RF02, RF05 |
| Característica ISO 25010:2023 | Adecuación funcional -> Completitud |
| Tipo (IEEE 1044) | Interfaz |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | Revisar `router.go:20-78` o la matriz RBAC. |
| Resultado esperado / obtenido | Rutas para registrar pacientes y antecedentes alérgicos / Ninguna; el rol ADMISION recibe 403 en todas las rutas. En modo memoria no hay pacientes sembrados, de modo que triaje, HCE y prescripción no pueden ejercitarse de punta a punta por la API. |
| Evidencia | `anexos/matriz-rbac.md`; `ports.PatientRepository` define `Create` y `AddPatientAllergy` sin consumidores HTTP. |
| Causa raíz | Alcance funcional incompleto respecto de los roles declarados. |
| Acción propuesta | M-22: endpoints `POST /patients` y `POST /patients/:id/allergies` para ADMISION y MEDICO, con validación y auditoría. Contrato de API nuevo: decisión del equipo. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | API de admisión y alergias para ADMISION, ENFERMERO y MEDICO; `TestAdmissionPatientAndAllergyAPI` y `TestRBACMatrizRutasPorRol` pasan. |

### DEF-27. Aceptar frecuencia cardíaca superior a 300 lpm

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF02 («Frecuencia Cardíaca <= 0 o > 300 lpm») |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Seguridad operacional |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Media / P3 (la clasificación resultante es Nivel I, por lo que no subestima la urgencia) |
| Pasos para reproducir | `Validate()` con FC = 301 o 1000. |
| Resultado esperado / obtenido | `ErrInvalidVitals` / `nil`. |
| Evidencia | `triage.go:62` sin cota superior. Prueba `TestDEF27…` con los límites 1, 300, 301 y 1000: falla antes (`52-…`) y pasa después (`53-def27-despues.txt`). El resto de signos (temperatura, presión, FR) tampoco tiene cota superior: se propone sin implementar porque la especificación no define umbrales. |
| Causa raíz | Requisito documentado sin implementar. |
| Acción propuesta | M-23 (corregido para FC); M-07 para el resto de signos. |
| Estado | En verificación: commit `fix(DEF-27)`. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF27FrecuenciaCardiacaLimiteSuperior` pasa. |

### DEF-28. Corromper la bitácora de auditoría por cadenas no copiadas del contexto Fiber

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RNF02 |
| Característica ISO 25010:2023 | Seguridad -> Responsabilidad; Fiabilidad -> Madurez |
| Tipo (IEEE 1044) | Lógica (concurrencia) |
| Severidad / Prioridad | Media / P2 |
| Pasos para reproducir | Encolar entradas de auditoría y leerlas después de que lleguen otras peticiones (como hace la goroutine asíncrona). |
| Resultado esperado / obtenido | Cada entrada conserva su ruta y su *correlation id* / 18 de 20 entradas muestran la ruta y el identificador de una petición posterior. |
| Evidencia | `audit_middleware.go:71,73` (base). Prueba `TestDEF28…`: antes (`55-def28-def41-antes.txt`) y después (`56-def28-despues.txt`). |
| Causa raíz | Fiber devuelve cadenas sin copia (*zero-allocation*) válidas solo durante el handler. Es el residuo de DEF-03. |
| Acción propuesta | M-24 (corregido): `utils.CopyString` sobre ruta, IP, método, usuario, rol y *correlation id* antes de despachar la goroutine. |
| Estado | En verificación: commit `fix(DEF-28)`. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | Con el `audit_middleware.go` de `origin/main` la prueba altera 18 de 20 entradas en tres corridas; con la corrección de la rama pasa (`evidencias/r3/31-def28-en-main.txt`). |

### DEF-29. Producir colisiones de hash por separador `|` sin escapar

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF04 |
| Característica ISO 25010:2023 | Seguridad -> Integridad |
| Tipo (IEEE 1044) | Lógica (cálculo) |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Calcular el hash con anamnesis `dolor|toracico` y examen `normal`, y luego con anamnesis `dolor` y examen `toracico|normal`. |
| Resultado esperado / obtenido | Hashes distintos / Idénticos (`9ec71965…`). |
| Evidencia | `crypto.go:56-68` concatena con `\|` y aplica `TrimSpace`, que además hace que los espacios finales no queden protegidos. Prueba abierta `TestDEF29…`. H16 (determinismo): el orden de campos y el formato de fecha UTC son fijos, así que el hash **es reproducible**; el defecto es de unicidad, no de determinismo. |
| Causa raíz | Serialización ambigua. |
| Acción propuesta | M-25: serialización canónica con longitud prefijada o JSON canónico, con versión de algoritmo (`hash_version`) para no invalidar los folios ya sellados. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | `TestDEF29HashSinColisionPorDelimitador` reproduce la colisión (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |

### DEF-30. Verificar la integridad sin validar el enlace con el folio anterior

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF04 |
| Característica ISO 25010:2023 | Seguridad -> Integridad, No repudio |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P2 |
| Pasos para reproducir | Sincronizar un folio cerrado con un `PreviousHash` que no corresponde a ningún folio y llamar a `/verify`. |
| Resultado esperado / obtenido | `false` / `true`. |
| Evidencia | `clinical_record_service.go:142-170` recalcula con el `PreviousHash` almacenado sin compararlo con el hash del folio anterior. No existe verificación de la cadena completa de un paciente (H18). Prueba abierta `TestDEF30…`. |
| Causa raíz | La verificación se diseñó por folio y no por cadena. |
| Acción propuesta | M-26: `GET /patients/:id/chain/verify`, que recorra los folios cerrados en orden y verifique cada enlace, para el rol AUDITOR. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | `TestDEF30VerificacionValidaEnlaceConFolioAnterior` reproduce el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |

### DEF-31. Revelar cuentas inactivas antes de validar la contraseña

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF01 |
| Característica ISO 25010:2023 | Seguridad -> Confidencialidad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Login con el correo de una cuenta inactiva y una contraseña **incorrecta**. |
| Resultado esperado / obtenido | 401 «Credenciales inválidas» / 403 «Cuenta inactiva o pendiente de validación ReTHUS». Además, un correo inexistente responde sin ejecutar Bcrypt (diferencia de tiempo medible). |
| Evidencia | `auth_service.go:34` antes de `:38`. Prueba abierta `TestDEF31…`. |
| Causa raíz | Orden de validación. |
| Acción propuesta | M-27: validar la contraseña primero (y comparar contra un hash ficticio si el usuario no existe); informar el estado inactivo solo tras credenciales correctas. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF31LoginNoRevelaCuentaInactivaConClaveErronea` pasa. |

### DEF-32. Responder el healthcheck sin verificar la base de datos

| Campo | Contenido |
|---|---|
| Módulo | Backend / Infra |
| Requisito afectado | RNF05 |
| Característica ISO 25010:2023 | Fiabilidad -> Disponibilidad |
| Tipo (IEEE 1044) | Interfaz |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Detener MySQL con el backend en ejecución y consultar `/api/v1/health`. |
| Resultado esperado / obtenido | 503 con el estado de la dependencia / 200 `{"status":"UP"}` (respuesta fija). |
| Evidencia | `router.go:24-30`; `15-health.txt`. El healthcheck de Compose (`docker-compose.yml:59-60`) depende de este endpoint. |
| Causa raíz | Healthcheck de liveness usado como readiness. |
| Acción propuesta | M-28: `/health/live` (proceso) y `/health/ready` (`db.PingContext` con *timeout* y modo de almacenamiento). |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | `router.go:34-40` responde `UP` sin consultar la base de datos; comprobado contra el backend real (`GET /api/v1/health`, `evidencias/r3/42-carga-http-real.txt`). |

### DEF-33. Restaurar la sesión desde `localStorage` sin revalidar; cifrado declarado inexistente

| Campo | Contenido |
|---|---|
| Módulo | Frontend |
| Requisito afectado | RF10, RF01 |
| Característica ISO 25010:2023 | Seguridad -> Confidencialidad |
| Tipo (IEEE 1044) | Lógica / documentación |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | 1. Iniciar sesión como MEDICO. 2. En DevTools, editar `saludconecta_user` y poner `role: "ADMIN"`. 3. Recargar con F5. |
| Resultado esperado / obtenido | La sesión se revalida contra el servidor / Se muestra `AdminLayout` (`App.jsx:100`). El backend sigue negando las operaciones (el rol sale del JWT, `auth_middleware.go:38`): no hay escalamiento de datos, pero sí una interfaz incoherente. |
| Evidencia | `App.jsx:15-23`, `api.js:89-101`. El token JWT queda en `localStorage` en texto claro, accesible a cualquier XSS. El diagrama 12 del README (`README.md:804`) lo llama «LocalStorage Cripto-Protegido»: **afirmación falsa**, no hay cifrado. |
| Causa raíz | Persistencia F5 implementada en el cliente sin endpoint de sesión. |
| Acción propuesta | M-29: `GET /auth/me` para revalidar al cargar; a mediano plazo, cookie `HttpOnly; Secure; SameSite=Strict`. Corregir el diagrama. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Corregido parcialmente** | Revalida con `/auth/me` al montar, pero pinta antes la interfaz con el rol de `localStorage`, guarda el *refresh token* en `localStorage` y declara un cifrado «AES-256 / TLS 1.3» inexistente. |

### DEF-34. Exponer MySQL y el backend al host con credenciales en texto plano

| Campo | Contenido |
|---|---|
| Módulo | Infra |
| Requisito afectado | RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Confidencialidad |
| Tipo (IEEE 1044) | Configuración |
| Severidad / Prioridad | Media / P2 |
| Pasos para reproducir | Revisar `docker-compose.yml`. |
| Resultado esperado / obtenido | Solo nginx expuesto y secretos por `env_file` o *secrets* / MySQL en `3306:3306` (`:16`) y backend en `8080:8080` (`:58`), que permite saltarse nginx; credenciales de root, usuario, JWT y admin escritas en el archivo (`:11`, `:14`, `:21`, `:49`, `:51`, `:54`). No se copian aquí. |
| Evidencia | Lectura del archivo. Fortaleza verificada: el backend sí corre como `appuser` sin privilegios (`src/backend/Dockerfile:40-48`), como afirma el diagrama 11. |
| Causa raíz | Configuración de desarrollo usada como única configuración. |
| Acción propuesta | M-30: quitar los `ports` de MySQL y del backend (o enlazarlos a `127.0.0.1`), mover los secretos a un `.env` no versionado (ya ignorado en `.gitignore`) y rotar los valores publicados. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `docker-compose.yml:16,60` publica solo en `127.0.0.1` y las credenciales son obligatorias (`${VAR:?…}`). Docker no disponible: verificación por lectura del archivo de despliegue. |

### DEF-35. Omitir CSP y HSTS y perder cabeceras de seguridad en activos estáticos

| Campo | Contenido |
|---|---|
| Módulo | Infra |
| Requisito afectado | RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Integridad (mitigación de XSS) |
| Tipo (IEEE 1044) | Configuración |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Revisar `src/frontend/nginx.conf`. |
| Resultado esperado / obtenido | CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` y HSTS con TLS / Existen `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` (obsoleta) y `Referrer-Policy` (`:16-19`). **No hay CSP** (crítica, porque el token está en `localStorage`), ni HSTS, ni TLS. El bloque de activos (`:37-41`) declara su propio `add_header`, y en nginx eso anula la herencia del nivel `server`: JS y CSS se sirven **sin** las cabeceras de seguridad. |
| Evidencia | Lectura de la configuración. **No medido** con `curl -I` (Docker no disponible). |
| Causa raíz | Comportamiento de herencia de `add_header` en nginx. |
| Acción propuesta | M-31: `include` común de cabeceras en cada `location`; CSP `default-src 'self'`; TLS y HSTS en el despliegue real. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | `src/frontend/nginx.conf:16-19` no define CSP ni HSTS y el bloque de activos (`:39`) anula las cabeceras heredadas. |

### DEF-36. Incumplir el contraste WCAG AAA declarado en los banners de perfil

| Campo | Contenido |
|---|---|
| Módulo | Frontend |
| Requisito afectado | RF09 («garantiza contraste WCAG AAA sobre cualquier fondo») |
| Característica ISO 25010:2023 | Capacidad de interacción -> Inclusividad (accesibilidad) |
| Tipo (IEEE 1044) | Interfaz |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Calcular el contraste WCAG 2.x de los textos del banner componiendo las capas translúcidas sobre cada parada del degradado (`node contraste.mjs`). |
| Resultado esperado / obtenido | ≥ 7:1 (texto normal, AAA) / Mínimos: 1,85:1 (texto blanco sobre `bg-white/20`, banner Pediatría, parada `#F59E0B`), 4,74:1 (insignia de color) y 5,37:1 (descripción sobre `bg-black/45`). El primero incumple incluso AA (4,5:1). |
| Evidencia | `ProfileScreen.jsx:230`, degradados en `UserProfileModal.jsx:31-83`; cálculo en `evidencias/40-contraste-banners.txt`. Limitación: no se modelan el desenfoque ni la ilustración SVG del banner. No se ejecutó axe-core ni Lighthouse (**No medido**: el entorno no tiene navegador automatizado). El óvalo `bg-white/95` sí da contraste alto para el nombre. |
| Causa raíz | Se verificó el óvalo pero no el resto de textos del banner. |
| Acción propuesta | M-32: fondo sólido (≥ 85 % de opacidad oscura) detrás de todos los textos del banner, o texto oscuro sobre el ámbar; retirar la afirmación AAA hasta medirla con axe-core. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | Blanco sobre el tramo `#F59E0B` del banner de pediatría: 2,15:1; sobre `#0D9488`: 3,74:1 (`evidencias/r3/44-contraste-modal-alergias.txt`). No cumple AA ni AAA. |

### DEF-37. Escribir bajo `RLock` en `ClinicalRecordMemoryRepo.GetByID`

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RNF05 |
| Característica ISO 25010:2023 | Fiabilidad -> Madurez |
| Tipo (IEEE 1044) | Lógica (concurrencia) |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Lecturas concurrentes de un folio con aclaraciones bajo `go test -race`. |
| Resultado esperado / obtenido | Sin carreras / `WARNING: DATA RACE` en `rec.Clarifications = clar` (`memory_repos.go:368`), que escribe en el registro compartido con un candado de lectura; además, `GetByID` devuelve el puntero interno, de modo que el llamador puede mutar el almacén. |
| Evidencia | Prueba abierta `TestDEF37…`. No reproducible en local (sin cgo). **Confirmado en CI** por el job `backend-defectos-abiertos` con `-race`: «race detected during execution of test» (`evidencias/89b-ci-defectos-abiertos-race.txt`). |
| Causa raíz | Mutación dentro de una lectura. Es el mismo patrón de puntero compartido que DEF-46. |
| Acción propuesta | M-33: devolver una copia y adjuntar las aclaraciones a la copia. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `GetByID` devuelve una copia; `TestDEF37LecturaConcurrenteDeFolioSinCarrera` pasa. Con `-race`: **No medido** en local (sin gcc); se ejecuta en CI. |

### DEF-38. Ignorar errores del descuento de inventario y validar stock sin atomicidad

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF05 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Fiabilidad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Dos prescripciones simultáneas que juntas superan el stock. |
| Resultado esperado / obtenido | Una se rechaza / Por análisis, ambas pueden validar el stock antes de descontar (`prescription_service.go:72`); el error del descuento se descarta (`:88`) y la prescripción ya quedó persistida (`:83`). |
| Evidencia | Análisis de código. No se escribió una prueba porque depende del adaptador (en MySQL, de la transacción). |
| Causa raíz | Validación y descuento fuera de una misma transacción. |
| Acción propuesta | M-34: `UPDATE … SET stock = stock - ? WHERE id = ? AND stock >= ?` dentro de la transacción de la prescripción. |
| Estado | Confirmado (por análisis). |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Corregido parcialmente** | Los descuentos son atómicos y los errores se propagan, pero la prescripción se persiste antes de descontar y sin transacción. Severidad Media -> Baja. |

### DEF-39. Publicar documentación inconsistente y cifras no medidas

| Campo | Contenido |
|---|---|
| Módulo | Documentación |
| Requisito afectado | Todos (trazabilidad) |
| Característica ISO 25010:2023 | Mantenibilidad -> Analizabilidad; Capacidad de interacción -> Autodescriptividad |
| Tipo (IEEE 1044) | Documentación |
| Severidad / Prioridad | Media / P2 |
| Pasos para reproducir | Ver la matriz completa en `verificacion-documental.md`. |
| Resultado esperado / obtenido | Documentación verificable / 37 afirmaciones evaluadas: 8 verificadas, 14 parciales, 13 falsas y 2 no verificables (`verificacion-documental.md`, sección 2). |
| Evidencia | `verificacion-documental.md`. |
| Causa raíz | Documentación escrita antes de medir y sin revisión cruzada. |
| Acción propuesta | M-35: corregido en esta rama `docs/informe-calidad.md` y, en el README, las listas de Trello, el rango de requisitos y el badge. Pendiente para el equipo: especificación (RF07–RF10, RNF04–RNF05), diagramas 11 y 12, tabla de variables y las afirmaciones de cumplimiento del README. |
| Estado | En corrección (parcial en rama). |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | `main` vuelve a publicar listas de Trello antiguas, el rango «RF01 a RF12» (hay RF01 a RF16) y la bitácora «DEF-01 a DEF-04». Calidad reaplica en esta rama solo los cambios autorizados del README. |

### DEF-40. Mantener pruebas que pasan de forma trivial y cobertura frontend no ejecutable

| Campo | Contenido |
|---|---|
| Módulo | Pruebas |
| Requisito afectado | RF04, RF05 |
| Característica ISO 25010:2023 | Mantenibilidad -> Capacidad de ser probado |
| Tipo (IEEE 1044) | Documentación / lógica de prueba |
| Severidad / Prioridad | Media / P2 |
| Pasos para reproducir | Revisar `tests/backend/prescription_test.go`, `src/backend/core/services/clinical_record_service_test.go` y `npx vitest run --coverage`. |
| Resultado esperado / obtenido | Pruebas que ejercitan el caso clínico real / 1. La amoxicilina se define con principio activo `"BETALACTAMICOS"` igual que la alergia, por lo que la prueba confirma una coincidencia de texto y oculta DEF-06. 2. `clinical_record_service_test.go` está en `core/services` pero solo prueba `crypto` y `domain` (0,0 % de cobertura del paquete, `07-cover-func-src.txt`). 3. `vitest --coverage` falla por falta de `@vitest/coverage-v8` (`12-…`). 4. La RTM de `plan-de-pruebas.md` declara cobertura del 100 % por requisito con identificadores `TC-*` que no aparecen en el código (solo existen en el documento). 5. `AdminGovernance.test.jsx` valida datos simulados (DEF-22). |
| Evidencia | Archivos citados. H29: `tests/backend` sí importa los paquetes reales de `src/backend` mediante `replace` (`tests/backend/go.mod`) y no usa copias; esa parte queda **refutada**. |
| Causa raíz | Pruebas escritas para confirmar la implementación, no el requisito. |
| Acción propuesta | M-36: propuesta al Responsable de Pruebas (no se modificaron sus archivos): usar principios activos reales en los *fixtures*, mover la prueba de `core/services` a `pkg/crypto` o ampliarla, agregar `@vitest/coverage-v8` como devDependency y vincular cada `TC-*` con el nombre de la prueba. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Corregido parcialmente** | La cobertura frontend es ejecutable (72,85 %), pero persisten pruebas que dan confianza falsa: `AllergyAlertModal.test.jsx` prueba una copia del componente (DEF-90) y `MedicalKit.test.jsx` afirma contenido semilla. |

### DEF-41. Aceptar `X-Correlation-ID` arbitrario del cliente

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RNF02 («identificador único UUID v4») |
| Característica ISO 25010:2023 | Seguridad -> Responsabilidad |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Baja / P4 (el logger serializa en JSON, lo que impide romper líneas; el valor sí llega a la bitácora en BD y a las cabeceras) |
| Pasos para reproducir | Enviar `X-Correlation-ID: no-es-un-uuid`, 1 000 caracteres o un fragmento JSON. |
| Resultado esperado / obtenido | Se reemplaza por un UUID generado / Se acepta y se devuelve. |
| Evidencia | `audit_middleware.go:17-20` (base). Prueba `TestDEF41…`: antes (`57-def41-antes.txt`) y después (`58-def41-despues.txt`). |
| Causa raíz | Entrada del cliente sin validar. |
| Acción propuesta | M-37 (corregido): aceptar solo un UUID canónico. |
| Estado | En verificación: commit `fix(DEF-41)`. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | La corrección (`fix(DEF-41)`) solo está en la rama de calidad; `TestDEF41CorrelationIDSoloAceptaUUID` pasa en la rama. |

### DEF-42. Usar coste Bcrypt 10 en el seeder de MySQL

| Campo | Contenido |
|---|---|
| Módulo | BD |
| Requisito afectado | RNF03 («Bcrypt coste 12») |
| Característica ISO 25010:2023 | Seguridad -> Confidencialidad |
| Tipo (IEEE 1044) | Configuración |
| Severidad / Prioridad | Baja / P4 |
| Pasos para reproducir | Revisar `seeder.go:100,123,142`. |
| Resultado esperado / obtenido | Coste 12 / `bcrypt.DefaultCost` (10). El resto del sistema sí usa 12 (`crypto.go:35`), así que **H07 se confirma parcialmente**. |
| Evidencia | Lectura del código. |
| Causa raíz | El seeder no reutiliza `crypto.HashPassword`. |
| Acción propuesta | M-38: usar `crypto.HashPassword` en el seeder (se resuelve junto con M-09). |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | El seeder ya no crea cuentas y el único hash usa coste 12 (`pkg/crypto/crypto.go:38`). |

### DEF-43. Usar datos personales de apariencia real en semillas y simulaciones

| Campo | Contenido |
|---|---|
| Módulo | Documentación / datos |
| Requisito afectado | Ley 1581 de 2012 (RF07, RF08) |
| Característica ISO 25010:2023 | Seguridad -> Confidencialidad |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Baja / P3 |
| Pasos para reproducir | Revisar `memory_repos.go:50-110`, `seeder.go:111-150`, `api.js:11-76` y el README («Persona Oficial de Pruebas Clínicas»). |
| Resultado esperado / obtenido | Datos sintéticos claramente identificados / La cuenta médica de prueba usa el nombre de un integrante real del equipo (líder técnico) junto con un número de cédula, un teléfono y una tarjeta profesional de formato plausible; aparecen otros nombres con documentos de apariencia real. |
| Evidencia | 67 coincidencias de los nombres sembrados en código y documentación (`grep -rni`). No se pudo determinar si los números corresponden a personas reales (**No verificable**). |
| Causa raíz | Datos de demostración no anonimizados. |
| Acción propuesta | M-39: sustituir por datos sintéticos evidentes (p. ej. «Médico Demo 01», documento `0000000001`), o registrar la autorización expresa del titular conforme a la Ley 1581. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | Siguen datos personales de apariencia real en `AdminOrgChartView.jsx:112-119`, `MedicalKitScreen.jsx`, `Header.jsx` y `ProfileScreen.jsx`. |

### DEF-44. Acumular deuda técnica estática (errcheck, complejidad, duplicación, archivos grandes)

| Campo | Contenido |
|---|---|
| Módulo | Backend / Frontend |
| Requisito afectado | — (mantenibilidad) |
| Característica ISO 25010:2023 | Mantenibilidad -> Modificabilidad, Analizabilidad |
| Tipo (IEEE 1044) | Lógica / estilo |
| Severidad / Prioridad | Baja / P4 |
| Pasos para reproducir | Ver `anexos/analisis-estatico.md`. |
| Resultado esperado / obtenido | Sin deuda bloqueante / SA4006 en `postgres/user_repo.go:133`; errcheck en `main.go:68` y `logger.go:70`; `SuggestManchesterPriority` con complejidad 17; `AdminDashboardScreen.jsx` con 2 233 líneas; duplicación Go del 14,46 %; 65 variables sin uso en JSX; regla `api` de `.gitignore:19` que ignora `src/backend/cmd/api`; `/verify` y `/mfa/setup` responden 500 en casos de no encontrado. |
| Evidencia | `21-…`, `22-…`, `25-…`, `31-…`, `32-…`, `42-matriz-rbac.txt`. |
| Causa raíz | Ausencia de linters en el flujo de trabajo previo. |
| Acción propuesta | M-19, M-40: ver plan de mantenimiento. `.golangci.yml` bloquea la deuda nueva desde esta rama. |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | 16 funciones con complejidad mayor de 15 (media 3,86), 62 hallazgos de golangci-lint (21 nuevos desde `6492f07`) y 89 avisos de ESLint (`evidencias/r3/05c-golangci-lint-total.txt`, `08-gocyclo.txt`, `23-eslint.txt`). Los errores de ESLint de `App.jsx` están corregidos solo en la rama. |

### DEF-45. Mantener vulnerabilidades en dependencias de desarrollo JS

| Campo | Contenido |
|---|---|
| Módulo | Frontend |
| Requisito afectado | RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Integridad (cadena de desarrollo) |
| Tipo (IEEE 1044) | Configuración |
| Severidad / Prioridad | Baja / P4 (0 vulnerabilidades en producción) |
| Pasos para reproducir | `npm audit`. |
| Resultado esperado / obtenido | 0 de severidad alta o crítica / 6: 2 críticas (`tinypool`), 1 alta, 3 moderadas (`esbuild`, `vite`, `@vitest/mocker`). |
| Evidencia | `30-npm-audit.txt`. |
| Causa raíz | Versiones mayores antiguas de Vite y Vitest. |
| Acción propuesta | M-41: migrar a Vite y Vitest vigentes en una rama dedicada (cambio mayor que puede romper la configuración de pruebas). |
| Estado | Confirmado. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Sigue abierto** | `npm audit`: 6 vulnerabilidades en dependencias de desarrollo (2 críticas, 1 alta, 3 moderadas); producción: 0 (`evidencias/r3/22b-npm-audit-completo.txt`, `22-npm-audit-prod.txt`). |

### DEF-46. Exponer el puntero interno del catálogo de medicamentos y provocar una carrera de datos

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RF05, RNF01 |
| Característica ISO 25010:2023 | Fiabilidad -> Madurez; Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica (concurrencia) |
| Severidad / Prioridad | Media / P2 (el adaptador en memoria es el que queda activo en producción por DEF-10) |
| Pasos para reproducir | 1. `cd tests/backend && go test -race -run TestRNF01 ./...` con prescripciones concurrentes del mismo medicamento. 2. Alternativa determinista: modificar el `StockQuantity` del medicamento devuelto por `GetMedicationByID` y volver a consultarlo. |
| Resultado esperado / obtenido | Sin carreras; el inventario no cambia al modificar la copia / `WARNING: DATA RACE`: `DeductStock` escribe `StockQuantity` bajo `Lock` (`memory_repos.go:506`) mientras el servicio lo lee sin candado (`prescription_service.go:79`) y `c.JSON` serializa el mismo struct (`prescription_handler.go:106`); son líneas de la rama según la traza de CI, que equivalen a `:72` y `:101` en `6492f07`. En la prueba determinista, el inventario almacenado pasa de 10 a 0. |
| Evidencia | CI, run `41361540450` (`evidencias/89-ci-run-41361540450.txt`); prueba `TestDEF46…`: falla antes (`90-def46-antes.txt`) y pasa después (`91-def46-despues.txt`). La verificación con `-race` corresponde al pipeline (no hay cgo en el entorno local). |
| Causa raíz | `GetMedicationByID` (`memory_repos.go:471-479` en `6492f07`) devolvía el puntero almacenado, así que el candado no protegía las lecturas posteriores. |
| Acción propuesta | M-45 (corregido): devolver una copia. La validación de stock sigue sin ser atómica (DEF-38, M-34). |
| Estado | En verificación: commit `fix(DEF-46)`; queda pendiente confirmar el pipeline en verde. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `TestDEF46CatalogoNoExponePunteroInterno` y `TestDEF46PrescripcionesConcurrentesSinCarrera` pasan. |

### DEF-47. Calcular un TOTP ajeno al secreto cuando Web Crypto no está disponible

| Campo | Contenido |
|---|---|
| Módulo | Frontend |
| Requisito afectado | RF01 |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad; Fiabilidad -> Ausencia de fallos |
| Tipo (IEEE 1044) | Lógica (cálculo) |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | 1. Ejecutar `calculateTotpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59000)` en un entorno donde `crypto.subtle` no existe o falla: Node 20.18.1 con jsdom (CI) o un navegador que abre la aplicación por `http://<ip-de-la-red-local>`, que no es un contexto seguro. 2. Comparar con el vector RFC 6238 `287082`. |
| Resultado esperado / obtenido | `287082` / Un valor distinto en cada ejecución (`988480` y `747488` en dos corridas de CI; `677088` en local), porque el respaldo calculaba `(Date.now()/30000 * 2654435761) % 1000000` sin usar el secreto ni el instante solicitado. |
| Evidencia | `src/frontend/src/utils/totp.js:93-98` (base). Prueba existente `tests/frontend/totp.test.js:23`, que falla en CI (`89-ci-run-41361540450.txt`); prueba nueva `tests/frontend/totp.regression.test.js` con 4 vectores RFC 6238: falla antes (`92-def47-antes.txt`) y pasa después (`93-def47-despues.txt`). |
| Causa raíz | Un «fallback matemático» de demostración en lugar de una implementación de HMAC-SHA1. Agrava DEF-23: fuera de contexto seguro, la validación previa del cliente rechaza todos los códigos reales y la pantalla de MFA muestra códigos falsos. |
| Acción propuesta | M-46 (corregido): HMAC-SHA1 local (RFC 2104 y FIPS 180-4) cuando Web Crypto falta o falla, y contador de 64 bits. M-18 sigue vigente: el servidor debe ser la única fuente de verdad del TOTP. |
| Estado | En verificación: commit `fix(DEF-47)`. |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `tests/frontend/totp.regression.test.js` (3 pruebas) pasa (`evidencias/r3/24-vitest.txt`). |

### DEF-48. Mantener una prueba con timeout fijo de 1 s que falla bajo `-race`

| Campo | Contenido |
|---|---|
| Módulo | Pruebas |
| Requisito afectado | RF07 |
| Característica ISO 25010:2023 | Mantenibilidad -> Capacidad de ser probado |
| Tipo (IEEE 1044) | Lógica de prueba |
| Severidad / Prioridad | Baja / P3 |
| Pasos para reproducir | `cd tests/backend && CGO_ENABLED=1 go test -race -run TestStaffRegisterRequiresAdmin ./...` en Linux. |
| Resultado esperado / obtenido | La prueba pasa / `test: timeout error 1000ms` en el caso «admin con rol admin», y en consecuencia «El registro del administrador no creo la cuenta». |
| Evidencia | `tests/backend/staff_register_routes_test.go:66` usa `app.Test(req)`, cuyo timeout por defecto es de 1 s. El registro ejecuta Bcrypt con coste 12, que bajo la instrumentación de `-race` supera ese límite (en el mismo run, cada prueba que crea `memory.NewDataStore()`, con dos hashes de coste 12, tarda unos 4,7 s). Falló igual en los runs `41356845373` y `41361540450`. **No es una condición de carrera:** el detector no reportó ningún acceso concurrente en esa prueba. |
| Causa raíz | Timeout de prueba acoplado al rendimiento del entorno. |
| Acción propuesta | M-47 (propuesta al Responsable de Pruebas; Calidad no modifica sus pruebas): usar `app.Test(req, -1)` o un timeout explícito amplio. Mitigación en CI: el paso con `-race` excluye solo esa prueba (`-skip '^TestStaffRegisterRequiresAdmin$'`) y el paso siguiente ejecuta la suite completa sin `-race`, del que se toma la cobertura. Al corregirse la prueba se debe retirar el `-skip`. |
| Estado | Confirmado (mitigado). |

#### Verificación R3 (10 nov 2026)

| Veredicto | Evidencia |
|---|---|
| **Verificado — corregido** | `staff_register_routes_test.go:84` usa 30 s. Calidad retira en esta rama el `-skip` que quedaba en `calidad.yml`. |

### DEF-49. Permitir el registro anónimo de administradores activos

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF07, RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad, Resistencia |
| Tipo (IEEE 1044) | Lógica / Interfaz |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | `POST /api/v1/auth/register-admin` sin cabecera `Authorization`, con nombre, documento, correo y contraseña. |
| Resultado esperado / obtenido | 401/403 / 201 y cuenta ADMIN activa, con `mfa_secret` en la respuesta. |
| Evidencia | `router.go:52` registra la ruta antes de `authMW`; `auth_handler.go:278-356` y `auth_service.go:229-244` crean el ADMIN activo. Con esa cuenta se aprueban médicos, se dispensa y se leen recetas (`router.go:61-68,173-189`). R3: `TestDEF49RegistroDeAdministradorRequiereAutenticacion` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF49RegistroDeAdministradorRequiereAutenticacion` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | El registro de administradores se publicó como flujo de alta abierto en lugar de restringirlo a un administrador autenticado o al arranque. |
| Acción propuesta | M-21: eliminar la ruta pública; el alta de ADMIN solo por `BootstrapAdmin` o por un ADMIN autenticado con MFA. Cambia el contrato de la API: decisión del equipo. |
| Estado | Confirmado (reverificado en R3) |

### DEF-50. Exponer sin autenticación la semilla TOTP de cualquier cuenta

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend / Frontend |
| Requisito afectado | RF07, RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad, Confidencialidad; Fiabilidad -> Disponibilidad |
| Tipo (IEEE 1044) | Lógica / Interfaz |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | `GET /api/v1/auth/mfa-seed?email=<correo de un médico con MFA>` sin token. |
| Resultado esperado / obtenido | 401 / 200 con el secreto TOTP vigente. |
| Evidencia | `router.go:53`; `auth_service.go:248-283` devuelve `user.MFASecret`, activa MFA en cuentas que no lo tenían (`:259-267`, con lo que bloquea su ingreso) y entrega una semilla determinista para correos inexistentes (`:270-278`), lo que permite enumerar cuentas. El cliente la consume en `api.js:203-208` y `AuthScreen.jsx:66-95` (botón «Pegar código de prueba»). R3: `TestDEF50SemillaMFANoSeExponeSinAutenticacion` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF50SemillaMFANoSeExponeSinAutenticacion` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Una ayuda de demostración para escanear el QR se dejó como endpoint público en la API real. |
| Acción propuesta | M-22: eliminar el endpoint y el autocompletado; la semilla solo se entrega en `/auth/mfa/setup` autenticado. |
| Estado | Confirmado (reverificado en R3) |

### DEF-51. Omitir el cruce de alergias en la prescripción v2, la única que la interfaz permite usar

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend / Frontend |
| Requisito afectado | RF05 |
| Característica ISO 25010:2023 | Seguridad operacional -> Identificación de riesgos; Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Paciente con alergia severa a PENICILINA; `DispatchTreatment` con amoxicilina 500 mg. |
| Resultado esperado / obtenido | `AllergyConflictError` / receta emitida en estado PENDING y dispensable. |
| Evidencia | `treatment_service.go:44-140` no consulta alergias; `MatchAllergy` solo se usa en v1 (`prescription_service.go:71`). En la interfaz, la vista `prescription` muestra `PharmacyDashboard` (`App.jsx:394-399`): `PrescriptionScreen`, que trae el interceptor, se importa pero nunca se muestra, y la prescripción real se hace en `TreatmentFollowUpView.jsx:120-220` sin `AllergyBanner`. R3: `TestDEF51PrescripcionV2CruzaAlergias` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF51PrescripcionV2CruzaAlergias` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | El módulo v2 se construyó en paralelo al v1 sin reutilizar el interceptor de alergias. |
| Acción propuesta | M-23: aplicar `MatchAllergy` en `DispatchTreatment` y en `DispensePrescription`, y mostrar `AllergyBanner` en la vista de tratamiento. |
| Estado | Confirmado (reverificado en R3) |

### DEF-52. Aceptar recetas v2 con cantidades negativas e ítems de inventario no verificados

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF05, RF08 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Seguridad -> Integridad |
| Tipo (IEEE 1044) | Lógica / Datos |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Receta v2 con `inv-risp-3` y `quantity_prescribed = -50`; dispensarla. |
| Resultado esperado / obtenido | Error de validación / receta emitida; al dispensarla el stock pasa de 95 a 145. |
| Evidencia | `treatment_service.go:63-97` no valida que la cantidad sea positiva, que el ítem exista, ni que el nombre y la concentración coincidan con el inventario. El precio unitario lo envía el cliente y los datos del paciente enviados en el cuerpo prevalecen sobre los reales (`:66-77`). Reproducido en memoria. R3: `TestDEF52RecetaV2RechazaCantidadNoPositiva` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF52RecetaV2RechazaCantidadNoPositiva` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | El servicio confía en la entidad recibida del cliente. |
| Acción propuesta | M-24: DTO de entrada y validación contra el inventario y el paciente reales. |
| Estado | Confirmado (reverificado en R3) |

### DEF-53. Dispensar sin verificar el documento del paciente

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF08 |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad; Seguridad operacional |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Receta v2 válida; `POST /api/v2/pharmacy/dispense` sin `patient_document`. |
| Resultado esperado / obtenido | Rechazo / receta dispensada. |
| Evidencia | `pharmacy_service.go:117` solo compara si el documento no viene vacío. R3: `TestDEF53DispensacionExigeDocumentoDelPaciente` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF53DispensacionExigeDocumentoDelPaciente` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | La validación de identidad es opcional. |
| Acción propuesta | M-25: exigir el documento escaneado y compararlo siempre. |
| Estado | Confirmado (reverificado en R3) |

### DEF-54. Dispensar medicamentos vencidos

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF08 |
| Característica ISO 25010:2023 | Seguridad operacional -> Fallo seguro |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Vencer el lote `inv-amox-250` (fecha de ayer) y dispensar una receta con ese ítem. |
| Resultado esperado / obtenido | Rechazo / dispensado. |
| Evidencia | `MarkAsDispensedTx` solo comprueba el stock (`memory_repos.go:1062-1101`; `mysql/prescription_v2_repo.go:267-283`). R3: `TestDEF54NoDispensaMedicamentoVencido` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF54NoDispensaMedicamentoVencido` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | El vencimiento no forma parte de las reglas de dispensación. |
| Acción propuesta | M-26: rechazar lotes vencidos o inactivos en los tres adaptadores. |
| Estado | Confirmado (reverificado en R3) |

### DEF-55. Eliminar físicamente pacientes y sus antecedentes alérgicos

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF01, RF05, RNF04 |
| Característica ISO 25010:2023 | Fiabilidad -> Integridad; Seguridad -> Responsabilidad |
| Tipo (IEEE 1044) | Lógica / Datos |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Admitir un paciente, registrar alergia a PENICILINA, `DELETE /api/v1/patients/:id` (permitido a ADMISION) y readmitirlo con el mismo documento. |
| Resultado esperado / obtenido | Eliminación lógica o rechazo / el paciente readmitido no tiene alergias y el interceptor no alerta. |
| Evidencia | `router.go:82`; `memory_repos.go:340-351` y `mysql/patient_repo.go:164-190` borran en cascada e ignoran los errores (`_, _ =`). En MySQL, el trigger frena el borrado de folios solo si quedó instalado (`seeder.go` lo deja como advertencia). R3: `TestDEF55EliminarPacienteNoPierdeAntecedentesAlergicos` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF55EliminarPacienteNoPierdeAntecedentesAlergicos` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Se implementó un borrado duro para corregir errores de admisión. |
| Acción propuesta | M-27: eliminación lógica con motivo y auditoría; nunca borrar alergias ni historia clínica. |
| Estado | Confirmado (reverificado en R3) |

### DEF-56. Borrar las tablas de prescripción v1 en la migración v2

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | BD |
| Requisito afectado | RF05, RNF04 |
| Característica ISO 25010:2023 | Fiabilidad -> Recuperabilidad; Mantenibilidad -> Modificabilidad |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Aplicar `database/migrations/v2_pharmacy_appointments.sql` sobre una base con prescripciones v1. |
| Resultado esperado / obtenido | Migración no destructiva / `DROP TABLE prescription_items; DROP TABLE prescriptions;` sin condición. |
| Evidencia | `v2_pharmacy_appointments.sql:68-69` borra las tablas aunque el comentario dice «si están vacías»; `:127-136` reinicia el stock con `ON DUPLICATE KEY UPDATE` en cada ejecución. El repositorio v1 sigue usando el esquema anterior (`mysql/prescription_repo.go:29,45`). Verificado por lectura; sin MySQL, la ejecución queda **No medida**. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Migración escrita para una base vacía de desarrollo. |
| Acción propuesta | M-28: migración expandir/contraer, sin `DROP` y con prueba de integración que la aplique dos veces. |
| Estado | Confirmado (reverificado en R3) |

### DEF-57. Asociar notas anatómicas al folio de otro paciente y de otro médico

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF03 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Seguridad -> Integridad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Folio del paciente A (médico M1); `AddAnatomicalNote` con `clinical_record_id` = folio de A, `patient_id` = B y médico M2. |
| Resultado esperado / obtenido | Rechazo / nota aceptada. |
| Evidencia | `clinical_record_service.go:223-231` no compara el paciente ni el autor del folio. En `POST /patients/:id/anatomical-notes` se usa el ID del paciente como ID de folio (`clinical_record_handler.go:276-283`). R3: `TestDEF57NotaAnatomicaCoincideConPacienteDelFolio` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF57NotaAnatomicaCoincideConPacienteDelFolio` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Falta control a nivel de objeto en el módulo nuevo. |
| Acción propuesta | M-29: exigir `record.PatientID == note.PatientID` y que el autor sea el del folio. |
| Estado | Confirmado (reverificado en R3) |

### DEF-58. Reactivar una receta ya dispensada al reenviarla con su ID

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF08 |
| Característica ISO 25010:2023 | Fiabilidad; Seguridad -> Integridad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Emitir y dispensar una receta; reenviar `DispatchTreatment` con el mismo `id`; dispensar de nuevo. |
| Resultado esperado / obtenido | Conflicto / segunda dispensación exitosa. |
| Evidencia | `treatment_service.go:50-58` acepta el `id` del cliente y fuerza PENDING; `memory_repos.go:986-997` sobrescribe sin comprobar. Con `DB_DRIVER=postgres` este es el repositorio activo (DEF-10). R3: `TestDEF58RecetaDispensadaNoSeReactiva` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF58RecetaDispensadaNoSeReactiva` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Identificadores controlados por el cliente. |
| Acción propuesta | M-24: generar el ID en el servidor y rechazar duplicados. |
| Estado | Confirmado (reverificado en R3) |

### DEF-59. Dispensar recetas canceladas y dejar stock negativo en el adaptador en memoria

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF08 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Receta en estado CANCELLED; dispensarla. |
| Resultado esperado / obtenido | `ErrPrescriptionCancelled` / dispensada. |
| Evidencia | `memory_repos.go:1062-1101` no comprueba CANCELLED (MySQL sí: `prescription_v2_repo.go:259`) y valida el stock por ítem, sin acumular ítems repetidos. R3: `TestDEF59NoDispensaRecetaCancelada` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF59NoDispensaRecetaCancelada` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Reglas implementadas solo en un adaptador. |
| Acción propuesta | M-26: llevar las reglas al servicio para que valgan en todos los adaptadores. |
| Estado | Confirmado (reverificado en R3) |

### DEF-60. No extender la alergia a un fármaco concreto a su familia farmacológica

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF05 |
| Característica ISO 25010:2023 | Seguridad operacional -> Identificación de riesgos |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | `MatchAllergy` con alergia AMOXICILINA frente a AMPICILINA, y con CEFTRIAXONA frente a CEFALEXINA. |
| Resultado esperado / obtenido | Conflicto / sin alerta. |
| Evidencia | `core/domain/allergy.go:137-155` calcula la familia solo del fármaco prescrito, nunca del alérgeno. R3: `TestDEF60AlergiaAFarmacoSeExtiendeASuFamilia` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF60AlergiaAFarmacoSeExtiendeASuFamilia` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Modelo de reactividad cruzada unidireccional. |
| Acción propuesta | M-03 (ampliada): calcular la familia también para el alérgeno, con validación clínica de las tablas. |
| Estado | Confirmado (reverificado en R3) |

### DEF-61. Escribir PDF fuera del directorio de documentos (path traversal)

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Integridad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | `GeneratePrescriptionPDF` con `unique_code = "/../../escape-def61"`. |
| Resultado esperado / obtenido | Ruta dentro de `storage/documents` / archivo escrito en el directorio padre. |
| Evidencia | `adapters/pdf/generator.go:172,207` construye el nombre con datos del cliente; `filepath.Join` resuelve `..`. R3: `TestDEF61PDFNoSaleDelDirectorioDeDocumentos` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF61PDFNoSaleDelDirectorioDeDocumentos` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Nombres de archivo sin saneamiento. |
| Acción propuesta | M-30: nombre de archivo derivado de un UUID del servidor y verificación del prefijo. |
| Estado | Confirmado (reverificado en R3) |

### DEF-62. Guardar datos del paciente en claro en disco y en los registros

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend / Infra |
| Requisito afectado | RNF03 (Ley 1581) |
| Característica ISO 25010:2023 | Seguridad -> Confidencialidad |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | Emitir una cita o receta sin SMTP configurado. |
| Resultado esperado / obtenido | Envío o almacenamiento protegido / PDF y correo con nombre, documento, EPS y medicamentos en `storage/documents` y `storage/outbox`, con permisos 0644 y sin purga. |
| Evidencia | `generator.go:24,198-199,245-246` y `smtp.go:53-60` (gosec G301/G306 en [evidencia v2 no conservada]…`). El registro de `pharmacy_service.go:126-133` incluye `patient_document`. El compose no pasa las variables `SMTP_*`. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Bandeja local de depuración usada como mecanismo normal. |
| Acción propuesta | M-31: permisos 0600, cifrado o retención limitada, y registros sin documento del paciente. |
| Estado | Confirmado (reverificado en R3) |

### DEF-63. Aceptar los marcadores de `.env.example` como `JWT_SECRET` y contraseña del administrador

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad |
| Tipo (IEEE 1044) | Configuración |
| Severidad / Prioridad | Alta / P1 |
| Pasos para reproducir | Copiar `.env.example` a `.env` sin editarlo y arrancar. |
| Resultado esperado / obtenido | Arranque bloqueado / arranca con un secreto público de 52 caracteres y crea el ADMIN con la contraseña publicada. |
| Evidencia | `pkg/config/config.go:16-23` no incluía el marcador; `bootstrap.go` solo exigía longitud. Antes y después en [evidencia v2 no conservada]…` y `15-def63-despues.txt`. |
| Reproducción | Regresión permanente en `calidad_defectos_corregidos_v2_regression_test.go` (pasa en la rama). |
| Causa raíz | La lista de secretos publicados no se actualizó al cambiar la plantilla. |
| Acción propuesta | Corregido (commit `fix(DEF-63)`): ambos marcadores se rechazan. Regresión en `calidad_defectos_corregidos_v2_regression_test.go`. R3 amplió la lista al valor de ejemplo del README (`defina_un_secreto_aleatorio_de_32_o_mas`), que se aceptaba como secreto: `TestDEF63EjemploDelREADMENoEsSecretoValido` falla antes y pasa después (`evidencias/r3/33-def63-readme-antes.txt`, `34-def63-readme-despues.txt`). |
| Estado | Corregido en la rama de calidad (pendiente de fusión a main) |

### DEF-64. Generar códigos de receta con poca entropía y buscarlos de forma ambigua

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF08 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Fiabilidad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | Emitir muchas recetas y buscar por código. |
| Resultado esperado / obtenido | Código único / `math/rand` con 90 000 valores por año y búsqueda que devuelve la primera coincidencia. |
| Evidencia | `appointment_service.go:138-141` (gosec G404); `memory_repos.go:1047-1060` y `mysql/prescription_v2_repo.go:219-226`. Verificado por lectura y análisis estático. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Formato de código pensado para que sea legible, sin tener en cuenta las colisiones. |
| Acción propuesta | M-32: `crypto/rand`, restricción UNIQUE y error ante ambigüedad. |
| Estado | Confirmado (reverificado en R3) |

### DEF-65. Romper el triaje y el contacto de pacientes con `DB_DRIVER=postgres`

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | BD |
| Requisito afectado | RF02, RNF05 |
| Característica ISO 25010:2023 | Fiabilidad -> Disponibilidad; Portabilidad -> Adaptabilidad |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | Arrancar con PostgreSQL y registrar un triaje. |
| Resultado esperado / obtenido | Triaje guardado / error por columnas inexistentes. |
| Evidencia | `postgres/triage_repo.go:20-27` inserta `pain_scale_score` y `pain_scale_observations`, que `postgres/schema.sql:70-85` no define; `patients` no tiene `email` ni `address` (`postgres/patient_repo.go:170`). Verificado por lectura; sin PostgreSQL, la ejecución queda **No medida**. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | El esquema embebido de PostgreSQL no se mantuvo junto con el de MySQL. |
| Acción propuesta | M-33: esquema único versionado y prueba de integración por motor. |
| Estado | Confirmado (reverificado en R3) |

### DEF-66. Permitir editar notas anatómicas si falla la consulta del folio y dejar el dolor fuera del hash

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF03 |
| Característica ISO 25010:2023 | Seguridad -> Integridad, No repudio |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Repositorio que falla en `GetByID` y luego `UpdateAnatomicalNote`. |
| Resultado esperado / obtenido | Error / nota actualizada. |
| Evidencia | `clinical_record_service.go:269,300` solo bloquea si `err == nil`; las notas sin folio se pueden editar siempre; la EVA y el mapeo no entran en `CalculateChainedRecordHash`. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Validación que deja pasar la operación cuando no puede comprobar (*fail-open*). |
| Acción propuesta | M-29: comprobación que falle en cerrado e inclusión de los datos clínicos en el hash. |
| Estado | Confirmado (reverificado en R3) |

### DEF-67. Convertir en «sin dolor» una EVA fuera de 0 a 10

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF02 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica / Datos |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Triaje válido con `pain_scale_score = 11`. |
| Resultado esperado / obtenido | Error de validación / se guarda 0. |
| Evidencia | `core/domain/triage.go:93-95`; en folios y notas no hay límite (`clinical_record_service.go:308-323`). R3: `TestDEF67EscalaEVAFueraDeRangoSeRechaza` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF67EscalaEVAFueraDeRangoSeRechaza` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Saneamiento silencioso en lugar de validación. |
| Acción propuesta | M-34: rechazar valores fuera de rango. |
| Estado | Confirmado (reverificado en R3) |

### DEF-68. Borrar el contacto del paciente en una actualización parcial

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF01 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Registrar correo y dirección; `PATCH` solo con el teléfono. |
| Resultado esperado / obtenido | Se conservan / correo y dirección vacíos. |
| Evidencia | `patient_service.go:148-158`, `memory_repos.go:326-338` y `mysql/patient_repo.go:144-162`; sin validación del formato del correo. R3: `TestDEF68ActualizacionParcialConservaContacto` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF68ActualizacionParcialConservaContacto` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | PATCH implementado como reemplazo total. |
| Acción propuesta | M-35: semántica de PATCH con campos opcionales y validación. |
| Estado | Confirmado (reverificado en R3) |

### DEF-69. Agendar citas con condición de carrera y médico erróneo

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF (agenda v2) |
| Característica ISO 25010:2023 | Fiabilidad; Seguridad -> Confidencialidad |
| Tipo (IEEE 1044) | Concurrencia / Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Citas simultáneas al mismo médico y hora; o agendar como ENFERMERO. |
| Resultado esperado / obtenido | Una cita / varias; el médico de la cita es quien la crea. |
| Evidencia | `appointment_service.go:53-60,87-89` (verificar y crear sin bloqueo); `appointment_handler.go:57,82,99`. Cualquier ENFERMERO o ADMIN lee la agenda con datos de pacientes de cualquier médico. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Falta de atomicidad y de control a nivel de objeto. |
| Acción propuesta | M-36: restricción única por médico y franja, y médico explícito validado. |
| Estado | Confirmado (reverificado en R3) |

### DEF-70. Permitir que un médico edite o borre publicaciones de otro

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | Muro de salud (v2) |
| Característica ISO 25010:2023 | Seguridad -> Responsabilidad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | M1 publica; M2 la edita. |
| Resultado esperado / obtenido | `ErrNotRecordOwner` / editada. Un `PUT` sobre un ID inexistente la crea. |
| Evidencia | `health_education_service.go:63-127`. R3: `TestDEF70PublicacionSoloLaEditaSuAutor` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF70PublicacionSoloLaEditaSuAutor` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Sin control de propiedad. |
| Acción propuesta | M-37: comprobar el autor. |
| Estado | Confirmado (reverificado en R3) |

### DEF-71. Dejar sin auditar las lecturas de datos de pacientes en `/api/v2`

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RNF03 (Ley 1581) |
| Característica ISO 25010:2023 | Seguridad -> Responsabilidad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | `GET /api/v2/treatments/:id` autenticado. |
| Resultado esperado / obtenido | Entrada READ en la bitácora / ninguna. |
| Evidencia | `isSensitivePath` (`audit_middleware.go`, final del archivo) solo reconoce `/clinical-records`, `/patients` y `/prescriptions`. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Lista de rutas sensibles sin actualizar. |
| Acción propuesta | M-38: marcar las rutas sensibles en el router. |
| Estado | Confirmado (reverificado en R3) |

### DEF-72. Declarar roles inconsistentes en las rutas nuevas: AUDITOR bloqueado y ADMIN con acceso a recetas

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF07, RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Confidencialidad; Adecuación funcional -> Completitud |
| Tipo (IEEE 1044) | Interfaz |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Token AUDITOR en `GET /api/v1/patients/x/anatomical-notes`; token ADMIN en `GET /api/v2/treatments/x` y `POST /api/v2/pharmacy/dispense`. |
| Resultado esperado / obtenido | Coherencia con la intención declarada y aislamiento de ADMIN / AUDITOR 403 y ADMIN con acceso. |
| Evidencia | `router.go:74-90` (el grupo `/patients` excluye a AUDITOR) y `router.go:166-189`. En v1 ADMIN no tenía acceso a datos clínicos (H12). Matriz completa en [evidencia v2 no conservada]. R3: `TestDEF72AuditorConsultaNotasAnatomicasDelPaciente` sigue fallando por el defecto (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF72AuditorConsultaNotasAnatomicasDelPaciente` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Roles añadidos ruta por ruta sin una matriz de diseño. |
| Acción propuesta | M-39: matriz RBAC de diseño aprobada por el Arquitecto y verificada por la prueba de matriz. |
| Estado | Confirmado (reverificado en R3) |

### DEF-73. Acumular identificadores de *refresh token* sin poda y perder sesiones al reiniciar

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RNF02 |
| Característica ISO 25010:2023 | Eficiencia -> Utilización de recursos; Fiabilidad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Baja / P4 |
| Pasos para reproducir | Rotar miles de veces el *refresh token* de un usuario. |
| Resultado esperado / obtenido | Memoria acotada / `userJTI` crece sin límite. |
| Evidencia | `refresh_token_tracker.go:41,47-73,112-127`; el estado solo vive en memoria y el cierre de sesión no revoca el *access token* vigente. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Registro de tokens en memoria sin limpieza por usuario. |
| Acción propuesta | M-40: podar en cada rotación y persistir la lista de revocación. |
| Estado | Confirmado (reverificado en R3) |

### DEF-74. Fabricar órdenes, diagnósticos, alergias y grupo sanguíneo en las vistas de enfermería

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Frontend |
| Requisito afectado | RF03, RF05 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Seguridad operacional |
| Tipo (IEEE 1044) | Lógica / Datos |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Abrir el resumen de enfermería sin órdenes guardadas. |
| Resultado esperado / obtenido | Solo datos del servidor / a los 3 primeros pacientes reales se les asignan diagnósticos y fármacos inventados; al primero, alergia a «Penicilina, Betalactámicos» y a la vez Amoxicilina + Clavulánico. |
| Evidencia | `NurseSummaryView.jsx:54-111` (alergia en `:67`, amoxicilina en `:83`, «O+» por defecto en `:66`); `NurseChecklistView.jsx:71-79` lo convierte en la tarea «Administrar Amoxicilina». `GET /patients` no trae alergias (`mysql/patient_repo.go:111-140`), así que un alérgico real aparece «Sin alergias». R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Datos de demostración mezclados con datos reales. |
| Acción propuesta | M-41: eliminar las órdenes por defecto y obtener órdenes y alergias del servidor. |
| Estado | Confirmado (reverificado en R3) |

### DEF-75. Registrar la administración de medicación solo en el navegador

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Frontend |
| Requisito afectado | RF03 |
| Característica ISO 25010:2023 | Fiabilidad; Seguridad -> No repudio |
| Tipo (IEEE 1044) | Lógica / Datos |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Marcar una dosis como administrada y abrir la lista en otra estación o turno. |
| Resultado esperado / obtenido | Registro en el servidor y en la HCE / la marca solo existe en `localStorage`. |
| Evidencia | `NurseChecklistView.jsx:142,168-178,240-259` y `TreatmentFollowUpView.jsx:176-206` (que además reemplaza la orden anterior en `:179`). El mensaje dice «guardada en el historial de enfermería». R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Funcionalidad de interfaz sin API de respaldo. |
| Acción propuesta | M-41: API de administración de medicamentos con auditoría. |
| Estado | Confirmado (reverificado en R3) |

### DEF-76. Dejar datos de salud en el navegador tras cerrar sesión y mezclar perfiles

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Frontend |
| Requisito afectado | RNF03 (Ley 1581) |
| Característica ISO 25010:2023 | Seguridad -> Confidencialidad |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | Cerrar sesión en una estación compartida y entrar con otro usuario. |
| Resultado esperado / obtenido | Almacenamiento limpio / quedan órdenes de enfermería con nombres, documentos, diagnósticos y alergias, y el perfil del usuario anterior. |
| Evidencia | `App.jsx:216-226` no borra `saludconecta_nurse_orders` ni `saludconecta_nurse_checklist_*`; `App.jsx:34,47` usa claves globales de perfil y avatar como respaldo. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Claves de almacenamiento sin ámbito por usuario. |
| Acción propuesta | M-42: limpiar todo el almacenamiento clínico al cerrar sesión. |
| Estado | Confirmado (reverificado en R3) |

### DEF-77. Prellenar en farmacia el documento que debería escanearse

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Frontend |
| Requisito afectado | RF08 |
| Característica ISO 25010:2023 | Seguridad -> Autenticidad |
| Tipo (IEEE 1044) | Interfaz |
| Severidad / Prioridad | Alta / P2 |
| Pasos para reproducir | Pulsar «Dispensar» desde el buzón. |
| Resultado esperado / obtenido | El farmacéutico escanea o digita el documento / se rellena con el documento de la propia receta. |
| Evidencia | `PharmacyDashboard.jsx:628-632`; junto con DEF-53, la comparación del servidor siempre coincide. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Atajo de usabilidad que anula el control. |
| Acción propuesta | M-25: no prellenar y exigir el escaneo. |
| Estado | Confirmado (reverificado en R3) |

### DEF-78. Abrir la HCE de otro paciente por coincidencia parcial de nombre

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Frontend |
| Requisito afectado | RF03 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Seguridad operacional |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Buscar «ana» cuando falla la búsqueda por documento. |
| Resultado esperado / obtenido | Lista para confirmar / abre directamente la HCE de «Mariana» (el primero que contiene el texto entre los primeros 200). |
| Evidencia | `App.jsx:238-263`. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Respaldo de búsqueda con navegación automática. |
| Acción propuesta | M-43: mostrar candidatos y exigir confirmación del documento. |
| Estado | Confirmado (reverificado en R3) |

### DEF-79. Registrar «O+» como grupo sanguíneo por defecto en la admisión

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Frontend |
| Requisito afectado | RF01 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Seguridad operacional |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Admitir un paciente sin tocar el campo de grupo sanguíneo. |
| Resultado esperado / obtenido | Campo obligatorio vacío / se guarda O+. |
| Evidencia | `PatientRegisterModal.jsx:24`; `TreatmentFollowUpView.jsx:166` copia «O+» a la orden de enfermería. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Valor por defecto en un dato transfusional. |
| Acción propuesta | M-44: campo vacío y obligatorio. |
| Estado | Confirmado (reverificado en R3) |

### DEF-80. Mostrar pantallas sin control de rol e inferir el rol por el nombre o la especialidad

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Frontend |
| Requisito afectado | RF07 |
| Característica ISO 25010:2023 | Seguridad -> Autorización; Usabilidad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Médico con especialidad «Enfermedades infecciosas». |
| Resultado esperado / obtenido | Menú de MEDICO / se le trata como enfermero. |
| Evidencia | `App.jsx:67-76,162-166,326-411`; `Sidebar.jsx:25-36,52,155`; `MedicalKitScreen.jsx:124-128`. El backend sí aplica `RequireRoles`. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Heurísticas de texto en lugar de `role_name`. |
| Acción propuesta | M-45: usar solo `role_name` del servidor y proteger cada vista. |
| Estado | Confirmado (reverificado en R3) |

### DEF-81. Atribuir órdenes de enfermería a un médico ficticio

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Frontend |
| Requisito afectado | RF03 |
| Característica ISO 25010:2023 | Seguridad -> Responsabilidad |
| Tipo (IEEE 1044) | Datos |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Orden sin nombre de médico. |
| Resultado esperado / obtenido | Error o autor real / «Dr. Santiago Vélez». |
| Evidencia | `clinical.js:150-151` y `TreatmentFollowUpView.jsx:171`. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Valor de respaldo con un nombre real. |
| Acción propuesta | M-45: autor tomado del token. |
| Estado | Confirmado (reverificado en R3) |

### DEF-82. Silenciar errores en vistas nuevas

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Frontend |
| Requisito afectado | RNF02 |
| Característica ISO 25010:2023 | Fiabilidad -> Tolerancia a fallos |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Baja / P4 |
| Pasos para reproducir | Fallo de red al cargar inventario o pacientes. |
| Resultado esperado / obtenido | Mensaje de error / lista vacía sin aviso. |
| Evidencia | `TreatmentFollowUpView.jsx:51,56`, `NurseSummaryView.jsx:123-124`, `NurseChecklistView.jsx:154-155`, `AdminOrgChartView.jsx:69` y `App.jsx:153,255`. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Manejo de errores incompleto. |
| Acción propuesta | M-46: mostrar el error y permitir reintentar. |
| Estado | Confirmado (reverificado en R3) |

### DEF-83. Usar brotli v1.1.0 con vulnerabilidad alcanzable GO-2026-6888

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RNF03 |
| Característica ISO 25010:2023 | Seguridad -> Resistencia; Fiabilidad -> Disponibilidad |
| Tipo (IEEE 1044) | Dependencias |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | `govulncheck ./...` en `src/backend`. |
| Resultado esperado / obtenido | Sin vulnerabilidades alcanzables / GO-2026-6888 (asignación excesiva de memoria al descomprimir) alcanzable. |
| Evidencia | [evidencia v2 no conservada]; dependencia transitiva de Fiber; corregida en brotli v1.2.7. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Dependencia transitiva desactualizada. |
| Acción propuesta | M-47: actualizar la dependencia (`go get github.com/andybalholm/brotli@v1.2.7`) y verificar con govulncheck. Cambia `go.mod`: lo decide el equipo. |
| Estado | Confirmado (reverificado en R3) |

### DEF-84. Importar adaptadores concretos desde el núcleo del dominio

| Campo | Contenido |
|---|---|
| Registrado en | Revisión 2 (7 nov 2026); publicado y reverificado en R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RNF05 (arquitectura hexagonal) |
| Característica ISO 25010:2023 | Mantenibilidad -> Modularidad, Capacidad de prueba |
| Tipo (IEEE 1044) | Diseño |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | `go list -f '{{.Imports}}' ./core/...`. |
| Resultado esperado / obtenido | `core/` sin dependencias de adaptadores / `core/services` importa `adapters/email`, `adapters/pdf` y `pkg/logger`. |
| Evidencia | [evidencia v2 no conservada]; `appointment_service.go` y `treatment_service.go`. En v1, H28 estaba refutada. R3: verificado por lectura; `src/` no cambió entre la base de la v2 (`658472a`) y `origin/main` (`9bacb0a`) (`evidencias/r3/01-cambios-main-desde-v2.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Los servicios nuevos reciben tipos concretos en lugar de puertos. |
| Acción propuesta | M-48: puertos `DocumentGenerator` y `Notifier` en `core/ports` (cambio de arquitectura: decisión del equipo). |
| Estado | Confirmado (reverificado en R3) |

### DEF-85. Interpretar como UTC la hora local de la cita

| Campo | Contenido |
|---|---|
| Registrado en | Revisión R3 (10 nov 2026) |
| Módulo | Backend / Frontend |
| Requisito afectado | RF13 (agendamiento, sección 5 del README) |
| Característica ISO 25010:2023 | Seguridad operacional -> Identificación de riesgos; Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica / Datos |
| Severidad / Prioridad | Crítica / P1 |
| Pasos para reproducir | Un médico agenda en `DoctorAppointmentsView` una cita a las 18:00 (hora de Colombia, UTC-5); el `input datetime-local` envía `2026-11-17T18:00` sin zona. |
| Resultado esperado / obtenido | Cita a las 18:00 de Colombia / se guarda `18:00Z` (13:00 en Colombia): el calendario del médico la muestra a las 13:00, mientras el PDF y el correo dicen 18:00. Las citas de las 5 horas siguientes se rechazan como «pasadas». |
| Evidencia | `appointment_handler.go:45-54` usa `time.Parse` sin zona (UTC); `DoctorAppointmentsView.jsx:468` calcula `min` con `toISOString()` (UTC). `TestDEF85CitaConservaLaHoraLocalDeColombia` lo reproduce: «Hora elegida 2026-11-17 18:00 (Colombia); guardada 2026-11-17T18:00:00Z, es decir 2026-11-17 13:00 en Colombia» (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF85CitaConservaLaHoraLocalDeColombia` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Fechas sin zona horaria en el contrato y en el formulario. |
| Acción propuesta | M-49: enviar la fecha en RFC 3339 con zona desde el cliente y rechazar en el servidor fechas sin zona (o interpretarlas en `America/Bogota` de forma explícita). Cambia el contrato de la API: lo decide el equipo. |
| Estado | Confirmado |

### DEF-86. Extraer el documento del PDF417 con una expresión genérica y compararlo sin normalizar

| Campo | Contenido |
|---|---|
| Registrado en | Revisión R3 (10 nov 2026) |
| Módulo | Frontend / Backend |
| Requisito afectado | RF15 |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Capacidad de interacción -> Protección frente a errores |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Escanear una cédula cuyo PDF417 contiene otra secuencia de 8 a 10 dígitos antes del número de documento, o cuyo documento lleva ceros a la izquierda. |
| Resultado esperado / obtenido | Se extrae el número de documento normalizado / se toma la primera secuencia de 8 a 10 dígitos y el servidor compara la cadena exacta (`0001234567` ≠ `1234567`). |
| Evidencia | `PharmacyDashboard.jsx:164-166` (`/\b\d{8,10}\b/`); `pharmacy_service.go:117` compara cadenas tras `TrimSpace`. El fallo es «cerrado» (rechaza), por lo que no entrega a otro paciente, pero obliga a la contingencia manual, que DEF-77 debilita. Verificado por lectura. |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | No se modeló el formato del PDF417 de la cédula colombiana. |
| Acción propuesta | M-50: parser del formato de la cédula y normalización (solo dígitos, sin ceros a la izquierda) en el servidor. |
| Estado | Confirmado |

### DEF-87. Validar la duración del video con el valor que declara el cliente y aceptar contenido que no es video

| Campo | Contenido |
|---|---|
| Registrado en | Revisión R3 (10 nov 2026) |
| Módulo | Backend / Frontend |
| Requisito afectado | Muro de salud (RF13 de la RTM) |
| Característica ISO 25010:2023 | Seguridad -> Integridad; Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica / Datos |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | `CreatePost` con `video_duration_seconds = -30` y `video_url = data:text/html;base64,...`. |
| Resultado esperado / obtenido | Rechazo / publicación aceptada. Además, el formulario admite videos de hasta 20 MB en base64, pero Fiber limita el cuerpo a 4 MB por defecto. |
| Evidencia | `core/domain/health_education.go:70` solo compara el número declarado; `MedicalKitScreen.jsx:298-316` mide la duración en el navegador y envía el archivo como *data URL*. `TestDEF87MuroNoConfiaEnLaDuracionDeclaradaPorElCliente` lo reproduce (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). React escapa el texto y `<source src>` no ejecuta HTML, así que **no** se reprodujo XSS. |
| Reproducción | Prueba `TestDEF87MuroNoConfiaEnLaDuracionDeclaradaPorElCliente` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | La regla de 120 s se implementó en el cliente y el servidor confía en sus metadatos. |
| Acción propuesta | M-51: subir el video como archivo, validar tipo MIME, tamaño y duración en el servidor (o restringir a URL de YouTube) y alinear el límite de cuerpo. |
| Estado | Confirmado |

### DEF-88. Agendar citas para pacientes inexistentes

| Campo | Contenido |
|---|---|
| Registrado en | Revisión R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF13 (agendamiento) |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección; Fiabilidad -> Integridad |
| Tipo (IEEE 1044) | Lógica |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | `ScheduleAppointment` con `patient_id` que no existe. |
| Resultado esperado / obtenido | 404 o 422 / cita creada con nombre de paciente vacío. |
| Evidencia | `appointment_service.go:62-78` ignora los errores de búsqueda del médico y del paciente. `TestDEF88CitaExigePacienteExistente` lo reproduce (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). |
| Reproducción | Prueba `TestDEF88CitaExigePacienteExistente` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Errores de búsqueda tratados como opcionales. |
| Acción propuesta | M-36 (ampliada): exigir que el paciente exista y que el médico tenga rol MEDICO. |
| Estado | Confirmado |

### DEF-89. Aceptar EVA y coordenadas fuera de rango en notas anatómicas

| Campo | Contenido |
|---|---|
| Registrado en | Revisión R3 (10 nov 2026) |
| Módulo | Backend |
| Requisito afectado | RF13 de la RTM (kit médico) |
| Característica ISO 25010:2023 | Adecuación funcional -> Corrección |
| Tipo (IEEE 1044) | Lógica / Datos |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | `AddAnatomicalNote` con EVA −1 y 11 y coordenadas (−5000, 99999). |
| Resultado esperado / obtenido | Rechazo / notas guardadas. |
| Evidencia | `clinical_record_service.go:209-244` no valida `PainLevel` ni coordenadas. `TestDEF89NotaAnatomicaRechazaEVAFueraDeRango` lo reproduce; 0 y 10 son valores válidos (`evidencias/r3/30-defectos-abiertos-reproduccion.txt`). Complementa DEF-67, que cubre el triaje. |
| Reproducción | Prueba `TestDEF89NotaAnatomicaRechazaEVAFueraDeRango` (falla mientras el defecto exista; ver `defectos-abiertos.txt`). |
| Causa raíz | Validación de dominio ausente en la entidad nueva. |
| Acción propuesta | M-34 (ampliada): `Validate()` en `ClinicalAnatomicalNote`. |
| Estado | Confirmado |

### DEF-90. Probar una copia del modal de alergias en lugar del componente real

| Campo | Contenido |
|---|---|
| Registrado en | Revisión R3 (10 nov 2026) |
| Módulo | Pruebas |
| Requisito afectado | RF05, RF09 |
| Característica ISO 25010:2023 | Mantenibilidad -> Capacidad de ser probado |
| Tipo (IEEE 1044) | Lógica de prueba |
| Severidad / Prioridad | Media / P2 |
| Pasos para reproducir | Leer `tests/frontend/AllergyAlertModal.test.jsx`. |
| Resultado esperado / obtenido | La prueba importa `src/frontend/src/components/AllergyAlertModal.jsx` / define su propio componente en las líneas 5-40 y comprueba sus clases. |
| Evidencia | El archivo declara «Simulación del componente AllergyAlertModal». El componente real solo lo usa `PrescriptionScreen`, que la interfaz no muestra (DEF-51). Tampoco mide contraste: solo busca `bg-red-50` y `border-red-600`. Medición propia del componente real: 14,76:1 en el texto principal, pero 6,47:1 en el dato de severidad (`text-red-700`), que no llega a AAA (`evidencias/r3/44-contraste-modal-alergias.txt`). |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Prueba escrita sobre una especificación y no sobre el código. |
| Acción propuesta | M-52 (propuesta al Responsable de Pruebas): importar el componente real y medir el contraste con axe-core. |
| Estado | Confirmado |

### DEF-91. Publicar un dictamen «Aprobado 100 % conforme a ISO/IEC 25010» y una RTM al 100 % sin evidencia que los sostenga

| Campo | Contenido |
|---|---|
| Registrado en | Revisión R3 (10 nov 2026) |
| Módulo | Documentación |
| Requisito afectado | RNF03; todos los RF |
| Característica ISO 25010:2023 | Mantenibilidad -> Analizabilidad; Seguridad -> Responsabilidad |
| Tipo (IEEE 1044) | Documentación |
| Severidad / Prioridad | Alta / P1 |
| Pasos para reproducir | Comparar la tarjeta «Certificación de Calidad», el README (secciones 4.5, 4.7 y 14.1) y la evidencia de R3. |
| Resultado esperado / obtenido | Dictamen y RTM coherentes con la evidencia / «Aprobado 100 %» y «100 % de RF01 a RF12 y RNF01 a RNF08» con 18 defectos críticos abiertos en `main`. |
| Evidencia | La RTM cita pruebas que existen (18 de 21 filas, `evidencias/r3/50-rtm-verificacion.txt`), pero solo 5 de 21 requisitos se sostienen sin un defecto abierto que los contradiga. El README define RF01 a RF16 y la RTM omite RF14 a RF16 y llama RF13 a otro requisito. La cifra p95 de 28,4 ms no tiene comando de origen. El endpoint `/health` responde `"iso_quality": "ISO/IEC 25010 Evaluated"`. |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | La certificación la emitió el rol de Pruebas sin la evaluación del rol de Calidad. |
| Acción propuesta | M-53: retirar el dictamen de conformidad hasta cerrar los Críticos; la RTM debe enlazar pruebas que fallarían si el requisito se incumple. |
| Estado | Confirmado |

### DEF-92. Reutilizar los identificadores DEF-01 a DEF-04 y crear identificadores SEC-* paralelos con referencias a archivos inexistentes

| Campo | Contenido |
|---|---|
| Registrado en | Revisión R3 (10 nov 2026) |
| Módulo | Documentación |
| Requisito afectado | RNF02 |
| Característica ISO 25010:2023 | Mantenibilidad -> Analizabilidad |
| Tipo (IEEE 1044) | Documentación |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Comparar la sección 14.3 del README con `docs/informe-calidad.md` y la bitácora. |
| Resultado esperado / obtenido | Un identificador por defecto / DEF-02 y DEF-03 tienen dos significados; 25 defectos de la bitácora tienen además un ID SEC-*. |
| Evidencia | README 14.3: DEF-02 pasa de «latencia de alergias» a «carrera en auditoría» y DEF-03 de «pánico en auditoría» a «pool MySQL»; cita `adapters/http/middleware/audit.go` y `mysql/db.go`, que no existen; afirma `append([]byte(nil), c.Body()...)` (no está en el código) y timeouts de 3 s en todos los repositorios SQL (no hay `context.WithTimeout` en `adapters/storage/mysql`). Mapa completo en `mapa-ids-sec-def.md`. |
| Reproducción | Sin prueba automatizada: verificado por lectura de código o análisis estático. |
| Causa raíz | Dos registros de defectos sin un responsable único. |
| Acción propuesta | M-54: una sola bitácora (la de Calidad) y tabla de equivalencias SEC -> DEF en el README. |
| Estado | Confirmado |

---

## 4. Métricas de la bitácora

Universo: 44 defectos nuevos (DEF-05 a DEF-48). Tamaño del código productivo: 14,779 KLOC (`anexos/linea-base.md`, A.2).

### 4.1 Por severidad

| Severidad | Cantidad | % |
|---|---|---|
| Crítica | 7 | 15,9 % |
| Alta | 16 | 36,4 % |
| Media | 15 | 34,1 % |
| Baja | 6 | 13,6 % |
| **Total** | **44** | 100 % |

### 4.2 Por módulo (módulo principal)

| Módulo | Cantidad | Defectos |
|---|---|---|
| Backend | 23 | 05, 06, 07, 08, 09, 10, 12, 13, 14, 16, 17, 18, 24, 26, 27, 28, 29, 30, 31, 37, 38, 41, 46 |
| Backend / Infra | 2 | 15, 32 |
| Frontend | 7 | 21, 22, 23, 33, 36, 45, 47 |
| BD | 5 | 11, 19, 20, 25, 42 |
| Infra | 2 | 34, 35 |
| Documentación / datos | 2 | 39, 43 |
| Pruebas | 2 | 40, 48 |
| Backend / Frontend | 1 | 44 |
| **Total** | **44** | |

### 4.3 Por característica ISO/IEC 25010:2023

Se cuenta la característica principal, que es la primera indicada en cada ficha.

| Característica | Cantidad | Defectos |
|---|---|---|
| Seguridad | 25 | 07, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 25, 28, 29, 30, 31, 33, 34, 35, 41, 42, 43, 45, 47 |
| Adecuación funcional | 5 | 21, 23, 26, 27, 38 |
| Fiabilidad | 5 | 10, 19, 32, 37, 46 |
| Seguridad operacional (*Safety*) | 4 | 05, 06, 08, 09 |
| Mantenibilidad | 4 | 39, 40, 44, 48 |
| Capacidad de interacción | 1 | 36 |
| Eficiencia de desempeño, Compatibilidad, Flexibilidad | 0 | — (Flexibilidad aparece como secundaria en DEF-25) |
| **Total** | **44** | |

Si se cuenta también la característica secundaria, la Seguridad operacional (*Safety*) afecta a 8 defectos: 05, 06, 07, 08, 09, 10, 21 y 27. Seis de los siete defectos Críticos tienen impacto directo de *Safety*; la excepción es DEF-11, cuyo impacto es de autenticidad.

### 4.4 Indicadores

| Indicador | Fórmula | Valor |
|---|---|---|
| Densidad de defectos nuevos | 44 / 14,779 KLOC | **2,98 defectos/KLOC** |
| Densidad total (incluye DEF-01 a DEF-04) | 48 / 14,779 | 3,25 defectos/KLOC |
| Densidad de Crítica + Alta | 23 / 14,779 | 1,56 defectos/KLOC |
| Defectos corregidos en esta rama | 8 de 44 | 18,2 % (DEF-05, 08 parcial, 12, 27, 28, 41, 46, 47) |
| Defectos con prueba que los reproduce | 21 de 44 | 47,7 % (11 abiertos reproducidos en local, DEF-37 y DEF-48 en CI, 8 corregidos) |
| Defectos detectados por el pipeline de CI | 3 | DEF-46, DEF-47 y DEF-48, más la confirmación de DEF-37 |
| Correcciones históricas verificadas como completas | 1 de 4 | DEF-04 (DEF-01, 02 y 03 parciales) |

---

## 5. Métricas R3 (10 nov 2026)

Fuente única: `anexos/cifras-r3.json`, generado por `anexos/generar_bitacora_r3.py`. Universo: 92 defectos registrados (DEF-01 a DEF-92). Código productivo: 30,157 KLOC (`src/`, Go + JSX + JS sin pruebas, `evidencias/r3/01b-inventario.txt`).

### 5.1 Verificación R3 de DEF-01 a DEF-48

| Veredicto | Cantidad | Defectos |
|---|---|---|
| Verificado — corregido | 27 | 01, 04, 05, 06, 07, 08, 09, 11, 12, 13, 14, 16, 17, 18, 19, 20, 23, 24, 26, 27, 31, 34, 37, 42, 46, 47, 48 |
| Corregido parcialmente | 8 | 02, 10, 15, 21, 22, 33, 38, 40 |
| Sigue abierto | 12 | 03, 28, 29, 30, 32, 35, 36, 39, 41, 43, 44, 45 |
| Corrección presente; ejecución No medida | 1 | 25 |
| Regresión | 0 | — |
| Ya no aplica | 0 | — |
| **Total** | **48** | |

### 5.2 Defectos abiertos en `main` por severidad

Ámbito DEF-05 a DEF-92 (los históricos DEF-02 y DEF-03, también abiertos, no tienen severidad vigente). Incluye los «Sigue abierto», los «Corregido parcialmente», DEF-49 a DEF-92 y las tres correcciones de Calidad aún no fusionadas (DEF-28, DEF-41, DEF-63). Total: **62**; densidad 2,06 defectos abiertos/KLOC.

| Severidad | Abiertos |
|---|---|
| Crítica | 18 |
| Alta | 9 |
| Media | 28 |
| Baja | 7 |

### 5.3 Defectos nuevos de R3 (DEF-85 a DEF-92)

| Crítica | Alta | Media | Baja | Total |
|---|---|---|---|---|
| 1 | 1 | 6 | 0 | 8 |

Los 36 defectos DEF-49 a DEF-84 se registraron en la revisión 2 (7 nov 2026), que no llegó a publicarse; R3 los reverificó y los publica.
