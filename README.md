# Corporacion de Estudios Tecnologicos del Norte del Valle (COTECNOVA)
## Ingenieria de Sistemas - Ingenieria de Software II
### Periodo Academico: 2026-2 | Docente: Felipe Gutierrez Isaza
### Proyecto Final: Sistema Clinico Hospitalario «SaludConecta IPS v2.4»

---

## 1. Descripcion del Proyecto y Arquitectura Tecnica

«SaludConecta IPS v2.4» es un sistema asistencial hospitalario disenado para gestionar procesos clinicos de alta criticidad: admision y agendamiento, triaje estructurado bajo el protocolo internacional de Manchester, Historia Clinica Electronica (HCE) con sellado criptografico inmutable (Resolucion 1995 de 1999), prescripcion medica con intercepcion automatica de alergias farmacologicas en tiempo real e interoperabilidad normativa mediante RIPS JSON (Resolucion 2275 de 2023) y HL7 FHIR Release 4.

### Stack Tecnologico
- **Backend:** Go 1.22+ estructurado bajo **Arquitectura Hexagonal Estricta (Puertos y Adaptadores)** utilizando el framework web de alto rendimiento **GoFiber (v2)**.
- **Frontend:** React 18 (Vite, Tailwind CSS, arquitectura modular de componentes accesibles y soporte PWA para atencion offline).
- **Persistencia de Datos:** MySQL 8.0+ relacional con motor InnoDB, integridad referencial estricta, triggers de inmutabilidad y compatibilidad para adaptadores PostgreSQL y almacenamiento volatil en memoria.
- **Estandar de Calidad:** Evaluado, asegurado y documentado bajo el estandar internacional **ISO/IEC 25010** y lineamientos de seguridad OWASP ASVS Nivel 2.

---

## 2. Integrantes y Asignacion de Roles del Equipo

| Nombre del Integrante | Rol Asignado | Responsabilidades Principales |
| :--- | :--- | :--- |
| **Santiago Velez** | Lider Tecnico / Arquitecto de Software | Diseno de arquitectura hexagonal, definicion de puertos y adaptadores, coordinacion tecnica del stack Go/Fiber y persistencia. |
| **Integrante 2** | Responsable de Pruebas (QA / Testing) | Diseno de casos de prueba aplicando particion de equivalencia y valores limite, automatizacion de suites en Go y React. |
| **Integrante 3** | Responsable de Calidad (ISO/IEC 25010) | Evaluacion de caracteristicas de calidad ISO 25010, bitacora de defectos (DEF-01 a DEF-04) y verificacion de seguridad. |
| **Integrante 4** | Responsable de Documentacion | Elaboracion de especificaciones formales de requisitos, marco normativo (Res. 1995 / 2275), criterios BDD y manuales. |

---

## 3. Gestion del Proyecto en Trello

El flujo de trabajo, la priorizacion de requerimientos y el ciclo de vida del desarrollo se gestionaron mediante el tablero oficial de Trello:

- [Tablero de Trello del Equipo](URL_DEL_TABLERO)

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
│   └── informe-calidad.md         # ISO/IEC 25010, bitacora de defectos y refactorizaciones
├── src/
│   ├── backend/                   # Codigo fuente Go + Fiber (Arquitectura Hexagonal)
│   │   ├── cmd/api/main.go        # Punto de entrada e inyeccion de dependencias
│   │   ├── core/                  # Dominio, puertos y logica de servicios agnostica
│   │   ├── adapters/              # Adaptadores HTTP (Fiber), Storage (MySQL/PG/Mem) e Interop
│   │   ├── database/schema.sql    # DDL relacional, indices y triggers de inmutabilidad
│   │   ├── pkg/                   # Utilidades transversales (crypto, logger)
│   │   ├── go.mod                 # Modulo de Go del backend
│   │   └── go.sum                 # Sumas criptograficas del backend
│   └── frontend/                  # Codigo fuente de React (Vite + Tailwind CSS)
│       └── README.md              # Guia del cliente web y componentes de interfaz
└── tests/
    ├── backend/                   # Pruebas automatizadas en Go (Triage, HCE, Alergias)
    │   ├── triage_test.go         # Particion de equivalencia y valores limite Manchester
    │   ├── clinical_record_test.go# Verificacion de inmutabilidad y rechazo a modificaciones
    │   ├── prescription_test.go   # Intercepcion de alergias farmacologicas (< 150 ms)
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
*Ejecuta la suite de pruebas unitarias sobre los componentes asistenciales, validando la reaccion ante alertas criticas de seguridad farmacologica.*

---

## 7. Documentacion Tecnica y Normativa

Para consultar el detalle formal de la ingenieria del proyecto, accede a los documentos tecnicos en el directorio `docs/`:

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
