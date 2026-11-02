import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  base32ToBytes,
  calculateTotpCode,
  buildOtpAuthUri,
  generateQrDataUrl,
  sha1Bytes,
  hmacSha1Bytes,
} from '../../src/frontend/src/utils/totp';

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const ascii = (text) => new TextEncoder().encode(text);

// Secreto ASCII "12345678901234567890" codificado en Base32 (semilla SHA-1 del RFC 6238, Apendice B)
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

// Vectores RFC 6238 (SHA-1) truncados a los 6 ultimos digitos de los codigos de 8 digitos
const RFC_6238_VECTORS = [
  { epoch: 59, code: '287082' },
  { epoch: 1111111109, code: '081804' },
  { epoch: 1111111111, code: '050471' },
  { epoch: 1234567890, code: '005924' },
  { epoch: 2000000000, code: '279037' },
  { epoch: 20000000000, code: '353130' },
];

describe('TOTP RFC 6238 & QR Generator', () => {
  const secret = 'KRSXG5CTMVRXEZLU';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('debe decodificar Base32 a bytes correctamente', () => {
    expect(new TextDecoder().decode(base32ToBytes(RFC_SECRET))).toBe('12345678901234567890');
  });

  it('debe construir la URI estandar otpauth:// compatible con Google Authenticator', () => {
    const uri = buildOtpAuthUri(secret, 'medico@saludconecta.ips.gov.co', 'SaludConecta IPS');
    expect(uri).toContain('otpauth://totp/SaludConecta%20IPS:medico%40saludconecta.ips.gov.co');
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain('period=30');
  });

  it.each(RFC_6238_VECTORS)('coincide con el vector RFC 6238 en T=$epoch s (Web Crypto)', async ({ epoch, code }) => {
    expect(await calculateTotpCode(RFC_SECRET, epoch * 1000)).toBe(code);
  });

  it.each(RFC_6238_VECTORS)('coincide con el vector RFC 6238 en T=$epoch s (HMAC-SHA1 en JavaScript puro)', async ({ epoch, code }) => {
    // Simula un contexto inseguro sin window.crypto.subtle
    vi.stubGlobal('crypto', {});
    expect(window.crypto.subtle).toBeUndefined();
    expect(await calculateTotpCode(RFC_SECRET, epoch * 1000)).toBe(code);
  });

  it('lanza un error explicito en lugar de inventar un codigo cuando el secreto es invalido', async () => {
    await expect(calculateTotpCode('')).rejects.toThrow();
    await expect(calculateTotpCode('!!!!')).rejects.toThrow();
  });

  it('SHA-1 puro coincide con los vectores FIPS 180-4', () => {
    expect(toHex(sha1Bytes(ascii('abc')))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(toHex(sha1Bytes(ascii('')))).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(
      toHex(sha1Bytes(ascii('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))
    ).toBe('84983e441c3bd26ebaae4aa1f95129e5e54670f1');
  });

  it('HMAC-SHA1 puro coincide con los vectores RFC 2202', () => {
    expect(toHex(hmacSha1Bytes(new Uint8Array(20).fill(0x0b), ascii('Hi There')))).toBe(
      'b617318655057264e28bc0b6fb378c8ef146be00'
    );
    expect(toHex(hmacSha1Bytes(ascii('Jefe'), ascii('what do ya want for nothing?')))).toBe(
      'effcdf6ae5eb2fa2d27416d5f184df9c259a7c79'
    );
    // Llave mayor que el tamano de bloque (80 bytes de 0xaa)
    expect(
      toHex(
        hmacSha1Bytes(
          new Uint8Array(80).fill(0xaa),
          ascii('Test Using Larger Than Block-Size Key - Hash Key First')
        )
      )
    ).toBe('aa4ae5e15272d00e95705637ce8a3b55ed402112');
  });

  it('debe generar una imagen QR en formato data URL base64', async () => {
    const uri = buildOtpAuthUri(secret, 'medico@saludconecta.ips.gov.co');
    const qrDataUrl = await generateQrDataUrl(uri);
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
