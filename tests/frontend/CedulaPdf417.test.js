import { describe, it, expect } from 'vitest';
import { extractDocumentFromPdf417, normalizeDocument } from '../../src/frontend/src/utils/cedula';

// Texto decodificado sintético con el formato de la cédula: el número va en los caracteres 48 a 57 con ceros.
const pdf417 = (numero, prefijo = '0123456789012345678901234567890123456789PUBDSK_1') =>
  prefijo.slice(0, 48) + String(numero).padStart(10, '0') + 'APELLIDOUNO APELLIDODOS NOMBRES 0M19900514';

describe('Lectura del documento desde el PDF417 de la cédula (DEF-86)', () => {
  it('toma el número de su posición fija aunque antes aparezcan otras secuencias de dígitos', () => {
    expect(extractDocumentFromPdf417(pdf417('1094111222'))).toBe('1094111222');
    expect(extractDocumentFromPdf417(pdf417('7654321'))).toBe('7654321');
  });

  it('sin el formato de la cédula solo acepta una única secuencia candidata', () => {
    expect(extractDocumentFromPdf417('CC 1094111222')).toBe('1094111222');
    expect(extractDocumentFromPdf417('codigo 12345678 documento 87654321')).toBe('');
    expect(extractDocumentFromPdf417('')).toBe('');
  });

  it('normaliza ceros a la izquierda, puntos y espacios', () => {
    expect(normalizeDocument(' 0.001.094.111.222 ')).toBe('1094111222');
    expect(normalizeDocument('pa-123456')).toBe('PA123456');
  });
});
