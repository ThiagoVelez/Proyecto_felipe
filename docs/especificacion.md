# Especificacion de Requisitos de Software: SaludConecta IPS v2.4

## 1. Proposito del Sistema y Marco Normativo

«SaludConecta IPS v2.4» es una plataforma de software hospitalario orientada a la gestion asistencial, interoperabilidad y seguridad del paciente en instituciones prestadoras de servicios de salud en Colombia. El diseno del sistema cumple estrictamente con el marco legal sanitario nacional e internacional:

- **Resolucion 1995 de 1999 (Ministerio de Salud y Proteccion Social):** Establece las normas para el manejo de la Historia Clinica. Dictamina el caracter reservado, confidencial, integro y secuencial de los registros clinicos. Impone la prohibicion de tachaduras, enmendaduras o eliminaciones de folios previamente guardados, exigiendo notas aclaratorias como unico mecanismo formal para complementar un folio cerrado.
- **Resolucion 2275 de 2023 (Ministerio de Salud y Proteccion Social):** Reglamenta el Registro Individual de Prestacion de Servicios de Salud (RIPS) soportado en la Factura Electronica de Venta en Salud (FEVS) bajo estructura JSON y codificacion estandar (CUPS, CIE-11 y CUM).
- **Estandar ISO/IEC 25010:** Marco de evaluacion de la calidad del producto software, priorizando adecuacion funcional, fiabilidad, seguridad, eficiencia de desempeno y mantenibilidad.

---

## 2. Requisitos Funcionales (Priorizacion MoSCoW)

| Codigo | Nombre del Requisito | Descripcion Detallada | Prioridad MoSCoW |
| :--- | :--- | :--- | :--- |
| **RF01** | Autenticacion, MFA y Roles RBAC | Control de acceso basado en roles (MEDICO, ENFERMERO, ADMISION, AUDITOR, ADMIN) con tokens JWT (HS256) y autenticacion multifactor obligatoria mediante algoritmo TOTP (RFC 6238). | **Must Have** |
| **RF02** | Triaje Manchester y Guardia Fisiologica | Valoracion en urgencias con semaforizacion automatica en 5 niveles (Nivel I a V) segun constantes vitales e intercepcion preventiva de rangos fisiologicos incompatibles (Glasgow < 3 o > 15, FC <= 0, etc.). | **Must Have** |
| **RF03** | HCE e Inmutabilidad Absoluta | Registro de atencion clinica con bloqueo de modificacion post-cierre. Una vez firmado electronicamente el folio, cualquier peticion de mutacion es rechazada con HTTP 403/409 y protegida por triggers a nivel de BD. | **Must Have** |
| **RF04** | Cadena Criptografica SHA-256 | Calculo determinista de hash SHA-256 encadenado que incorpora el hash del folio previo del paciente, asegurando trazabilidad contra alteraciones o ataques de sustitucion. | **Must Have** |
| **RF05** | Intercepcion Farmacologica de Alergias | Cruce de seguridad en tiempo real entre el principio activo del catalogo CUM recetado y los antecedentes alergicos del paciente. Respuesta en < 150 ms bloqueando prescripciones conflictivas (ej. Betalactamicos). | **Must Have** |
| **RF06** | Sincronizacion Offline-First Rural | Consolidacion por lotes idempotentes (UUID v4) de folios capturados en brigadas rurales desconectadas, garantizando validacion de firmas y continuidad de la cadena criptografica. | **Should Have** |
| **RF07** | Gobernanza de Personal y Habilitacion ReTHUS | Registro de personal exclusivo del Administrador; toda cuenta ingresa inactiva y exige tarjeta profesional para roles medicos y de enfermeria. Activacion y suspension controladas; la suspension revoca de inmediato los tokens vigentes. | **Must Have** |
| **RF08** | Panel Administrativo Desacoplado | Entorno exclusivo del rol ADMIN con gobernanza de personal y bitacora forense real (inicios de sesion, mutaciones y lecturas de datos clinicos). Los errores del servidor se muestran sin simular exito. | **Must Have** |
| **RF09** | Perfil Asistencial con Alto Contraste | Perfil con banners tematicos, foto reactiva y oval de alta luminosidad (contraste WCAG AAA). | **Must Have** |
| **RF10** | Menu Lateral Colapsable y Persistencia de Sesion | Sidebar colapsable y persistencia de sesion ante recarga (F5) con revalidacion contra `GET /auth/me`. | **Must Have** |
| **RF11** | Admision de Pacientes y Antecedentes Alergicos | API de admision, busqueda por documento y registro de alergias para ADMISION, ENFERMERO y MEDICO, con validacion de catalogos y rechazo de documentos duplicados. | **Must Have** |
| **RF12** | Catalogo Farmacologico y Prescripcion | Consulta de catalogo CUM con stock y descuento de inventario al prescribir (catalogo inicial de demostracion `CUM-DEMO-xxx`). | **Should Have** |

> El detalle vigente de cada requisito (limites de intentos, revocacion de sesion, cruce de alergias por familia, autor del folio, cadena sin bifurcaciones, sincronizacion con autoria y hashes del servidor) esta en la seccion 4 del `README.md`.

---

## 3. Requisitos No Funcionales (RNF)

1. **RNF01 - Latencia de Respuesta (Eficiencia de Desempeno):** El percentil 95 (p95) de la latencia en operaciones de lectura y emision de prescripciones debe ser inferior a 400 ms bajo concurrencia estandar.
2. **RNF02 - Trazabilidad y Auditoria Forense:** Cada peticion debe portar y propagar un encabezado `X-Correlation-ID` unico (UUID v4). Las operaciones de mutacion deben quedar persistidas en bitacora inalterable con direccion IP, marca de tiempo UTC y actor institucional (ISO/IEC 27001).
3. **RNF03 - Seguridad en Aplicaciones (OWASP ASVS Nivel 2):** Proteccion contra inyeccion SQL mediante sentencias preparadas, encriptacion de contrasenas mediante Bcrypt (coste 12), expiracion forzosa de tokens JWT, limitacion de tasa de peticiones (Rate Limiting) y sanitizacion de cabeceras CORS.
4. **RNF04 - Inmutabilidad Criptografica de Datos:** La modificacion de folios cerrados y de notas aclaratorias se previene en la aplicacion y en el motor de base de datos (triggers en MySQL y PostgreSQL).
5. **RNF05 - Resiliencia en Zonas Rurales:** Operacion autonoma sin conexion y sincronizacion idempotente con la sede central.
6. **RNF06 - Configuracion y Persistencia a Prueba de Fallos:** El servicio no arranca sin `JWT_SECRET` seguro y, si la base de datos configurada no responde, termina con error en lugar de conmutar a memoria.
7. **RNF07 - Gestion de Secretos:** Sin secretos ni cuentas por defecto en codigo, compose o documentacion; las credenciales viven en un `.env` privado.
8. **RNF08 - Consistencia bajo Concurrencia:** Repositorios con copias defensivas y candados (`go test -race`), cadena SHA-256 lineal ante cierres simultaneos y lotes atomicos.

---

## 4. Escenarios de Aceptacion BDD (Behavior-Driven Development)

### Escenario 1: Clasificacion de Triaje Manchester y Deteccion de Rango Invalido
```gherkin
Caracteristica: Clasificacion de Triaje y Validacion Fisiologica
  Como enfermero de admision de urgencias
  Quiero registrar las constantes vitales del paciente
  Para clasificar su prioridad de atencion y detectar errores de captura

  Escenario: Paciente en estado critico clasificado automaticamente como Nivel I
    Dado que el paciente con identificacion "CC-111222333" se encuentra registrado
    Cuando se ingresa un triaje con Glasgow de 7 puntos y saturacion de oxigeno del 82%
    Entonces el sistema debe asignar automaticamente el nivel "NIVEL_I" (Rojo)
    Y el estado del registro debe quedar en "PENDIENTE" con prioridad maxima en la cola.

  Escenario: Rechazo de valoracion con puntaje de Glasgow superior al limite plausible
    Dado que se captura un triaje para el paciente "CC-111222333"
    Cuando se ingresa un puntaje de Glasgow de 16
    Entonces el sistema debe rechazar la solicitud con codigo HTTP 422 Unprocessable Entity
    Y el mensaje de error debe indicar "la escala de coma de glasgow debe estar entre 3 y 15 puntos".
```

### Escenario 2: Inmutabilidad de Historia Clinica Cerrada
```gherkin
Caracteristica: Inmutabilidad de Folios Clinicos Segun Resolucion 1995
  Como auditor medico y oficial de cumplimiento
  Quiero que los folios clinicos firmados no puedan ser modificados ni eliminados
  Para asegurar la custodia legal y no repudio de la atencion medica

  Escenario: Bloqueo de actualizacion sobre folio clinico cerrado
    Dado un folio clinico con ID "cr-88412" en estado "is_closed = true"
    Cuando un usuario intenta emitir una peticion de actualizacion sobre su anamnesis o plan
    Entonces el sistema debe interceptar la operacion y retornar HTTP 403 Forbidden
    Y el disparador de base de datos debe abortar la transaccion si se ejecuta de forma directa
    Y no debe modificarse la firma digital ni el hash SHA-256 preexistente.

  Escenario: Incorporacion valida de nota aclaratoria
    Dado un folio clinico cerrado "cr-88412"
    Cuando el facultativo tratante anexa una nota aclaratoria con justificacion clinica
    Entonces el sistema debe almacenar la nota en la tabla de aclaraciones vinculada
    Y el folio principal debe mantener su contenido original sin alteraciones.
```

### Escenario 3: Intercepcion Inmediata de Alergias Cruzadas (Betalactamicos)
```gherkin
Caracteristica: Prevencion de Eventos Adversos por Hipersensibilidad Farmacologica
  Como medico general
  Quiero recetar farmacos validados contra las alergias del paciente
  Para evitar choques anafilacticos y eventos iatrogenicos

  Escenario: Rechazo en tiempo real ante conflicto por antecedente alergico severo
    Dado que el paciente "Carlos Ramirez" tiene alergia severa registrada a "BETALACTAMICOS"
    Cuando el medico prescribe el medicamento "Amoxil 500mg" (Principio activo: Amoxicilina)
    Entonces el motor de validacion debe abortar la prescripcion en un tiempo menor a 150 ms
    Y el servicio debe responder con codigo HTTP 422 Unprocessable Entity
    Y el cuerpo de respuesta debe contener la alerta "alerta critica de seguridad: el paciente registra alergia conocida (BETALACTAMICOS - severidad: SEVERA)"
    Y no se debe descontar stock del catalogo de medicamentos.
```

