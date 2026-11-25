# Guía de estudio: revisión de calidad R4

<!-- cifras-r4 -->
> **Cifras vigentes de la revisión R4 (24 nov 2026, base `6a51bb8`).** Fuente única: `anexos/cifras-r4.json`; coherencia comprobada con `anexos/verificar_cifras_r4.py`. Detalle en `informe-revision-r4.md`.
>
> - Verificación del cierre (DEF-01 a DEF-98): 67 verificados, 7 verificados parcialmente, 18 revisados sin prueba, 3 no verificables, 3 reabiertos (DEF-50, DEF-72, DEF-91). Reproducciones de R3 que hoy pasan: 22 de 22.
> - Defectos registrados: 110. Nuevos de R4: 12 (0 críticos, 2 altos, 8 medios, 2 bajos). Abiertos: 16 (1 crítico, 3 altos, 9 medios, 3 bajos). Reproducciones de defectos abiertos: 6 de 6.
> - Pruebas backend (pasan / fallan / omitidas): 154 / 0 / 0. Cobertura backend: 52,1 % con el comando de R3 y 72,7 % sin adaptadores MySQL/PostgreSQL. Vitest (pruebas / archivos): 147 / 20. Cobertura frontend: 61,02 %.
> - Análisis estático: golangci-lint 0; staticcheck 0; gosec 0; gocyclo 21 funciones mayores de 15 (12 en src); govulncheck 1 alcanzable (GO-2026-6859); npm audit prod-dev 0-0; ESLint 0 / 128.
> - Rendimiento: p95 3,45 ms; memoria 15,07 MB. OWASP ASVS L2 (muestra de 53): 34,0 % en R1 -> 45,3 %. Mutaciones detectadas: 4 de 7.
> - Afirmaciones del README (V / P / NV / F): 19 / 19 / 1 / 5 en las 48 de R3 (4 retiradas); 30 / 26 / 8 / 14 en total. RTM: 11 de 24 requisitos sostenidos. Dictamen: **No conforme con ISO/IEC 25010:2023**.
<!-- /cifras-r4 -->

## 1. Qué es R4, en cinco líneas

1. Es la cuarta revisión de Calidad, hecha el 24 nov 2026 sobre `main` (commit `6a51bb8`), después de que el equipo declaró cerrados 97 de 98 defectos.
2. Su pregunta era una sola: ¿los defectos están cerrados de verdad, sin hacer trampa con las pruebas y sin romper otra cosa?
3. La respuesta corta: casi todo sí. 67 cierres se comprobaron ejecutando pruebas y ninguna prueba se debilitó.
4. Pero 3 cierres no se sostienen (DEF-50, DEF-72 y DEF-91) y las funciones nuevas trajeron 12 defectos, ninguno crítico.
5. Dictamen: **No conforme** con ISO/IEC 25010:2023, porque queda 1 defecto crítico abierto (DEF-50). Con 4 arreglos pequeños podría pasar a «Conforme con observaciones».

## 2. Lo más grave, explicado para un hospital

| Defecto | Qué pasa | Por qué importa en un hospital |
|---|---|---|
| **DEF-50** (crítico, reabierto) | Cualquier persona con usuario, por ejemplo una enfermera, puede pedir al sistema el «código secreto» del segundo factor (TOTP) del administrador o del Encargado de TI. | El segundo factor es la cerradura extra de las cuentas con más poder. Si alguien además conoce la contraseña, entra como administrador y puede activar cuentas o ver la auditoría. |
| **DEF-99** (alto) | En el portal, alguien sin cuenta pide una cita con el número de cédula de un paciente real y pone su propio correo. Cuando el médico agenda, el sistema guarda ese correo en la ficha del paciente real. | Desde ese momento las citas, recetas y resultados de laboratorio del paciente le llegan a un desconocido. Es una fuga de datos de salud (Ley 1581). |
| **DEF-100** (alto) | El backend habla con la base de datos sin cifrar la conexión (sin TLS). | El equipo usa la base de datos en la nube: la historia clínica viaja por internet en texto legible. |
| **DEF-72** (medio, reabierto) | El rol ADMIN, que es administrativo, todavía puede ver recetas con datos del paciente y hasta dispensar medicamentos. | Un administrativo no debería ver medicamentos de pacientes ni entregarlos; solo se había corregido la parte del rol AUDITOR. |
| **DEF-91** (alto, reabierto) | El README sigue diciendo «Aprobado con distinción de excelencia, 100 % de conformidad». | Es una afirmación que la evidencia no sostiene; ante el profesor resta credibilidad a todo el documento. |

Lo bueno, con la misma claridad: los 25 defectos críticos históricos de seguridad del paciente siguen corregidos. Se probó contra el sistema funcionando que bloquea una receta de amoxicilina a un alérgico a la «penicilína» (con tilde), que clasifica una hipotermia de 30 °C como muy urgente, que no deja recetar en el folio de otro paciente y que no deja reescribir un folio cerrado.

## 3. Cómo se verificó el cierre

1. **Un script lee la bitácora** y, para cada uno de los 98 defectos, saca las pruebas que se citan como evidencia.
2. **Se ejecutan todas las pruebas** del backend y del frontend y el script mira si cada prueba citada existe, si se ejecuta (no está omitida) y si pasa.
3. **Se revisó el historial de las pruebas** desde R3: no se borraron aserciones, no hay `skip` nuevos y las 22 pruebas que en R3 fallaban por un defecto hoy pasan sin cambiar lo que comprueban.
4. **Se probó como un atacante** contra el sistema funcionando (caja negra), con contraseñas generadas en el momento y no guardadas.
5. **Se hicieron mutaciones**: se rompió a propósito una línea importante en una copia y se miró si alguna prueba lo detectaba. 4 de 7 se detectaron; 2 no, porque hay una segunda barrera en la base de datos; y 1 no, porque nadie probó el valor Glasgow 8 (DEF-110).

Resultado: 67 verificados, 7 parcialmente, 18 revisados sin prueba, 3 no verificables (solo tienen pruebas con MySQL real que nadie ejecuta) y 3 reabiertos.

## 4. Comparación R1 -> R3 -> R4

| Indicador | R1 (1 nov) | R3 (10 nov) | R4 (24 nov) |
|---|---|---|---|
| Pruebas backend que pasan | 17 | 91 | 154 / 0 / 0 (pasan / fallan / omitidas) |
| Pruebas frontend (pruebas / archivos) | 31 | 108 / 15 | 147 / 20 |
| Cobertura backend comparable | 60,3 % | 68,9 % | 72,7 % (52,1 % si se cuentan los adaptadores de MySQL y PostgreSQL) |
| Hallazgos de golangci-lint | — | 62 | 0 |
| OWASP ASVS nivel 2 (muestra de 53) | 34,0 % | — | 45,3 % |
| Requisitos de la RTM que se sostienen | — | 5 de 21 | 11 de 24 |
| Defectos abiertos | — | 63 (18 críticos) | 16 (1 crítico) |
| Dictamen | No conforme | No conforme | No conforme |

## 5. Preguntas probables del profesor

1. **¿Qué diferencia hay entre Calidad y Pruebas?** Pruebas escribe y ejecuta pruebas para encontrar fallos. Calidad define qué es «bueno» (ISO 25010), revisa el producto y el proceso, verifica que los cierres sean ciertos y decide el dictamen. Calidad no corrige código: registra defectos y propone acciones.
2. **¿Por qué ISO/IEC 25010:2023 y no la de 2011?** Porque es la vigente: agrega la característica Seguridad operacional (*safety*), clave en un sistema clínico, y renombra Usabilidad como Capacidad de interacción y Portabilidad como Flexibilidad.
3. **¿Qué es el control de defectos abiertos?** Un job del pipeline que ejecuta pruebas que deben fallar mientras el defecto exista. Si una pasa, avisa «parece corregido». Así un defecto no se puede cerrar ni olvidar sin evidencia. Hoy controla 6 defectos.
4. **¿Por qué la cobertura no es lo mismo que calidad?** Porque mide qué líneas se ejecutan, no si se comprueba algo correcto. Ejemplo de R4: la frontera Glasgow 8 se ejecuta, pero ninguna prueba revisa su resultado (DEF-110).
5. **¿Por qué hay dos cifras de cobertura?** Porque una prueba nueva hizo entrar al cálculo los adaptadores de MySQL y PostgreSQL, que no se prueban sin base de datos. Para comparar con R3 se usa 72,7 %; el 52,1 % muestra que la persistencia real no tiene pruebas automáticas.
6. **¿Qué hicieron con DEF-02?** Era un defecto histórico que decía que había una caché de alergias. Se comprobó que la caché nunca existió; se corrigió la documentación y el índice de la base de datos sí existe. En R4 queda como «revisado sin prueba».
7. **¿Cómo usaron la IA?** Como asistente: Claude Code ejecutó los comandos, escribió borradores y pruebas, y revisó documentos con subagentes. Cada cifra sale de un archivo de evidencia con el comando que la produjo, y los hallazgos graves se comprobaron con una prueba propia. Los commits llevan la línea de coautoría. Ojo: el README dice «Sonnet 5.5», pero los commits del cierre dicen «Opus 5.5»; hay que corregir esa declaración.
8. **¿Por qué el dictamen sigue siendo «No conforme» si mejoró tanto?** Porque queda un crítico (DEF-50) que permite saltarse el segundo factor. Con un crítico abierto en Seguridad no se puede declarar conformidad.
9. **¿Qué es un defecto reabierto?** Uno que estaba cerrado y una prueba demuestra que sigue presente. No se le da un número nuevo: cambia su estado y se conserva el historial.
10. **¿Qué es una mutación y para qué sirve?** Romper a propósito una línea del código y ver si las pruebas lo notan. Si no lo notan, las pruebas no protegen esa regla.
11. **¿Qué es verificado y qué es revisado?** Verificado: se ejecutó algo que lo demuestra. Revisado: solo se leyó el código o el documento. El informe siempre dice cuál de los dos es.
12. **¿Qué es OWASP ASVS y por qué 45,3 %?** Es una lista de requisitos de seguridad para aplicaciones web. Se evaluaron los mismos 53 requisitos de R1: cumplen 24, así que 24/53 = 45,3 %.
13. **¿Por qué no se usó Docker?** No estaba instalado en el equipo. Lo que dependía de Docker se marcó «No medido» y se tomó del pipeline de GitHub cuando existía (por ejemplo, las pruebas con `-race`).
14. **¿Qué pasa con la rama QA?** Está 69 commits atrás de `main`. Fusionarla no borra archivos, pero deja el README en conflicto; se recomienda actualizarla primero (DEF-106).
15. **¿Qué tiene que hacer el equipo primero?** Cuatro arreglos pequeños: que `mfa-seed` solo dé la semilla propia (DEF-50), verificar la identidad en el portal (DEF-99), activar TLS hacia la base de datos (DEF-100) y quitar el «100 %» del README (DEF-91). Además, proteger la rama `main` para que el pipeline sea obligatorio.
