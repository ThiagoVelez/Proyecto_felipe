# Anexo C. Matriz RBAC ruta x rol (H12)

## C.1 Método

- Se enumeraron las 24 rutas de `src/backend/adapters/http/router.go:24-78`: 2 públicas (`GET /health` y `POST /auth/login`) y 22 protegidas por JWT.
- La prueba `tests/backend/rbac_matrix_regression_test.go` monta el router real con el adaptador en memoria, firma un token por rol con `crypto.GenerateJWT` y ejecuta cada ruta. La tabla siguiente es la salida literal de esa prueba (`CALIDAD_MATRIZ_SALIDA`, evidencia `evidencias/42-matriz-rbac.txt`). Para `mfa/setup` y `mfa/enable` se omite `/api/v1` en la primera columna por brevedad.
- **Criterio:** 401 indica rechazo por autenticación y 403 rechazo por RBAC. Cualquier otro código (200, 400, 404, 422, 500) indica que la petición superó ambos controles y llegó al handler, que respondió según el cuerpo vacío o el identificador ficticio `x`.
- La prueba falla si el resultado real difiere del esperado; queda en el pipeline como regresión.

## C.2 Resultado (códigos HTTP reales)

| Método | Ruta | ADMIN | MEDICO | ENFERMERO | ADMISION | AUDITOR | Sin token |
|---|---|---|---|---|---|---|---|
| POST | `/auth/mfa/setup` | 500 | 500 | 500 | 500 | 500 | 401 |
| POST | `/auth/mfa/enable` | 400 | 400 | 400 | 400 | 400 | 401 |
| GET | `/admin/users` | 200 | 403 | 403 | 403 | 403 | 401 |
| POST | `/admin/users` | 400 | 403 | 403 | 403 | 403 | 401 |
| PATCH | `/admin/users/x/status` | 404 | 403 | 403 | 403 | 403 | 401 |
| GET | `/admin/audit-logs` | 200 | 403 | 403 | 403 | 403 | 401 |
| POST | `/triage/` | 403 | 422 | 422 | 403 | 403 | 401 |
| GET | `/triage/` | 403 | 200 | 200 | 403 | 403 | 401 |
| GET | `/triage/x` | 403 | 404 | 404 | 403 | 403 | 401 |
| PATCH | `/triage/x/status` | 403 | 400 | 400 | 403 | 403 | 401 |
| POST | `/clinical-records/` | 403 | 400 | 403 | 403 | 403 | 401 |
| POST | `/clinical-records/x/close` | 403 | 400 | 403 | 403 | 403 | 401 |
| POST | `/clinical-records/x/clarifications` | 403 | 400 | 403 | 403 | 403 | 401 |
| GET | `/clinical-records/x` | 403 | 404 | 403 | 403 | 403 | 401 |
| GET | `/clinical-records/patient/x` | 403 | 200 | 403 | 403 | 403 | 401 |
| GET | `/clinical-records/x/verify` | 403 | 500 | 403 | 403 | 500 | 401 |
| GET | `/clinical-records/x/rips` | 403 | 404 | 403 | 403 | 404 | 401 |
| GET | `/clinical-records/x/fhir` | 403 | 404 | 403 | 403 | 404 | 401 |
| POST | `/prescriptions/` | 403 | 400 | 403 | 403 | 403 | 401 |
| GET | `/prescriptions/x` | 403 | 404 | 403 | 403 | 403 | 401 |
| GET | `/prescriptions/record/x` | 403 | 404 | 403 | 403 | 403 | 401 |
| POST | `/sync/batch` | 403 | 400 | 403 | 403 | 403 | 401 |

## C.3 Conclusiones

1. **Esperado = real en las 110 combinaciones ruta x rol y en las 22 peticiones sin token.** Las 16 rutas clínicas niegan ADMIN con 403. La parte de H12 sobre el aislamiento del ADMIN queda **refutada como defecto**.
2. **Proporción de rutas protegidas por RBAC:** 20 de 22 rutas protegidas exigen rol explícito (90,9 %); las 2 restantes (`/auth/mfa/*`) son, con razón, para cualquier usuario autenticado.
3. **El rol ADMISION no tiene ninguna ruta.** No existe API para registrar pacientes ni alergias (los repositorios lo permiten, pero ningún handler lo expone). Se registra en **DEF-26**.
4. **El JWT se acepta sin consultar al usuario.** Los tokens de la prueba pertenecen a usuarios inexistentes (`usr-rbac-medico`, …) y aun así obtienen 200 en `GET /clinical-records/patient/x`. El middleware (`auth_middleware.go:29-39`) confía solo en la firma y la expiración. Es la causa raíz de **DEF-13** (los usuarios desactivados conservan acceso).
5. **Errores de mapeo.** `GET /clinical-records/x/verify` devuelve 500 para un folio inexistente (debería ser 404), y `POST /auth/mfa/setup` devuelve 500 para un usuario inexistente. No filtran detalles internos; se agrupan en DEF-44.
6. **Lo que la matriz no cubre:** solo verifica el control por rol, no la propiedad del recurso. DEF-17 (un médico cierra el folio de otro) demuestra que no hay control a nivel de objeto (ASVS V4.2.1).


---

## C.R3 Actualización R3 (10 nov 2026, H34)

### C.R3.1 Método

- `router.go` registra **70 rutas** (`origin/main` `9bacb0a`; comparación automática en `informe-revision-r3.md`, H34): 6 públicas y 64 protegidas por JWT.
- La prueba `TestRBACMatrizRutasPorRol` (ampliada en la revisión 2 con el rol FARMACIA y las rutas `/api/v2`) ejecuta **55 rutas** con un token por rol contra el router real. Salida literal: `evidencias/r3/45-matriz-rbac.txt` (`CALIDAD_MATRIZ_SALIDA=… go test -run TestRBACMatrizRutasPorRol`). La prueba pasa: la política efectiva coincide con la registrada.
- Las 15 rutas restantes se verificaron por lectura de `router.go` (tabla C.R3.3).
- El rol **FARMACIA** existe en el código (rol 6) y en 14 rutas, pero no figura en el modelo de roles documentado (README, RF01: MEDICO, ENFERMERO, ADMISION, AUDITOR, ADMIN).

### C.R3.2 Resultado ejecutado (55 rutas)

| Metodo | Ruta | ADMIN | MEDICO | ENFERMERO | ADMISION | AUDITOR | FARMACIA | Sin token |
|---|---|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/mfa/setup` | 200 | 200 | 200 | 200 | 200 | 200 | 401 |
| POST | `/api/v1/auth/mfa/enable` | 400 | 400 | 400 | 400 | 400 | 400 | 401 |
| GET | `/api/v1/admin/users` | 200 | 403 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v1/admin/users` | 400 | 403 | 403 | 403 | 403 | 403 | 401 |
| PATCH | `/api/v1/admin/users/x/status` | 404 | 403 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/admin/audit-logs` | 200 | 403 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v1/triage/` | 403 | 422 | 422 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/triage/` | 403 | 200 | 200 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/triage/x` | 403 | 404 | 404 | 403 | 403 | 403 | 401 |
| PATCH | `/api/v1/triage/x/status` | 403 | 400 | 400 | 403 | 403 | 403 | 401 |
| POST | `/api/v1/clinical-records/` | 403 | 400 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v1/clinical-records/x/close` | 403 | 400 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v1/clinical-records/x/clarifications` | 403 | 400 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/clinical-records/x` | 403 | 404 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/clinical-records/patient/x` | 403 | 200 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/clinical-records/x/verify` | 403 | 404 | 403 | 403 | 404 | 403 | 401 |
| GET | `/api/v1/clinical-records/x/rips` | 403 | 404 | 403 | 403 | 404 | 403 | 401 |
| GET | `/api/v1/clinical-records/x/fhir` | 403 | 404 | 403 | 403 | 404 | 403 | 401 |
| POST | `/api/v1/prescriptions/` | 403 | 400 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/prescriptions/x` | 403 | 404 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/prescriptions/record/x` | 403 | 404 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v1/sync/batch` | 403 | 400 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/auth/me` | 200 | 200 | 200 | 200 | 200 | 200 | 401 |
| GET | `/api/v1/medications` | 403 | 200 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v1/patients/` | 403 | 422 | 422 | 422 | 403 | 403 | 401 |
| GET | `/api/v1/patients/` | 403 | 200 | 200 | 200 | 403 | 403 | 401 |
| GET | `/api/v1/patients/lookup` | 403 | 400 | 400 | 400 | 403 | 403 | 401 |
| GET | `/api/v1/patients/x` | 403 | 404 | 404 | 404 | 403 | 403 | 401 |
| PATCH | `/api/v1/patients/x` | 403 | 404 | 404 | 404 | 403 | 403 | 401 |
| DELETE | `/api/v1/patients/x` | 403 | 404 | 404 | 404 | 403 | 403 | 401 |
| POST | `/api/v1/patients/x/allergies` | 403 | 422 | 422 | 422 | 403 | 403 | 401 |
| GET | `/api/v1/patients/x/allergies` | 403 | 404 | 404 | 404 | 403 | 403 | 401 |
| GET | `/api/v1/patients/x/anatomical-notes` | 403 | 200 | 200 | 403 | 403 | 403 | 401 |
| POST | `/api/v1/patients/x/anatomical-notes` | 403 | 400 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/clinical-records/x/anatomical-notes` | 403 | 200 | 200 | 403 | 200 | 403 | 401 |
| POST | `/api/v1/clinical-records/x/anatomical-notes` | 403 | 400 | 403 | 403 | 403 | 403 | 401 |
| PUT | `/api/v1/clinical-records/x/pain-mapping` | 403 | 404 | 403 | 403 | 403 | 403 | 401 |
| DELETE | `/api/v1/anatomical-notes/x` | 403 | 404 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/health-education/` | 200 | 200 | 200 | 403 | 403 | 200 | 401 |
| POST | `/api/v1/health-education/` | 403 | 422 | 403 | 403 | 403 | 403 | 401 |
| PUT | `/api/v1/health-education/x` | 403 | 422 | 403 | 403 | 403 | 403 | 401 |
| DELETE | `/api/v1/health-education/x` | 403 | 200 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v2/triage/` | 403 | 422 | 422 | 403 | 403 | 403 | 401 |
| POST | `/api/v2/appointments/` | 400 | 400 | 400 | 403 | 403 | 403 | 401 |
| GET | `/api/v2/appointments/` | 200 | 200 | 200 | 403 | 403 | 403 | 401 |
| GET | `/api/v2/appointments/doctor/x` | 200 | 200 | 200 | 403 | 403 | 403 | 401 |
| POST | `/api/v2/treatments/dispatch` | 403 | 400 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v2/treatments/x` | 404 | 404 | 404 | 403 | 403 | 404 | 401 |
| GET | `/api/v2/pharmacy/inbox` | 200 | 200 | 200 | 403 | 403 | 200 | 401 |
| GET | `/api/v2/pharmacy/inventory` | 200 | 200 | 200 | 403 | 403 | 200 | 401 |
| POST | `/api/v2/pharmacy/inventory` | 400 | 403 | 403 | 403 | 403 | 400 | 401 |
| PATCH | `/api/v2/pharmacy/inventory/x/stock` | 400 | 403 | 403 | 403 | 403 | 400 | 401 |
| DELETE | `/api/v2/pharmacy/inventory/x` | 200 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET | `/api/v2/pharmacy/prescriptions/lookup` | 400 | 403 | 403 | 403 | 403 | 400 | 401 |
| POST | `/api/v2/pharmacy/dispense` | 400 | 403 | 403 | 403 | 403 | 400 | 401 |

### C.R3.3 Rutas verificadas por lectura (15)

| Método | Ruta | Roles declarados en `router.go` | Observación |
|---|---|---|---|
| GET | `/api/v1/health` | Pública | Responde `UP` sin consultar la base de datos (DEF-32) |
| POST | `/api/v1/auth/login` | Pública (límite 30/min por IP) | — |
| POST | `/api/v1/auth/refresh` | Pública (límite 120/min) | — |
| POST | `/api/v1/auth/logout` | Pública | — |
| POST | `/api/v1/auth/register-admin` | **Pública** | Crea un ADMIN activo sin autenticación (DEF-49, Crítica) |
| GET | `/api/v1/auth/mfa-seed` | **Pública** | Entrega la semilla TOTP de cualquier cuenta (DEF-50, Crítica) |
| PUT | `/api/v1/patients/:id` | ADMISION, ENFERMERO, MEDICO | Mismo handler que PATCH (DEF-68) |
| PUT | `/api/v1/clinical-records/:id/anatomical-notes/:note_id` | MEDICO | Propiedad comprobada en el servicio (`TestR3NotaAnatomicaSoloLaModificaSuAutorYNoTrasElCierre`) |
| DELETE | `/api/v1/clinical-records/:id/anatomical-notes/:note_id` | MEDICO | Ídem |
| PUT | `/api/v1/anatomical-notes/:note_id` | MEDICO | Ídem |
| GET | `/api/v1/health-education/:id` | MEDICO, ENFERMERO, ADMIN, FARMACIA | Igual que el listado |
| GET | `/api/v2/triage/` | ENFERMERO, MEDICO | Duplica la ruta v1 |
| GET | `/api/v2/triage/:id` | ENFERMERO, MEDICO | Duplica la ruta v1 |
| PATCH | `/api/v2/triage/:id/status` | ENFERMERO, MEDICO | Duplica la ruta v1 |
| PUT | `/api/v2/pharmacy/inventory/:id` | FARMACIA, ADMIN | — |

### C.R3.4 Hallazgos H34

- Dos rutas públicas que no deberían serlo (DEF-49, DEF-50).
- ADMIN accede a recetas v2, dispensación e inventario (`/api/v2/treatments/:id`, `/api/v2/pharmacy/*`), en contra del RF08 («aislado absolutamente de historias clínicas»), y AUDITOR queda bloqueado en `/patients/:id/anatomical-notes` aunque la ruta lo declara (DEF-72).
- ENFERMERO puede eliminar pacientes (`DELETE /api/v1/patients/:id`, DEF-55) y crear citas a su nombre (DEF-69).
- En el frontend varias pantallas no comprueban el rol e infieren el rol por texto (DEF-80).
