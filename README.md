# Corporacion de Estudios Tecnologicos del Norte del Valle (COTECNOVA)
## Ingenieria de Sistemas - Ingenieria de Software II
### Periodo Academico: 2026-2 | Docente: Felipe Gutierrez Isaza
### Proyecto Final: Sistema Clinico Hospitalario «SaludConecta IPS v2.4»

---

## 1. Descripcion del Proyecto y Arquitectura Tecnica

«SaludConecta IPS v2.4» es un sistema web y asistencial hospitalario disenado para gestionar procesos clinicos criticos: admision y agendamiento, triaje estructurado bajo el protocolo internacional de Manchester, Historia Clinica Electronica (HCE) con sellado criptografico inmutable (Resolucion 1995 de 1999), prescripcion medica con intercepcion de alergias en tiempo real e interoperabilidad normativa mediante RIPS JSON (Resolucion 2275 de 2023) y HL7 FHIR Release 4.

### Stack Tecnologico
- **Backend:** Go 1.22+ estructurado bajo **Arquitectura Hexagonal Estricta (Puertos y Adaptadores)** utilizando el framework web **GoFiber (v2)**.
- **Frontend:** React 18 (Vite, Tailwind CSS, arquitectura de componentes accesibles y PWA).
- **Persistencia de Datos:** MySQL 8.0+ relacional con soporte nativo e intercambiable para PostgreSQL y almacenamiento volatil en memoria para pruebas.
- **Estandar de Calidad:** Evaluado y documentado segun la norma internacional **ISO/IEC 25010**.

---

## 2. Integrantes y Asignacion de Roles

| Nombre del Integrante | Rol Asignado | Responsabilidades Principales |
| :--- | :--- | :--- |
| **Santiago Velez** | Lider Tecnico / Arquitecto de Software | Diseno de arquitectura hexagonal, diseno de interfaces (puertos), coordinacion del stack Go/Fiber y persistencia. |
| **Integrante 2** | Responsable de Pruebas (QA / Testing) | Diseno de casos de prueba con particion de equivalencia y valores limite, automatizacion de suites en Go y React. |
| **Integrante 3** | Responsable de Calidad (ISO/IEC 25010) | Auditoria de caracteristicas de calidad, gestion de la bitacora de defectos y verificacion de estandares de seguridad. |
| **Integrante 4** | Responsable de Documentacion | Redaccion de especificaciones formales de requisitos, normatividad sanitaria (Res. 1995 / 2275) y manuales tecnicos. |

---

## 3. Gestion del Proyecto en Trello

El flujo de trabajo y seguimiento del ciclo de vida del desarrollo se gestiono bajo metodologia agil mediante el tablero oficial de Trello:

- [Tablero de Trello del Equipo](URL_DEL_TABLERO)

### Organizacion de Listas Operativas:
1. **Por hacer (Backlog):** Historias de usuario, requisitos funcionales (RF01 a RF06), diseno de tablas y contratos de API priorizados bajo la tecnica MoSCoW.
2. **En curso (In Progress):** Tareas en desarrollo activo asignadas a los integrantes tecnicos (codificacion de handlers, repositorios e interfaces de usuario).
3. **En revision (In Review / Code Review):** Pull requests, analisis estatico de codigo con `go vet` y revision de adherencia a la arquitectura hexagonal sin fugas de abstraccion.
4. **Hecho (Done):** Incrementos de software verificados con pruebas automatizadas aprobadas al 100%, sin defectos criticos abiertos y documentacion actualizada.

---

## 4. Estructura del Repositorio

El proyecto implementa la siguiente jerarquia fisica estricta:

```text
proyecto-final/
├── README.md                      # Presentacion institucional, roles, ejecucion y Trello
├── .gitignore                     # Exclusion de credenciales, binarios y dependencias
├── .env.example                   # Variables de entorno plantilla sin datos sensibles
├── go.work                        # Workspace de Go para resolucion de modulos
├── docs/
│   ├── especificacion.md          # Alcance, RF (MoSCoW), RNF y Criterios BDD
│   ├── plan-de-pruebas.md         # Particion de equivalencia, valores limite y RTM
│   └── informe-calidad.md         # ISO/IEC 25010, bitacora de defectos y refactorizaciones
├── src/
│   ├── backend/                   # Codigo fuente Go + Fiber (Arquitectura Hexagonal)
│   │   ├── cmd/api/main.go        # Punto de entrada e inyeccion de dependencias
│   │   ├── core/                  # Dominio, puertos y servicios agnosticos
│   │   ├── adapters/              # Adaptadores HTTP (Fiber), Storage (MySQL/PG/Mem) e Interop
│   │   ├── database/schema.sql    # DDL relacional, indices y triggers de inmutabilidad
│   │   └── go.mod                 # Modulo de Go del backend
│   └── frontend/                  # Codigo fuente React (Vite + Tailwind CSS)
└── tests/
    ├── backend/                   # Pruebas automatizadas en Go (Triage, HCE, Alergias)
    └── frontend/                  # Pruebas automatizadas en React (Vitest / Testing Library)
```

---

## 5. Guia de Ejecucion Local

### 5.1. Configuracion de la Base de Datos (MySQL)

1. Conectate a tu motor MySQL local e importa el esquema DDL y disparadores de inmutabilidad:
   ```sql
   CREATE DATABASE IF NOT EXISTS saludconecta_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE saludconecta_db;
   SOURCE src/backend/database/schema.sql;
   ```

2. Configura las variables de entorno creando el archivo `.env` en `src/backend/` a partir de `src/backend/.env.example`.

### 5.2. Puesta en Marcha del Backend (Go)

```powershell
cd src/backend
go run cmd/api/main.go
```
*El servidor HTTP Fiber iniciara en `http://localhost:8080`.*

> **Nota:** Tambien es posible ejecutar en modo volatil en memoria para pruebas rapidas sin requerir base de datos ejecutando `$env:DB_DRIVER="memory"; go run cmd/api/main.go`.

### 5.3. Puesta en Marcha del Frontend (React)

```powershell
cd src/frontend
npm install
npm run dev
```
*La aplicacion web estara disponible en `http://localhost:5173`.*

---

## 6. Ejecucion de Pruebas Automatizadas

### 6.1. Pruebas Automatizadas del Backend (Go)
Desde la raiz del proyecto:
```powershell
go test ./tests/backend/... -v
```

O directamente dentro del directorio `src/backend`:
```powershell
cd src/backend
go test -v ./...
```

### 6.2. Pruebas Automatizadas del Frontend (React)
```powershell
cd src/frontend
npm test
```
*(Ejecuta las suites de renderizado y verificacion de alertas clinicas en `tests/frontend/AllergyAlertModal.test.jsx`).*
