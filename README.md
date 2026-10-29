# Corporacion de Estudios Tecnologicos del Norte del Valle (COTECNOVA)
## Ingenieria de Sistemas - Ingenieria de Software II
### Periodo Academico: 2026-2 | Docente: Felipe Gutierrez Isaza
### Proyecto Final: Sistema Clinico Hospitalario «SaludConecta IPS v2.4»

---

## 1. Descripcion del Proyecto y Arquitectura Tecnica

«SaludConecta IPS v2.4» es un sistema asistencial hospitalario disenado para gestionar procesos clinicos de alta criticidad: admision y agendamiento, triaje estructurado bajo el protocolo internacional de Manchester, Historia Clinica Electronica (HCE) con sellado criptografico inmutable (Resolucion 1995 de 1999), prescripcion medica con intercepcion automatica de alergias farmacologicas en tiempo real e interoperabilidad normativa mediante RIPS JSON (Resolucion 2275 de 2023) y HL7 FHIR Release 4.

### Stack Tecnologico
- **Backend:** Go 1.22+ estructurado bajo **Arquitectura Hexagonal Estricta (Puertos y Adaptadores)** utilizando el framework web de alto rendimiento **GoFiber (v2)**.
- **Frontend:** React 18 (Vite 5, Tailwind CSS 3, Lucide Icons, arquitectura modular de componentes accesibles y soporte PWA para atencion offline y brigadas rurales). Disenado bajo el sistema de diseno oficial de Stitch (Proyecto ID: `3409750822053339349`).
- **Persistencia de Datos:** MySQL 8.0+ relacional con motor InnoDB, integridad referencial estricta, triggers de inmutabilidad y compatibilidad para adaptadores PostgreSQL y almacenamiento volatil en memoria.
- **Estandar de Calidad:** Evaluado, asegurado y documentado bajo el estandar internacional **ISO/IEC 25010** y lineamientos de seguridad OWASP ASVS Nivel 2.

---

## 2. Integrantes y Asignacion de Roles del Equipo

| Nombre del Integrante | Rol Asignado | Responsabilidades Principales |
| :--- | :--- | :--- |
| **Santiago Velez** | Lider Tecnico / Arquitecto de Software | Diseno de arquitectura hexagonal, definicion de puertos y adaptadores, coordinacion tecnica del stack Go/Fiber y persistencia. |
| **Santiago Arcos** | Responsable de Pruebas (QA / Testing) | Diseno de casos de prueba aplicando particion de equivalencia y valores limite, automatizacion de suites en Go y React. |
| **Juan Jose Sanchez** | Responsable de Calidad (ISO/IEC 25010) | Evaluacion de caracteristicas de calidad ISO 25010, bitacora de defectos (DEF-01 a DEF-04) y verificacion de seguridad. |
| **Santiago Velez, Santiago Arcos y Juan Jose Sanchez** | Responsables de Documentacion | Elaboracion de especificaciones formales de requisitos, marco normativo (Res. 1995 / 2275), criterios BDD y manuales tecnicos. |

---

## 3. Gestion del Proyecto en Trello

El flujo de trabajo, la priorizacion de requerimientos y el ciclo de vida del desarrollo se gestionaron mediante el tablero oficial de Trello:

- [Tablero de Trello del Equipo](https://trello.com/b/HUUP8uyu/proyecto-de-felipe)

### Organizacion de las Listas Operativas:
1. **Por hacer (Backlog):** Requisitos funcionales (RF01 a RF06) priorizados mediante tecnica MoSCoW, diseno de modelos de dominio y contratos de interfaces.
2. **En curso (In Progress):** Modulos y adaptadores en desarrollo activo (handlers HTTP, repositorios MySQL/Postgres y componentes de interfaz de usuario).
3. **En revision (In Review / Code Review):** Inspeccion de codigo estricta, analisis estatico con `go vet` y verificacion de desacoplamiento de capas segun la Arquitectura Hexagonal.
4. **Hecho (Done):** Incrementos de software con pruebas automatizadas aprobadas (100% pass), sin defectos criticos abiertos y con trazabilidad documental completa.

---

## 4. Estructura Exacta del Repositorio

El proyecto implementa la jerarquia fisica de archivos y directorios requerida:

```text
proyecto-final/
├── README.md                      # Presentacion institucional, roles, ejecucion y Trello
├── .gitignore                     # Exclusion de credenciales, binarios y dependencias
├── .env.example                   # Variables de entorno plantilla sin datos sensibles
├── go.work                        # Workspace de Go para resolucion multi-modulo
├── docs/
│   ├── especificacion.md          # Alcance, RF (MoSCoW), RNF y Criterios BDD (Gherkin)
│   ├── plan-de-pruebas.md         # Particion de equivalencia, valores limite y matriz RTM
│   ├── informe-calidad.md         # ISO/IEC 25010, bitacora de defectos y refactorizaciones
│   └── stitch_designs/            # Maquetas visuales y capturas oficiales de Stitch
│       ├── 01_auth_mfa.html (.png)         # Autenticacion, Sede y MFA TOTP
│       ├── 02_dashboard_espera.html (.png) # Sala de espera y cola Manchester
│       ├── 03_historia_clinica_hce.html (.png) # HCE Unificada e inmutabilidad
│       ├── 04_triaje_manchester.html (.png)    # Constantes vitales y Glasgow
│       └── 05_prescripcion_alergia.html (.png) # Prescripcion e intercepcion
├── src/
│   ├── backend/                   # Codigo fuente Go + Fiber (Arquitectura Hexagonal)
│   │   ├── cmd/api/main.go        # Punto de entrada e inyeccion de dependencias
│   │   ├── core/                  # Dominio, puertos y logica de servicios agnostica
│   │   │   ├── domain/            # Entidades puras (Patient, Triage, Record, Prescription)
│   │   │   ├── ports/             # Interfaces de entrada y salida (Driving/Driven)
│   │   │   └── services/          # Casos de uso y reglas de negocio clinicas
│   │   ├── adapters/              # Adaptadores HTTP (Fiber), Storage (MySQL/PG/Mem) e Interop
│   │   │   ├── http/              # Handlers Fiber, DTOs y middlewares
│   │   │   ├── storage/           # Implementaciones de persistencia relacional y volatil
│   │   │   └── interop/           # Adaptadores RIPS JSON y HL7 FHIR
│   │   ├── database/schema.sql    # DDL relacional, indices y triggers de inmutabilidad
│   │   ├── pkg/                   # Utilidades transversales (crypto, logger)
│   │   ├── go.mod                 # Modulo de Go del backend
│   │   └── go.sum                 # Sumas criptograficas del backend
│   └── frontend/                  # Codigo fuente de React (Vite 5 + Tailwind CSS 3 + Lucide Icons)
│       ├── index.html             # Plantilla HTML5 accesible
│       ├── package.json           # Dependencias, scripts de ejecucion y herramientas
│       ├── postcss.config.js      # Configuracion de PostCSS
│       ├── tailwind.config.js     # Tokens de diseno, paleta clinica y extensiones
│       ├── vite.config.js         # Configuracion de Vite y enrutamiento de tests
│       ├── README.md              # Guia detallada del cliente web y componentes
│       └── src/
│           ├── main.jsx           # Renderizado raiz de React 18
│           ├── App.jsx            # Enrutador de pantallas y estado de sesion
│           ├── index.css          # Importaciones de Tailwind y estilos globales
│           ├── setupTests.js      # Configuracion Jest-DOM para pruebas Vitest
│           ├── components/        # Componentes UI reutilizables
│           │   ├── Header.jsx     # Barra superior, busqueda de pacientes y modo offline
│           │   ├── Sidebar.jsx    # Menu de navegacion lateral y widget SHA-256
│           │   └── AllergyAlertModal.jsx # Modal critico de intercepcion de contraindicaciones
│           ├── screens/           # Pantallas del flujo clinico asistencial
│           │   ├── AuthScreen.jsx # Login asistencial, sede, password ReTHUS y MFA TOTP
│           │   ├── DashboardScreen.jsx # Indicadores KPI y sala de espera Manchester
│           │   ├── TriageScreen.jsx    # Captura de constantes vitales y escala Glasgow
│           │   ├── HceScreen.jsx  # Historia clinica, pestañas y sellado inmutable
│           │   └── PrescriptionScreen.jsx # Prescripcion e intercepcion farmacologica
│           └── services/
│               └── api.js         # Cliente API desacoplado con fallback offline
└── tests/
    ├── backend/                   # Pruebas automatizadas en Go (Triage, HCE, Alergias, Sync)
    │   ├── triage_test.go         # Particion de equivalencia y valores limite Manchester
    │   ├── clinical_record_test.go# Verificacion de inmutabilidad y rechazo a modificaciones
    │   ├── prescription_test.go   # Intercepcion de alergias farmacologicas (< 150 ms)
    │   ├── sync_test.go           # Sincronizacion offline por lotes e idempotencia (UUID v4)
    │   ├── fixtures_test.go       # Generadores de datos de prueba
    │   ├── go.mod                 # Modulo de pruebas de Go
    │   └── go.sum                 # Sumas criptograficas del modulo de pruebas
    └── frontend/                  # Pruebas automatizadas en React
        └── AllergyAlertModal.test.jsx # Verificacion de componente modal ante contraindicaciones
```

---

## 5. Guia de Ejecucion Local

### 5.1. Configuracion de la Base de Datos (MySQL)

1. Conectate a tu motor local de MySQL e importa el esquema DDL y los disparadores de auditoria:
   ```sql
   CREATE DATABASE IF NOT EXISTS saludconecta_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE saludconecta_db;
   SOURCE src/backend/database/schema.sql;
   ```

2. Configura las variables de entorno para el backend creando el archivo `.env` en `src/backend/` tomando como referencia `src/backend/.env.example` o `.env.example` en la raiz.

### 5.2. Puesta en Marcha del Backend (Go)

Desde la terminal en la raiz del proyecto:
```powershell
cd src/backend
go run cmd/api/main.go
```
*El servicio HTTP de GoFiber iniciara escuchando en el puerto configurado (por defecto `http://localhost:8080`).*

> **Nota:** Para ejecutar el backend en modo volatil en memoria (sin requerir MySQL ni PostgreSQL para pruebas rapidas), define la variable de entorno antes de ejecutar: `$env:DB_DRIVER="memory"; go run cmd/api/main.go`.

### 5.3. Puesta en Marcha del Frontend (React)

```powershell
cd src/frontend
npm install
npm run dev
```
*El servidor de desarrollo Vite servira la aplicacion web asistencial en `http://localhost:5173`.*

---

## 6. Instrucciones para Ejecutar las Pruebas Automatizadas

### 6.1. Pruebas Automatizadas del Backend (Go)

Las pruebas automatizadas de caja blanca y de integracion logica se ejecutan con la herramienta nativa de Go:

1. **Desde la raiz del proyecto (utilizando el workspace de pruebas):**
   ```powershell
   go test ./tests/backend/... -v
   ```

2. **O ingresando directamente al modulo de pruebas de backend:**
   ```powershell
   cd tests/backend
   go test -v ./...
   ```

3. **Para ejecutar las pruebas internas de los servicios del backend:**
   ```powershell
   cd src/backend
   go test -v ./...
   ```

### 6.2. Pruebas Automatizadas del Frontend (React)

```powershell
cd src/frontend
npm test
```
*Ejecuta la suite de pruebas unitarias sobre los componentes asistenciales con Vitest, validando la intercepcion preventiva ante alertas criticas de seguridad farmacologica.*

---

## 7. Documentacion Tecnica y Normativa

Para consultar el detalle formal de la ingenieria del proyecto, accede a los documentos tecnicos en el directorio `docs/` y guias especificas de modulo:

1. [Especificacion de Requisitos de Software (`docs/especificacion.md`)](docs/especificacion.md):
   - Marco regulatorio: Resolucion 1995 de 1999 (HCE) y Resolucion 2275 de 2023 (RIPS).
   - Requisitos Funcionales (RF01 a RF06) clasificados bajo la metodologia MoSCoW.
   - Requisitos No Funcionales (RNF): latencia p95 < 400 ms, trazabilidad con Correlation-ID y seguridad OWASP ASVS Nivel 2.
   - Escenarios de aceptacion formales en formato BDD (Dado-Cuando-Entonces / Gherkin).

2. [Plan de Pruebas y Tecnicas de Diseno (`docs/plan-de-pruebas.md`)](docs/plan-de-pruebas.md):
   - Particion de Equivalencia y Analisis de Valores Limite (Escala de Glasgow [3, 15], Frecuencia Cardiaca, Presion Arterial y Dosificacion Pediatrica).
   - Casos de prueba disenados y Matriz de Trazabilidad de Requisitos (RTM).

3. [Informe de Calidad ISO/IEC 25010 (`docs/informe-calidad.md`)](docs/informe-calidad.md):
   - Evaluacion de las 6 caracteristicas esenciales de calidad de software.
   - Bitacora de defectos tecnicos registrados durante el ciclo de vida (DEF-01 a DEF-04).
   - Medidas de mantenimiento preventivo y refactorizacion implementadas.

4. [Guia del Cliente Web y Arquitectura Frontend (`src/frontend/README.md`)](src/frontend/README.md):
   - Especificaciones de arquitectura del cliente React 18, Vite 5 y Tailwind CSS.
   - Catalogo de pantallas basado en el diseno Stitch y soporte de operacion offline.
   - Procedimiento de ejecucion y pruebas unitarias con Vitest.

5. [Disenos y Capturas de Interfaz Stitch (`docs/stitch_designs/`)](docs/stitch_designs/):
   - Maquetas HTML y capturas PNG oficiales de las 5 pantallas asistenciales implementadas.
