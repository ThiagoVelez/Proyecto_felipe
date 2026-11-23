/**
 * Lectura del número de documento desde el código PDF417 de la cédula colombiana (DEF-86).
 *
 * En la cédula de ciudadanía el número va en una posición fija del texto decodificado (caracteres 48 a 57),
 * relleno con ceros a la izquierda. Antes se tomaba la primera secuencia de 8 a 10 dígitos, que puede ser otro
 * campo del código. Si el formato no coincide, solo se acepta un número cuando hay una única secuencia candidata;
 * en cualquier otro caso se devuelve '' para que el farmacéutico lo digite.
 */
export const CEDULA_DOC_START = 48;
export const CEDULA_DOC_END = 58;

export function normalizeDocument(value) {
  const clean = String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  return /^\d+$/.test(clean) ? clean.replace(/^0+/, '') : clean;
}

export function extractDocumentFromPdf417(raw) {
  const text = String(raw || '');
  if (text.length >= CEDULA_DOC_END) {
    const field = text.slice(CEDULA_DOC_START, CEDULA_DOC_END);
    if (/^\d{10}$/.test(field)) {
      const doc = normalizeDocument(field);
      if (doc.length >= 5) return doc;
    }
  }
  const candidates = text.match(/\b\d{6,10}\b/g) || [];
  return candidates.length === 1 ? normalizeDocument(candidates[0]) : '';
}
