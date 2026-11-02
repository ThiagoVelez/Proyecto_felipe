## Descripción

<!-- Qué cambia y por qué. Una o dos frases. -->

## Trazabilidad

- Requisito(s): <!-- RF01..RF10 / RNF01..RNF05 -->
- Defecto(s) relacionados: <!-- DEF-XX o "ninguno" -->
- Característica ISO/IEC 25010:2023 afectada: <!-- p. ej. Seguridad → Integridad -->

## Checklist de calidad

- [ ] El cambio está trazado a un requisito o a un defecto registrado en `docs/calidad/04-bitacora-defectos.md`.
- [ ] Se añadieron o actualizaron pruebas que fallan sin el cambio y pasan con él.
- [ ] `go test -race ./...` y `npx vitest run` pasan en local o en el pipeline `calidad`.
- [ ] La cobertura no baja del umbral configurado en el pipeline.
- [ ] No se modificaron pruebas existentes del Responsable de Pruebas sin su aprobación.
- [ ] No se añadieron secretos, contraseñas, tokens ni archivos `.env`; las variables nuevas están en `.env.example`.
- [ ] La documentación afectada (README, especificación, informes) está actualizada y sin cifras no medidas.
- [ ] Ortografía y tildes revisadas en textos visibles y documentación.

## Revisión

- [ ] Revisión del Responsable de Calidad completada (tarjeta movida desde «En revisión de calidad»).

## Evidencia

<!-- Comandos ejecutados y extracto de su salida, o enlace al run del pipeline. -->
