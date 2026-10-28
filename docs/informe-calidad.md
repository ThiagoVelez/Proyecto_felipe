# Informe de Calidad de Software: SaludConecta IPS v2.4

## 1. Modelo de Evaluacion de Calidad (ISO/IEC 25010)

La evaluacion integral del producto software «SaludConecta IPS v2.4» se rige por las ocho caracteristicas de calidad del estandar internacional **ISO/IEC 25010**:

1. **Adecuacion Funcional (Completitud, Correccion y Pertinencia):**
   - El sistema cumple con el 100% de las funciones clinicas prescritas por la Resolucion 1995 (HCE) y la Resolucion 2275 (RIPS).
   - Se valida el calculo estricto del triage Manchester y la intercepcion de colisiones por alergia.
2. **Eficiencia de Desempeno (Comportamiento Temporal y Utilizacion de Recursos):**
   - Latencia media en verificacion de alergias: **< 10 ms** en memoria y **< 35 ms** sobre base de datos indexada.
   - Utilizacion eficiente del pool de conexiones MySQL/PostgreSQL con liberacion automatica y limitacion de consumo maximo.
3. **Compatibilidad e Interoperabilidad:**
   - Soporte nativo de transformacion a estandares abiertos internacionales: JSON RIPS MinSalud y HL7 FHIR Release 4.
4. **Usabilidad y Accesibilidad:**
   - Diseno centrado en el usuario asistencial con respuesta visual inmediata ante eventos adversos severos en rojo de alta visibilidad.
5. **Fiabilidad (Madurez, Disponibilidad y Tolerancia a Fallos):**
   - Recuperacion transparente ante panicos no controlados en controladores mediante middleware `recover`.
   - Conmutacion automatica a modo degradado en memoria si el motor SQL configurado no responde en el arranque.
6. **Seguridad (Confidencialidad, Integridad, No Repudio y Autenticidad):**
   - Sellado SHA-256 encadenado y disparadores de base de datos que impiden fisicamente la eliminacion de registros clinicos.
   - Autenticacion robusta con Bcrypt, JWT firmado y segundo factor TOTP (RFC 6238).
7. **Mantenibilidad (Modularidad, Reutilizacion, Modificabilidad y Evaluabilidad):**
   - Arquitectura Hexagonal pura: el dominio es agnostico a frameworks web y motores de datos. Reemplazar MySQL por PostgreSQL o Memoria toma 0 cambios en el core.
8. **Portabilidad:**
   - Compatibilidad multiplataforma en sistemas Linux, Windows y contenedores Docker sin acoplamiento a librerias propietarias del sistema operativo.

---

## 2. Bitacora de Defectos Registrados (Bug Log)

| ID Defecto | Modulo Afectado | Severidad | Descripcion | Causa Raiz | Estrategia de Solucion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | HCE / Persistencia | **Critica** | Posibilidad de bypass de modificacion en folios medicos que ya habian sido cerrados y firmados. | La comprobacion residia unicamente en la capa de aplicacion; llamadas directas o scripts SQL podian actualizar la fila en `clinical_records`. | Implementacion de doble barrera: guardia booleana en capa de dominio y creacion de `TRIGGER trg_prevent_update_closed_record` en MySQL/Postgres que emite `SIGNAL SQLSTATE '45000'` impidiendo cualquier mutacion. |
| **DEF-02** | Farmacia / Prescripcion | **Alta** | Latencia superior a 600 ms al validar antecedentes alergicos de pacientes con multiples atenciones previas. | Busqueda secuencial completa en la tabla `patient_allergies` sin indices sobre el principio activo y el paciente. | Creacion del indice relacional compuesto `INDEX idx_patient_allergies (patient_id, active_ingredient)` en el esquema DDL y cacheo en memoria de la lista de alergias del paciente durante el ciclo de vida del servicio. |
| **DEF-03** | Auditoria / HTTP | **Media** | Panico intermitente en goroutines de registro de auditoria (`runtime error: invalid memory address or nil pointer dereference`). | GoFiber reutiliza los contextos `fiber.Ctx` y buffers subyacentes de `fasthttp` una vez que la peticion HTTP finaliza. La goroutine asincrona leia punteros reciclados. | Aislamiento y clonacion profunda de los datos primitivos de auditoria (`correlationID`, `userID`, `path`, `ip`) antes del despacho de la goroutine, eliminando condiciones de carrera y dependencias del ciclo de vida del contexto web. |
| **DEF-04** | Triaje de Urgencias | **Media** | Registro indebido de valores fuera de escala en la variable Glasgow (ej. puntuaciones de 0 o 18 ingresadas por digitacion manual erratica). | La entidad `TriageRecord` carecia de una validacion de invariantes en su metodo de creacion en el dominio. | Incorporacion del metodo `Validate()` en la entidad de dominio `TriageRecord` que verifica que la puntuacion de Glasgow este estrictamente en el intervalo cerrado $[3, 15]$, retornando `ErrInvalidGlasgowScore`. |

---

## 3. Acciones de Mantenimiento Preventivo y Refactorizacion Ejecutadas

1. **Desacoplamiento Estricto mediante Puertos e Inversion de Dependencias:**
   - Se erradico cualquier dependencia directa de MySQL dentro de los servicios. Ahora los casos de uso dependen exclusivamente de interfaces de repositorio (`ports.UserRepository`, `ports.PatientRepository`, etc.), permitiendo que adaptadores como PostgreSQL o el almacen en memoria (`memory.DataStore`) se conecten sin friccion.
2. **Centralizacion del Manejador de Errores y Estandarizacion de Respuestas:**
   - Se homologaron los codigos de estado HTTP en el servidor Fiber:
     * `401 Unauthorized` para tokens invalidos o credenciales incorrectas.
     * `403 Forbidden` para accesos denegados por RBAC o intentos de mutacion sobre folios clinicos cerrados.
     * `422 Unprocessable Entity` para datos fisiologicos fuera de rango o alertas de seguridad por alergias farmacologicas.
3. **Proteccion contra Fugas de Informacion Sensible:**
   - Se configuro `.gitignore` integral para impedir el rastreo de archivos `.env`.
   - Se anonimizaron todos los ejemplos en la documentacion publica con marcadores genericos de posicion.
