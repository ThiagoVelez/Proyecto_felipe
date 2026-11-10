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
