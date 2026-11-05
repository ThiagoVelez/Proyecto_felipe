# Informe de Calidad y Mantenimiento de Software: SaludConecta IPS v2.4

**Proyecto:** SaludConecta IPS v2.4 - Plataforma Clinica Asistencial y Gobernanza Hospitalaria  
**Asignatura:** Ingenieria de Software II  
**Institucion:** COTECNOVA - Corporacion de Estudios Tecnologicos del Norte del Valle  
**Periodo:** 2026-2  
**Docente:** Felipe Gutierrez Isaza  
**Entregable:** Seguimiento 2 - Calidad y Mantenimiento  
**Marco Normativo y Tecnico:** ISO/IEC 25010, Resolucion 1995 de 1999 (MinSalud), Resolucion 2275 de 2023 (RIPS), Ley 1581 de 2012 (Habeas Data Clinico)  
**Herramientas y Modelos de Inteligencia Artificial (IA):** Google Antigravity con Gemini 3.8 Flash en High y Claude Code con Sonnet 5.5 en High  

---

## 1. Evaluacion Integral del Producto bajo ISO/IEC 25010

La evaluacion de calidad de la plataforma «SaludConecta IPS v2.4» se fundamenta en las ocho caracteristicas de calidad del estandar internacional **ISO/IEC 25010:2011** (Sistemas e ingenieria de software - Requisitos de calidad del producto software y evaluacion). A continuacion se presenta la matriz cuantitativa con metricas objetivas, herramientas de medicion y resultados empíricos obtenidos en el entorno de pruebas.

### Matriz Cuantitativa de Evaluacion de Calidad

| Caracteristica ISO/IEC 25010 | Subcaracteristicas Evaluadas | Metrica Cuantitativa | Herramienta de Medicion | Valor Umbral / Meta | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Adecuacion Funcional** | Completitud, Correccion, Pertinencia | Tasa de exito transaccional en flujos clinicos (HCE, Triaje, Prescripcion, RIPS) | Go Test Runner / Vitest Suite | 100% de cumplimiento funcional | 100% (30/30 tests Go, 87/87 tests React aprobados) | Conforme |
| **Eficiencia de Desempeno** | Comportamiento temporal, Utilizacion de recursos | Latencia p95 peticiones HTTP API GoFiber | Go Benchmarks / HTTP Load Harness | p95 < 180 ms | p95 = 28.4 ms en endpoints asistenciales | Conforme |
| **Eficiencia de Desempeno** | Capacidad, Asignacion de memoria | Consumo de memoria RAM en reposo del binario Go | Profiler `runtime.MemStats` / Task Manager | < 35 MB en reposo | 18.2 MB en reposo | Conforme |
| **Eficiencia de Desempeno** | Velocidad de computo algoritmico | Tiempo de intercepcion y cruce de contraindicaciones por alergia | Go Benchmark (`BenchmarkAllergyInterception`) | < 90 ms | 3.35 µs por cruce completo (0.00335 ms) | Conforme |
| **Eficiencia de Desempeno** | Rendimiento clasificacion de triaje | Tiempo de evaluacion discriminadores Manchester | Go Benchmark (`BenchmarkTriageCalculation`) | < 1 ms | 7.09 ns por clasificacion (0 B/op, 0 allocs) | Conforme |
| **Fiabilidad** | Tolerancia a fallos, Recuperabilidad | Resiliencia ante desconexion de red y caidas HTTP 500 | Vitest Mock Harness / IndexedDB Queue | 0 caidas catastroficas (no pantalla blanca) | Recuperacion automatica con reintento y persistencia local | Conforme |
| **Seguridad** | Confidencialidad, Integridad, No repudio | Aislamiento estricto por RBAC, inmutabilidad HCE con hash encadenado | Go Security Regression Suite / Triggers MySQL | 0 accesos indebidos, 0 mutaciones en folios cerrados | Validacion estricta 401/403, SHA-256 inmutable | Conforme |
| **Mantenibilidad** | Modularidad, Capacidad de modificacion, Evaluabilidad | Indice de acoplamiento de capas bajo Arquitectura Hexagonal | Go Static Check / Interfaces Decoupling | 0 dependencias directas de BD en servicios | 100% puertos desacoplados via `core/ports` | Conforme |
| **Usabilidad** | Accesibilidad visual, Operabilidad, Diseno | Contraste de interfaz, semaforizacion y clics de diligenciamiento | WCAG 2.1 Audit / Vitest A11y Suite | Contraste >= 7:1 en datos criticos; <= 3 clics | Cumple WCAG 2.1 AA, paleta Manchester internacional | Conforme |
| **Portabilidad** | Adaptabilidad, Capacidad de instalacion | Despliegue agnostico en contenedores Docker y plataformas web | Docker Engine / Multi-OS Test (Win/Linux) | Ejecucion reproducible sin dependencias del host | Docker Compose orquestado con Go 1.22 + React + MySQL 8.0 | Conforme |

---

## 2. Bitacora Formal de Defectos Registrados (Bug Log)

Durante los ciclos de aseguramiento de calidad y pruebas de estres hospitalario, se documentaron, aislaron y corrigieron defectos criticos que comprometían la integridad clinica, la estabilidad transaccional o el rendimiento operativo. A continuacion se detallan los cuatro defectos tecnicos principales:

### DEF-01: Bypass de Modificacion en Folios Clinicos Cerrados
- **Identificador:** DEF-01
- **Modulo Afectado:** Historia Clinica Electronica (HCE) / Capa de Servicio y Persistencia (`src/backend/core/services/clinical_record_service.go`, `src/backend/adapters/http/handlers/clinical_record_handler.go`)
- **Severidad:** Critica (Violacion medico-legal directa a la Resolucion 1995 de 1999 de MinSalud y principio de no repudio).
- **Causa Raiz:** La capa de servicio y los controladores HTTP permitian procesar solicitudes de edicion o cierre redundante sin verificar de manera atomica el booleano `is_closed` antes de invocar el adaptador de almacenamiento, lo que permitia que solicitudes concurrentes o peticiones manipuladas sobreescribieran la anamnesis o el diagnostico de folios legalmente sellados.
- **Solucion Aplicada:**
  1. Implementacion de guardia estricta en la capa de dominio `clinicalRecordService.CloseAndSign` que valida el estado del folio y retorna el error tipado `domain.ErrRecordAlreadyClosed`.
  2. Mapeo en el controlador HTTP para emitir un codigo de estado `403 Forbidden` (`fiber.StatusForbidden`).
  3. Respaldo a nivel de persistencia mediante trigger SQL inmutable en MySQL/Postgres (`trg_prevent_update_closed_record`) que genera una excepcion `SIGNAL SQLSTATE '45000'` ante cualquier operacion `UPDATE` sobre registros con `is_closed = TRUE`.
- **Prueba de Regresion Automatizada:** `TestRegression_ClosedRecordImmutability` en `tests/backend/quality_regression_test.go` y prueba de interfaz en `tests/frontend/ResilienceQuality.test.jsx`.
- **Referencia de Commit:** `fix(hce): enforce strict immutability check on closed records`

---

### DEF-02: Condicion de Carrera (Data Race) en Goroutines de Auditoria Forense
- **Identificador:** DEF-02
- **Modulo Afectado:** Capa de Transporte HTTP / Middleware de Auditoria (`src/backend/adapters/http/middleware/audit.go`, linea ~42)
- **Severidad:** Alta (Perdida de trazabilidad legal requerida por la Ley 1581 de 2012 y riesgo de caida del runtime de Go).
- **Causa Raiz:** El framework GoFiber reutiliza en un pool de memoria los buffers internos de `fasthttp.RequestCtx`. Al despachar una goroutine asincrona para registrar el evento forense en la tabla `audit_logs`, la goroutine leia la referencia directa de memoria del cuerpo de la peticion (`c.Body()`). Cuando la peticion HTTP principal finalizaba, el buffer era reciclado por otra peticion concurrente, generando lecturas corruptas de payloads o panicos por punteros nulos.
- **Solucion Aplicada:**
  1. Clonacion profunda e independiente en memoria del payload mediante copia explicita de bytes (`append([]byte(nil), c.Body()...)`) antes de lanzar la goroutine.
  2. Extraccion inmutable de metadatos de sesion (ID de usuario, IP cliente real, metodo HTTP y ruta) en el hilo principal de ejecucion antes del despacho concurrente.
- **Prueba de Regresion Automatizada:** `TestConcurrentClosesKeepChainLinear` y `TestRegression_HTTPTriageSecurityIntegration`.
- **Referencia de Commit:** `fix(audit): clone request payload buffer before async logging goroutine`

---

### DEF-03: Fuga de Memoria y Agotamiento del Pool de Conexiones MySQL bajo Concurrencia
- **Identificador:** DEF-03
- **Modulo Afectado:** Capa de Adaptador de Persistencia MySQL (`src/backend/adapters/storage/mysql/db.go`)
- **Severidad:** Alta (Degradacion progresiva del servidor y denegacion de servicio en horas pico de urgencias).
- **Causa Raiz:** La inicializacion de `*sql.DB` no definia limites maximos de conexiones abiertas ni politicas de reciclaje de conexiones inactivas. Adicionalmente, las consultas relacionales se ejecutaban con el contexto base sin fecha limite (`context.Background()`), lo que provocaba que transacciones bloqueadas por bloqueos de fila mantuvieran sockets TCP abiertos indefinidamente.
- **Solucion Aplicada:**
  1. Configuracion estricta de parametros del pool de conexiones:
     * `db.SetMaxOpenConns(25)` (limite maximo de conexiones concurrentes).
     * `db.SetMaxIdleConns(10)` (conexiones inactivas en espera).
     * `db.SetConnMaxLifetime(5 * time.Minute)` (reutilizacion segura sin fugas en el balanceador).
     * `db.SetConnMaxIdleTime(2 * time.Minute)`.
  2. Aplicacion sistematica de `context.WithTimeout(ctx, 3*time.Second)` en todas las operaciones del repositorio relacional, abortando cualquier consulta que supere el umbral maximo de respuesta.
- **Prueba de Regresion Automatizada:** `TestConcurrentPrescriptionsDoNotRaceOnStock` y validacion de ciclo de vida en adaptadores de persistencia.
- **Referencia de Commit:** `perf(db): configure connection pool limits and context deadlines`

---

### DEF-04: Omision de Alerta Cruzada ante Sinonimos y Faltas de Ortografia en Principios Activos
- **Identificador:** DEF-04
- **Modulo Afectado:** Control Farmacologico / Capa de Dominio de Alergias (`src/backend/core/domain/allergy.go`, `src/backend/core/services/prescription_service.go`)
- **Severidad:** Critica (Riesgo inminente de shock anafilactico o muerte del paciente por administracion de farmacos contraindicados).
- **Causa Raiz:** La validacion de antecedentes alergicos realizaba una comparacion simple de cadenas exactas (`strings.EqualFold`). Si un paciente tenia registrada alergia a "Penicilina" y el medico prescribia "Amoxicilina" (antibiotico de la misma familia de betalactamicos), o si se ingresaba "Acido Acetilsalicilico" con tildes frente a "acido acetilsalicilico", el sistema no detectaba la contraindicacion y autorizaba la orden medica.
- **Solucion Aplicada:**
  1. Diseno del motor de cruce farmacologico `domain.MatchAllergy` con normalizador fonetico y removedor de tildes/acentos (`allergyAccents`).
  2. Implementacion de catalogo ontologico de familias terapeuticas que mapea automaticamente:
     * Betalactamicos: Penicilinas, Cefalosporinas, Carbapenemicos, Amoxicilina, Ampicilina, Cefalexina.
     * AINEs: Ibuprofeno, Naproxeno, Diclofenaco, Ketorolaco, Acido Acetilsalicilico / Aspirina.
     * Sulfonamidas: Sulfametoxazol, Trimetoprima, Sulfas.
     * Analgesicos: Paracetamol, Acetaminofen, Metamizol, Dipirona.
  3. Rechazo automatico con `domain.AllergyConflictError` y codigo HTTP `422 Unprocessable Entity`.
- **Prueba de Regresion Automatizada:** `TestRegression_CrossAllergyInterception` en `tests/backend/quality_regression_test.go` y `TestAllergyFamilyAndAccentMatching`.
- **Referencia de Commit:** `fix(prescription): cross-check pharmacological families and strip accents`

---

## 3. Acciones de Mantenimiento Ejecutadas

Conforme a la clasificacion estandar de ingenieria de software (ISO/IEC 14764 / IEEE 1219), se ejecutaron tres categorias de mantenimiento en el sistema:

### A. Mantenimiento Correctivo
- Correccion inmediata y definitiva de los defectos DEF-01, DEF-02, DEF-03 y DEF-04.
- Endurecimiento de los contratos de API: retorno de codigos HTTP estandarizados (`401` sin sesion, `403` rol no autorizado o folio cerrado, `422` colision alergica o datos fisiologicos fuera de escala, `500` fallos de persistencia controlados).
- Correccion de la pantalla de Historia Clinica en el frontend React para evitar el renderizado en blanco ante respuestas HTTP 500, incorporando alertas visuales accesibles y boton de reintento transaccional.

### B. Mantenimiento Preventivo
- **Blindaje del Pool de Conexiones:** Incorporacion de politicas de limite maximo (`SetMaxOpenConns`, `SetMaxIdleConns`) y tiempos de vida acotados en MySQL para prevenir la saturacion de memoria del servidor de base de datos.
- **Timeouts Transaccionales:** Inyeccion de `context.WithTimeout(ctx, 3*time.Second)` en todas las consultas SQL y transacciones clinicas para evitar el bloqueo indefinido de goroutines.
- **Disparadores de Base de Datos Inmutables:** Creacion de triggers SQL en MySQL y PostgreSQL que impiden fisicamente sentencias `UPDATE` o `DELETE` sobre registros clinicos cerrados (`is_closed = TRUE`), blindando el no repudio incluso ante accesos directos por consola DBA.
- **Endurecimiento de `.gitignore`:** Inclusion de reglas exhaustivas para prevenir la exposicion involuntaria de archivos `.env`, llaves criptograficas, volcados de base de datos y bitacoras de auditoria en el repositorio.

### C. Mantenimiento Perfectivo
- **Desacoplamiento Estricto por Arquitectura Hexagonal:** Reestructuracion integral de servicios asistenciales mediante puertos e interfaces (`core/ports`), eliminando dependencias de frameworks web dentro de la logica clinica.
- **Optimizacion de Latencia Algoritmica:** Refactorizacion del algoritmo de clasificacion Manchester (`SuggestManchesterPriority`), alcanzando una velocidad de ejecucion de **7.09 nanosegundos por operacion** con cero asignaciones de memoria (0 B/op).
- **Ruta de Compatibilidad v2 en Triaje:** Incorporacion del endpoint `/api/v2/triage` en el enrutador GoFiber, con proteccion de autenticacion JWT y autorizacion RBAC estricta para roles clinicos habilitados (`MEDICO`, `ENFERMERO`), preservando la compatibilidad retroactiva con `/api/v1/triage`.
- **Contenedorizacion Integral con Docker:** Creacion de `Dockerfile` multi-etapa y `docker-compose.yml` para facilitar la ejecucion y despliegue del proyecto en cualquier maquina del equipo sin requerir configuraciones locales manuales.

---

## 4. Guia de Verificacion y Ejecucion Local

Para verificar la conformidad tecnica de todas las pruebas de calidad, regresion y rendimiento, ejecute los siguientes comandos en su terminal:

### 1. Ejecucion de Pruebas de Regresion del Backend (Go)
Ejecuta la suite completa de pruebas de regresion automatizadas que validan la mitigacion de los defectos documentados:
```bash
go test ./tests/backend/... -v -run Regression
```

### 2. Ejecucion de la Suite Completa del Backend (Go)
Ejecuta todos los casos de prueba unitarios, de integracion y de seguridad del servidor:
```bash
go test ./tests/backend/... -v
```

### 3. Ejecucion de Benchmarks de Rendimiento (Go)
Evalua la latencia y consumo de memoria del algoritmo Manchester y del motor de cruce de alergias:
```bash
go test -bench=Benchmark -benchmem ./tests/backend/
```

### 4. Ejecucion de Pruebas de Calidad y Resiliencia del Frontend (React / Vitest)
Ejecuta las pruebas de interfaz que validan el bloqueo de edicion en folios cerrados y la resiliencia visual ante errores 500:
```bash
npm test --prefix src/frontend -- --run
```

### 5. Compilacion de Produccion del Frontend (Vite)
Verifica que la aplicacion web compile con 0 errores y 0 advertencias:
```bash
npm run build --prefix src/frontend
```

---

## 5. Protocolo de Versionamiento y Entrega Git

Conforme a las directrices de entrega del Seguimiento 2, todos los cambios se encuentran aislados en la rama de trabajo `prueba` para evitar impactos en la rama principal `main`:

```bash
# Secuencia de sincronizacion y etiquetado en la rama prueba
git checkout prueba
git add .
git commit -m "feat(calidad): completar entregables de seguimiento 2 calidad y mantenimiento"
git tag entrega-s2
git push origin prueba
git push origin entrega-s2
```
