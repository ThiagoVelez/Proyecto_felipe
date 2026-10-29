import { describe, it, expect } from 'vitest';
import { base32ToBytes, calculateTotpCode, buildOtpAuthUri, generateQrDataUrl } from '../../src/frontend/src/utils/totp';

describe('TOTP RFC 6238 & QR Generator', () => {
  const secret = 'JBSWY3DPEHPK3PXP'; // Base32 test secret

  it('debe decodificar Base32 a bytes correctamente', () => {
    const bytes = base32ToBytes(secret);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('debe construir la URI estandar otpauth:// compatible con Google Authenticator', () => {
    const uri = buildOtpAuthUri(secret, 'svelez@saludconecta.ips.gov.co', 'SaludConecta IPS');
    expect(uri).toContain('otpauth://totp/SaludConecta%20IPS:svelez%40saludconecta.ips.gov.co');
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain('period=30');
  });

  it('debe coincidir exactamente con el vector de prueba oficial RFC 6238 (T=59s -> 287082)', async () => {
    const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const code = await calculateTotpCode(rfcSecret, 59 * 1000);
    expect(code).toBe('287082');
  });

  it('debe generar una imagen QR en formato data URL base64', async () => {
    const uri = buildOtpAuthUri(secret);
    const qrDataUrl = await generateQrDataUrl(uri);
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
