# -*- coding: utf-8 -*-
"""Comprueba que las cifras de la revisión R4 coincidan en todos los documentos de docs/calidad.

Uso (desde la raíz del repositorio):
  python -X utf8 docs/calidad/anexos/verificar_cifras_r4.py             # verifica; código 1 si algo no coincide
  python -X utf8 docs/calidad/anexos/verificar_cifras_r4.py --escribir  # inserta o actualiza el bloque cifras-r4

Fuente única: anexos/cifras-r4.json. El bloque <!-- cifras-r4 --> ... <!-- /cifras-r4 --> se coloca encima del bloque
cifras-r3 (que se conserva como historia). Además se recalculan desde los documentos: los abiertos por severidad de la
tabla resumen de la bitácora, las categorías de anexos/verificacion-cierre-r4.md, la lista de defectos-abiertos.txt y
las cifras de la tabla 1.2 del informe y de la guía de estudio.
"""
import json
import pathlib
import re
import sys

CAL = pathlib.Path(__file__).resolve().parents[1]
DOCS_BLOQUE = ["README.md", "07-resumen-ejecutivo.md", "informe-revision-r4.md", "guia-estudio-r4.md"]
INI, FIN = "<!-- cifras-r4 -->", "<!-- /cifras-r4 -->"


def bloque(c):
    ci, d, m = c["cierre"], c["defectos"], c["medidas"]
    k, s, n = ci["categorias"], d["abiertos_por_severidad"], d["nuevos_r4_por_severidad"]
    return f"""{INI}
> **Cifras vigentes de la revisión R4 (24 nov 2026, base `{c['base']}`).** Fuente única: `anexos/cifras-r4.json`; coherencia comprobada con `anexos/verificar_cifras_r4.py`. Detalle en `informe-revision-r4.md`.
>
> - Verificación del cierre (DEF-01 a DEF-98): {k['Verificado']} verificados, {k['Verificado parcialmente']} verificados parcialmente, {k['Revisado sin prueba']} revisados sin prueba, {k['No verificable']} no verificables, {k['Reabierto']} reabiertos ({', '.join(ci['reabiertos'])}). Reproducciones de R3 que hoy pasan: {ci['reproducciones_r3']}.
> - Defectos registrados: {d['registrados']}. Nuevos de R4: {d['nuevos_r4']} ({n['Crítica']} críticos, {n['Alta']} altos, {n['Media']} medios, {n['Baja']} bajos). Abiertos: {d['abiertos']} ({s['Crítica']} crítico, {s['Alta']} altos, {s['Media']} medios, {s['Baja']} bajos). Reproducciones de defectos abiertos: {d['reproducciones_abiertas']}.
> - Pruebas backend (pasan / fallan / omitidas): {m['pruebas_backend']['r4']}. Cobertura backend: {m['cobertura_backend']['r4']} con el comando de R3 y {m['cobertura_backend']['r4_sin_adaptadores']} sin adaptadores MySQL/PostgreSQL. Vitest (pruebas / archivos): {m['vitest']['r4']}. Cobertura frontend: {m['cobertura_frontend']['r4']}.
> - Análisis estático: golangci-lint {m['golangci_lint']['r4']}; staticcheck {m['staticcheck']['r4']}; gosec {m['gosec']['r4']}; gocyclo {m['gocyclo']['r4']} funciones mayores de 15 ({m['gocyclo']['r4_en_src']} en src); govulncheck {m['govulncheck']['r4']} alcanzable ({m['govulncheck']['r4_id']}); npm audit prod-dev {m['npm_audit']['r4']}; ESLint {m['eslint']['r4']}.
> - Rendimiento: p95 {m['p95_http']['r4']}; memoria {m['memoria']['r4']}. OWASP ASVS L2 (muestra de 53): {m['asvs']['r1']} en R1 -> {m['asvs']['r4']}. Mutaciones detectadas: {m['mutaciones']['r4']}.
> - Afirmaciones del README (V / P / NV / F): {m['afirmaciones']['r4_comparables']} en las 48 de R3 ({m['afirmaciones']['r4_retiradas']} retiradas); {m['afirmaciones']['r4_total']} en total. RTM: {m['rtm']['r4']} requisitos sostenidos. Dictamen: **{c['dictamen']}**.
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
    for doc in DOCS_BLOQUE:
        t = (CAL / doc).read_text(encoding="utf-8")
        if esperado not in t:
            errores.append(f"{doc}: falta el bloque cifras-r4 o no coincide con cifras-r4.json")
        elif doc in ("README.md", "07-resumen-ejecutivo.md") and "<!-- cifras-r3 -->" in t and t.index(INI) > t.index("<!-- cifras-r3 -->"):
            errores.append(f"{doc}: el bloque cifras-r4 debe ir encima del bloque cifras-r3")

    # Bitácora: abiertos por severidad (todo lo que no empieza por «Cerrado») y nuevos de R4
    filas = tabla_bitacora()
    sev, nuevos = {}, {}
    for _, (_, _, s, _, est) in filas.items():
        if not est.startswith("Cerrado"):
            sev[s] = sev.get(s, 0) + 1
        if "(R4" in est and est.startswith("Nuevo"):
            nuevos[s] = nuevos.get(s, 0) + 1
    quitar0 = lambda dic: {k: v for k, v in dic.items() if v}
    if quitar0(sev) != quitar0(c["defectos"]["abiertos_por_severidad"]):
        errores.append(f"bitácora: abiertos por severidad {sev} != {c['defectos']['abiertos_por_severidad']}")
    if quitar0(nuevos) != quitar0(c["defectos"]["nuevos_r4_por_severidad"]):
        errores.append(f"bitácora: nuevos de R4 {nuevos} != {c['defectos']['nuevos_r4_por_severidad']}")
    if sum(sev.values()) != c["defectos"]["abiertos"]:
        errores.append(f"bitácora: {sum(sev.values())} abiertos != {c['defectos']['abiertos']}")
    if len(filas) + 4 != c["defectos"]["registrados"]:  # DEF-01 a DEF-04 están en la sección 1
        errores.append(f"bitácora: {len(filas) + 4} defectos registrados != {c['defectos']['registrados']}")
    for d in c["cierre"]["reabiertos"]:
        if not filas.get(d, [""] * 5)[4].startswith("Reabierto"):
            errores.append(f"bitácora: {d} no figura como «Reabierto»")

    # defectos-abiertos.txt: cada entrada abierta en la bitácora y cantidad igual a las reproducciones
    lista = re.findall(r"^(DEF-\d+) ", (CAL / "defectos-abiertos.txt").read_text(encoding="utf-8"), re.M)
    for ident in lista:
        if filas.get(ident, [""] * 4 + ["falta"])[4].startswith(("Cerrado", "falta")):
            errores.append(f"defectos-abiertos.txt: {ident} no está abierto en la bitácora")
    if f"{len(lista)} de {len(lista)}" != c["defectos"]["reproducciones_abiertas"]:
        errores.append(f"defectos-abiertos.txt: {len(lista)} entradas != {c['defectos']['reproducciones_abiertas']}")

    # Anexo de verificación del cierre
    anexo = (CAL / "anexos" / "verificacion-cierre-r4.md").read_text(encoding="utf-8")
    for cat, n in c["cierre"]["categorias"].items():
        filas_cat = len(re.findall(r"\| \*\*" + re.escape(cat) + r"\*\* \|", anexo))
        if filas_cat != n or f"| {cat} | {n} |" not in anexo:
            errores.append(f"verificacion-cierre-r4.md: «{cat}» tiene {filas_cat} filas; cifras-r4.json dice {n}")

    # Informe: tabla 3.1 y columna R4 de la tabla 1.2
    inf = (CAL / "informe-revision-r4.md").read_text(encoding="utf-8")
    for cat, n in c["cierre"]["categorias"].items():
        if f"| {cat} | {n} |" not in inf:
            errores.append(f"informe-revision-r4.md: la tabla 3.1 no muestra «{cat}: {n}»")
    m = c["medidas"]
    for clave in ("pruebas_backend", "cobertura_backend", "vitest", "cobertura_frontend", "asvs", "rtm"):
        if f"| {m[clave]['r4']} |" not in inf:
            errores.append(f"informe-revision-r4.md: la tabla 1.2 no muestra {clave} = {m[clave]['r4']}")
    if f"| {m['cobertura_backend']['r4_sin_adaptadores']} |" not in inf:
        errores.append("informe-revision-r4.md: falta la cobertura sin adaptadores en la tabla 1.2")

    # Guía de estudio: tabla R1 -> R3 -> R4
    guia = (CAL / "guia-estudio-r4.md").read_text(encoding="utf-8")
    for clave in ("pruebas_backend", "vitest", "asvs", "rtm"):
        if m[clave]["r4"] not in guia:
            errores.append(f"guia-estudio-r4.md: no aparece {clave} = {m[clave]['r4']}")
    return errores


def escribir(c):
    nuevo = bloque(c)
    for doc in DOCS_BLOQUE:
        p = CAL / doc
        t = p.read_text(encoding="utf-8")
        if INI in t:
            t = re.sub(re.escape(INI) + r".*?" + re.escape(FIN), lambda _: nuevo, t, flags=re.S)
        elif "<!-- cifras-r3 -->" in t:
            t = t.replace("<!-- cifras-r3 -->", nuevo + "\n\n<!-- cifras-r3 -->", 1)
        else:
            lineas = t.split("\n", 1)
            t = lineas[0] + "\n\n" + nuevo + "\n" + (lineas[1] if len(lineas) > 1 else "")
        p.write_text(t, encoding="utf-8", newline="\n")


def main():
    c = json.loads((CAL / "anexos" / "cifras-r4.json").read_text(encoding="utf-8"))
    if "--escribir" in sys.argv:
        escribir(c)
    errores = verificar(c)
    for e in errores:
        print("ERROR:", e)
    print(f"Documentos con bloque comprobados: {len(DOCS_BLOQUE)}; comprobaciones cruzadas: bitácora, defectos-abiertos.txt, "
          f"verificacion-cierre-r4.md, informe y guía; errores: {len(errores)}")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
