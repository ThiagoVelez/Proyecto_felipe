"""Verificación R4 del cierre de defectos (H-R4-01).

Lee 04-bitacora-defectos.md, toma de cada ficha (y de las tablas de DEF-01 a DEF-04) el estado declarado y las
pruebas citadas, y las cruza con las ejecuciones reales:

  - go test -json de tests/backend y src/backend (pasa / falla / omitida / no ejecutada);
  - pruebas con etiqueta de compilación `integration` (MySQL/PostgreSQL), que ni la suite local ni el pipeline ejecutan;
  - archivos de Vitest citados y su resultado en el reporte JSON de Vitest;
  - commits citados (existen en el repositorio).

Uso (desde la raíz):
  python -X utf8 docs/calidad/anexos/verificar_cierre_r4.py <go-tests.json> <go-src.json> <vitest.json> <salida.md>

La categoría final la ajusta Calidad a mano cuando la revisión de código (no automatizable) cambia el veredicto; esos
ajustes se listan en el anexo con su motivo (diccionario AJUSTES_MANUALES).
"""
import json
import pathlib
import re
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[3]
BASE = "6a51bb8"  # origin/main auditado en R4

# Ajustes por revisión de código o caja negra (se completan tras las hipótesis H-R4-xx). Clave: DEF-XX.
AJUSTES_MANUALES: dict[str, tuple[str, str]] = {
    "DEF-11": ("Verificado parcialmente", "Caja negra (evidencias/r4/42): el backend en memoria arranca sin cuentas sembradas; el seeder MySQL no se ejecutó (sin motor)."),
    "DEF-12": ("Verificado", "La ficha cita `TestDEF12ResolveJWTSecret`, nombre que ya no existe; la prueba equivalente `TestDEF12ValidateJWTSecret` (src/backend/pkg/config) pasa (DEF-104)."),
    "DEF-24": ("Verificado", "govulncheck R4 no reporta vulnerabilidades de Fiber v2.52.16 (evidencias/r4/07)."),
    "DEF-44": ("Verificado parcialmente", "golangci-lint 0 y gofmt 0, pero gocyclo da 21 funciones >15 (12 en src) y la lista aceptada no está enumerada (evidencias/r4/08, H-R4-07)."),
    "DEF-45": ("Verificado", "npm audit completo: 0 vulnerabilidades (evidencias/r4/22b)."),
    "DEF-48": ("Verificado", "La suite tests/backend pasa con -race en el run 45183473187 de main (evidencias/r4/45)."),
    "DEF-50": ("Reabierto", "Cualquier usuario autenticado obtiene la semilla TOTP de otra cuenta: `TestDEF50R4SemillaMFASoloDelPropioUsuario` falla por el defecto (evidencias/r4/32). La prueba citada solo cubría el acceso sin sesión."),
    "DEF-62": ("Verificado parcialmente", "Permisos y retención verificados, pero el fallo SMTP registra el correo sin enmascarar (DEF-101)."),
    "DEF-72": ("Reabierto", "Solo se corrigió la parte de AUDITOR; ADMIN sigue en recetas, bandeja de farmacia y dispensación: `TestDEF72R4AdminNoAccedeARecetasNiDispensa` y caja negra (evidencias/r4/32 y 42)."),
    "DEF-83": ("Verificado", "govulncheck R4 ya no reporta GO-2026-6888 (brotli) como alcanzable (evidencias/r4/07)."),
    "DEF-91": ("Reabierto", "README.md:2151 y 2367 siguen publicando un dictamen «100 % de conformidad» (evidencias/r4/50-afirmaciones-readme.md)."),
    "DEF-97": ("Verificado", "`SessionPerTab.test.js` (3 pruebas) pasa; el recorrido con Playwright citado en el README no está versionado."),
    "DEF-98": ("Verificado", "`TestParametrosDeRutaNoSeCorrompenEntrePeticiones` pasa en local y con -race en CI (evidencias/r4/45)."),
}


def cargar_go(ruta):
    estado = {}
    for linea in open(ruta, encoding="utf-8", errors="replace"):
        try:
            e = json.loads(linea)
        except ValueError:
            continue
        t, a = e.get("Test"), e.get("Action")
        if t and a in ("pass", "fail", "skip"):
            estado[t] = a
    return estado


def cargar_vitest(ruta):
    datos = json.load(open(ruta, encoding="utf-8"))
    por_archivo = {}
    for archivo in datos.get("testResults", []):
        nombre = pathlib.Path(archivo["name"]).name
        estados = [r.get("status") for r in archivo.get("assertionResults", [])]
        por_archivo[nombre] = estados
    return por_archivo


def definiciones_go():
    """Mapa prueba -> (archivo, tiene etiqueta integration)."""
    defs = {}
    for base in (RAIZ / "tests" / "backend", RAIZ / "src" / "backend"):
        for f in base.rglob("*_test.go"):
            texto = f.read_text(encoding="utf-8", errors="replace")
            integracion = "//go:build integration" in texto.split("package", 1)[0]
            for m in re.finditer(r"^func (Test\w+|Benchmark\w+)\(", texto, re.M):
                defs[m.group(1)] = (str(f.relative_to(RAIZ)).replace("\\", "/"), integracion)
    return defs


def secciones_bitacora():
    # El estado declarado es el de la base auditada (origin/main), no el de la bitacora ya actualizada por R4.
    texto = subprocess.run(["git", "show", f"{BASE}:docs/calidad/04-bitacora-defectos.md"], cwd=RAIZ,
                           capture_output=True, encoding="utf-8").stdout
    fichas = {}
    # Tabla resumen (sección 2): estado declarado vigente.
    estados = {}
    for m in re.finditer(r"^\| (DEF-\d+) \| .* \| (Crítica|Alta|Media|Baja) \| P\d \| ([^|]+) \|$", texto, re.M):
        estados[m.group(1)] = (m.group(2), m.group(3).strip())
    # Fichas DEF-05 en adelante.
    partes = re.split(r"^### (DEF-\d+)\. ", texto, flags=re.M)
    for i in range(1, len(partes), 2):
        fichas[partes[i]] = partes[i + 1]
    # DEF-01 a DEF-04: tablas de la sección 1.
    sec1 = texto.split("## 1.", 1)[1].split("## 2.", 1)[0]
    for n in range(1, 5):
        d = f"DEF-0{n}"
        fichas[d] = "\n".join(l for l in sec1.splitlines() if f"DEF-0{n}" in l)
        if d not in estados:
            sev = re.search(rf"\*\*{d}\*\* \| [^|]+ \| \*\*(\w+)\*\*", sec1)
            cierre = re.search(rf"^\| {d} \| \*\*([^*]+)\*\*", sec1.split("Cierre v2", 1)[1], re.M) if "Cierre v2" in sec1 else None
            r3 = re.search(rf"^\| {d} \| \*\*([^*]+)\*\*", sec1, re.M)
            estado = (cierre or r3).group(1) if (cierre or r3) else "Sin estado"
            estados[d] = ((sev.group(1) if sev else "?").replace("Critica", "Crítica"), estado)
    return fichas, estados


def ultimo_bloque(ficha):
    """Texto del bloque de cierre más reciente (Cierre v2 > Verificación R3 > ficha)."""
    for marca in ("#### Cierre v2", "#### Verificación R3"):
        if marca in ficha:
            return ficha.split(marca, 1)[1]
    return ficha


def commit_existe(h):
    return subprocess.run(["git", "cat-file", "-e", f"{h}^{{commit}}"], cwd=RAIZ, capture_output=True).returncode == 0


def main():
    go_tests, go_src, vitest_json, salida = sys.argv[1:5]
    ejec = cargar_go(go_tests)
    ejec.update(cargar_go(go_src))
    vit = cargar_vitest(vitest_json)
    defs = definiciones_go()
    fichas, estados = secciones_bitacora()

    filas, conteo = [], {}
    for n in range(1, 99):
        d = f"DEF-{n:02d}"
        ficha = fichas.get(d, "")
        sev, declarado = estados.get(d, ("?", "Sin registro"))
        bloque = ultimo_bloque(ficha)
        citadas = list(dict.fromkeys(re.findall(r"\b(Test[A-Z0-9_]\w*|Benchmark\w+)", bloque)))
        if not citadas:  # si el cierre no cita pruebas, se usan las de toda la ficha
            citadas = list(dict.fromkeys(re.findall(r"\b(Test[A-Z0-9_]\w*)", ficha)))
        archivos_vit = list(dict.fromkeys(re.findall(r"\b([A-Za-z0-9]+(?:\.regression)?\.test\.jsx?)\b", bloque)))
        commits = [c for c in dict.fromkeys(re.findall(r"`([0-9a-f]{7,12})`", bloque)) if not c.isdigit()]

        ev, pasan, fallan, omitidas, inexist, integ, noejec = [], 0, 0, 0, 0, 0, 0
        for t in citadas:
            if t not in defs:
                # Prefijo: la ficha puede citar el nombre abreviado («TestDEF28…»)
                candidatos = [x for x in defs if x.startswith(t)]
                if len(candidatos) == 1:
                    t = candidatos[0]
                else:
                    inexist += 1
                    ev.append(f"`{t}` no existe")
                    continue
            archivo, es_integ = defs[t]
            if es_integ:
                integ += 1
                ev.append(f"`{t}` solo con `-tags integration` (no ejecutada)")
                continue
            r = ejec.get(t)
            if r == "pass":
                pasan += 1
                ev.append(f"`{t}` pasa")
            elif r == "fail":
                fallan += 1
                ev.append(f"`{t}` **FALLA**")
            elif r == "skip":
                omitidas += 1
                ev.append(f"`{t}` omitida")
            else:
                noejec += 1
                ev.append(f"`{t}` no ejecutada ({'benchmark' if t.startswith('Benchmark') else 'sin resultado'})")
        for a in archivos_vit:
            st = vit.get(a)
            if st is None:
                inexist += 1
                ev.append(f"`{a}` no existe en el reporte de Vitest")
            elif all(s == "passed" for s in st) and st:
                pasan += 1
                ev.append(f"`{a}` ({len(st)} pruebas) pasa")
            else:
                fallan += sum(1 for s in st if s == "failed")
                omitidas += sum(1 for s in st if s in ("skipped", "todo", "pending"))
                ev.append(f"`{a}`: {st.count('passed')} pasan, {st.count('failed')} fallan, otras {len(st)-st.count('passed')-st.count('failed')}")
        for c in commits:
            ev.append(f"commit `{c}` {'existe' if commit_existe(c) else '**no existe**'}")

        cerrado = declarado.lower().startswith("cerrado") or declarado.lower().startswith("verificado")
        if fallan:
            cat = "Reabierto"
        elif pasan and not (inexist or omitidas or integ or noejec):
            cat = "Verificado"
        elif pasan:
            cat = "Verificado parcialmente"
        elif integ and not inexist:
            cat = "No verificable"
        elif citadas or archivos_vit:
            cat = "No verificable"
        else:
            cat = "Revisado sin prueba"
        motivo = ""
        if d in AJUSTES_MANUALES:
            cat, motivo = AJUSTES_MANUALES[d]
        conteo[cat] = conteo.get(cat, 0) + 1
        filas.append((d, sev, declarado, cat, "; ".join(ev) or "La ficha no cita prueba ni commit", motivo))

    with open(salida, "w", encoding="utf-8", newline="\n") as f:
        f.write("| ID | Severidad | Estado declarado | Estado verificado R4 | Evidencia automática | Ajuste por revisión |\n")
        f.write("|---|---|---|---|---|---|\n")
        for d, sev, decl, cat, ev, motivo in filas:
            f.write(f"| {d} | {sev} | {decl} | **{cat}** | {ev} | {motivo} |\n")
        f.write("\nConteo: " + ", ".join(f"{k}: {v}" for k, v in sorted(conteo.items())) + f" (total {len(filas)})\n")
    print(json.dumps(conteo, ensure_ascii=False))


if __name__ == "__main__":
    main()
