# Informe Integral de Aseguramiento de Calidad y Pruebas (QA)
## Plataforma Clínica Hospitalaria «SaludConecta IPS v2.4» — Versión Actualizada

---

### Control Institucional del Documento
- **Institución:** Corporación de Estudios Tecnológicos del Norte del Valle (COTECNOVA)
- **Programa Académico:** Ingeniería de Sistemas — Asignatura: Ingeniería de Software II (Periodo 2026-2)
- **Docente Titular:** Ing. Felipe Gutiérrez Isaza
- **Responsable de Pruebas (QA / Testing Lead):** **Santiago Arcos**
- **Destinatarios / Compañeros de Equipo:**
  - **Santiago Vélez** (Líder Técnico / Arquitecto de Software)
  - **Juan José Sánchez** (Responsable de Calidad ISO/IEC 25010)
- **Proyecto Evaluado:** Sistema Clínico Hospitalario «SaludConecta IPS v2.4» (Actualización Entrega-s2 con nuevos módulos clínicos)
- **Hito / Tag de Entrega:** `Entrega-s2` (Seguimiento 2: Calidad, Pruebas y Mantenimiento)
- **Estándares Aplicados:** **ISO/IEC/IEEE 29119** (Software Testing), **ISO/IEC 25010** (Product Quality), **ISO/IEC 14764** (Mantenimiento), **OWASP ASVS v4.0.3 Nivel 2**, **Resolución 1995 de 1999** (MinSalud HCE), **Resolución 2275 de 2023** (RIPS JSON) y **Ley 1581 de 2012** (Habeas Data).

---

## 1. Resumen Ejecutivo del Estado del Proyecto Actualizado

El presente informe ha sido elaborado por **Santiago Arcos** para entregar al equipo de desarrollo el estado cuantitativo y cualitativo de las pruebas de QA sobre la versión actualizada del proyecto, detallando los puntos de verificación superados y la **guía técnica de correcciones y precauciones** necesarias para mantener el 100% de conformidad en la entrega académica.

### Resumen de Resultados de Ejecución
- **Frontend (React 18 + Vitest + Testing Library):**
  - **14 suites de prueba** ejecutadas de forma íntegra.
  - **105 pruebas unitarias y de integración APROBADAS (100% PASS)** en un tiempo de ejecución de 15.99s.
  - Compilación de producción con Vite (`npm run build`) **100% exitosa** (generación limpia de bundles en `dist/` en 9.10s sin errores de tipado o dependencias faltantes).
- **Backend (Go 1.22+ & Fiber v2):**
  - Incorporación y validación de las nuevas suites de dominio:
    - `anatomical_notes_test.go`: Inmutabilidad de notas sobre folios cerrados y restricción exclusiva a facultativos médicos.
    - `appointment_test.go`: Rechazo de fechas pasadas, control de solapamiento de 20 minutos por médico y generación de PDF/email.
    - `health_education_test.go`: Control de autoría médica, categorización y límite estricto de duración de video a 120 segundos.
    - `pharmacy_dispensation_test.go`: Validación de cédula escaneada vía PDF417, deducción atómica de inventario y bloqueo de doble dispensación.
    - `quality_regression_test.go`: Blindaje contra los defectos DEF-01 a DEF-04 y endpoints compatibles `/api/v2/triage`.
    - `performance_benchmark_test.go`: Algoritmo Manchester en 5.55 ns/op e intercepción de alergias en 3.23 µs/op.

---

## 2. Inventario de Pruebas Ejecutadas en el Nuevo Proyecto

### 2.1. Capa Frontend: 14 Suites / 105 Pruebas Aprobadas (Vitest)

| Archivo de Prueba | Tests | Foco de Verificación | Estado |
| :--- | :---: | :--- | :---: |
| `DoctorLayout.test.jsx` | 6 | Menú asistencial, Header con tarjeta ReTHUS y ProfileScreen con 5 banners médicos | **PASS** |
| `PatientFlow.test.jsx` | 10 | Selección por API, búsqueda por documento (404), alta de pacientes y registro de alergias | **PASS** |
| `AuthMfa.test.jsx` | 14 | Desafío TOTP RFC 6238 en login, bloqueo tras 5 intentos, expiración de sesión y setup MFA | **PASS** |
| `ClinicalScreens.test.jsx` | 11 | Carga de folios reales, visualización de hash SHA-256, alertas 422 de alergias y nivel Manchester | **PASS** |
| `AdminGovernance.test.jsx` | 23 | Registro ReTHUS inactivo, activación administrativa, bitácora forense real y sedes | **PASS** |
| `MedicalKit.test.jsx` | 7 | Escala Visual Analógica EVA (0-10), descriptores de dolor y Muro de Salud comunitario | **PASS** |
| `AdminOrgChartAndBranches.test.jsx` | 6 | Organigrama institucional, creación dinámica de sedes y menú lateral administrativo | **PASS** |
| `ResilienceQuality.test.jsx` | 2 | Manejo accesible de caídas HTTP 500 sin pantalla blanca y bloqueo de campos en folios cerrados | **PASS** |
| `NurseModules.test.jsx` | 2 | Resumen clínico de enfermería, fármacos activos, notas de evolución y checklist de tareas | **PASS** |
| `totp.test.js` | 18 | Vectores RFC 6238 oficiales en Web Crypto y HMAC-SHA1 en JS puro | **PASS** |
| `PharmacyDashboard.test.jsx` | 2 | Buzón de recetas con escáner PDF417 y control de inventario con ajuste y baja de stock | **PASS** |
| `AllergyAlertModal.test.jsx` | 2 | Intercepción visual de alergias con borde rojo, estilo `bg-red-50` y contraste WCAG AAA | **PASS** |
| `TreatmentFollowUpView.test.jsx` | 1 | Prescripción por concentración/dosis, liquidación con cobertura EPS y datos del paciente | **PASS** |
| `DoctorAppointmentsView.test.jsx` | 1 | Calendario médico, agendamiento con validación y confirmación en PDF | **PASS** |
| **TOTAL GENERAL FRONTEND** | **105** | **14 suites aprobadas con 0 fallos** | **100% PASS** |

---

## 3. Guía de Correcciones, Observaciones Críticas y Puntos de Atención para el Compañero

Para asegurar que el backend y los nuevos componentes pasen las pruebas en cualquier entorno sin romper la arquitectura ni las reglas legales de la IPS, el compañero desarrollador debe verificar minuciosamente los siguientes **5 puntos críticos**:

### 1. Módulo de Citas y Calendario Médico (`appointment_service.go` & Handlers)
- **Regla de No Retroactividad:** Las citas cuya fecha/hora sea anterior a `time.Now()` deben ser rechazadas de inmediato con `domain.ErrAppointmentInPast` (HTTP 422).
- **Regla de Solapamiento de Agenda (20 minutos):** El servicio valida que un médico no tenga dos citas asignadas con una diferencia menor a 20 minutos. El compañero debe verificar que en las consultas SQL/repositorio no se ignoren citas con estado `SCHEDULED` para el mismo `doctor_id`.
- **Generación de Archivos Temporales PDF:** El generador de PDF requiere un directorio temporal con permisos de escritura. Verificar que la variable o ruta por defecto no falle en entornos Linux/Docker con permisos restringidos.

### 2. Módulo de Notas Anatómicas 3D (`clinical_record_service.go`)
- **Restricción Estricta de Rol (Médico Exclusivo):** Únicamente usuarios con `RoleName == "MEDICO"` (`RoleID == 2`) y tarjeta profesional activa pueden agregar, modificar o eliminar notas anatómicas. Si un enfermero (`ENFERMERO`) o personal de admisión lo intenta, debe retornar invariablemente `domain.ErrUnauthorizedRole` (HTTP 403 Forbidden).
- **Inmutabilidad Post-Cierre (Resolución 1995 de 1999):** Una vez que el folio clínico es firmado y cerrado (`is_closed = true`), **queda estrictamente prohibido** agregar nuevas notas anatómicas o mutar las existentes. La capa de servicio debe arrojar `domain.ErrRecordAlreadyClosed` (HTTP 403/409).
- **Propiedad del Folio (Anti-IDOR):** Un médico no puede editar ni borrar la nota registrada por otro colega (`domain.ErrNotRecordOwner` / HTTP 403).

### 3. Muro de Salud y Educación Comunitaria (`health_education_service.go`)
- **Límite de Duración de Video (Máximo 120 Segundos):** Si el payload incluye un `video_duration_sec > 120`, el backend debe rechazar la solicitud con `domain.ErrVideoDurationTooLong` (HTTP 422).
- **Permisos de Autoría:** Solo el facultativo médico puede crear (`CreatePost`), editar (`UpdatePost`) o eliminar (`DeletePost`). Roles de enfermería tienen permiso exclusivo de consulta/lectura (`ListPosts`).

### 4. Módulo de Farmacia, Coberturas y Lector PDF417 (`pharmacy_service.go`)
- **Cotejo Obligatorio de Cédula Escaneada:** Al momento de dispensar mediante `POST /api/v1/pharmacy/dispense`, el campo `patient_document` (leído por el escáner del código de barras PDF417 de la cédula física) debe coincidir con el documento registrado en la receta médica. Si difieren, debe abortar con `domain.ErrDocumentMismatch` (HTTP 422/409) para prevenir suplantaciones y entregas erróneas.
- **Protección contra Doble Dispensación:** Si la receta ya tiene estado `DISPENSED`, cualquier segundo intento de despacho debe arrojar `domain.ErrAlreadyDispensed` (HTTP 409 Conflict).
- **Deducción Atómica de Inventario:** El decremento de stock en `inventory_items` debe realizarse en la misma transacción para evitar inconsistencias o saldos negativos bajo concurrencia.

### 5. Configuración de Entorno, Seguridad y Despliegue
- **Secretos Obligatorios:** El servidor Go nunca debe arrancar si `JWT_SECRET` tiene menos de 32 caracteres o utiliza valores publicados en plantillas.
- **Bootstrap Administrativo:** Verificar que en `.env` existan `ADMIN_INITIAL_EMAIL` y `ADMIN_INITIAL_PASSWORD` (mínimo 12 caracteres), dado que el sistema no contiene cuentas precargadas por política de seguridad OWASP.
- **Instalación de Dependencias Frontend:** Todo miembro que ejecute las pruebas en local debe correr previamente `npm install` en `src/frontend` para garantizar la presencia de Vitest y las extensiones de `jest-dom`.

---

## 4. Matriz de Trazabilidad de Requisitos de la Versión Actualizada (RTM)

| Requisito / Módulo | Descripción Técnica | Pruebas Automatizadas Asociadas | Estado QA |
| :--- | :--- | :--- | :---: |
| **RF01: Autenticación & MFA** | JWT dual, revocación inmediata y TOTP RFC 6238 en servidor | `auth_security_test.go`, `totp.test.js`, `AuthMfa.test.jsx` | **APROBADO** |
| **RF02: Triaje Manchester** | Clasificación algorítmica Manchester y rangos fisiológicos | `triage_test.go`, `triage_security_test.go`, `quality_regression_test.go` | **APROBADO** |
| **RF03: Inmutabilidad HCE** | Bloqueo absoluto post-cierre y triggers SQL | `clinical_record_test.go`, `quality_regression_test.go`, `ResilienceQuality.test.jsx` | **APROBADO** |
| **RF04: Cadena SHA-256** | Hash encadenado lineal sin bifurcaciones concurrentes | `clinical_chain_test.go`, `mysql_integration_test.go` | **APROBADO** |
| **RF05: Alergias Farmacológicas** | Cruce por familias (Betalactámicos) y normalización de tildes | `prescription_test.go`, `prescription_security_test.go`, `AllergyAlertModal.test.jsx` | **APROBADO** |
| **RF06: Sincronización Rural** | Lotes offline idempotentes con UUID v4 y autoria del servidor | `sync_test.go` | **APROBADO** |
| **RF07-08: Gobernanza ReTHUS** | Cuentas inactivas por defecto y aislamiento AdminLayout | `admin_governance_test.go`, `staff_register_routes_test.go`, `AdminGovernance.test.jsx` | **APROBADO** |
| **RF09-10: UI & Resiliencia F5** | Sidebar colapsable, persistencia F5 y tolerancia a fallos 500 | `DoctorLayout.test.jsx`, `ResilienceQuality.test.jsx` | **APROBADO** |
| **RF11: Admisión de Pacientes** | Registro, catálogos estrictos y validación de duplicados (409) | `patient_api_test.go`, `PatientFlow.test.jsx` | **APROBADO** |
| **RF12: Farmacia & Stock V2** | Dispensación, inventario, liquidación y lector PDF417 | `pharmacy_dispensation_test.go`, `PharmacyDashboard.test.jsx`, `TreatmentFollowUpView.test.jsx` | **APROBADO** |
| **NUEVO: Notas Anatómicas 3D** | Notas clínicas por capas, dolor y bloqueo en folios cerrados | `anatomical_notes_test.go` | **APROBADO** |
| **NUEVO: Citas Médicas** | Calendario, solapamiento de 20 min y rechazo de fechas pasadas | `appointment_test.go`, `DoctorAppointmentsView.test.jsx` | **APROBADO** |
| **NUEVO: Muro Educativo & EVA** | Escala de dolor EVA 0-10, videos $\le 120\text{s}$ y autoría médica | `health_education_test.go`, `MedicalKit.test.jsx` | **APROBADO** |
| **NUEVO: Módulos Enfermería** | Resumen clínico, checklist de tareas y notas de evolución | `NurseModules.test.jsx` | **APROBADO** |
| **NUEVO: Sedes Dinámicas** | Registro dinámico de sedes institucionales en administración | `AdminOrgChartAndBranches.test.jsx` | **APROBADO** |

---

## 5. Comandos de Consola para Reproducción Inmediata

Pasa estos comandos al compañero para que reproduzca y valide la suite completa en su entorno:

```powershell
# ====================================================================
# 1. PRUEBAS DEL CLIENTE FRONTEND (React 18 + Vitest)
# ====================================================================
cd src/frontend
npm install
npm test -- --run
npm run build

# ====================================================================
# 2. PRUEBAS DEL NÚCLEO BACKEND (Go 1.22+)
# ====================================================================
# Ejecutar todas las pruebas unitarias y de integración
go test ./tests/backend/... -v

# Ejecutar con detector de condiciones de carrera (Race Detector)
go test -race -count=1 ./tests/backend/...

# Ejecutar los benchmarks de rendimiento algorítmico
go test -bench=Benchmark -benchmem ./tests/backend/ -run=^$

# ====================================================================
# 3. VERIFICACIÓN INTEGRAL CON DOCKER COMPOSE (Recomendado)
# ====================================================================
# Copiar plantilla y configurar variables privadas obligatorias
cp .env.example .env
# Iniciar servicios orquestados (MySQL 8, Go API, Frontend Nginx)
docker compose up --build
```

---

## 6. Dictamen de Calidad

El proyecto actualizado cumple con una arquitectura robusta, modular y desacoplada bajo lineamientos **ISO/IEC 25010** y **ISO/IEC/IEEE 29119**. Implementando las 5 recomendaciones técnicas descritas en la sección 3, el sistema garantiza un pase perfecto de auditoría de código y sustentación final.

---
**Dictamen:** **APROBADO PARA SUSTENTACIÓN (100% SUITES CONFORMES)**  
**Santiago Arcos**  
*Responsable de Pruebas (QA / Testing Lead)*  
*Ingeniería de Software II — COTECNOVA 2026-2*
