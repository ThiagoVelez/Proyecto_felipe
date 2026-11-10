# 07. Resumen ejecutivo: calidad de SaludConecta IPS v2.4

<!-- cifras-r3 -->
> **Cifras vigentes de la revisión R3 (10 nov 2026).** Fuente única: `anexos/cifras-r3.json`; coherencia comprobada con `anexos/verificar_cifras_r3.py`. Detalle en `informe-revision-r3.md`.
>
> - Defectos registrados: 92 (DEF-01 a DEF-92). Verificación de DEF-01 a DEF-48: 27 verificados, 8 corregidos parcialmente, 12 siguen abiertos, 1 sin ejecución medible, 0 regresiones.
> - Abiertos en `main` (DEF-05 a DEF-92): 62 (18 críticos, 9 altos, 28 medios, 7 bajos). Nuevos de R3: 8 (1 crítico, 1 alto, 6 medios).
> - Pruebas backend: 91 pasan, 0 fallan, 22 reproducciones omitidas (evidencias/r3/12-go-test-tests.txt). Cobertura backend: 68,9 %. Vitest: 108 pruebas en 15 archivos (105 en 14 archivos del equipo), todas pasan. Cobertura frontend: 72,85 %. Reproducciones de defectos abiertos: 22 de 22.
> - Análisis estático: golangci-lint 62 hallazgos (21 nuevos desde la v1); gocyclo 16 funciones con complejidad mayor de 15; govulncheck 1 vulnerabilidad alcanzable (GO-2026-6888); npm audit 0 en producción; 6 en desarrollo; ESLint 0 errores, 89 avisos.
> - Rendimiento: p95 1,38 ms HTTP real; 3,92 a 7,86 ms en proceso; memoria 11,5 a 16,3 MB.
> - Afirmaciones publicadas: 48 evaluadas: 7 verificadas, 24 parciales, 2 no verificadas, 15 falsas. RTM: 5 de 21 requisitos se sostienen. Dictamen: **No conforme con ISO/IEC 25010:2023**.
<!-- /cifras-r3 -->

**Resumen R3.** El equipo corrigió con pruebas 27 de los 48 defectos de las revisiones anteriores, incluidos 6 de los 7 críticos de la v1. Los módulos nuevos (citas, notas 3D, farmacia v2, muro y enfermería) suman 18 críticos abiertos, por lo que el dictamen sigue siendo **no conforme**. El resumen de una página está en `informe-revision-r3.md`, sección 1. El texto siguiente es el resumen de la v1 y se conserva como historia.

**Estado general:** la arquitectura y el control de acceso por roles son sólidos, pero el sistema todavía permite prescripciones peligrosas, puede perder o alterar registros clínicos y expone cuentas con credenciales conocidas; no está listo para uso clínico.

## Semáforo ISO/IEC 25010:2023

| Característica | Estado | Característica | Estado |
|---|---|---|---|
| Adecuación funcional | Rojo | Seguridad | Rojo |
| Eficiencia de desempeño | Verde | Mantenibilidad | Amarillo |
| Compatibilidad | Amarillo | Flexibilidad | Amarillo |
| Capacidad de interacción | Rojo | Seguridad operacional (*Safety*) | Rojo |
| Fiabilidad | Rojo | | |

## Cifras medidas

Todas las cifras tienen su comando y su salida en `anexos/evidencias/`.

| Indicador | Valor |
|---|---|
| Defectos nuevos registrados | 44: 7 Críticos, 16 Altos, 15 Medios, 6 Bajos (2,98 por KLOC) |
| Corregidos en esta rama, con prueba que falla antes y pasa después | 8 (DEF-05, 08, 12, 27, 28, 41, 46, 47) |
| Detectados por el pipeline de CI | 3: una carrera de datos real (DEF-46), un TOTP falso sin Web Crypto (DEF-47) y una prueba frágil bajo `-race` (DEF-48) |
| Defectos reproducidos por una prueba automatizada | 21 de 44 |
| Cobertura de pruebas del backend | 38,7 % -> 60,3 % |
| Cobertura de pruebas del frontend | 41,5 % (antes no era medible) |
| Cumplimiento OWASP ASVS L2 (muestra de 53 requisitos) | 34,0 % (el README afirma nivel 2) |
| Matriz de permisos ruta x rol | 110 de 110 combinaciones correctas |
| Latencia p95 en proceso (prescripción y lectura) | ≤ 2,99 ms (meta < 400 ms; sin red ni MySQL) |
| Afirmaciones documentales verificadas | 37: 8 verdaderas, 14 parciales, 13 falsas, 2 no verificables |
| Vulnerabilidades alcanzables en dependencias | 1 en Go (Fiber); 0 en producción JS |

## Los 3 riesgos principales

1. **Seguridad del paciente.** El cruce de alergias no reconoce familias (penicilina frente a amoxicilina, DEF-06) y una hipotermia severa se clasifica como no urgente (DEF-09). El bloqueo eludible con otro `patient_id` (DEF-05) ya está corregido.
2. **Integridad del registro clínico.** Si MySQL falla, el sistema guarda en memoria sin avisar y pierde los datos al reiniciar (DEF-10). La sincronización puede sobrescribir folios firmados o asignarlos a otro médico (DEF-07, DEF-18), y la cadena SHA-256 puede bifurcarse (DEF-16).
3. **Cuentas comprometibles.** Cada arranque siembra una cuenta médica con contraseña y segundo factor publicados (DEF-11), los usuarios suspendidos conservan acceso (DEF-13) y no hay límite de intentos de login (DEF-15).

## Los 3 aciertos principales del equipo

1. **Aislamiento real del administrador:** las 16 rutas clínicas le responden 403 y el rol no puede falsificarse desde el navegador.
2. **Arquitectura hexagonal limpia:** el dominio no depende de frameworks ni de drivers, y el motor de persistencia se cambia por configuración.
3. **Base técnica segura:** SQL siempre parametrizado, Bcrypt, TOTP verificado en el servidor y hashes y secretos excluidos de las respuestas JSON.

## Acciones recomendadas antes de la entrega final

1. Retirar las cuentas sembradas y rotar sus credenciales (M-09).
2. Fallar de forma visible cuando no haya base de datos (M-08).
3. Exigir que solo el autor cierre su folio y corregir la precisión de `closed_at` (M-15, M-17).
4. Rechazar los tokens de usuarios inactivos (M-11).
5. Hacer idempotente la sincronización (M-04).

Además, el equipo debe revisar y fusionar la rama `calidad/auditoria-iso25010`, activar el pipeline `calidad` y adoptar la lista de Trello «En revisión de calidad».
