# Plan de Pruebas de Software: SaludConecta IPS v2.4

## 1. Enfoque y Alcance de las Pruebas

El aseguramiento de calidad de «SaludConecta IPS v2.4» se fundamenta en la norma **ISO/IEC/IEEE 29119** (Software Testing) y los principios de la piramide de pruebas:

- **Pruebas Unitarias de Caja Blanca:** Evaluacion exhaustiva de la logica de dominio, invariantes de negocio, calculos fisiologicos deterministas y algoritmos criptograficos SHA-256 encadenados.
- **Pruebas de Integracion de Servicios y Adaptadores:** Verificacion del comportamiento de los puertos de persistencia con almacenes en memoria y transaccionalidad SQL, control de errores y cruce de indices de farmacia.
- **Pruebas de Componentes Visuales:** Renderizado condicional en frontend asegurando que las alertas de seguridad clinica desplieguen el contraste y estilos visuales correctos.

---

## 2. Tecnicas de Diseno de Pruebas Aplicadas

### 2.1. Particion de Equivalencia (EP) y Analisis de Valores Limite (BVA)

#### A. Escala de Coma de Glasgow (GCS)
- **Particion Invalida Inferior:** $(-\infty, 2]$ $\rightarrow$ Rechazo con `ErrInvalidGlasgowScore`. Limite critico: $2$.
- **Particion Valida:** $[3, 15]$ $\rightarrow$ Procesamiento exitoso. Limites criticos: $3$ (coma profundo) y $15$ (paciente alerta).
- **Particion Invalida Superior:** $[16, +\infty)$ $\rightarrow$ Rechazo con `ErrInvalidGlasgowScore`. Limite critico: $16$.

#### B. Frecuencia Cardiaca (FC en latidos por minuto)
- **Particion Imposible/Invalida:** $(-\infty, 0] \cup [301, +\infty)$ $\rightarrow$ Error de signos vitales no plausibles. Limites: $0, 301$.
- **Particion Critica (Manchester Nivel I / Bradicardia o Taquicardia Extrema):** $(0, 39] \cup [151, 300]$ $\rightarrow$ Clasificacion inmediata en Nivel I. Limites: $39, 40, 150, 151$.
- **Particion Normal / Estandar:** $[60, 100]$ $\rightarrow$ Parametros dentro de ventana fisiologica basal.

#### C. Tension Arterial Sistolica (TAS en mmHg) y Saturacion de Oxigeno (SpO2 en %)
- **TAS Choque Hemodinamico:** $< 70\text{ mmHg}$ $\rightarrow$ Disparador Manchester Nivel I.
- **SpO2 Hipoxemia Severa:** $< 85\%$ $\rightarrow$ Disparador Manchester Nivel I.
- **SpO2 Limite Normal:** $90\% - 94\%$ (Nivel II/III), $\ge 95\%$ (Estable).

#### D. Dosificacion y Margen Seguro de Administracion
- Para prescripciones pediatricas y de adultos, el rango de dosis calculada $(\text{mg/kg/dia})$ debe validarse contra el stock maximo disponible en inventario hospitalario, impidiendo consumos negativos o decrementos superiores al saldo existente.

---

## 3. Tabla de Casos de Prueba Disenados

| ID Caso | Modulo | Entrada / Condicion de Prueba | Valor Esperado | Tecnica Aplicada | Archivo de Resolucion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TRG-01** | Triaje | Glasgow = 16, FC = 75, SpO2 = 98% | Error `ErrInvalidGlasgowScore` | BVA (Limite superior) | `tests/backend/triage_test.go` |
| **TC-TRG-02** | Triaje | Glasgow = 15, FC = 0 lpm | Error `ErrInvalidVitals` | EP (Valor fisiologico nulo) | `tests/backend/triage_test.go` |
| **TC-TRG-03** | Triaje | Glasgow = 7, SpO2 = 82%, FC = 145 | Prioridad `NIVEL_I` (Rojo) | EP / BVA (Estado critico) | `tests/backend/triage_test.go` |
| **TC-TRG-04** | Triaje | Glasgow = 15, SpO2 = 99%, FC = 72 | Prioridad `NIVEL_V` (Azul) | EP (Valores fisiologicos normales) | `tests/backend/triage_test.go` |
| **TC-HCE-01** | HCE | Creacion de borrador con medico activo | `IsClosed = false`, Hash = `nil` | Caja Blanca (Estado inicial) | `tests/backend/clinical_record_test.go` |
| **TC-HCE-02** | HCE | Firma y cierre formal con token digital | `IsClosed = true`, Hash SHA-256 generado | Caja Blanca (Transicion de estado) | `tests/backend/clinical_record_test.go` |
| **TC-HCE-03** | HCE | Segundo intento de cierre/modificacion | Error `ErrRecordAlreadyClosed` | Caja Blanca (Inmutabilidad legal) | `tests/backend/clinical_record_test.go` |
| **TC-HCE-04** | HCE | Registro de nota aclaratoria valida | Insercion en aclaraciones, folio intacto | Caja Blanca (Regla Res. 1995) | `tests/backend/clinical_record_test.go` |
| **TC-HCE-05** | HCE | Verificacion de integridad hash SHA-256 | `VerifyIntegrity() == true` | Criptografia / Integridad | `tests/backend/clinical_record_test.go` |
| **TC-RX-01** | Farmacia | Prescribir Amoxicilina a paciente con alergia a Betalactamicos | Retorno `AllergyConflictError` en < 150 ms | EP / Intercepcion de riesgo | `tests/backend/prescription_test.go` |
| **TC-RX-02** | Farmacia | Prescribir Paracetamol a paciente con alergia a Betalactamicos | Prescripcion exitosa y descuento de stock | EP (Principio activo no conflictivo) | `tests/backend/prescription_test.go` |
| **TC-UI-01** | Frontend | Alerta farmacologica severa (Betalactamicos) | Modal renderizado con borde rojo y bg-red-50 | Caja Negra / UI Testing | `tests/frontend/AllergyAlertModal.test.jsx` |

---

## 4. Matriz de Trazabilidad de Requisitos (RTM)

| Requisito Funcional | Casos de Prueba Asociados | Estado de Cobertura | Resultado de Ejecucion |
| :--- | :--- | :--- | :--- |
| **RF01: Autenticacion, MFA y RBAC** | `TestPasswordHashingAndVerification`, `TestJWTIssuanceAndValidation` | 100% | **PASS** |
| **RF02: Triaje Manchester** | `TC-TRG-01`, `TC-TRG-02`, `TC-TRG-03`, `TC-TRG-04` | 100% | **PASS** |
| **RF03: Inmutabilidad HCE** | `TC-HCE-01`, `TC-HCE-02`, `TC-HCE-03`, `TC-HCE-04` | 100% | **PASS** |
| **RF04: Cadena Criptografica SHA-256** | `TC-HCE-05`, `TestChainedSHA256Integrity` | 100% | **PASS** |
| **RF05: Intercepcion de Alergias** | `TC-RX-01`, `TC-RX-02`, `TC-UI-01` | 100% | **PASS** |
| **RF06: Sincronizacion Offline Rural** | `SaveBatch` / Batch Synchronization Integrity Unit Suite | 100% | **PASS** |

