# comando: grep -rnE "AAA|WCAG" README.md docs --include=*.md (excluye docs/calidad); python -I contraste.py (script incluido abajo; colores tomados de src/frontend/tailwind.config.js y de la paleta estándar de Tailwind 3)
# fecha: 2026-11-24

# H-R4-26. Afirmaciones WCAG y contraste real

## 1. Dónde se afirma WCAG (README de origin/main 6a51bb8 y docs/, sin docs/calidad)

| Ubicación | Nivel afirmado | Texto resumido |
|---|---|---|
| README:350 | **AAA** | `ProfileScreen`: «cumplimiento de contraste WCAG AAA mediante óvalo de alta luminosidad». |
| README:379 | **AAA** | RTM, fila RF09: tipo de prueba «Usabilidad / WCAG AAA», APROBADO (PASS). |
| README:525 | **AAA** | RF09: óvalo `bg-white/95` «que garantiza contraste WCAG AAA sobre cualquier fondo». |
| README:2084 | **AAA** | Sección 14.6: «óvalo protector de contraste WCAG AAA». |
| README:2811 | **AAA** | Sección 1.25: «contraste AAA en banners» (DEF-36). |
| README:444 | AA / AAA | Métricas §4.7: «WCAG AA / AAA», resultado «Paleta estandarizada», Conforme. |
| README:1963 | AA (con meta 7:1) | §14.2: «Contraste >= 7:1 en datos críticos», «Cumple WCAG 2.1 AA». |
| README:2179 | AA (con meta 7:1) | §14.9.3: «WCAG 2.1 AA (ISO/IEC 40500) con ratio de contraste superior a 7:1 en datos vitales». |
| README:3161 | AA | Sección 3 de la Entrega Final: «Contraste de color superior a 4.5:1», CONFORME (100%). |
| README:99, 2162, 2368, 3327 | AA | Pirámide de pruebas, descripción de la *skill* y dictámenes («cumple ... ISO/IEC 40500 (WCAG 2.1 AA)»). |
| `docs/especificacion.md:25` | **AAA** | RF09: «oval de alta luminosidad (contraste WCAG AAA)». |
| `docs/informe-calidad.md:30` | AA (con meta 7:1) | «Contraste >= 7:1 en datos criticos», «Cumple WCAG 2.1 AA». |
| `src/frontend/README.md:72` (fuera de `docs/`, como referencia) | **AAA** | «Conmutador de modo de alto contraste ... WCAG AAA». No se encontró ese conmutador en `src/frontend/src` (búsqueda de `highContrast` y «alto contraste» sin resultados de código). |

Conclusión: se sigue afirmando **AAA** en 5 lugares del README y en `docs/especificacion.md:25`, y **AA** (en algunos casos con meta de 7:1) en otros 8 lugares del README y en `docs/informe-calidad.md:30`.

## 2. Método

Fórmula WCAG 2.x:

- Canal sRGB c en [0, 1]: `c_lin = c / 12.92` si `c <= 0.04045`; si no, `((c + 0.055) / 1.055) ^ 2.4`.
- Luminancia relativa: `L = 0.2126 R_lin + 0.7152 G_lin + 0.0722 B_lin`.
- Contraste: `(L_mayor + 0.05) / (L_menor + 0.05)`. AAA para texto normal: 7:1; AA: 4,5:1. Se toma el umbral de texto normal porque los textos evaluados son `text-xs` o `text-sm`.
- Fondos semitransparentes (`bg-x/NN`): composición alfa en sRGB sobre el color de debajo, como hace el navegador. No se considera `backdrop-blur`, que solo difumina lo que hay detrás.

Colores usados: `tailwind.config.js` (`outline` #6e7977, `background` #faf8ff, `primary` #005c55, `primary-fixed` #9cf2e8, `on-primary-fixed-variant` #00504a) y Tailwind 3 estándar (`slate-950` #020617, `slate-600` #475569, `slate-500` #64748b, `red-50` #fef2f2, `red-800` #991b1b, `red-900` #7f1d1d, `emerald-50` #ecfdf5, `emerald-800` #065f46). La parada clara del banner de Pediatría es #F59E0B (`UserProfileModal.jsx:35`).

Script (`contraste.py`, ejecutado con `python -I`; Python 3.12.7):

```python
# Contraste WCAG 2.x: L = 0.2126 R + 0.7152 G + 0.0722 B (canales linealizados); ratio = (L1 + 0.05) / (L2 + 0.05)
def hex2rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def lum(rgb):
    r, g, b = (lin(x) for x in rgb); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def mezcla(fg, alfa, bg):
    # composicion alfa de un fondo semitransparente sobre el color de abajo (sRGB, como el navegador)
    return tuple(round(alfa * f + (1 - alfa) * b) for f, b in zip(fg, bg))
def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True); return (la + 0.05) / (lb + 0.05)
W = hex2rgb('#ffffff')
casos = [
 ("A RF09 texto de portada: text-white sobre bg-slate-950/85 encima de #F59E0B", W, mezcla(hex2rgb('#020617'), 0.85, hex2rgb('#F59E0B'))),
 ("B RF09 ovalo: text-slate-600 sobre bg-white/95 encima de #F59E0B", hex2rgb('#475569'), mezcla(W, 0.95, hex2rgb('#F59E0B'))),
 ("B2 RF09 ovalo: text-slate-500 sobre bg-white/95 encima de #F59E0B", hex2rgb('#64748b'), mezcla(W, 0.95, hex2rgb('#F59E0B'))),
 ("B3 RF09 ovalo: text-slate-500 sobre bg-white/95 encima de #0F766E", hex2rgb('#64748b'), mezcla(W, 0.95, hex2rgb('#0F766E'))),
 ("C text-outline sobre bg-background #faf8ff", hex2rgb('#6e7977'), hex2rgb('#faf8ff')),
 ("C2 text-outline sobre blanco", hex2rgb('#6e7977'), W),
 ("D alergias: text-red-800 sobre bg-white/80 encima de bg-red-50", hex2rgb('#991b1b'), mezcla(W, 0.80, hex2rgb('#fef2f2'))),
 ("D2 alergias: text-red-900 sobre bg-red-50", hex2rgb('#7f1d1d'), hex2rgb('#fef2f2')),
]
for n, fg, bg in casos:
    r = ratio(fg, bg)
    print(f"{n}: {r:.2f}:1 AAA={'si' if r >= 7 else 'no'} AA={'si' if r >= 4.5 else 'no'}")
```

## 3. Resultados

Las tres combinaciones representativas pedidas son 1 (RF09, donde se afirma AAA), 2 (la clase de texto más usada) y 3 (dato crítico de seguridad del paciente). Se agregan variantes de cada una.

| # | Combinación (texto / fondo efectivo) | Origen en el código | Contraste | 7:1 (AAA) | 4,5:1 (AA) |
|---|---|---|---|---|---|
| 1a | `text-white` / `bg-slate-950/85` sobre #F59E0B → #261d15 | `UserProfileModal.jsx:316-318` (DEF-36) | 16,55:1 | Cumple | Cumple |
| 1b | `text-white` / `bg-slate-950/80` sobre #F59E0B → #332415 | `ProfileScreen.jsx:280` | 14,96:1 | Cumple | Cumple |
| 1c | `text-slate-600` / óvalo `bg-white/95` sobre #F59E0B → #fefaf3 | `ProfileScreen.jsx:357`, `:367` | 7,28:1 | Cumple (margen 0,28) | Cumple |
| **1d** | **`text-slate-500` / óvalo `bg-white/95` sobre #F59E0B → #fefaf3** | **`ProfileScreen.jsx:383` (sede del usuario, dentro del óvalo)** | **4,57:1** | **No cumple** | Cumple |
| **1e** | **`text-slate-500` / óvalo `bg-white/95` sobre #0F766E** | **`ProfileScreen.jsx:383`** | **4,44:1** | **No cumple** | **No cumple** |
| 1f | `text-on-primary-fixed-variant` #00504a / `bg-primary-fixed` #9cf2e8 | `ProfileScreen.jsx:370-373` (insignia de rol) | 7,25:1 | Cumple | Cumple |
| 1g | `text-emerald-800` / `bg-emerald-50` | `ProfileScreen.jsx:361` (insignia ReTHUS) | 7,29:1 | Cumple | Cumple |
| **2a** | **`text-outline` #6e7977 / `bg-background` #faf8ff** | **427 usos de `text-outline` en `src/frontend/src` (p. ej., `AdminRegisterModal.jsx:247`)** | **4,27:1** | **No cumple** | **No cumple** |
| 2b | `text-outline` #6e7977 / blanco | Ídem, sobre tarjetas `bg-white` | 4,50:1 (4,502) | No cumple | Cumple por 0,002 |
| 3a | `text-red-800` / `bg-white/80` sobre `bg-red-50` → #fffcfc | `AllergyAlertModal.jsx:90` (mensaje del servidor) | 8,14:1 | Cumple | Cumple |
| 3b | `text-red-900` / `bg-red-50` | `AllergyAlertModal.jsx:38`, `:77` (principio activo en conflicto) | 9,16:1 | Cumple | Cumple |

El valor 1a coincide con el registrado por el equipo en `docs/calidad/evidencias/v2/def36-contraste-banners.txt` (#F59E0B con 0,85 → 16,55).

## 4. Conclusión

- **AAA (RF09, README:350, 379, 525, 2084 y `docs/especificacion.md:25`): Falsa tal como está redactada.** El texto blanco sobre las cápsulas oscuras del banner sí cumple 7:1 (corrección DEF-36). Pero el óvalo «que garantiza contraste WCAG AAA sobre cualquier fondo» contiene texto `text-slate-500` (`ProfileScreen.jsx:383`) con 4,57:1 o 4,44:1, por debajo de 7:1. El texto `text-slate-600` del mismo óvalo queda en 7,28:1, apenas por encima del umbral. La prueba citada en la RTM (`DoctorLayout.test.jsx:63`) no mide contraste.
- **AA con «superior a 4.5:1» (README:3161) y «Conforme» (README:444, 1963): Falsa.** La clase de color de texto más usada de la interfaz, `text-outline`, da 4,27:1 sobre el fondo de página `#faf8ff` y no llega a AA para texto normal; sobre blanco queda justo en 4,50:1.
- **«Superior a 7:1 en datos vitales/críticos» (README:1963, 2179; `docs/informe-calidad.md:30`): Parcial.** En el modal de alergias, el dato crítico cumple (9,16:1 y 8,14:1), pero no hay una medición del resto de pantallas clínicas que sostenga una afirmación general.
- **Afirmación AAA a corregir:** RF09 en README:525 y en `docs/especificacion.md:25`. La afirmación AA general de README:3161 debería retirarse o sustituirse por una medición real.
