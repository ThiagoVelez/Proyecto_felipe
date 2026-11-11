# -*- coding: utf-8 -*-
"""Comprueba que las cifras de la revisión R3 coincidan en todos los documentos de docs/calidad.

Uso (desde la raíz del repositorio):
  python -X utf8 docs/calidad/anexos/verificar_cifras_r3.py            # verifica; código 1 si algo no coincide
  python -X utf8 docs/calidad/anexos/verificar_cifras_r3.py --escribir # inserta o actualiza el bloque de cifras

Fuente única: anexos/cifras-r3.json (generado por generar_bitacora_r3.py). Cada documento lleva el mismo
bloque entre las marcas <!-- cifras-r3 --> y <!-- /cifras-r3 -->. Además se recalculan los totales de la
tabla resumen de la bitácora y se cruzan con defectos-abiertos.txt y con el informe R3.
"""
import json
import pathlib
import re
import sys

CAL = pathlib.Path(__file__).resolve().parents[1]
DOCS = [
    "01-plan-aseguramiento-calidad.md", "02-modelo-calidad-iso25010-2023.md", "03-informe-revision-codigo.md",
    "04-bitacora-defectos.md", "05-auditoria-owasp-asvs-l2.md", "06-plan-mantenimiento.md",
    "07-resumen-ejecutivo.md", "README.md", "verificacion-documental.md", "trello-tarjetas-defectos.md",
    "informe-revision-r3.md",
]
INI, FIN = "<!-- cifras-r3 -->", "<!-- /cifras-r3 -->"


def bloque(c):
    r, m = c["resumen"], c["medidas"]
    v = r["verificacion_01_48"]
    s = r["abiertos_en_main_por_severidad"]
    n = r["nuevos_r3_por_severidad"]
    return f"""{INI}
> **Cifras vigentes de la revisión R3 (10 nov 2026).** Fuente única: `anexos/cifras-r3.json`; coherencia comprobada con `anexos/verificar_cifras_r3.py`. Detalle en `informe-revision-r3.md`.
>
> - Defectos registrados: {r['defectos_registrados']} (DEF-01 a DEF-92). Verificación de DEF-01 a DEF-48: {v.get('Verificado — corregido', 0)} verificados, {v.get('Corregido parcialmente', 0)} corregidos parcialmente, {v.get('Sigue abierto', 0)} siguen abiertos, {v.get('Corrección presente; ejecución No medida', 0)} sin ejecución medible, 0 regresiones.
> - Abiertos en `main` (DEF-05 a DEF-92): {r['abiertos_en_main']} ({s.get('Crítica', 0)} críticos, {s.get('Alta', 0)} altos, {s.get('Media', 0)} medios, {s.get('Baja', 0)} bajos). Nuevos de R3: {r['nuevos_r3']} ({n.get('Crítica', 0)} crítico, {n.get('Alta', 0)} alto, {n.get('Media', 0)} medios).
> - Pruebas backend: {m['pruebas_backend']}. Cobertura backend: {m['cobertura_backend']}. Vitest: {m['vitest']}. Cobertura frontend: {m['cobertura_frontend']}. Reproducciones de defectos abiertos: {m['reproducciones_abiertas']}.
> - Análisis estático: golangci-lint {m['golangci_lint']}; gocyclo {m['gocyclo']}; govulncheck {m['govulncheck']}; npm audit {m['npm_audit']}; ESLint {m['eslint']}.
> - Rendimiento: p95 {m['p95']}; memoria {m['memoria']}.
> - Afirmaciones publicadas: {m['afirmaciones']}. RTM: {m['rtm']}. Dictamen: **{m['dictamen']}**.
{FIN}"""


def tabla_bitacora():
    texto = (CAL / "04-bitacora-defectos.md").read_text(encoding="utf-8")
    filas = {}
    for ln in texto.splitlines():
        mt = re.match(r"^\| (DEF-\d+) \|(.*)\|\s*$", ln)
        if mt:
            celdas = mt.group(2).replace("\\|", "\x00").split("|")
            if len(celdas) == 5:
                filas[mt.group(1)] = [x.strip() for x in celdas]
    return filas


def verificar(c):
    errores = []
    esperado = bloque(c)
    for doc in DOCS:
        t = (CAL / doc).read_text(encoding="utf-8")
        if esperado not in t:
            errores.append(f"{doc}: falta el bloque de cifras R3 o no coincide con cifras-r3.json")
    filas = tabla_bitacora()
    ids = sorted(filas, key=lambda x: int(x[4:]))
    if ids != [f"DEF-{i:02d}" for i in range(5, 93)]:
        errores.append("bitácora: la tabla resumen no tiene exactamente DEF-05 a DEF-92")
    sev = {}
    for i, (_, _, s, _, est) in filas.items():
        if not (est.startswith("Cerrado") or est.startswith("Corrección presente")):
            sev[s] = sev.get(s, 0) + 1
    if sev != c["resumen"]["abiertos_en_main_por_severidad"]:
        errores.append(f"bitácora: abiertos por severidad {sev} != cifras-r3.json {c['resumen']['abiertos_en_main_por_severidad']}")
    lista = (CAL / "defectos-abiertos.txt").read_text(encoding="utf-8")
    for ident in re.findall(r"^(DEF-\d+) ", lista, re.M):
        est = filas.get(ident, ["", "", "", "", "falta"])[4]
        if est.startswith(("Cerrado", "Rechazado", "En verificación", "Corrección presente")) or est == "falta":
            errores.append(f"defectos-abiertos.txt: {ident} figura como «{est}» en la bitácora")
    inf = (CAL / "informe-revision-r3.md").read_text(encoding="utf-8")
    v = c["resumen"]["verificacion_01_48"]
    for nombre, cantidad in v.items():
        if f"| {nombre} | {cantidad} |" not in inf:
            errores.append(f"informe-revision-r3.md: la tabla de verificación no muestra «{nombre}: {cantidad}»")
    return errores


def escribir(c):
    nuevo = bloque(c)
    for doc in DOCS:
        p = CAL / doc
        t = p.read_text(encoding="utf-8")
        if INI in t:
            t = re.sub(re.escape(INI) + r".*?" + re.escape(FIN), lambda _: nuevo, t, flags=re.S)
        else:
            lineas = t.split("\n", 1)
            t = lineas[0] + "\n\n" + nuevo + "\n" + (lineas[1] if len(lineas) > 1 else "")
        p.write_text(t, encoding="utf-8")


def main():
    c = json.loads((CAL / "anexos" / "cifras-r3.json").read_text(encoding="utf-8"))
    if "--escribir" in sys.argv:
        escribir(c)
    errores = verificar(c)
    for e in errores:
        print("ERROR:", e)
    print(f"Documentos comprobados: {len(DOCS)}; errores: {len(errores)}")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
