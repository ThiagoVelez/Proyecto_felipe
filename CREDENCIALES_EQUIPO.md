# SaludConecta IPS v2.4 - Guía de Credenciales y Acceso para el Equipo de Trabajo

> **Aviso de Confidencialidad y Uso Interno:**
> Este documento contiene credenciales de laboratorio, perfiles de acceso y claves del segundo factor criptográfico (TOTP RFC 6238). Está destinado exclusivamente al equipo de desarrollo, evaluadores y colaboradores autorizados. No debe ser publicado en repositorios o canales abiertos.

---

## 1. Credenciales de Acceso Institucional

| Perfil de Usuario | Nombre Completo | Correo Institucional | Contraseña Asistencial | Rol en Plataforma | Tarjeta ReTHUS / Identificador | Entorno de Trabajo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Médico Asistencial (Líder del Equipo)** | Dr. Santiago Vélez | `svelez@saludconecta.ips.gov.co` | `Urgencias2026*` | `MEDICO` (Rol ID 2) | `RM-94821-VALLE` | Portal Clínico Asistencial (Dashboard, Sala de Espera, Triaje Manchester, HCE Inmutable, Prescripción Médica) |
| **Administrador del Sistema (TI & Gobernanza)** | Administrador del Sistema | `admin@saludconecta.ips.gov.co` | `Admin2026*Secure!` | `ADMIN` (Rol ID 1) | `TI-ADMIN-001` | `AdminLayout` Desacoplado (Gobernanza ReTHUS, Auditoría Forense ISO 25010, Red de Sedes, Catálogo CUM) |

---

## 2. Instrucciones para el Segundo Factor Obligatorio (TOTP RFC 6238)

Por requerimiento de la Resolución 1995 de 1999 y la norma ISO/IEC 25010, toda autenticación clínica requiere firma de segundo factor:

1. **Escaneo del Código QR Directo:**
   - En el formulario de acceso se genera de forma nativa el código QR dinámico.
   - Abra su aplicación móvil de autenticación (**Google Authenticator**, **Authy** o **Microsoft Authenticator**).
   - Escanee el código QR que aparece en pantalla para vincular la cuenta a su teléfono celular.

2. **Semilla Criptográfica de Contingencia:**
   - Semilla Base32: `JBSWY3DPEHPK3PXP`
   - Algoritmo: HMAC-SHA1
   - Ventana de expiración: 30 segundos
   - Dígitos: 6 dígitos numéricos

3. **Acceso Ágil de Laboratorio:**
   - La interfaz incluye la opción *"Pegar código de prueba"*, la cual calcula localmente el token correspondiente al segundo exacto para agilizar las pruebas sin necesidad de utilizar el celular si así se requiere.

---

## 3. Pasos para Iniciar Sesión

1. **Abrir la Aplicación:**
   - Ingrese a [http://localhost:5173](http://localhost:5173) en su navegador web.
   - Visualizará la pantalla institucional de acceso con el video de fondo en reproducción continua.

2. **Ingresar Credenciales:**
   - Ingrese el correo institucional (`svelez@saludconecta.ips.gov.co` para médico o `admin@saludconecta.ips.gov.co` para administración).
   - Ingrese la contraseña asignada.
   - Seleccione la sede operativa de turno (ej. *Sede Cartago - Hospital Central*).

3. **Verificar Segundo Factor:**
   - Digite el código de 6 dígitos generado por su aplicación Authenticator o pulse *"Pegar código de prueba"*.
   - Haga clic en el botón **"Verificar y Firmar Acceso Asistencial"**.

4. **Direccionamiento Automático por Rol (RBAC):**
   - Si inicia sesión como **Dr. Santiago Vélez (`MEDICO`)**, el sistema lo dirigirá a la vista asistencial clínica.
   - Si inicia sesión como **Administrador TI (`ADMIN`)**, el sistema lo aislará en el panel de control administrativo desacoplado, sin acceso a historias clínicas confidenciales.

---

## 4. Comandos de Inicialización del Entorno Local

### Terminal 1: Servidor Backend en Go (GoFiber v2)

```powershell
cd src/backend
go run ./cmd/api/main.go
```

_El backend levantará en `http://localhost:8080`. Se ejecutará el seeder idempotente de MySQL para garantizar la existencia de las cuentas base._

### Terminal 2: Servidor Frontend en React (Vite PWA)

```powershell
cd src/frontend
npm run dev
```

_El frontend levantará en `http://localhost:5173` con proxy inverso configurado hacia el backend._

---

## 5. Ejecución de Pruebas de Calidad

```powershell
# Pruebas del Backend (Go)
go test ./tests/backend/... -v

# Pruebas del Frontend (Vitest)
cd src/frontend
npm test -- --run
```
