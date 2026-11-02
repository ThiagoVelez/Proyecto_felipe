# 02. Modelo de calidad ISO/IEC 25010:2023 aplicado a SaludConecta IPS v2.4

## 1. Criterios

- **Modelo:** ISO/IEC 25010:2023, con 9 características: Adecuación funcional, Eficiencia de desempeño, Compatibilidad, Capacidad de interacción, Fiabilidad, Seguridad, Mantenibilidad, Flexibilidad y Seguridad operacional (*Safety*).
- **Métricas:** basadas en ISO/IEC 25023 cuando existe una medida equivalente (densidad de defectos, cobertura de funciones, tiempo de respuesta, cobertura de pruebas); las métricas propias se justifican en su fila.
- **Valor medido:** siempre con evidencia en `anexos/`. Lo que no pudo medirse aparece como **No medido**, con su motivo.
- **Medición:** estado de la rama `calidad/auditoria-iso25010` al cierre (incluye las 6 correcciones). Cuando el valor anterior es relevante, se indica entre paréntesis.
- **Veredicto por subcaracterística:** Cumple, Parcial, No cumple, Sin dato.

## 2. Mediciones por característica

### 2.1 Adecuación funcional

| Subcaracterística | Métrica | Fórmula | Umbral objetivo | Valor medido | Evidencia | Veredicto |
|---|---|---|---|---|---|---|
| Completitud | Cobertura funcional de extremo a extremo (ISO 25023 FCp-1 adaptada) | RF con API y UI operativas / RF totales | 100 % | 5 / 10 = **50 %** (RF01, RF07, RF08, RF09 y RF10; RF02–RF06 no tienen interfaz conectada) | DEF-21, DEF-26 | No cumple |
| Completitud | Requisitos con al menos una prueba automatizada | RF con prueba / RF totales | 100 % | 9 / 10 = **90 %** (RF09 sin prueba) | `tests/`, RTM | Parcial |
| Corrección | Defectos de corrección Críticos o Altos abiertos | Conteo | 0 | **9** (DEF-06, 07, 09, 10, 19, 20, 21, 23, 26) | `04-bitacora-defectos.md` | No cumple |
| Pertinencia | Adecuación de funciones a los objetivos del usuario | Evaluación con usuarios | — | **No medido** (sin pruebas con usuarios asistenciales) | — | Sin dato |

### 2.2 Eficiencia de desempeño

| Subcaracterística | Métrica | Fórmula | Umbral objetivo | Valor medido | Evidencia | Veredicto |
|---|---|---|---|---|---|---|
| Comportamiento temporal | Tiempo de respuesta p95 (ISO 25023 PTb-1) en emisión de prescripción, intercepción de alergia y lectura de historia | Percentil 95 de 1 000 peticiones con 20 clientes concurrentes, pila HTTP completa en proceso y almacén en memoria | < 400 ms (RNF01); < 150 ms en alergias (RF05) | **1,81–2,99 ms** en 3 corridas | `evidencias/74-rendimiento-corrida{1,2,3}.txt` | Parcial (sin red ni MySQL) |
| Utilización de recursos | Tamaño del bundle JS de producción (propia: afecta la carga en sedes rurales) | kB gzip | ≤ 200 kB gzip | **106,74 kB** | `evidencias/11-npm-build.txt` | Cumple |
| Capacidad | Usuarios concurrentes sostenidos | Prueba de carga | Definir con el equipo | **No medido** (sin entorno desplegado ni herramienta de carga) | — | Sin dato |

### 2.3 Compatibilidad

| Subcaracterística | Métrica | Fórmula | Umbral objetivo | Valor medido | Evidencia | Veredicto |
|---|---|---|---|---|---|---|
| Interoperabilidad | Cobertura de pruebas del adaptador RIPS/FHIR | Sentencias cubiertas / totales | ≥ 70 % | **10,5 %** | `evidencias/72-final-cover-por-paquete.txt` | No cumple |
| Interoperabilidad | Conformidad de los JSON RIPS y FHIR con sus esquemas oficiales | Documentos válidos / generados | 100 % | **No medido** (no se validó contra los esquemas de MinSalud ni de HL7) | — | Sin dato |
| Coexistencia | — | — | — | No aplica en el alcance | — | — |

### 2.4 Capacidad de interacción

| Subcaracterística | Métrica | Fórmula | Umbral objetivo | Valor medido | Evidencia | Veredicto |
|---|---|---|---|---|---|---|
| Inclusividad | Contraste mínimo de texto sobre los banners (WCAG 2.x) | (L1 + 0,05) / (L2 + 0,05) | ≥ 7:1 (AAA, declarado en RF09) | **1,85:1** | `evidencias/40-contraste-banners.txt` | No cumple |
| Inclusividad | Infracciones de axe-core o Lighthouse | Conteo | 0 | **No medido** (sin navegador automatizado) | — | Sin dato |
| Protección contra errores del usuario | Operaciones mutantes del cliente que muestran al usuario el error real | Operaciones con `strict: true` / operaciones mutantes en `api.js` | 100 % | 2 / 8 = **25 %** (solo login y registro de personal) | `src/frontend/src/services/api.js` | No cumple |
| Operabilidad, autodescriptividad | — | — | — | **No medido** | — | Sin dato |

### 2.5 Fiabilidad

| Subcaracterística | Métrica | Fórmula | Umbral objetivo | Valor medido | Evidencia | Veredicto |
|---|---|---|---|---|---|---|
| Ausencia de fallos | Densidad de defectos (ISO 25023 RMa-1) | Defectos nuevos / KLOC productivas | ≤ 1,0 | 44 / 14,779 = **2,98** | `04-bitacora-defectos.md`, sección 4 | No cumple |
| Disponibilidad | Dependencias críticas verificadas por el healthcheck | Dependencias verificadas / críticas | 100 % | 0 / 1 = **0 %** | DEF-32 | No cumple |
| Tolerancia a fallos | Escenarios de caída de la base de datos que terminan en fallo seguro | Seguros / evaluados | 100 % | 0 / 1 = **0 %** | DEF-10 | No cumple |
| Recuperabilidad | Tiempo de restauración desde respaldo | Medición | Definir RTO | **No medido** (no hay procedimiento de respaldo) | — | Sin dato |

### 2.6 Seguridad

| Subcaracterística | Métrica | Fórmula | Umbral objetivo | Valor medido | Evidencia | Veredicto |
|---|---|---|---|---|---|---|
| Confidencialidad, integridad y autenticidad | Cumplimiento estricto de ASVS 4.0.3 L2 (muestra) | Cumple / evaluados | 100 % (RNF03) | 18 / 53 = **34,0 %** (antes de la rama: 30,2 %) | `05-auditoria-owasp-asvs-l2.md` | No cumple |
| Confidencialidad | Rutas protegidas con RBAC explícito | Rutas con `RequireRoles` / rutas autenticadas | 100 % de las que acceden a datos | 20 / 22 = **90,9 %** (las 2 restantes son `/auth/mfa/*`, por diseño) | `anexos/matriz-rbac.md` | Cumple |
| Confidencialidad | Exactitud de la matriz de autorización | Combinaciones correctas / evaluadas | 100 % | 110 / 110 = **100 %** | `anexos/matriz-rbac.md` | Cumple |
| Integridad | Dependencias Go sin CVE conocidos | Módulos sin aviso / módulos del build | 100 % | 19 / 25 = **76 %**; sin CVE alcanzable: 24 / 25 = **96 %** | `evidencias/78-modulos-go.txt`, `24-govulncheck.txt` | No cumple |
| Integridad | Dependencias JS de producción sin CVE | Paquetes sin aviso / paquetes | 100 % | **100 %** (0 vulnerabilidades con `--omit=dev`) | `evidencias/30-npm-audit.txt` | Cumple |
| No repudio | Defectos abiertos de la cadena SHA-256 | Conteo | 0 | **6** (DEF-16, 17, 18, 20, 29, 30) | Bitácora | No cumple |
| Responsabilidad | Entradas de auditoría intactas tras peticiones concurrentes | Entradas correctas / entradas | 100 % | **20 / 20** (antes: 2 / 20 = 10 %) | `evidencias/55-…` y `56-…` | Cumple (tras DEF-28) |
| Resistencia | Controles anti fuerza bruta en autenticación | Controles presentes / requeridos (por cuenta, por IP real, bloqueo progresivo) | 3 / 3 | **0 / 3** | DEF-15 | No cumple |

### 2.7 Mantenibilidad

| Subcaracterística | Métrica | Fórmula | Umbral objetivo | Valor medido | Evidencia | Veredicto |
|---|---|---|---|---|---|---|
| Modularidad | Dependencias del dominio hacia adaptadores o drivers | Conteo | 0 | **0** | `evidencias/41-arquitectura.txt` | Cumple |
| Analizabilidad | Complejidad ciclomática media y funciones por encima de 15 | Media de gocyclo / conteo | ≤ 10 / 0 | **3,5 / 1** | `evidencias/73-final-analisis.txt` | Parcial |
| Modificabilidad | Código duplicado (jscpd, ≥ 70 tokens) | Líneas duplicadas / líneas | ≤ 5 % | Go **14,46 %**; frontend **3,26 %** | `evidencias/32-jscpd.txt` | Parcial |
| Capacidad de prueba | Cobertura de sentencias del backend (ISO 25023 MTe) | `go tool cover` total | ≥ 70 % (meta del plan) | **60,3 %** (línea base 38,7 %) | `evidencias/71-final-go-test-tests.txt` | Parcial |
| Capacidad de prueba | Cobertura de sentencias del frontend | vitest + v8 | ≥ 60 % | **41,5 %** (ramas 60,4 %, funciones 27,5 %) | `evidencias/96-final-vitest-coverage.txt` | No cumple |
| Reutilización | — | — | — | **No medido** | — | Sin dato |

### 2.8 Flexibilidad

| Subcaracterística | Métrica | Fórmula | Umbral objetivo | Valor medido | Evidencia | Veredicto |
|---|---|---|---|---|---|---|
| Adaptabilidad | Motores de base de datos con paridad de inmutabilidad | Motores con triggers / motores soportados | 100 % | 1 / 2 = **50 %** (MySQL sí, PostgreSQL no) | DEF-25 | No cumple |
| Reemplazabilidad | Cambio de adaptador de persistencia sin tocar el dominio | Verificación funcional | Sí | **Sí** (memoria y MySQL seleccionables con `DB_DRIVER`) | `storage/factory.go`, `evidencias/15-health.txt` | Cumple |
| Instalabilidad | Pasos de instalación verificados en un entorno limpio | Pasos exitosos / documentados | 100 % | Nativo: build y arranque correctos en Windows. Docker Compose: **No medido** (sin Docker) | `anexos/linea-base.md` | Parcial |
| Escalabilidad | — | — | — | **No medido** | — | Sin dato |

### 2.9 Seguridad operacional (*Safety*)

| Subcaracterística | Métrica | Fórmula | Umbral objetivo | Valor medido | Evidencia | Veredicto |
|---|---|---|---|---|---|---|
| Identificación de riesgos | Alertas de alergia correctas en casos de reactividad cruzada y escritura | Casos bloqueados / casos | 100 % | **0 / 2** (penicilina-amoxicilina; tildes) | `TestDEF06…`, `43-defectos-abiertos.txt` | No cumple |
| Identificación de riesgos | Vigencia inmediata de una alergia nueva | Casos bloqueados / casos | 100 % | **1 / 1** | `evidencias/76-h21-alergia-vigente.txt` | Cumple |
| Fallo seguro | Entradas clínicas inválidas rechazadas (paciente ajeno al folio, nivel Manchester inválido x3, FC 301 y 1000, Glasgow 2 y 16, FC 0) | Rechazadas / casos | 100 % | **9 / 9** (antes de la rama: 3 / 9 = 33 %) | `evidencias/50-…` a `54-…`, `75-h23-limites.txt` | Cumple (en los casos probados) |
| Restricción operacional | Clasificación Manchester correcta en escenarios de riesgo vital no febril | Correctos / casos | 100 % | **0 / 1** (hipotermia de 30 °C -> Nivel V) | `TestDEF09…` | No cumple |
| Advertencia de peligro | Alertas clínicas de la UI originadas en el backend | Alertas conectadas / alertas mostradas | 100 % | **0 %** (el banner y el modal de alergias usan datos fijos) | DEF-21 | No cumple |
| Integración segura | — | — | — | No aplica (sin integración con dispositivos médicos) | — | — |

## 3. Semáforo global

| Característica | Semáforo | Justificación |
|---|---|---|
| Adecuación funcional | **Rojo** | Solo la mitad de los requisitos funciona de extremo a extremo y 9 defectos Críticos o Altos afectan la corrección. |
| Eficiencia de desempeño | **Verde** | p95 por debajo de 3 ms en proceso, muy lejos de 400 ms; falta confirmarlo con red y MySQL. |
| Compatibilidad | **Amarillo** | Hay exportadores RIPS y FHIR, pero sin validar contra los esquemas y con 10,5 % de cobertura. |
| Capacidad de interacción | **Rojo** | El contraste AAA declarado no se cumple (1,85:1) y el 75 % de las operaciones oculta errores al usuario. |
| Fiabilidad | **Rojo** | La conmutación silenciosa a memoria y un healthcheck ciego permiten perder registros sin aviso. |
| Seguridad | **Rojo** | 34 % de ASVS L2, credenciales sembradas, tokens no revocables y no repudio vulnerable. |
| Mantenibilidad | **Amarillo** | Capas limpias y complejidad baja, pero 14,46 % de duplicación en Go y cobertura por debajo de la meta. |
| Flexibilidad | **Amarillo** | El adaptador es reemplazable, pero la inmutabilidad solo existe en MySQL. |
| Seguridad operacional | **Rojo** | Hay prescripciones peligrosas que no se bloquean y casos de subtriaje; las validaciones corregidas en esta rama no alcanzan para cambiar el color. |
