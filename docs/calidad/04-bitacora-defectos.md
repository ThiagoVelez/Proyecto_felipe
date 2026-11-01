# 04. Bitácora de defectos

- **Responsable:** Juan José Sánchez (Responsable de Calidad).
- **Base auditada:** commit `6492f07`. Salvo indicación, las líneas citadas corresponden a ese commit.
- **Ciclo de vida:** `Nuevo -> Confirmado -> En corrección -> En verificación -> Cerrado` / `Rechazado` (ver `01-plan-aseguramiento-calidad.md`, sección 6).
- **Severidad** = impacto técnico; **prioridad** = urgencia de corrección (P1 inmediata … P4 cuando haya capacidad). Por definición del plan, todo defecto que pueda causar daño a un paciente es **Crítica**.
- **Reproducción automatizada:** los defectos marcados con «prueba abierta» tienen una prueba en `tests/backend/calidad_defectos_abiertos_regression_test.go` que afirma el comportamiento correcto y por eso **falla mientras el defecto exista**. Se ejecuta con:

```bash
cd tests/backend && CALIDAD_DEFECTOS_ABIERTOS=1 go test -count=1 -v -run TestDEF ./...
```

Salida registrada: `anexos/evidencias/43-defectos-abiertos.txt` (11 fallos reproducidos; DEF-37 requiere `-race`).

---

## 1. Defectos históricos DEF-01 a DEF-04 (contenido original conservado)

El contenido de las columnas originales se transcribe sin cambios desde `docs/informe-calidad.md` (versión `6492f07`). La columna nueva registra la verificación de la corrección contra el código.

| ID | Módulo | Severidad | Descripción | Causa raíz | Estrategia de solución | Verificación de la corrección |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | HCE / Persistencia | **Critica** | Posibilidad de bypass de modificacion en folios medicos que ya habian sido cerrados y firmados. | La comprobacion residia unicamente en la capa de aplicacion; llamadas directas o scripts SQL podian actualizar la fila en `clinical_records`. | Implementacion de doble barrera: guardia booleana en capa de dominio y creacion de `TRIGGER trg_prevent_update_closed_record` en MySQL/Postgres que emite `SIGNAL SQLSTATE '45000'` impidiendo cualquier mutacion. | **Parcial.** El trigger de MySQL existe (`schema.sql:233-242`, más `trg_prevent_delete_clinical_record` en `:245`). **No existe** script ni trigger para PostgreSQL. La guardia de dominio `CanModify()` (`core/domain/clinical_record.go:50`) no se invoca en ningún punto del código (búsqueda `grep -rn CanModify`: solo la definición). La protección efectiva en aplicación es la cláusula `WHERE ... is_closed = FALSE` de `mysql/clinical_record_repo.go:152`. `clinical_record_clarifications` no tiene protección. Ver DEF-25 y DEF-07. |
| **DEF-02** | Farmacia / Prescripcion | **Alta** | Latencia superior a 600 ms al validar antecedentes alergicos de pacientes con multiples atenciones previas. | Busqueda secuencial completa en la tabla `patient_allergies` sin indices sobre el principio activo y el paciente. | Creacion del indice relacional compuesto `INDEX idx_patient_allergies (patient_id, active_ingredient)` en el esquema DDL y cacheo en memoria de la lista de alergias del paciente durante el ciclo de vida del servicio. | **Parcial.** El índice existe (`schema.sql:69`). La caché en memoria **no se encontró**: `grep -rni cache src/backend` no devuelve resultados y `prescription_service.go:43` consulta las alergias en cada prescripción. Al no existir caché, el riesgo de alergia obsoleta planteado en H21 no aplica. La latencia original de 600 ms y su mejora no tienen medición registrada; la medición de esta auditoría (memoria, en proceso) da p95 de 1,91–2,22 ms en la intercepción (`evidencias/74-rendimiento-corrida*.txt`). |
| **DEF-03** | Auditoria / HTTP | **Media** | Panico intermitente en goroutines de registro de auditoria (`runtime error: invalid memory address or nil pointer dereference`). | GoFiber reutiliza los contextos `fiber.Ctx` y buffers subyacentes de `fasthttp` una vez que la peticion HTTP finaliza. La goroutine asincrona leia punteros reciclados. | Aislamiento y clonacion profunda de los datos primitivos de auditoria (`correlationID`, `userID`, `path`, `ip`) antes del despacho de la goroutine, eliminando condiciones de carrera y dependencias del ciclo de vida del contexto web. | **Parcial.** La goroutine ya no recibe `fiber.Ctx` (`audit_middleware.go:82-84`), pero la «clonación profunda» no existía: `c.Path()` y el `X-Correlation-ID` se asignaban sin copiar y apuntaban a búferes reutilizados. La prueba `TestDEF28…` demostró 18 de 20 entradas corrompidas (`evidencias/55-def28-def41-antes.txt`). Corregido en esta rama como **DEF-28**. `go test -race`: **No medido** en local (sin cgo); se ejecuta en el pipeline. |
| **DEF-04** | Triaje de Urgencias | **Media** | Registro indebido de valores fuera de escala en la variable Glasgow (ej. puntuaciones de 0 o 18 ingresadas por digitacion manual erratica). | La entidad `TriageRecord` carecia de una validacion de invariantes en su metodo de creacion en el dominio. | Incorporacion del metodo `Validate()` en la entidad de dominio `TriageRecord` que verifica que la puntuacion de Glasgow este estrictamente en el intervalo cerrado $[3, 15]$, retornando `ErrInvalidGlasgowScore`. | **Confirmada.** `core/domain/triage.go:56-58` y `triage_service.go:26`. Límites verificados: 16 en `tests/backend/triage_test.go:25`; 2, 3 y 15 en `TestH23LimitesGlasgowNoCubiertos` (`evidencias/75-h23-limites.txt`). |

---

## 2. Resumen de defectos nuevos

| ID | Título | Módulo | Severidad | Prioridad | Estado |
|---|---|---|---|---|---|
| DEF-05 | Permitir prescripción contraindicada indicando un `patient_id` distinto al del folio | Backend | Crítica | P1 | En verificación (corregido en rama) |
| DEF-06 | Omitir la reactividad cruzada y las variantes de escritura en el cruce de alergias | Backend | Crítica | P1 | Confirmado |
| DEF-07 | Sobrescribir folios cerrados al reenviar un lote de sincronización (adaptador en memoria) | Backend | Crítica | P1 | Confirmado |
| DEF-08 | Aceptar niveles Manchester arbitrarios enviados por el cliente | Backend | Crítica | P1 | En verificación (corrección parcial) |
| DEF-09 | Clasificar la hipotermia severa como Nivel V (no urgente) | Backend | Crítica | P1 | Confirmado |
| DEF-10 | Conmutar en silencio a almacenamiento en memoria cuando falla MySQL | Backend | Crítica | P1 | Confirmado |
| DEF-11 | Sembrar en cada arranque una cuenta médica con contraseña y secreto TOTP publicados | BD | Crítica | P1 | Confirmado |
| DEF-12 | Arrancar con un `JWT_SECRET` por defecto publicado en el código | Backend | Alta | P1 | En verificación (corregido en rama) |
| DEF-13 | Mantener vigentes los tokens de usuarios desactivados | Backend | Alta | P1 | Confirmado |
| DEF-14 | Deshabilitar el MFA mediante `/auth/mfa/setup` sin verificar el factor actual | Backend | Alta | P2 | Confirmado |
| DEF-15 | Permitir fuerza bruta en login y TOTP; limitar por la IP del proxy | Backend / Infra | Alta | P2 | Confirmado |
| DEF-16 | Bifurcar la cadena de hashes al cerrar folios concurrentes del mismo paciente | Backend | Alta | P2 | Confirmado |
| DEF-17 | Permitir que un médico cierre y firme el folio de otro | Backend | Alta | P2 | Confirmado |
| DEF-18 | Aceptar autoría y hash previo declarados por el cliente en la sincronización | Backend | Alta | P1 | Confirmado |
| DEF-19 | Abortar el lote completo en MySQL al reenviar un folio cerrado | BD | Alta | P2 | Nuevo (análisis) |
| DEF-20 | Invalidar la verificación de integridad por el redondeo de `closed_at` en MySQL | BD | Alta | P2 | Nuevo (análisis) |
| DEF-21 | Presentar pantallas clínicas desconectadas del backend con datos y hash simulados | Frontend | Alta | P1 | Confirmado |
| DEF-22 | Mostrar éxito falso y bitácora fabricada en el panel de administración | Frontend | Alta | P1 | Confirmado |
| DEF-23 | Bloquear en el cliente códigos TOTP válidos al validarlos contra un secreto fijo | Frontend | Alta | P2 | Confirmado |
| DEF-24 | Usar Fiber v2.52.5 con vulnerabilidad alcanzable GO-2025-3845 | Backend | Alta | P2 | Confirmado |
| DEF-25 | Omitir triggers en PostgreSQL y en aclaraciones; guardia de dominio sin uso | BD | Alta | P2 | Confirmado |
| DEF-26 | Carecer de API de admisión de pacientes y alergias (rol ADMISION sin rutas) | Backend | Alta | P2 | Confirmado |
| DEF-27 | Aceptar frecuencia cardíaca superior a 300 lpm | Backend | Media | P3 | En verificación (corregido en rama) |
| DEF-28 | Corromper la bitácora de auditoría por cadenas no copiadas del contexto Fiber | Backend | Media | P2 | En verificación (corregido en rama) |
| DEF-29 | Producir colisiones de hash por separador `|` sin escapar | Backend | Media | P3 | Confirmado |
| DEF-30 | Verificar la integridad sin validar el enlace con el folio anterior | Backend | Media | P2 | Confirmado |
| DEF-31 | Revelar cuentas inactivas antes de validar la contraseña | Backend | Media | P3 | Confirmado |
| DEF-32 | Responder el healthcheck sin verificar la base de datos | Backend / Infra | Media | P3 | Confirmado |
| DEF-33 | Restaurar la sesión desde `localStorage` sin revalidar; cifrado declarado inexistente | Frontend | Media | P3 | Confirmado |
| DEF-34 | Exponer MySQL y el backend al host con credenciales en texto plano | Infra | Media | P2 | Confirmado |
| DEF-35 | Omitir CSP y HSTS y perder cabeceras de seguridad en activos estáticos | Infra | Media | P3 | Confirmado |
| DEF-36 | Incumplir el contraste WCAG AAA declarado en los banners de perfil | Frontend | Media | P3 | Confirmado |
| DEF-37 | Escribir bajo `RLock` en `ClinicalRecordMemoryRepo.GetByID` | Backend | Media | P3 | Nuevo (requiere `-race`) |
| DEF-38 | Ignorar errores del descuento de inventario y validar stock sin atomicidad | Backend | Media | P3 | Confirmado |
| DEF-39 | Publicar documentación inconsistente y cifras no medidas | Documentación | Media | P2 | En corrección (parcial en rama) |
| DEF-40 | Mantener pruebas que pasan de forma trivial y cobertura frontend no ejecutable | Pruebas | Media | P2 | Confirmado |
| DEF-41 | Aceptar `X-Correlation-ID` arbitrario del cliente | Backend | Baja | P4 | En verificación (corregido en rama) |
| DEF-42 | Usar coste Bcrypt 10 en el seeder de MySQL | BD | Baja | P4 | Confirmado |
| DEF-43 | Usar datos personales de apariencia real en semillas y simulaciones | Documentación / Datos | Baja | P3 | Confirmado |
| DEF-44 | Acumular deuda técnica estática (errcheck, complejidad, duplicación, archivos grandes) | Backend / Frontend | Baja | P4 | Confirmado |
| DEF-45 | Mantener vulnerabilidades en dependencias de desarrollo JS | Frontend | Baja | P4 | Confirmado |

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
| Evidencia | Análisis de código. **No reproducido:** MySQL no disponible en el entorno del agente. |
| Causa raíz | La idempotencia se implementó con un `UPDATE` que el trigger de inmutabilidad prohíbe. |
| Acción propuesta | M-04 (misma acción que DEF-07): `INSERT IGNORE` o comprobación previa de existencia e igualdad. |
| Estado | Nuevo (pendiente de reproducir con MySQL en CI o en Docker). |

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
| Evidencia | `crypto.go:56-68` concatena con `|` y aplica `TrimSpace`, que además hace que los espacios finales no queden protegidos. Prueba abierta `TestDEF29…`. H16 (determinismo): el orden de campos y el formato de fecha UTC son fijos, así que el hash **es reproducible**; el defecto es de unicidad, no de determinismo. |
| Causa raíz | Serialización ambigua. |
| Acción propuesta | M-25: serialización canónica con longitud prefijada o JSON canónico, con versión de algoritmo (`hash_version`) para no invalidar los folios ya sellados. |
| Estado | Confirmado. |

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

### DEF-37. Escribir bajo `RLock` en `ClinicalRecordMemoryRepo.GetByID`

| Campo | Contenido |
|---|---|
| Módulo | Backend |
| Requisito afectado | RNF05 |
| Característica ISO 25010:2023 | Fiabilidad -> Madurez |
| Tipo (IEEE 1044) | Lógica (concurrencia) |
| Severidad / Prioridad | Media / P3 |
| Pasos para reproducir | Lecturas concurrentes de un folio con aclaraciones bajo `go test -race`. |
| Resultado esperado / obtenido | Sin carreras / Por análisis, carrera de datos: `rec.Clarifications = clar` (`memory_repos.go:368`) escribe en el registro compartido con un candado de lectura; además, `GetByID` devuelve el puntero interno, de modo que el llamador puede mutar el almacén. |
| Evidencia | Prueba abierta `TestDEF37…`, que solo detecta el defecto con `-race`. **No verificado** en local (sin cgo); el job `backend-defectos-abiertos` de `calidad.yml` la ejecuta con `-race`. |
| Causa raíz | Mutación dentro de una lectura. |
| Acción propuesta | M-33: devolver una copia y adjuntar las aclaraciones a la copia. |
| Estado | Nuevo (pendiente de confirmar en CI). |

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

---

## 4. Métricas de la bitácora

Universo: 41 defectos nuevos (DEF-05 a DEF-45). Tamaño del código productivo: 14,779 KLOC (`anexos/linea-base.md`, A.2).

### 4.1 Por severidad

| Severidad | Cantidad | % |
|---|---|---|
| Crítica | 7 | 17,1 % |
| Alta | 15 | 36,6 % |
| Media | 14 | 34,1 % |
| Baja | 5 | 12,2 % |
| **Total** | **41** | 100 % |

### 4.2 Por módulo (módulo principal)

| Módulo | Cantidad | Defectos |
|---|---|---|
| Backend | 22 | 05, 06, 07, 08, 09, 10, 12, 13, 14, 16, 17, 18, 24, 26, 27, 28, 29, 30, 31, 37, 38, 41 |
| Backend / Infra | 2 | 15, 32 |
| Frontend | 6 | 21, 22, 23, 33, 36, 45 |
| BD | 5 | 11, 19, 20, 25, 42 |
| Infra | 2 | 34, 35 |
| Documentación / datos | 2 | 39, 43 |
| Pruebas | 1 | 40 |
| Backend / Frontend | 1 | 44 |
| **Total** | **41** | |

### 4.3 Por característica ISO/IEC 25010:2023

Se cuenta la característica principal, que es la primera indicada en cada ficha.

| Característica | Cantidad | Defectos |
|---|---|---|
| Seguridad | 24 | 07, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 25, 28, 29, 30, 31, 33, 34, 35, 41, 42, 43, 45 |
| Adecuación funcional | 5 | 21, 23, 26, 27, 38 |
| Seguridad operacional (*Safety*) | 4 | 05, 06, 08, 09 |
| Fiabilidad | 4 | 10, 19, 32, 37 |
| Mantenibilidad | 3 | 39, 40, 44 |
| Capacidad de interacción | 1 | 36 |
| Eficiencia de desempeño, Compatibilidad, Flexibilidad | 0 | — (Flexibilidad aparece como secundaria en DEF-25) |
| **Total** | **41** | |

Si se cuenta también la característica secundaria, la Seguridad operacional (*Safety*) afecta a 8 defectos: 05, 06, 07, 08, 09, 10, 21 y 27. Seis de los siete defectos Críticos tienen impacto directo de *Safety*; la excepción es DEF-11, cuyo impacto es de autenticidad.

### 4.4 Indicadores

| Indicador | Fórmula | Valor |
|---|---|---|
| Densidad de defectos nuevos | 41 / 14,779 KLOC | **2,77 defectos/KLOC** |
| Densidad total (incluye DEF-01 a DEF-04) | 45 / 14,779 | 3,04 defectos/KLOC |
| Densidad de Crítica + Alta | 22 / 14,779 | 1,49 defectos/KLOC |
| Defectos corregidos en esta rama | 6 de 41 | 14,6 % (DEF-05, 08 parcial, 12, 27, 28, 41) |
| Defectos con prueba que los reproduce | 17 de 41 | 41,5 % (11 abiertos + 6 corregidos) |
| Correcciones históricas verificadas como completas | 1 de 4 | DEF-04 (DEF-01, 02 y 03 parciales) |
