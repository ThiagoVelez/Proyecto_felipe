# Mapa de identificadores SEC-* y DEF-*

- **Revisión:** R3 (10 nov 2026). **Responsable:** Juan José Sánchez (Responsable de Calidad).
- **Fuentes:** tabla «Registro de la auditoría de seguridad» del README de `main` (sección 13, 25 filas SEC-*), tarjeta de Trello «Auditoría de Seguridad» (lista «Pruebas QA») y bitácora de Calidad (`04-bitacora-defectos.md`).
- **Método:** cada SEC-* se emparejó con el DEF-* de la bitácora que describe el mismo defecto (mismo síntoma, archivo y corrección). La existencia de cada prueba citada se comprobó con un script sobre `tests/` y `src/backend` (todas existen). El veredicto es el de la verificación R3 (`anexos/cifras-r3.json`).

## 1. Equivalencias SEC-* -> DEF-*

Los 25 identificadores SEC-* corresponden uno a uno con las 25 tarjetas de defectos de la lista «Bugs solucionados». Ningún SEC-* queda sin DEF-* equivalente, así que no hay hallazgos independientes que analizar aparte.

| SEC | Defecto según el README | DEF equivalente | Prueba citada por el equipo | Veredicto R3 |
|---|---|---|---|---|
| SEC-C01 | El cruce de alergias usaba el paciente enviado por el cliente | DEF-05 | `TestAllergyCrossCheckUsesRecordPatient` existe | Verificado — corregido |
| SEC-C02 | Penicilina no bloqueaba amoxicilina; «ÁCIDO» y «ACIDO» eran distintos | DEF-06 | `TestAllergyFamilyAndAccentMatching` existe | Verificado — corregido |
| SEC-C03 | Reenviar un lote con un folio cerrado lo reemplazaba y reabría (memoria) | DEF-07 | `TestSyncNeverRewritesClosedRecordsNorTrustsClient` existe | Verificado — corregido |
| SEC-C04 | El backend aceptaba niveles Manchester fuera del catálogo | DEF-08 | `TestTriageRejectsClientLevelOutsideCatalog` existe | Verificado — corregido |
| SEC-C05 | 30 °C con el resto normal se clasificaba NIVEL_V | DEF-09 | `TestTriageTemperatureDiscriminators` existe | Verificado — corregido |
| SEC-C06 | Si MySQL no respondía se pasaba en silencio a memoria | DEF-10 | `cmd/api/main.go` (no es una prueba) | Corregido parcialmente |
| SEC-C07 | El seeder creaba un MEDICO con contraseña y MFA conocidos | DEF-11 | `TestBootstrapAdminNeverUsesDefaults` existe; `TestMemoryStoreHasNoPublishedAccounts` existe | Verificado — corregido |
| SEC-A01 | `JWT_SECRET` por defecto publicado en el código | DEF-12 | `TestJWTSecretValidation` existe | Verificado — corregido |
| SEC-A02 | Tokens válidos hasta 8 h tras desactivar un usuario | DEF-13 | `TestDeactivatedUserLosesAccessImmediately` existe; `TestRoleComesFromStoreNotToken` existe | Verificado — corregido |
| SEC-A03 | `/auth/mfa/setup` reemplazaba el segundo factor sin verificar el TOTP | DEF-14 | `TestMFASetupRequiresCurrentCode` existe | Verificado — corregido |
| SEC-A04 | Sin límite de intentos; la IP del proxy se compartía entre usuarios | DEF-15 | `TestLoginBruteForceLockout` existe; `TestTOTPBruteForceLockout` existe; `TestRateLimitUsesRealClientIPBehindProxy` existe | Corregido parcialmente |
| SEC-A05 | Dos cierres simultáneos bifurcaban la cadena SHA-256 | DEF-16 | `TestConcurrentClosesKeepChainLinear` existe; `TestRepositoryRejectsForkedChainLink` existe | Verificado — corregido |
| SEC-A06 | Un médico podía firmar el folio de otro y rompía la verificación | DEF-17 | `TestRecordObjectLevelAccess` existe; `TestPrescriptionRequiresRecordAuthor` existe | Verificado — corregido |
| SEC-A07 | La sincronización aceptaba `doctor_id` y hash previo del cliente | DEF-18 | `TestSyncNeverRewritesClosedRecordsNorTrustsClient` existe; `TestSyncChainsAfterServerRecords` existe | Verificado — corregido |
| SEC-A08 | El trigger abortaba todo el lote al reenviar un folio cerrado | DEF-19 | `TestMySQLChainSyncAndTimestamps` existe | Verificado — corregido |
| SEC-A09 | `TIMESTAMP(0)` redondeaba `closed_at` y la verificación fallaba | DEF-20 | `TestClosedAtIsSealedToSeconds` existe | Verificado — corregido |
| SEC-A10 | HCE, prescripción y triaje mostraban datos y hashes simulados | DEF-21 | `ClinicalScreens.test.jsx` existe; `PatientFlow.test.jsx` existe | Corregido parcialmente |
| SEC-A11 | El panel admin mostraba éxito aunque el backend fallara y una bitácora fabricada | DEF-22 | `AdminGovernance.test.jsx` existe | Corregido parcialmente |
| SEC-A12 | El frontend validaba el TOTP localmente con un secreto fijo | DEF-23 | `AuthMfa.test.jsx` existe | Verificado — corregido |
| SEC-A13 | Fiber v2.52.5 afectado por GO-2025-3845 | DEF-24 | `govulncheck ./...` (no es una prueba) | Verificado — corregido |
| SEC-A14 | Triggers solo en MySQL; sin protección de aclaraciones | DEF-25 | `schema.sql` (no es una prueba); `postgres/schema.sql` (no es una prueba) | Corrección presente; ejecución No medida |
| SEC-A15 | Sin API de admisión; ADMISION sin rutas | DEF-26 | `TestAdmissionPatientAndAllergyAPI` existe | Verificado — corregido |
| SEC-A16 | Sin Web Crypto el cliente calculaba un TOTP inválido | DEF-47 | `totp.test.js` existe | Verificado — corregido |
| SEC-M01 | `GetMedicationByID` devolvía el puntero interno (carrera con `DeductStock`) | DEF-46 | `TestGetMedicationReturnsCopy` existe; `TestConcurrentPrescriptionsDoNotRaceOnStock` existe | Verificado — corregido |
| SEC-B01 | `TestStaffRegisterRequiresAdmin` fallaba bajo `-race` por el timeout de 1 s con Bcrypt | DEF-48 | `TestStaffRegisterRequiresAdmin` existe | Verificado — corregido |

## 2. Identificadores DEF-01 a DEF-04 del README (sección 14.3)

El README de `main` vuelve a usar DEF-01 a DEF-04, pero DEF-02 y DEF-03 ya no describen lo mismo que en la bitácora original (`docs/informe-calidad.md`). Se registra como DEF-92.

| ID en el README | Descripción en el README | Equivale en la bitácora de Calidad | Observación R3 |
|---|---|---|---|
| DEF-01 | Bypass de modificación en folios cerrados | DEF-01 (igual) | Verificado — corregido |
| DEF-02 | Carrera en las goroutines de auditoría | DEF-03 histórico y DEF-28 | En la bitácora original DEF-02 era «latencia de alergias > 600 ms» (caché inexistente). La carrera sigue abierta en `main`: 18 de 20 entradas alteradas (`evidencias/r3/31-def28-en-main.txt`). El README cita `adapters/http/middleware/audit.go`, que no existe, y una copia con `append([]byte(nil), c.Body()...)` que no está en el código. |
| DEF-03 | Fuga de conexiones del pool MySQL | Sin equivalente (hallazgo independiente) | Pool 25/10 verificado en `adapters/storage/mysql/connection.go:39-59`. Los «timeouts de 3 s en todas las transacciones» no existen (no hay `context.WithTimeout` en `adapters/storage/mysql`). El README cita `mysql/db.go`, que no existe. Las pruebas citadas no ejercitan el pool. |
| DEF-04 | Familias farmacológicas y acentos | DEF-04 histórico (Glasgow) y DEF-06 | En la bitácora original DEF-04 era «Glasgow fuera de escala»; el contenido del README corresponde a DEF-06 (verificado). |

## 3. Afirmaciones de la tarjeta «Auditoría de Seguridad»

| Afirmación | DEF | Veredicto |
|---|---|---|
| SEC-C01: el cruce de alergias usa el paciente del folio | DEF-05 | Verificada (vía v1). La vía v2, la única que muestra la interfaz, no cruza alergias (DEF-51). |
| SEC-C04 y C05: nivel fuera de catálogo e hipotermia | DEF-08, DEF-09 | Verificada |
| SEC-A02: revocación inmediata | DEF-13 | Verificada |
| SEC-A04: bloqueo tras 5 intentos e IP real tras proxy | DEF-15 | Parcial: el bloqueo existe; la IP se toma de `X-Real-IP` confiando en toda la red privada por defecto |
| SEC-A05: cadena lineal ante cierres concurrentes | DEF-16 | Verificada |
| Gobernanza ReTHUS: cuentas nacen inactivas | — | Parcial: cierto para `POST /admin/users`, pero `POST /auth/register-admin` es público y crea un ADMIN **activo** (DEF-49) |
| «7 defectos críticos blindados con tests de regresión» | DEF-05 a DEF-11 | Parcial: 6 de 7 verificados; DEF-10 corregido parcialmente (PostgreSQL usa memoria para los módulos v2) |
| «16 defectos de severidad alta corregidos y probados» | DEF-12 a DEF-26 y DEF-47 | Parcial: 12 de 16 verificados; DEF-15, 21 y 22 corregidos parcialmente; DEF-25 sin ejecución medible |
| «TOTP RFC 6238 validado exclusivamente en el servidor» | DEF-23, DEF-50 | Parcial: la validación es del servidor, pero `GET /auth/mfa-seed` entrega la semilla sin autenticación y la interfaz ofrece «Pegar código de prueba», lo que anula el segundo factor |
