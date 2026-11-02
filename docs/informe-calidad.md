# Informe de calidad de software: SaludConecta IPS v2.4

> Versión actualizada por el Responsable de Calidad el 2026-11-01 (rama `calidad/auditoria-iso25010`). El detalle, las mediciones y la evidencia están en el paquete [`docs/calidad/`](calidad/README.md). Este informe resume ese paquete y reemplaza las afirmaciones no verificadas de la versión anterior.

## 1. Modelo de evaluación de calidad (ISO/IEC 25010:2023)

La versión anterior usaba las 8 características de ISO/IEC 25010:2011. La norma vigente es **ISO/IEC 25010:2023**, que define 9 características: incorpora la **Seguridad operacional (*Safety*)**, renombra Usabilidad como **Capacidad de interacción** y Portabilidad como **Flexibilidad**. En un sistema clínico, *Safety* es la característica que agrupa los riesgos de daño al paciente.

Métricas, fórmulas y umbrales: [`calidad/02-modelo-calidad-iso25010-2023.md`](calidad/02-modelo-calidad-iso25010-2023.md).

| Característica | Semáforo | Resultado medido | Evidencia |
|---|---|---|---|
| 1. Adecuación funcional | Rojo | 5 de 10 RF funcionan de extremo a extremo (API e interfaz); 9 de 10 RF tienen al menos una prueba. La afirmación anterior de «100 % de las funciones clínicas» no tenía medición y es falsa (DEF-21, DEF-26). | `calidad/04-bitacora-defectos.md` |
| 2. Eficiencia de desempeño | Verde | p95 entre 1,81 y 2,99 ms con 20 clientes concurrentes en proceso y almacén en memoria (emisión de prescripción, intercepción de alergia y lectura de historia). Las cifras anteriores (< 10 ms en memoria y < 35 ms con BD) no tenían registro de medición; la de memoria es compatible con lo medido y la de base de datos queda **No medida** (sin MySQL en el entorno de evaluación). | `calidad/anexos/evidencias/74-rendimiento-corrida*.txt` |
| 3. Compatibilidad | Amarillo | Existen exportadores RIPS JSON y HL7 FHIR R4, con 10,5 % de cobertura de pruebas; la conformidad con los esquemas oficiales queda **No medida**. | `calidad/anexos/evidencias/72-final-cover-por-paquete.txt` |
| 4. Capacidad de interacción | Rojo | El contraste mínimo de texto sobre los banners es 1,85:1, frente al 7:1 de WCAG AAA declarado en RF09 (DEF-36); 6 de 8 operaciones del cliente ocultan errores del servidor (DEF-22). | `calidad/anexos/evidencias/40-contraste-banners.txt` |
| 5. Fiabilidad | Rojo | La conmutación automática a memoria cuando MySQL no responde, que la versión anterior presentaba como fortaleza, provoca pérdida silenciosa de registros (DEF-10). El healthcheck no verifica la base de datos (DEF-32). Densidad de defectos: 2,98 por KLOC. | `calidad/04-bitacora-defectos.md` |
| 6. Seguridad | Rojo | Cumplimiento estricto de OWASP ASVS 4.0.3 L2 del 34,0 % sobre 53 requisitos. Bcrypt, JWT firmado y TOTP existen, pero con credenciales sembradas (DEF-11), tokens no revocables (DEF-13) y MFA desactivable (DEF-14). La matriz RBAC es correcta en 110 de 110 combinaciones. | `calidad/05-auditoria-owasp-asvs-l2.md`, `calidad/anexos/matriz-rbac.md` |
| 7. Mantenibilidad | Amarillo | Se verificó la arquitectura hexagonal: el dominio no importa adaptadores. Complejidad ciclomática media de 3,5. Duplicación del 14,46 % entre adaptadores MySQL y PostgreSQL. Cobertura del backend: 60,3 % (38,7 % antes de la auditoría); del frontend: 41,5 %. | `calidad/anexos/analisis-estatico.md` |
| 8. Flexibilidad | Amarillo | El adaptador de persistencia se reemplaza por configuración, pero los triggers de inmutabilidad solo existen en MySQL (DEF-25). Compila y se ejecuta en Windows; Docker Compose queda **No medido**. | `calidad/anexos/linea-base.md` |
| 9. Seguridad operacional (*Safety*) | Rojo | El cruce de alergias no detecta reactividad cruzada (DEF-06) y la hipotermia severa se clasifica como no urgente (DEF-09). Se corrigieron en la rama la prescripción con un paciente distinto al del folio (DEF-05), los niveles Manchester inválidos (DEF-08) y la frecuencia cardíaca mayor de 300 lpm (DEF-27). | `calidad/04-bitacora-defectos.md` |

## 2. Bitácora de defectos

La bitácora completa, con DEF-05 a DEF-48 y la verificación de las correcciones históricas, está en [`calidad/04-bitacora-defectos.md`](calidad/04-bitacora-defectos.md). Los registros DEF-01 a DEF-04 se conservan abajo **sin modificar su contenido original**, incluida su ortografía, porque forman parte del historial del proyecto.

| ID Defecto | Modulo Afectado | Severidad | Descripcion | Causa Raiz | Estrategia de Solucion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | HCE / Persistencia | **Critica** | Posibilidad de bypass de modificacion en folios medicos que ya habian sido cerrados y firmados. | La comprobacion residia unicamente en la capa de aplicacion; llamadas directas o scripts SQL podian actualizar la fila en `clinical_records`. | Implementacion de doble barrera: guardia booleana en capa de dominio y creacion de `TRIGGER trg_prevent_update_closed_record` en MySQL/Postgres que emite `SIGNAL SQLSTATE '45000'` impidiendo cualquier mutacion. |
| **DEF-02** | Farmacia / Prescripcion | **Alta** | Latencia superior a 600 ms al validar antecedentes alergicos de pacientes con multiples atenciones previas. | Busqueda secuencial completa en la tabla `patient_allergies` sin indices sobre el principio activo y el paciente. | Creacion del indice relacional compuesto `INDEX idx_patient_allergies (patient_id, active_ingredient)` en el esquema DDL y cacheo en memoria de la lista de alergias del paciente durante el ciclo de vida del servicio. |
| **DEF-03** | Auditoria / HTTP | **Media** | Panico intermitente en goroutines de registro de auditoria (`runtime error: invalid memory address or nil pointer dereference`). | GoFiber reutiliza los contextos `fiber.Ctx` y buffers subyacentes de `fasthttp` una vez que la peticion HTTP finaliza. La goroutine asincrona leia punteros reciclados. | Aislamiento y clonacion profunda de los datos primitivos de auditoria (`correlationID`, `userID`, `path`, `ip`) antes del despacho de la goroutine, eliminando condiciones de carrera y dependencias del ciclo de vida del contexto web. |
| **DEF-04** | Triaje de Urgencias | **Media** | Registro indebido de valores fuera de escala en la variable Glasgow (ej. puntuaciones de 0 o 18 ingresadas por digitacion manual erratica). | La entidad `TriageRecord` carecia de una validacion de invariantes en su metodo de creacion en el dominio. | Incorporacion del metodo `Validate()` en la entidad de dominio `TriageRecord` que verifica que la puntuacion de Glasgow este estrictamente en el intervalo cerrado $[3, 15]$, retornando `ErrInvalidGlasgowScore`. |

**Verificación de las correcciones históricas (2026-11-01):**

- DEF-01: **Parcial**. Trigger solo en MySQL; la guardia de dominio no se invoca.
- DEF-02: **Parcial**. El índice existe; la caché no se encontró.
- DEF-03: **Parcial**. Las cadenas no se copiaban; corregido como DEF-28.
- DEF-04: **Confirmada**.

Detalle en la bitácora.

Resumen de los defectos nuevos: 44, de los cuales 7 son Críticos, 16 Altos, 15 Medios y 6 Bajos; 8 se corrigieron en la rama de auditoría con una prueba de regresión que falla antes y pasa después.

## 3. Acciones de mantenimiento

### 3.1 Acciones ejecutadas antes de la auditoría (verificadas)

1. **Desacoplamiento mediante puertos e inversión de dependencias.** **Verificada:** `core/` depende solo de `ports`, `domain`, `pkg/crypto` y bibliotecas estándar (`calidad/anexos/evidencias/41-arquitectura.txt`).
2. **Homologación de códigos HTTP (401, 403, 422).** **Parcial:** se cumple en autenticación y RBAC; cerrar un folio ya cerrado devuelve 409 (no 403) y algunos casos de «no encontrado» devuelven 500 (DEF-44).
3. **Protección contra fugas de información.** **Parcial:** `.gitignore` excluye `.env`. La afirmación de que «se anonimizaron todos los ejemplos» es **falsa**: el README y las semillas contienen credenciales por defecto y datos personales de apariencia real (DEF-11, DEF-43).

### 3.2 Acciones ejecutadas en la auditoría de calidad

- Correcciones con prueba de regresión: DEF-05, DEF-08 (parcial), DEF-12, DEF-27, DEF-28, DEF-41, DEF-46 y DEF-47 (las dos últimas, detectadas por el propio pipeline).
- Pipeline de calidad [`.github/workflows/calidad.yml`](../.github/workflows/calidad.yml), configuración [`.golangci.yml`](../.golangci.yml), ESLint del frontend y plantillas de PR y de defecto.
- Plan de mantenimiento ISO/IEC 14764 con 47 acciones priorizadas: [`calidad/06-plan-mantenimiento.md`](calidad/06-plan-mantenimiento.md).
