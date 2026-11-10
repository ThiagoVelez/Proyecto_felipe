# Publicación de la revisión R3 en Trello (10 nov 2026)

Tablero: https://trello.com/b/HUUP8uyu/proyecto-de-felipe. Acciones aplicadas con las herramientas MCP de Trello. Ninguna tarjeta ajena se editó, movió ni archivó: en «Pruebas QA» solo se agregaron comentarios.

## 1. Tarjetas de defectos de Calidad (lista «Bugs solucionados»)

| Tarjeta | Acción | Resultado |
|---|---|---|
| DEF-05, 06, 07, 08, 09, 11, 12, 13, 14, 16, 17, 18, 19, 20, 23, 24, 26, 46, 47 | Título con «(Verificado R3)» en lugar de «En verificación» y comentario «Verificado por Calidad (10 nov 2026)» con evidencia y enlace a la ficha | Se quedan en «Bugs solucionados» (19 tarjetas) |
| DEF-10, 15, 21, 22, 48 | Título con «(Reabierto R3: corregido parcialmente)», comentario «Reabierto por Calidad» y traslado a «Bugs encontrados para solucionar». DEF-15 y DEF-22 cambian la etiqueta de Alto a Medio | Movidas (5 tarjetas) |
| DEF-25 | Título «(Corrección presente; falta verificarla con motor)» y comentario | Se queda en «Bugs solucionados» (D-06) |

**Pendiente a mano:** desmarcar «completada» en DEF-10, 15, 21, 22 y 48. La herramienta disponible no permite desmarcarla (D-16).

DEF-48 se comentó primero como verificado y, tras el primer run del pipeline, se reabrió con un segundo comentario que corrige el anterior.

## 2. Tarjetas nuevas (lista «Bugs encontrados para solucionar»)

24 tarjetas, cada una con etiqueta de severidad, descripción (estado, explicación sencilla, evidencia y enlace a la ficha en `main`) y la checklist «Corrección» con dos ítems: la acción concreta (M-xx) y «Prueba de regresión en verde en el pipeline y verificación de Calidad».

| Severidad | Defectos |
|---|---|
| Crítico (17) | DEF-49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 74, 75, 78, 79, 85 |
| Alto (7) | DEF-61, 62, 64, 65, 76, 77, 91 |

DEF-63 (Alto) no se publicó porque está corregido en la rama de calidad. Los Medios y Bajos quedan solo en la bitácora.

## 3. Comentarios en «Pruebas QA» (tarjetas del Responsable de Pruebas)

Comentario «Verificación de Calidad (10 nov 2026)» con lo confirmado y lo que difiere, en tono colaborativo, en 12 tarjetas: QA Blindaje contra Data, Auditoría de Seguridad, Diseño Formal de Casos de Prueba, Automatización Frontend y Resiliencia, Certificación de Calidad, Citas Médicas, Notas Anatómicas 3D, Farmacia V2, Muro Educativo, Enfermería y Sedes, Automatización Integral Frontend (todo confirmado) y Consolidación Documental. La copia vacía duplicada de «Enfermería» no se tocó.

## 4. Aviso

Tarjeta «Revisión de Calidad R3 (10 nov) — resultados» en «Avisos» (https://trello.com/c/qDrwxeiZ), con el resumen, el enlace al pull request https://github.com/ThiagoVelez/Proyecto_felipe/pull/6, el informe en `main` y en la rama, y un comentario con el enlace del PR.

**Pendiente a mano:** asignar a Juan José Sánchez como miembro (ID `6ac653fb695dd2c0e2162ce0`); la herramienta de Trello disponible no ofrece la acción para asignar miembros a una tarjeta (D-16).
