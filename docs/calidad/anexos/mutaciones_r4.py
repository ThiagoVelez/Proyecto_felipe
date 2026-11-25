"""Mutaciones manuales de la revisión R4 (H-R4-21).

Exporta origin/main a un directorio temporal (git archive, sin conversión CRLF), aplica una mutación a la vez sobre esa
copia, ejecuta la suite completa de tests/backend y src/backend, registra qué pruebas detectan la mutación y restaura el
archivo antes de la siguiente. El repositorio de trabajo no se modifica.

Uso (desde la raíz): python -X utf8 docs/calidad/anexos/mutaciones_r4.py
"""
import json
import pathlib
import shutil
import subprocess
import tempfile

MUTACIONES = [
    ("M1", "RF05/RNF02 Cruce de alergias (familia y tildes)", "src/backend/core/domain/allergy.go",
     "if matchComponents(allergenParts, drugParts) {", "if false && matchComponents(allergenParts, drugParts) {"),
    ("M2", "RF03 Triaje Manchester: hipotermia severa (< 32 °C) como Nivel II", "src/backend/core/domain/triage.go",
     "(temp > 0 && (temp < 32.0 || temp >= 40.0))", "(temp > 0 && (temp < 20.0 || temp >= 40.0))"),
    ("M3", "RF03 Validación de Glasgow en [3, 15]", "src/backend/core/domain/triage.go",
     "if t.GlasgowScore < 3 || t.GlasgowScore > 15 {", "if t.GlasgowScore < 0 || t.GlasgowScore > 15 {"),
    ("M4", "RF04 Inmutabilidad del folio cerrado en la sincronización (guardia del servicio)", "src/backend/core/services/sync_service.go",
     "case err == nil && !existing.CanModify():", "case false && err == nil && !existing.CanModify():"),
    ("M5", "RF08 Cotejo del documento del paciente al dispensar", "src/backend/core/services/pharmacy_service.go",
     "!= domain.NormalizeDocument(presc.PatientDocument)", "!= domain.NormalizeDocument(req.PatientDocument)"),
    ("M6", "RF03 Triaje Manchester: Glasgow 8 como Nivel I", "src/backend/core/domain/triage.go",
     "if t.GlasgowScore <= 8 ||", "if t.GlasgowScore < 8 ||"),
    ("M7", "RF14 Cruce de alergias en la prescripción v2", "src/backend/core/services/treatment_service.go",
     "conflict != nil", "conflict != nil && false"),
]


def fallidas(directorio):
    r = subprocess.run(["go", "test", "-count=1", "-json", "./..."], cwd=directorio, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    nombres = set()
    for linea in r.stdout.splitlines():
        try:
            e = json.loads(linea)
        except ValueError:
            continue
        if e.get("Action") == "fail" and e.get("Test") and "/" not in e["Test"]:
            nombres.add(e["Test"])
    return r.returncode, sorted(nombres)


def main():
    raiz = pathlib.Path(__file__).resolve().parents[3]
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="mutaciones-r4-"))
    arch = subprocess.run(["git", "-c", "core.autocrlf=false", "archive", "origin/main", "go.work", "go.work.sum",
                           "src/backend", "tests/backend"], cwd=raiz, capture_output=True, check=True).stdout
    (tmp / "copia.tar").write_bytes(arch)
    subprocess.run(["tar", "-xf", "copia.tar"], cwd=tmp, check=True)
    print("| Mutación | Requisito | Archivo | Cambio | Pruebas que fallan (tests/backend y src/backend) | Detectada |")
    print("|---|---|---|---|---|---|")
    try:
        base_tests = fallidas(tmp / "tests" / "backend")
        base_src = fallidas(tmp / "src" / "backend")
        if base_tests[1] or base_src[1]:
            raise SystemExit(f"la línea base no está en verde: {base_tests} {base_src}")
        for mid, req, ruta, original, mutado in MUTACIONES:
            f = tmp / ruta
            texto = f.read_text(encoding="utf-8")
            if texto.count(original) != 1:
                print(f"| {mid} | {req} | `{ruta}` | no aplicada (el fragmento aparece {texto.count(original)} veces) | - | - |")
                continue
            f.write_text(texto.replace(original, mutado), encoding="utf-8")
            try:
                _, t1 = fallidas(tmp / "tests" / "backend")
                _, t2 = fallidas(tmp / "src" / "backend")
            finally:
                f.write_text(texto, encoding="utf-8")
            todas = t1 + t2
            print(f"| {mid} | {req} | `{ruta}` | `{original}` -> `{mutado}` | {', '.join('`'+x+'`' for x in todas) or 'ninguna'} | {'Sí' if todas else '**No**'} |")
        # Restauración comprobada: la copia vuelve a estar en verde
        print(f"\nCopia restaurada y en verde: tests={not fallidas(tmp / 'tests' / 'backend')[1]}, src={not fallidas(tmp / 'src' / 'backend')[1]}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
