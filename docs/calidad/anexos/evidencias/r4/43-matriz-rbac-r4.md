# comando: (cd tests/backend && CALIDAD_MATRIZ_R4_SALIDA=<este archivo> go test -count=1 -run TestR4MatrizRBACRutasNuevasYRolesTI .)
# fecha: 2026-11-25T03:01Z

| Metodo | Ruta | ADMIN | MEDICO | ENFERMERO | ADMISION | AUDITOR | FARMACIA | LABORATORIO | TI | sin token |
|---|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/v1/ti/overview` | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| GET | `/api/v1/ti/users` | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| PATCH | `/api/v1/ti/admins/x/status` | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 404 | 401 |
| GET | `/api/v1/ti/audit-logs` | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 200 | 401 |
| POST | `/api/v1/auth/register-admin` | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 400 | 401 |
| POST | `/api/v1/admin/branches` | 400 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| PUT | `/api/v1/admin/branches/x` | 404 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| DELETE | `/api/v1/admin/branches/x` | 404 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/admin/users` | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v2/appointment-requests/` | 403 | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v2/appointment-requests/pending-count` | 403 | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v2/appointment-requests/x/schedule` | 403 | 400 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v2/appointment-requests/x/reject` | 403 | 400 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v2/lab-orders/` | 403 | 200 | 403 | 403 | 403 | 403 | 200 | 403 | 401 |
| POST | `/api/v2/lab-orders/` | 403 | 400 | 403 | 403 | 403 | 403 | 400 | 403 | 401 |
| PUT | `/api/v2/lab-orders/x/progress` | 403 | 403 | 403 | 403 | 403 | 403 | 404 | 403 | 401 |
| POST | `/api/v2/lab-orders/x/seal` | 403 | 403 | 403 | 403 | 403 | 403 | 400 | 403 | 401 |
| POST | `/api/v2/lab-orders/x/dispatch` | 403 | 400 | 403 | 403 | 403 | 403 | 400 | 403 | 401 |
| GET | `/api/v2/nursing/` | 403 | 200 | 200 | 403 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v2/nursing/x` | 403 | 404 | 404 | 403 | 403 | 403 | 403 | 403 | 401 |
| PUT | `/api/v2/nursing/x/order` | 403 | 400 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| PUT | `/api/v2/nursing/x/duties` | 403 | 403 | 404 | 403 | 403 | 403 | 403 | 403 | 401 |
| POST | `/api/v2/nursing/x/notes` | 403 | 403 | 400 | 403 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/patients/` | 403 | 200 | 200 | 200 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/patients/x/allergies` | 403 | 404 | 404 | 404 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/clinical-records/patient/x` | 403 | 200 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v1/clinical-records/x/fhir` | 403 | 404 | 403 | 403 | 404 | 403 | 403 | 403 | 401 |
| GET | `/api/v2/triage/` | 403 | 200 | 200 | 403 | 403 | 403 | 403 | 403 | 401 |
| GET | `/api/v2/treatments/x` | 404 | 404 | 404 | 403 | 403 | 404 | 403 | 403 | 401 |
| GET | `/api/v2/pharmacy/inbox` | 200 | 200 | 200 | 403 | 403 | 200 | 403 | 403 | 401 |
| POST | `/api/v2/pharmacy/dispense` | 400 | 403 | 403 | 403 | 403 | 400 | 403 | 403 | 401 |
