# Cliente Web Asistencial PWA - SaludConecta IPS v2.4

Aplicacion cliente web de grado clinico hospitalario desarrollada con **React 18**, **Vite 5**, **Tailwind CSS 3** y **Lucide Icons**, orientada a estaciones de enfermeria, consultorios medicos y brigadas rurales con soporte offline-first.

---

## 1. Descripcion General y Objetivos Asistenciales

El cliente frontend de «SaludConecta IPS v2.4» proporciona la interfaz operativa para el personal asistencial (Medicos, Enfermeros, Admisionistas y Auditores Clinicos). Ha sido construido bajo la especificacion de diseno oficial de Stitch (Proyecto ID: `3409750822053339349`) y cumple con los requerimientos normativos colombianos:

- **Resolucion 1995 de 1999 (Ministerio de Salud):** Garantia de inmutabilidad del registro de historia clinica, bloqueo estricto de ediciones una vez firmado el folio y trazabilidad mediante cadena de hashes SHA-256.
- **Resolucion 2275 de 2023 (RIPS en JSON):** Estructuracion de datos diagnosticos bajo CIE-11 y compatibilidad para interoperabilidad hospitalaria.
- **Protocolo de Triaje Manchester:** Evaluacion sistematica de constantes vitales con clasificacion automatica en 5 niveles de gravedad y tiempos maximos de atencion.
- **Seguridad Farmacologica:** Intercepcion inmediata (< 150 ms) de prescripciones ante antecedentes alérgicos del paciente (ej. alergia a Betalactamicos).
- **Atencion en Zonas Rurales (Offline-First):** Capacidad de captura local y sincronizacion diferida mediante lotes e identificadores idempotentes UUID v4.

---

## 2. Stack Tecnologico del Frontend

- **Nucleo:** React 18.3.1 con Hooks y programacion declarativa.
- **Herramienta de Construccion y Bundler:** Vite 5.4.
- **Sistema de Diseno y Estilos:** Tailwind CSS 3.4 con tokens clinicos extendidos (`hospital-blue`, `manchester-red`, `manchester-orange`, `manchester-yellow`, `manchester-green`, `manchester-blue`).
- **Iconografia Profesional:** Lucide Icons (`lucide-react`) bajo estricta politica de cero emojis y vectores SVG limpios.
- **Suite de Pruebas Unitarias y de Componentes:** Vitest 1.6 con React Testing Library y Jest-DOM.
- **Cliente de Comunicacion:** Modulo `src/services/api.js` desacoplado, con soporte para consumo de API REST en GoFiber y emulacion offline automatica.

---

## 3. Jerarquia de Componentes y Pantallas

```text
src/frontend/
├── index.html                     # Punto de entrada HTML5 accesible
├── package.json                   # Definicion de dependencias, scripts y herramientas
├── postcss.config.js              # Integracion de Tailwind y Autoprefixer
├── tailwind.config.js             # Configuracion de paleta cromatica y fuentes
├── vite.config.js                 # Configuracion del servidor Vite y resolucion de tests
├── README.md                      # Documentacion de la aplicacion cliente
├── dist/                          # Salida de compilacion optimizada para produccion
└── src/
    ├── main.jsx                   # Renderizado raiz en el DOM
    ├── App.jsx                    # Orquestador principal, estado de sesion y router
    ├── index.css                  # Directivas de Tailwind y estilos base
    ├── setupTests.js              # Configuracion de extensiones jest-dom para Vitest
    ├── components/                # Componentes transversales reutilizables
    │   ├── Header.jsx             # Barra superior con busqueda, estado de red y usuario
    │   ├── Sidebar.jsx            # Menu de navegacion lateral y widget de auditoria SHA-256
    │   └── AllergyAlertModal.jsx  # Modal critico de intercepcion de contraindicaciones
    ├── screens/                   # Pantallas del flujo clinico asistencial
    │   ├── AuthScreen.jsx         # Autenticacion, seleccion de sede y MFA TOTP
    │   ├── DashboardScreen.jsx    # Sala de espera y cola de atencion Manchester
    │   ├── TriageScreen.jsx       # Captura de constantes vitales y escala Glasgow
    │   ├── HceScreen.jsx          # Historia clinica electronica y sellado inmutable
    │   └── PrescriptionScreen.jsx # Prescripcion de medicamentos con validacion cruzada
    └── services/
        └── api.js                 # Capa de integracion con el backend y almacenamiento local
```

---

## 4. Catalogo Detallado de Modulos y Pantallas (Stitch Designs)

Las pantallas replican con total fidelidad las maquetas generadas en Stitch, preservadas como referencia visual en `docs/stitch_designs/`:

### 4.1. Autenticacion Asistencial, Seleccion de Sede y MFA (`AuthScreen.jsx`)
- **Referencia:** Stitch Screen ID `0db8634f0b5e4b45b143f810e254d36d`.
- **Funcionalidad:**
  - Selector de sede asistencial (Sede Principal Hospitalaria, Sede Norte, Brigada Rural Movil).
  - Validacion de credenciales profesionales con politica de complejidad ReTHUS (Registro del Talento Humano en Salud).
  - Segundo factor de autenticacion (MFA TOTP) con teclado numerico de 6 digitos y temporizador de expiracion de 30 segundos.
  - Conmutador de modo de alto contraste para cumplimiento de accesibilidad WCAG AAA en ambientes de urgencias.

### 4.2. Dashboard General y Sala de Espera Asistencial (`DashboardScreen.jsx`)
- **Referencia:** Stitch Screen ID `922c5cd0eba14816ab4246a7d19906d0`.
- **Funcionalidad:**
  - Panel superior con 4 tarjetas de indicadores clave (KPI): Pacientes en espera, Tiempo promedio de atencion, Casos Nivel I/II criticos y Tasa de ocupacion de camas.
  - Filtros rapidos por especialidad (Medicina General, Urgencias, Pediatria, Medicina Interna).
  - Tabla reactiva de sala de espera con badges cromicos segun el Protocolo Manchester (Nivel I Rojo a Nivel V Azul).
  - Acciones directas para llamar a triaje o iniciar consulta medica inmediata.

### 4.3. Modulo de Triaje Manchester y Constantes Vitales (`TriageScreen.jsx`)
- **Referencia:** Stitch Screen ID `fc8fc61291944e01861ebe82d0076eeb`.
- **Funcionalidad:**
  - Formulario de signos vitales: Frecuencia Cardiaca (FC), Presion Arterial Sistolica/Diastolica (PA), Frecuencia Respiratoria (FR), Saturacion de Oxigeno (SpO2) y Temperatura.
  - Evaluacion de la Escala de Coma de Glasgow con particion de equivalencia estricta en el rango valido `[3, 15]`.
  - Disparador preventivo de alertas visuales ante valores fisiologicos incompatibles o extremos.
  - Calculo asistido de la clasificacion Manchester con indicacion del tiempo maximo de espera sugerido.

### 4.4. Historia Clinica Electronica Unificada (`HceScreen.jsx`)
- **Referencia:** Stitch Screen ID `5d3bfae896904b3c8e3f896082882e94`.
- **Funcionalidad:**
  - Banner persistente con datos del paciente, grupo sanguineo, numero de identificacion y badge de alergias activas destacadas en rojo.
  - Conmutador de estado de folio: Modo Borrador (editable) vs Folio Sellado (completamente inmutable, solo lectura).
  - Sistema de 5 pestañas clinicas:
    1. *Anamnesis:* Motivo de consulta y enfermedad actual.
    2. *Diagnosticos CIE-11:* Codificacion estandarizada internacional.
    3. *Plan de Manejo:* Conducta medica, paraclinicos y recomendaciones.
    4. *Cadena Criptografica:* Visualizacion del Hash SHA-256 del folio y Hash previo para garantia forense de no repudio.
    5. *Notas de Evolucion:* Historial cronologico de notas asistenciales.
  - Boton de sellado y firma digital con bloqueo de edicion irreversible segun Resolucion 1995 de 1999.

### 4.5. Prescripcion Medica y Alerta de Contraindicacion (`PrescriptionScreen.jsx`)
- **Referencia:** Stitch Screen ID `4c84fed7f4f24ac691cf4d061b54ee12`.
- **Funcionalidad:**
  - Selector de farmacos con codigo CUM/INVIMA, via de administracion, concentracion y pauta posologica.
  - Calculadora de dosificacion ponderal pediatrica (mg/kg/dia).
  - Motor de validacion de alergias cruzadas en tiempo real: Si se intenta prescribir Amoxicilina, Ampicilina o Penicilina a un paciente alergico a Betalactamicos, se detiene la emision y se activa el modal de alerta critica.
  - Tabla de medicamentos prescritos con opcion de eliminacion de items en borrador.

---

## 5. Componentes de Soporte e Integracion

### 5.1. Modal de Alerta de Contraindicacion (`AllergyAlertModal.jsx`)
Componente modal de maxima severidad disenado bajo la norma ISO 25010 y estandares de seguridad de datos asistenciales. Presenta:
- Detalle del farmaco prescrito y el alergeno registrado que colisiona.
- Explicacion clinica del riesgo de anafilaxia o choque farmacologico.
- Casilla de verificacion obligatoria de asuncion de responsabilidad para desbloquear la accion forzada.
- Opcion recomendada de cancelacion inmediata para seleccionar un farmaco alternativo no betalactamico (ej. Macrolidos como Claritromicina o Azitromicina).

### 5.2. Capa de Servicios y Sincronizacion Offline (`src/services/api.js`)
- Gestiona las llamadas HTTP mediante `fetch` nativo hacia los endpoints del backend en GoFiber.
- Detecta la disponibilidad de red (`navigator.onLine`).
- En ausencia de conexion, almacena las transacciones (triajes, folios y recetas) en una cola de sincronizacion local con claves UUID v4 para transmision por lotes una vez restablecida la conectividad.

---

## 6. Guia de Instalacion y Ejecucion Local

### Prerrequisitos
- Node.js version 18.0.0 o superior.
- npm version 9.0.0 o superior.

### Comandos de Puesta en Marcha

1. **Instalacion de dependencias:**
   ```bash
   cd src/frontend
   npm install
   ```

2. **Ejecucion en servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicacion estara accesible en el navegador en `http://localhost:5173`.

3. **Compilacion para produccion:**
   ```bash
   npm run build
   ```
   Genera los binarios estaticos minificados en la carpeta `dist/`.

4. **Previsualizacion del build de produccion:**
   ```bash
   npm run preview
   ```

---

## 7. Ejecucion de Pruebas Automatizadas

El proyecto incluye pruebas unitarias implementadas con Vitest y React Testing Library que verifican el correcto funcionamiento de los componentes criticos de seguridad:

```bash
cd src/frontend
npm test
```

### Casos Validados en Frontend:
- `tests/frontend/AllergyAlertModal.test.jsx`:
  - Renderizado de la alerta ante medicamentos con antecedentes alergicos confirmados.
  - Bloqueo preventivo del boton de sobreescritura hasta marcar explicitamente la casilla de confirmacion clinica informada.
  - Retorno seguro de cancelacion sin emitir la prescripcion.
