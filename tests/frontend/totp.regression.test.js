import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateTotpCode } from '../../src/frontend/src/utils/totp';

// DEF-47: sin Web Crypto (Node 20 con jsdom en CI, o un navegador fuera de contexto seguro como
// http://<ip-de-la-red-local>) el codigo debe seguir siendo el de RFC 6238, no un valor ajeno al secreto.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // "12345678901234567890" en Base32

const vectoresRfc6238 = [
  { segundos: 59, codigo: '287082' },
  { segundos: 1111111109, codigo: '081804' },
  { segundos: 1234567890, codigo: '005924' },
  { segundos: 2000000000, codigo: '279037' },
];

describe('DEF-47 - TOTP sin Web Crypto disponible', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('cumple los vectores RFC 6238 cuando importKey falla', async () => {
    vi.spyOn(window.crypto.subtle, 'importKey').mockRejectedValue(new Error('SubtleCrypto no disponible'));
    for (const v of vectoresRfc6238) {
      expect(await calculateTotpCode(RFC_SECRET, v.segundos * 1000)).toBe(v.codigo);
    }
  });

  it('cumple los vectores RFC 6238 cuando crypto.subtle no existe (contexto no seguro)', async () => {
    vi.stubGlobal('crypto', { getRandomValues: (a) => a });
    for (const v of vectoresRfc6238) {
      expect(await calculateTotpCode(RFC_SECRET, v.segundos * 1000)).toBe(v.codigo);
    }
  });

  it('depende del instante solicitado y no del reloj actual', async () => {
    vi.spyOn(window.crypto.subtle, 'importKey').mockRejectedValue(new Error('SubtleCrypto no disponible'));
    const a = await calculateTotpCode(RFC_SECRET, 59 * 1000);
    const b = await calculateTotpCode(RFC_SECRET, 59 * 1000 + 3_600_000);
    expect(a).not.toBe(b);
  });
});
