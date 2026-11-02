# Tarjetas de Trello para defectos Críticos y Altos

El agente no tiene acceso a Trello. Cada tarjeta está lista para copiar en el tablero del equipo.

**Alcance:** todos los defectos de severidad Crítica y Alta (23), más DEF-46 (Media) y DEF-48 (Baja). Estos dos se incluyen como excepción explícita porque los detectó el pipeline `calidad` en el PR de la auditoría y conviene que el equipo los siga en el tablero. El resto de defectos Medios y Bajos se gestiona solo en la bitácora.

- **Etiquetas sugeridas:** Crítica = rojo, Alta = naranja, Media = amarillo, Baja = verde.
- **Enlace base a la bitácora:** `https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md`. El documento estará en `main` después de fusionar la rama `calidad/auditoria-iso25010`; hasta entonces, sustituya `main` por el nombre de la rama.

## 0. Inventario de tarjetas

Estados tomados de la tabla resumen de `04-bitacora-defectos.md`. Las tarjetas «En verificación» ya tienen la corrección en la rama `calidad/auditoria-iso25010` y deben ir a **«En revisión de calidad»** (lista propuesta en la sección 1). Las demás van a **«Bugs encontrados para solucionar»**.

| Tarjeta | Severidad | Etiqueta | Estado en la bitácora | Lista sugerida |
|---|---|---|---|---|
| DEF-05 | Crítica | Rojo | En verificación | En revisión de calidad |
| DEF-06 | Crítica | Rojo | Confirmado | Bugs encontrados para solucionar |
| DEF-07 | Crítica | Rojo | Confirmado | Bugs encontrados para solucionar |
| DEF-08 | Crítica | Rojo | En verificación (corrección parcial) | En revisión de calidad |
| DEF-09 | Crítica | Rojo | Confirmado | Bugs encontrados para solucionar |
| DEF-10 | Crítica | Rojo | Confirmado | Bugs encontrados para solucionar |
| DEF-11 | Crítica | Rojo | Confirmado | Bugs encontrados para solucionar |
| DEF-12 | Alta | Naranja | En verificación | En revisión de calidad |
| DEF-13 a DEF-18 | Alta | Naranja | Confirmado | Bugs encontrados para solucionar |
| DEF-19, DEF-20 | Alta | Naranja | Nuevo (pendiente de reproducir con MySQL) | Bugs encontrados para solucionar |
| DEF-21 a DEF-26 | Alta | Naranja | Confirmado | Bugs encontrados para solucionar |
| DEF-46 | Media | Amarillo | En verificación | En revisión de calidad |
| DEF-47 | Alta | Naranja | En verificación | En revisión de calidad |
| DEF-48 | Baja | Verde | Confirmado (mitigado en CI) | Bugs encontrados para solucionar |

Total: 25 tarjetas (7 Críticas, 16 Altas, 1 Media, 1 Baja): 20 abiertas y 5 en verificación.

## 1. Propuesta de flujo: lista «En revisión de calidad»

Listas actuales: Avisos, Tareas por realizar, Tareas realizadas, Bugs encontrados para solucionar.

Se propone insertar **«En revisión de calidad»** entre «Tareas por realizar» y «Tareas realizadas»:

```
Avisos | Tareas por realizar | En revisión de calidad | Tareas realizadas | Bugs encontrados para solucionar
```

Reglas:

1. Ninguna tarjeta pasa a «Tareas realizadas» sin que el Responsable de Calidad la mueva desde «En revisión de calidad».
2. Para entrar en revisión, la tarjeta debe enlazar el PR con el pipeline `calidad` en verde y la checklist del PR completa.
3. Si la revisión falla, la tarjeta vuelve a «Tareas por realizar» con un comentario y, si corresponde, un `DEF-XX` nuevo en «Bugs encontrados para solucionar».
4. Una tarjeta de defecto se archiva cuando su estado en la bitácora es «Cerrado».
5. El PR que corrige un defecto de `docs/calidad/defectos-abiertos.txt` debe quitar su línea de esa lista; si no lo hace, el job «Backend - control de defectos abiertos» falla con «DEF-XX parece corregido».

## 2. Tarjetas Críticas (etiqueta roja)

### [DEF-05] Prescripción contraindicada con `patient_id` distinto al del folio

- **Estado:** En verificación.
- **Descripción:** el cruce de alergias usaba el paciente enviado por el cliente en lugar del paciente del folio. Corregido en la rama `calidad/auditoria-iso25010`; falta revisarlo y fusionarlo.
- **Checklist:**
  - [x] Prueba de regresión `TestDEF05…`
  - [x] Validación `ErrPrescriptionPatientMismatch` (422)
  - [ ] Revisión del PR por LT
  - [ ] Retirar `patient_id` del contrato (M-02)
- **Enlace:** [DEF-05 en la bitácora](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-05-permitir-prescripción-contraindicada-indicando-un-patient_id-distinto-al-del-folio)

### [DEF-06] Cruce de alergias sin reactividad cruzada ni normalización de tildes

- **Estado:** Confirmado.
- **Descripción:** una alergia a penicilina no bloquea la amoxicilina; «ÁCIDO» y «ACIDO» se tratan como principios distintos.
- **Checklist:**
  - [ ] Normalización Unicode de principios activos
  - [ ] Tabla de reactividad cruzada aprobada por LT
  - [ ] Fixtures con principios activos reales (RP)
  - [ ] Quitar DEF-06 de `defectos-abiertos.txt` y dejar `TestDEF06…` como regresión permanente
- **Enlace:** [DEF-06 en la bitácora](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-06-omitir-la-reactividad-cruzada-y-las-variantes-de-escritura-en-el-cruce-de-alergias)

### [DEF-07] La sincronización sobrescribe folios cerrados

- **Estado:** Confirmado.
- **Descripción:** reenviar un lote con el UUID de un folio cerrado reemplaza su contenido y lo deja abierto (adaptador en memoria).
- **Checklist:**
  - [ ] Definir el contrato de idempotencia
  - [ ] Implementarlo en memoria, MySQL y PostgreSQL
  - [ ] quitar DEF-07 de `defectos-abiertos.txt` (su prueba queda en verde como regresión)
  - [ ] Verificar DEF-19 en MySQL
- **Enlace:** [DEF-07 en la bitácora](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-07-sobrescribir-folios-cerrados-al-reenviar-un-lote-de-sincronización-adaptador-en-memoria)

### [DEF-08] Niveles Manchester arbitrarios desde el cliente

- **Estado:** En verificación (corrección parcial).
- **Descripción:** se aceptaban valores fuera del catálogo. Corregido parcialmente en la rama; falta la política de reclasificación a la baja.
- **Checklist:**
  - [x] Validación de catálogo y 422
  - [ ] Revisión del PR
  - [ ] Decisión clínica sobre la justificación obligatoria (M-06)
- **Enlace:** [DEF-08 en la bitácora](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-08-aceptar-niveles-manchester-arbitrarios-enviados-por-el-cliente)

### [DEF-09] Hipotermia severa clasificada como Nivel V

- **Estado:** Confirmado.
- **Descripción:** 30 °C con el resto de signos normales produce `NIVEL_V`.
- **Checklist:**
  - [ ] Tabla de discriminadores validada por el líder clínico
  - [ ] Implementación y pruebas de límites
  - [ ] Actualizar RF02 en la especificación
  - [ ] quitar DEF-09 de `defectos-abiertos.txt` (su prueba queda en verde como regresión)
- **Enlace:** [DEF-09 en la bitácora](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-09-clasificar-la-hipotermia-severa-como-nivel-v-no-urgente)

### [DEF-10] Conmutación silenciosa a memoria si falla MySQL

- **Estado:** Confirmado.
- **Descripción:** con MySQL caído, el backend arranca en memoria y pierde los registros al reiniciar.
- **Checklist:**
  - [ ] Decisión del equipo sobre el comportamiento documentado
  - [ ] Fallo visible salvo `ALLOW_MEMORY_FALLBACK=true`
  - [ ] Exponer el modo en `/health`
  - [ ] Actualizar README e informe
- **Enlace:** [DEF-10 en la bitácora](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-10-conmutar-en-silencio-a-almacenamiento-en-memoria-cuando-falla-mysql)

### [DEF-11] Cuenta médica sembrada con contraseña y TOTP publicados

- **Estado:** Confirmado.
- **Descripción:** el seeder crea en cada arranque una cuenta MEDICO con credenciales y secreto MFA conocidos.
- **Checklist:**
  - [ ] Semillas solo con `APP_ENV=development`
  - [ ] `ADMIN_INITIAL_PASSWORD` obligatorio y cambio en el primer ingreso
  - [ ] Rotar las credenciales de los despliegues existentes
  - [ ] Quitar las credenciales del README
- **Enlace:** [DEF-11 en la bitácora](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-11-sembrar-en-cada-arranque-una-cuenta-médica-con-contraseña-y-secreto-totp-publicados)

## 3. Tarjetas Altas (etiqueta naranja)

| Título de la tarjeta | Estado | Descripción breve | Checklist de corrección | Ancla en la bitácora |
|---|---|---|---|---|
| [DEF-12] `JWT_SECRET` por defecto publicado | En verificación | Tokens forjables. Corregido en la rama. | [x] `resolveJWTSecret` [x] prueba [ ] revisión del PR [ ] actualizar la tabla de variables del README | [DEF-12](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-12-arrancar-con-un-jwt_secret-por-defecto-publicado-en-el-código) |
| [DEF-13] Tokens de usuarios desactivados siguen vigentes | Confirmado | Suspensión sin efecto durante 8 h. | [ ] verificar `is_active` o `token_version` [ ] reducir el TTL [ ] quitar DEF-13 de `defectos-abiertos.txt` (su prueba queda en verde como regresión) | [DEF-13](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-13-mantener-vigentes-los-tokens-de-usuarios-desactivados) |
| [DEF-14] `/auth/mfa/setup` desactiva el MFA | Confirmado | Un token robado basta para quitar el segundo factor. | [ ] rotación con el TOTP actual [ ] MFA obligatorio por rol [ ] quitar DEF-14 de `defectos-abiertos.txt` (su prueba queda en verde como regresión) | [DEF-14](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-14-deshabilitar-el-mfa-mediante-authmfasetup-sin-verificar-el-factor-actual) |
| [DEF-15] Sin límite de intentos en login y TOTP | Confirmado | Fuerza bruta; límite compartido detrás de nginx. | [ ] limitador por cuenta [ ] `ProxyHeader` [ ] bloqueo progresivo | [DEF-15](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-15-permitir-fuerza-bruta-en-login-y-totp-limitar-por-la-ip-del-proxy) |
| [DEF-16] Cadena SHA-256 bifurcable por concurrencia | Confirmado | Dos cierres simultáneos comparten el hash previo. | [ ] operación atómica en el puerto [ ] `FOR UPDATE` [ ] quitar DEF-16 de `defectos-abiertos.txt` (su prueba queda en verde como regresión) | [DEF-16](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-16-bifurcar-la-cadena-de-hashes-al-cerrar-folios-concurrentes-del-mismo-paciente) |
| [DEF-17] Un médico cierra el folio de otro | Confirmado | Sin control a nivel de objeto; la verificación falla. | [ ] validar la propiedad [ ] hash con `record.DoctorID` [ ] quitar DEF-17 de `defectos-abiertos.txt` (su prueba queda en verde como regresión) | [DEF-17](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-17-permitir-que-un-médico-cierre-y-firme-el-folio-de-otro) |
| [DEF-18] La sincronización acepta autoría del cliente | Confirmado | Suplantación de `DoctorID` y hash previo. | [ ] DTO de sincronización [ ] autoría desde el token [ ] firma de dispositivo | [DEF-18](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-18-aceptar-autoría-y-hash-previo-declarados-por-el-cliente-en-la-sincronización) |
| [DEF-19] Reenvío de lote falla en MySQL | Nuevo | El trigger aborta el `ON DUPLICATE KEY UPDATE`. | [ ] reproducir con MySQL [ ] idempotencia sin `UPDATE` | [DEF-19](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-19-abortar-el-lote-completo-en-mysql-al-reenviar-un-folio-cerrado) |
| [DEF-20] Verificación falla por redondeo de `closed_at` | Nuevo | `TIMESTAMP(0)` redondea y el hash usa el segundo truncado. | [ ] reproducir con MySQL [ ] truncar a segundos | [DEF-20](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-20-invalidar-la-verificación-de-integridad-por-el-redondeo-de-closed_at-en-mysql) |
| [DEF-21] Pantallas clínicas con datos simulados | Confirmado | HCE, prescripción y triaje no usan la API. | [ ] integrar con la API [ ] estados de carga y error [ ] retirar datos fijos | [DEF-21](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-21-presentar-pantallas-clínicas-desconectadas-del-backend-con-datos-y-hash-simulados) |
| [DEF-22] Panel admin con éxito falso y bitácora fabricada | Confirmado | Errores del backend ocultos. | [ ] `strict: true` [ ] eliminar datos simulados [ ] ajustar `AdminGovernance.test.jsx` (RP) | [DEF-22](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-22-mostrar-éxito-falso-y-bitácora-fabricada-en-el-panel-de-administración) |
| [DEF-23] TOTP validado en el cliente con un secreto fijo | Confirmado | Bloquea a usuarios legítimos. | [ ] quitar la validación local [ ] usar el secreto del servidor | [DEF-23](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-23-bloquear-en-el-cliente-códigos-totp-válidos-al-validarlos-contra-un-secreto-fijo) |
| [DEF-24] Fiber v2.52.5 con GO-2025-3845 | Confirmado | Vulnerabilidad alcanzable. | [ ] actualizar Fiber y `x/crypto` [ ] revisar la imagen de Go [ ] govulncheck bloqueante | [DEF-24](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-24-usar-fiber-v2525-con-vulnerabilidad-alcanzable-go-2025-3845) |
| [DEF-25] Triggers solo en MySQL | Confirmado | Sin PostgreSQL ni protección de aclaraciones. | [ ] DDL de PostgreSQL [ ] triggers de aclaraciones [ ] usuario de BD sin DDL | [DEF-25](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-25-omitir-triggers-en-postgresql-y-en-aclaraciones-guardia-de-dominio-sin-uso) |
| [DEF-26] Sin API de admisión de pacientes | Confirmado | El rol ADMISION no tiene rutas. | [ ] `POST /patients` [ ] `POST /patients/:id/alergias` [ ] actualizar la matriz RBAC | [DEF-26](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-26-carecer-de-api-de-admisión-de-pacientes-y-alergias-rol-admision-sin-rutas) |
| [DEF-47] TOTP falso sin Web Crypto | En verificación | Fuera de contexto seguro, el cliente calculaba un código ajeno al secreto. Corregido en la rama. | [x] HMAC-SHA1 local [x] prueba con vectores RFC 6238 [ ] revisión del PR [ ] eliminar la validación TOTP del cliente (M-18) | [DEF-47](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-47-calcular-un-totp-ajeno-al-secreto-cuando-web-crypto-no-está-disponible) |

## 4. Tarjetas adicionales detectadas por el pipeline

### [DEF-46] Carrera de datos en el catálogo de medicamentos (etiqueta amarilla)

- **Estado:** En verificación.
- **Descripción:** `GetMedicationByID` devolvía el puntero interno del adaptador en memoria; con prescripciones concurrentes, `-race` detectó lecturas del stock sin candado mientras `DeductStock` lo modificaba. Corregido en la rama devolviendo una copia.
- **Checklist:**
  - [x] Prueba determinista `TestDEF46CatalogoNoExponePunteroInterno`
  - [x] Corrección en `memory_repos.go` (copia del medicamento)
  - [ ] Pipeline en verde con `-race` (job «Backend - pruebas con -race y cobertura»)
  - [ ] Revisión del PR
  - [ ] Aplicar el mismo patrón a `ClinicalRecordMemoryRepo.GetByID` (DEF-37, M-33)
- **Enlace:** [DEF-46 en la bitácora](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-46-exponer-el-puntero-interno-del-catálogo-de-medicamentos-y-provocar-una-carrera-de-datos)

### [DEF-48] Prueba con timeout fijo de 1 s que falla bajo `-race` (etiqueta verde)

- **Estado:** Confirmado (mitigado en CI).
- **Descripción:** `TestStaffRegisterRequiresAdmin` usa el timeout por defecto de 1 s de `fiber.App.Test`; bajo `-race`, Bcrypt con coste 12 lo supera. No es una carrera. El paso `-race` la excluye temporalmente y el paso siguiente la ejecuta sin `-race`.
- **Responsable sugerido:** Responsable de Pruebas (Calidad no modifica sus pruebas).
- **Checklist:**
  - [ ] Usar `app.Test(req, -1)` o un timeout explícito en `staff_register_routes_test.go` (RP)
  - [ ] Retirar `-skip '^TestStaffRegisterRequiresAdmin$'` del paso `-race` de `calidad.yml` (RC)
  - [ ] Pipeline en verde con la prueba incluida en `-race`
- **Enlace:** [DEF-48 en la bitácora](https://github.com/ThiagoVelez/Proyecto_felipe/blob/main/docs/calidad/04-bitacora-defectos.md#def-48-mantener-una-prueba-con-timeout-fijo-de-1-s-que-falla-bajo--race)

Nota: las anclas siguen la convención de GitHub (minúsculas, espacios convertidos en guiones y signos de puntuación eliminados). Si alguna no resuelve, basta buscar el identificador `DEF-XX` dentro de la bitácora.
