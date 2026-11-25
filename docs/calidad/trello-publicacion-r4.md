# Publicación en Trello: revisión R4 (24 nov 2026)

Tarjetas listas para pegar a mano en el tablero del proyecto (lista «Defectos / Calidad»). Cada tarjeta enlaza su ficha en `docs/calidad/04-bitacora-defectos.md` de la rama `calidad/revision-r4`. Etiqueta de color por severidad: Crítica rojo, Alta naranja, Media amarillo, Baja verde.

## 1. Tarjetas nuevas o reabiertas

### [Crítica] DEF-50 Reabierto: cualquier usuario obtiene el código secreto del segundo factor de otra cuenta
- **Descripción:** pidiendo `/auth/mfa-seed?email=` con cualquier sesión, el sistema entrega la semilla TOTP de la cuenta indicada (por ejemplo, la del administrador). El cierre anterior solo exigió iniciar sesión.
- **Checklist:**
  - [ ] Entregar solo la semilla del usuario de la sesión o retirar el endpoint
  - [ ] Rotar las semillas ya emitidas
  - [ ] `TestDEF50R4SemillaMFASoloDelPropioUsuario` pasa y se quita de `defectos-abiertos.txt`
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-50, «Reapertura R4».

### [Alta] DEF-91 Reabierto: el README sigue publicando «100 % de conformidad»
- **Descripción:** las líneas 2151 y 2367 del README mantienen un dictamen que la evidencia no sostiene.
- **Checklist:**
  - [ ] Retirar los dictámenes «100 %» o enlazar al dictamen de Calidad
  - [ ] Revisar las afirmaciones falsas de `evidencias/r4/50-afirmaciones-readme.md`
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-91, «Reapertura R4».

### [Alta] DEF-99 Una solicitud anónima del portal cambia el correo de un paciente real
- **Descripción:** con la cédula de otra persona, un desconocido deja su correo en la ficha del paciente al agendarse la cita; luego recibe citas, recetas y resultados.
- **Checklist:**
  - [ ] Comparar nombre y fecha de nacimiento antes de asociar la solicitud
  - [ ] No escribir datos de contacto desde el portal sin confirmación
  - [ ] `TestDEF99SolicitudPublicaNoAsignaCorreoAPacienteExistenteSinVerificarIdentidad` pasa
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-99.

### [Alta] DEF-100 La conexión a la base de datos no está cifrada (sin TLS)
- **Descripción:** MySQL y PostgreSQL se conectan sin TLS; con la base en la nube, la historia clínica viaja legible por internet.
- **Checklist:**
  - [ ] Variable `DB_TLS` con verificación de certificado
  - [ ] Documentarla en `.env.example`
  - [ ] `TestDEF100ConexionABaseDeDatosSolicitaTLS` pasa
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-100.

### [Media] DEF-72 Reabierto: ADMIN sigue viendo recetas y puede dispensar
- **Descripción:** solo se corrigió la parte de AUDITOR; ADMIN lee la bandeja de farmacia (datos del paciente) y puede dispensar.
- **Checklist:**
  - [ ] Quitar ADMIN de `/api/v2/treatments/:id` y de las rutas de recetas y dispensación de farmacia
  - [ ] `TestDEF72R4AdminNoAccedeARecetasNiDispensa` pasa
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-72, «Reapertura R4».

### [Media] DEF-102 Las pruebas con MySQL y PostgreSQL reales no corren en el pipeline
- **Descripción:** existen, pero solo se ejecutan a mano; cinco cierres dependen de ellas.
- **Checklist:**
  - [ ] Job de integración con servicios `mysql:8.0` y `postgres:16`
  - [ ] Contraseñas generadas en el run
- **Responsable sugerido:** Santiago Arcos. **Ficha:** bitácora, DEF-102.

### [Media] DEF-103 Versiones de Go distintas en CI y en la imagen, con una vulnerabilidad
- **Descripción:** CI usa Go 1.27.3 (vulnerabilidad GO-2026-6859) y el Dockerfile compila con Go 1.22, sin soporte.
- **Checklist:**
  - [ ] Go 1.27.4 en `calidad.yml` y en `src/backend/Dockerfile`
  - [ ] govulncheck bloqueante
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-103.

### [Media] DEF-105 `QA-actualizado.md` tiene cifras de una versión anterior
- **Descripción:** dice 14 suites y 105 pruebas; hoy hay 20 archivos y 147 pruebas. Los benchmarks tampoco coinciden.
- **Checklist:**
  - [ ] Regenerar o fechar las cifras con su commit
- **Responsable sugerido:** Santiago Arcos. **Ficha:** bitácora, DEF-105.

### [Media] DEF-106 La rama QA está 69 commits detrás de main
- **Descripción:** fusionarla deja el README en conflicto; resolverlo mal borraría el trabajo de main.
- **Checklist:**
  - [ ] Rebase de `QA` sobre `main` o PR nuevo solo con el cambio del README
- **Responsable sugerido:** Santiago Arcos. **Ficha:** bitácora, DEF-106.

### [Media] DEF-107 Se aceptan contraseñas demasiado cortas
- **Descripción:** 8 caracteres en cuentas de TI y administradores creadas desde el login y 1 carácter en el alta de personal.
- **Checklist:**
  - [ ] Política única de 12 caracteres mínimo
  - [ ] `TestDEF107CuentaPrivilegiadaExigeContrasenaDeDoceCaracteres` pasa
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-107.

### [Media] DEF-108 Los resultados de laboratorio se envían al correo que se escriba al despachar
- **Descripción:** un error de digitación basta para mandar resultados a otra persona.
- **Checklist:**
  - [ ] Usar el correo de la ficha del paciente
  - [ ] Auditar cualquier destinatario distinto
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-108.

### [Media] DEF-109 La sesión no tiene un límite absoluto
- **Descripción:** se puede renovar sin fin, y el token de acceso sigue sirviendo 15 minutos después de cerrar sesión.
- **Checklist:**
  - [ ] Tope de duración de la sesión
  - [ ] Revocar el token de acceso al cerrar sesión
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-109.

### [Media] DEF-110 Ninguna prueba revisa la frontera Glasgow 8 del triaje
- **Descripción:** si alguien cambia `<= 8` por `< 8`, un paciente grave bajaría de nivel sin que falle ninguna prueba. Calidad dejó una prueba propuesta.
- **Checklist:**
  - [ ] Adoptar `TestR4GlasgowOchoEsNivelI`
  - [ ] Probar los demás valores límite del triaje
- **Responsable sugerido:** Santiago Arcos. **Ficha:** bitácora, DEF-110.

### [Baja] DEF-101 Si falla el envío de correo, el registro muestra el correo del paciente
- **Descripción:** el aviso de error no enmascara el destinatario y el archivo de la bandeja local lleva el correo en el nombre.
- **Checklist:**
  - [ ] Enmascarar el correo en el aviso de fallo
  - [ ] `TestDEF101EnvioSMTPFallidoNoRegistraCorreoEnClaro` pasa
- **Responsable sugerido:** Santiago Vélez. **Ficha:** bitácora, DEF-101.

### [Baja] DEF-104 Faltan fichas de DEF-93 a DEF-98 en la bitácora
- **Descripción:** solo tienen la fila del resumen; DEF-12 cita una prueba con un nombre que ya no existe.
- **Checklist:**
  - [ ] Completar las fichas con pasos, esperado, obtenido y prueba
- **Responsable sugerido:** Juan José Sánchez. **Ficha:** bitácora, DEF-104.

## 2. Tarjetas existentes que pueden pasar a «Hecho»

Según `anexos/verificacion-cierre-r4.md`, estos defectos quedaron **verificados** ejecutando pruebas o herramientas (67): DEF-01, 03, 04, 05, 06, 07, 08, 09, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 37, 40, 41, 45, 46, 47, 48, 49, 51, 52, 53, 54, 55, 57, 58, 59, 60, 61, 63, 66, 67, 68, 70, 71, 73, 74, 79, 80, 82, 83, 85, 86, 87, 88, 89, 90, 97 y 98.

Deben **quedarse abiertas o volver a «En curso»**: DEF-50, DEF-72 y DEF-91 (reabiertas) y DEF-44 (corregido parcialmente). Las 7 verificadas parcialmente (DEF-11, 38, 44, 62, 64, 69, 75) y las 3 no verificables (DEF-25, 56, 65) pueden moverse a «Hecho» con un comentario que enlace su fila del anexo.
