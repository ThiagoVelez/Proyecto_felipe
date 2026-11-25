"""Pruebas de caja negra de la revisión R4 contra el backend real (cmd/api, DB_DRIVER=memory).

Cubre H-R4-09 (críticos de seguridad del paciente), H-R4-12/13 (registro de TI y de administradores), H-R4-14 (portal
del paciente), H-R4-15 (ADMIN y TI frente a datos clínicos), H-R4-18 (/health/ready) y la medición de p95 HTTP y
memoria del proceso. Los secretos (JWT_SECRET, TI_SETUP_CODE, contraseñas) se generan al vuelo y no se escriben en
ningún archivo; la salida solo registra códigos HTTP y campos no sensibles.

Uso (desde la raíz, Windows o Linux):
  python -X utf8 docs/calidad/anexos/caja_negra_r4.py <ruta-al-binario-api> [puerto]
El binario se compila antes con: (cd src/backend && go build -o <ruta> ./cmd/api)
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import struct
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BIN = sys.argv[1]
PUERTO = sys.argv[2] if len(sys.argv) > 2 else "18480"
BASE = f"http://127.0.0.1:{PUERTO}"
resultados = []


def registrar(hipotesis, caso, esperado, obtenido, ok):
    resultados.append((hipotesis, caso, esperado, obtenido, "OK" if ok else "FALLA"))


def http(metodo, ruta, cuerpo=None, token=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            texto = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(texto) if texto.strip().startswith(("{", "[")) else texto)
    except urllib.error.HTTPError as e:
        texto = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(texto)
        except ValueError:
            return e.code, texto


def totp(secreto_b32):
    clave = base64.b32decode(secreto_b32 + "=" * (-len(secreto_b32) % 8), casefold=True)
    contador = struct.pack(">Q", int(time.time()) // 30)
    h = hmac.new(clave, contador, hashlib.sha1).digest()
    o = h[-1] & 0x0F
    return "%06d" % ((struct.unpack(">I", h[o:o + 4])[0] & 0x7FFFFFFF) % 1000000)


def login(email, clave, secreto=None):
    cuerpo = {"email": email, "password": clave}
    st, r = http("POST", "/api/v1/auth/login", cuerpo)
    if st == 401 and isinstance(r, dict) and r.get("mfa_required") and secreto:
        cuerpo["totp_code"] = totp(secreto)
        st, r = http("POST", "/api/v1/auth/login", cuerpo)
    return st, (r.get("token") or r.get("access_token")) if isinstance(r, dict) else None


def main():
    trabajo = tempfile.mkdtemp(prefix="caja-negra-r4-")
    entorno = dict(os.environ)
    codigo_ti = "ti-" + secrets.token_urlsafe(18)
    entorno.update({
        "DB_DRIVER": "memory", "PORT": PUERTO, "JWT_SECRET": secrets.token_urlsafe(48), "TI_SETUP_CODE": codigo_ti,
        "ADMIN_INITIAL_EMAIL": "", "ADMIN_INITIAL_PASSWORD": "", "TRUSTED_PROXIES": "127.0.0.1",
    })
    # El registro va a un archivo temporal: una tuberia sin leer bloquea al servidor cuando se llena.
    archivo_log = open(os.path.join(trabajo, "servidor.log"), "w+b")
    proc = subprocess.Popen([BIN], cwd=trabajo, env=entorno, stdout=archivo_log, stderr=subprocess.STDOUT)
    try:
        for _ in range(60):
            try:
                if http("GET", "/api/v1/health/live")[0] == 200:
                    break
            except Exception:
                time.sleep(0.25)
        else:
            raise SystemExit("el backend no arrancó")
        ejecutar(codigo_ti, proc.pid)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        archivo_log.seek(0)
        log = archivo_log.read().decode("utf-8", "replace")
        archivo_log.close()
        # H-R4-12: el código de instalación nunca debe aparecer en los registros
        registrar("H-R4-12", "El TI_SETUP_CODE no aparece en los registros del proceso", "ausente",
                  "presente" if codigo_ti in log else "ausente", codigo_ti not in log)
    imprimir()


def ejecutar(codigo_ti, pid):
    # H-R4-18: /health/ready no expone DSN, versiones ni errores internos
    st, r = http("GET", "/api/v1/health/ready")
    claves = sorted(r.keys()) if isinstance(r, dict) else r
    registrar("H-R4-18", "GET /health/ready (sin token)", "200 sin DSN ni versión", f"{st} claves={claves}",
              st == 200 and not any(k in json.dumps(r).lower() for k in ("dsn", "password", "version", "go1")))

    # H-R4-12: registro del Encargado de TI
    base_ti = {"full_name": "Encargado TI Prueba", "document_number": "1000000001", "email": "ti.r4@example.com",
               "password": "ClaveTI-" + secrets.token_urlsafe(10), "branch": "", "setup_code": "codigo-equivocado-123"}
    st, _ = http("POST", "/api/v1/auth/register-ti", base_ti)
    registrar("H-R4-12", "register-ti con código equivocado", "403", st, st == 403)
    manipulado = dict(base_ti, setup_code=codigo_ti, role="ADMIN", role_id=1, is_active=True,
                      mfa_secret="JBSWY3DPEHPK3PXP")
    st, r = http("POST", "/api/v1/auth/register-ti", manipulado)
    rol = r.get("user", {}).get("role") if isinstance(r, dict) else None
    secreto_ti = r.get("mfa_secret") if isinstance(r, dict) else None
    registrar("H-R4-13", "register-ti con role/role_id/mfa_secret manipulados", "201, rol TI, semilla propia",
              f"{st}, rol={rol}, semilla_impuesta={'si' if secreto_ti == 'JBSWY3DPEHPK3PXP' else 'no'}",
              st == 201 and rol == "TI" and secreto_ti != "JBSWY3DPEHPK3PXP")
    st, _ = http("POST", "/api/v1/auth/register-ti", dict(base_ti, email="ti2.r4@example.com", setup_code=codigo_ti))
    registrar("H-R4-12", "Segundo register-ti con el código correcto (un solo uso)", "409", st, st == 409)
    st, tok_ti = login(base_ti["email"], base_ti["password"], secreto_ti)
    registrar("H-R4-12", "Login del Encargado de TI con TOTP", "200", st, st == 200 and bool(tok_ti))

    # H-R4-13: administrador de sede desde el login (anónimo) con rol manipulado
    st, sedes = http("GET", "/api/v1/branches")
    nombres = [s.get("name") for s in sedes] if isinstance(sedes, list) else [s.get("name") for s in sedes.get("branches", [])] if isinstance(sedes, dict) else []
    sede = nombres[0] if nombres else "Sede Cartago - Hospital Central"
    adm_sede = {"full_name": "Admin Sede Prueba", "document_number": "1000000002", "email": "adm.sede.r4@example.com",
                "password": "ClaveAdm-" + secrets.token_urlsafe(10), "branch": sede, "role": "TI", "role_id": 9,
                "is_active": True}
    st, r = http("POST", "/api/v1/auth/register-branch-admin", adm_sede)
    u = r.get("user", {}) if isinstance(r, dict) else {}
    registrar("H-R4-13", "register-branch-admin anónimo con role=TI, role_id=9, is_active=true",
              "201, rol ADMIN, cuenta inactiva", f"{st}, rol={u.get('role')}, activo={u.get('is_active')}",
              st == 201 and u.get("role") == "ADMIN" and not u.get("is_active"))
    st, tok = login(adm_sede["email"], adm_sede["password"], r.get("mfa_secret") if isinstance(r, dict) else None)
    registrar("H-R4-13", "Login del administrador pendiente de aprobación", "401/403", st, st in (401, 403) and not tok)

    # TI registra un administrador activo; el administrador registra y activa personal
    adm = {"full_name": "Admin Activo Prueba", "document_number": "1000000003", "email": "adm.r4@example.com",
           "password": "ClaveAdm-" + secrets.token_urlsafe(10), "branch": sede}
    st, r = http("POST", "/api/v1/auth/register-admin", adm, tok_ti)
    secreto_adm = r.get("mfa_secret") if isinstance(r, dict) else None
    st, tok_adm = login(adm["email"], adm["password"], secreto_adm)
    registrar("H-R4-13", "TI registra administrador y este inicia sesión con TOTP", "200", st, st == 200 and bool(tok_adm))

    def personal(rol_id, nombre, correo):
        clave = "Clave-" + secrets.token_urlsafe(10)
        st, r = http("POST", "/api/v1/admin/users", {"role_id": rol_id, "full_name": nombre, "email": correo,
                                                     "password": clave, "professional_card": "RM-" + correo[:6],
                                                     "branch": sede, "document_number": str(secrets.randbelow(10**9))},
                     tok_adm)
        uid = (r.get("user_id") or (r.get("user") or {}).get("id")) if isinstance(r, dict) else None
        http("PATCH", f"/api/v1/admin/users/{uid}/status", {"is_active": True}, tok_adm)
        st2, tok = login(correo, clave, (r.get("mfa_secret") if isinstance(r, dict) else None))
        return st2, tok, uid

    st, tok_med, med_id = personal(2, "Medico Prueba R4", "medico.r4@example.com")
    registrar("H-R4-09", "Alta y activación de médico por el administrador; login", "200", st, st == 200 and bool(tok_med))
    st, tok_enf, _ = personal(3, "Enfermera Prueba R4", "enfermera.r4@example.com")

    # Pacientes de prueba (datos sintéticos)
    def paciente(doc, nombre, correo=""):
        st, r = http("POST", "/api/v1/patients/", {"document_type": "CC", "document_number": doc, "first_name": nombre,
                                                  "last_name": "Sintetico", "birth_date": "1980-05-10", "gender": "M",
                                                  "blood_type": "O+", "eps_name": "EPS Prueba", "affiliation_status": "ACTIVO",
                                                  "email": correo, "address": "Calle 1"}, tok_med)
        return st, (r.get("id") if isinstance(r, dict) else None) or (r.get("patient", {}) or {}).get("id") if isinstance(r, dict) else None

    _, pa = paciente("70000001", "PacienteA")
    _, pb = paciente("70000002", "PacienteB")
    st, meds = http("GET", "/api/v1/medications?q=amox", None, tok_med)
    lista = meds if isinstance(meds, list) else (meds.get("medications") or meds.get("data") or []) if isinstance(meds, dict) else []
    amox = next((m.get("id") for m in lista if m.get("active_ingredient") == "AMOXICILINA"), None)

    # DEF-06/DEF-60: alergia escrita con tilde y por familia (penicilinas) frente a amoxicilina
    http("POST", f"/api/v1/patients/{pa}/allergies", {"active_ingredient": "Penicilína", "severity": "SEVERA", "notes": "prueba"}, tok_med)
    st, rec = http("POST", "/api/v1/clinical-records/", {"patient_id": pa, "anamnesis": "Prueba R4", "physical_exam": "Normal",
                                                        "cie11_code": "CA40", "diagnosis_description": "Prueba",
                                                        "treatment_plan": "Prueba", "pain_scale_score": 2}, tok_med)
    rec_a = rec.get("id") if isinstance(rec, dict) else None
    st, r = http("POST", "/api/v1/prescriptions/", {"clinical_record_id": rec_a, "patient_id": pa, "items": [
        {"medication_id": amox, "dosage": "500 mg", "frequency_hours": 8, "duration_days": 7, "total_quantity": 21}]}, tok_med)
    registrar("H-R4-09", "DEF-06/60: alergia «Penicilína» (tilde, familia) y receta de amoxicilina", "422 bloqueada", st, st == 422)

    # DEF-05: receta sobre el folio de A indicando el paciente B
    st, _ = http("POST", "/api/v1/prescriptions/", {"clinical_record_id": rec_a, "patient_id": pb, "items": [
        {"medication_id": amox, "dosage": "500 mg", "frequency_hours": 8, "duration_days": 7, "total_quantity": 21}]}, tok_med)
    registrar("H-R4-09", "DEF-05: receta en el folio de A con patient_id de B", "4xx rechazada", st, 400 <= st < 500)

    # DEF-09: hipotermia severa
    st, r = http("POST", "/api/v1/triage/", {"patient_id": pb, "systolic_bp": 120, "diastolic_bp": 80, "heart_rate": 75,
                                            "respiratory_rate": 16, "oxygen_saturation": 98, "body_temperature": 30.0,
                                            "glasgow_score": 15, "reason_for_consultation": "Hipotermia"}, tok_enf)
    nivel = r.get("manchester_level") if isinstance(r, dict) else None
    registrar("H-R4-09", "DEF-09: triaje con 30,0 °C", "201 y nivel I o II", f"{st}, nivel={nivel}",
              st in (200, 201) and str(nivel) in ("1", "2", "I", "II", "NIVEL_I", "NIVEL_II"))

    # DEF-07/DEF-18: inmutabilidad del folio cerrado en la sincronización
    st, _ = http("POST", f"/api/v1/clinical-records/{rec_a}/close", {"signature_token": "firma-r4"}, tok_med)
    sync = {"batch_id": "lote-r4", "records": [{"id": rec_a, "patient_id": pa, "anamnesis": "SOBRESCRITO", "physical_exam": "x",
                                                "cie11_code": "CA40", "diagnosis_description": "x", "treatment_plan": "x",
                                                "is_closed": False, "created_at": "2026-11-24T10:00:00Z"}]}
    http("POST", "/api/v1/sync/batch", sync, tok_med)
    st, r = http("GET", f"/api/v1/clinical-records/{rec_a}", None, tok_med)
    anam = r.get("anamnesis") if isinstance(r, dict) else None
    registrar("H-R4-09", "DEF-07: lote de sincronización sobre folio cerrado", "anamnesis sin cambios",
              f"cerrado={r.get('is_closed') if isinstance(r, dict) else None}, anamnesis={'SOBRESCRITA' if anam == 'SOBRESCRITO' else 'intacta'}",
              anam != "SOBRESCRITO")

    # H-R4-15: ADMIN y TI frente a datos clínicos (Ley 1581)
    for nombre, tok in (("ADMIN", tok_adm), ("TI", tok_ti)):
        for ruta in (f"/api/v1/patients/{pa}", f"/api/v1/clinical-records/{rec_a}", f"/api/v1/patients/{pa}/allergies",
                     "/api/v2/treatments/x", "/api/v2/pharmacy/inbox", "/api/v2/lab-orders/", "/api/v2/nursing/"):
            st, _ = http("GET", ruta, None, tok)
            registrar("H-R4-15", f"{nombre} GET {ruta.replace(pa or '-', '{pa}').replace(rec_a or '-', '{folio}')}", "403",
                      st, st == 403)

    # H-R4-14 / DEF-99: solicitud anónima con el documento de un paciente existente sin correo
    st, pub = http("GET", "/api/v1/public/branches")
    sedes_pub = pub if isinstance(pub, list) else pub.get("branches", []) if isinstance(pub, dict) else []
    sede_pub = (sedes_pub[0].get("name") if sedes_pub else sede)
    st, r = http("POST", "/api/v1/public/appointment-requests", {
        "branch": sede_pub, "document_type": "CC", "document_number": "70000002", "first_name": "Otra", "last_name": "Persona",
        "birth_date": "2001-01-01", "gender": "F", "blood_type": "A+", "eps_name": "X", "phone": "3000000000",
        "email": "tercero.r4@example.com", "address": "Calle 9", "observations": "Prueba R4", "consent": True})
    registrar("H-R4-14", "Solicitud pública con el documento de B, otro nombre y otro correo", "201 (solo recibo)", st, st == 201)
    st, sol = http("GET", "/api/v2/appointment-requests/", None, tok_med)
    lista_sol = sol if isinstance(sol, list) else (sol.get("requests") or sol.get("data") or []) if isinstance(sol, dict) else []
    sid = lista_sol[0].get("id") if lista_sol else None
    fecha = time.strftime("%Y-%m-%dT%H:%M:00-05:00", time.localtime(time.time() + 3 * 86400))
    st, _ = http("POST", f"/api/v2/appointment-requests/{sid}/schedule", {"appointment_date": fecha, "date": fecha, "note": "R4"}, tok_med)
    st2, r = http("GET", f"/api/v1/patients/{pb}", None, tok_med)
    correo = r.get("email") if isinstance(r, dict) else None
    registrar("H-R4-14", f"DEF-99: el médico agenda (estado {st}); correo de la ficha real de B", "vacío (identidad no verificada)",
              "correo del tercero" if correo == "tercero.r4@example.com" else repr(correo), correo != "tercero.r4@example.com")

    # Rendimiento: 110 peticiones autenticadas, concurrencia 5. El límite global es 120/min por IP: se espera a que
    # se vacíe la ventana de las peticiones anteriores para medir solo respuestas 200.
    time.sleep(62)
    def una(_):
        t0 = time.perf_counter()
        st, _ = http("GET", "/api/v1/admin/users", None, tok_adm)
        return (time.perf_counter() - t0) * 1000, st
    with ThreadPoolExecutor(5) as ex:
        datos = list(ex.map(una, range(110)))
    lat = sorted(d[0] for d in datos)
    codigos = {}
    for _, c in datos:
        codigos[c] = codigos.get(c, 0) + 1
    p = lambda q: lat[int(q * (len(lat) - 1))]
    registrar("RNF01", "GET /api/v1/admin/users n=110 c=5 (token ADMIN)", "p95 < 28,4 ms publicado",
              f"códigos={codigos} p50={p(.5):.2f} ms p95={p(.95):.2f} ms p99={p(.99):.2f} ms", p(.95) < 28.4)
    memoria = subprocess.run(["powershell", "-NoProfile", "-Command", f"(Get-Process -Id {pid}).WorkingSet64/1MB"],
                             capture_output=True, text=True).stdout.strip() if os.name == "nt" else "No medido"
    registrar("RNF01", "Memoria del proceso (WorkingSet) tras la carga", "< 18,2 MB publicado", f"{memoria} MB",
              memoria.replace(",", ".").replace(".", "", memoria.count(".") - 1).replace(" ", "")[:6].replace(",", ".").strip() != "" and float(memoria.replace(",", ".")) < 18.2 if memoria not in ("", "No medido") else False)


def imprimir():
    print("| Hipótesis | Caso | Esperado | Obtenido | Resultado |")
    print("|---|---|---|---|---|")
    for h, c, e, o, r in resultados:
        print(f"| {h} | {c} | {e} | {o} | {r} |")
    fallos = sum(1 for r in resultados if r[4] == "FALLA")
    print(f"\nCasos: {len(resultados)}; OK: {len(resultados) - fallos}; FALLA: {fallos}")


if __name__ == "__main__":
    main()
