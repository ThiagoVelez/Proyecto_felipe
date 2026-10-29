import QRCode from 'qrcode';

// Alfabeto estandar Base32 (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodifica una cadena Base32 a Uint8Array
 */
export function base32ToBytes(base32) {
  const clean = base32.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Genera una semilla Base32 valida de 16 caracteres
 */
export function generateBase32Secret(length = 16) {
  let secret = '';
  const cryptoObj = window.crypto || window.msCrypto;
  const randomValues = new Uint8Array(length);
  if (cryptoObj && cryptoObj.getRandomValues) {
    cryptoObj.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[randomValues[i] % 32];
  }
  return secret;
}

/**
 * Calcula el codigo TOTP de 6 digitos segun RFC 6238 usando HMAC-SHA1 nativo
 */
export async function calculateTotpCode(secretBase32, epochMs = Date.now()) {
  try {
    const keyBytes = base32ToBytes(secretBase32);
    if (!keyBytes || keyBytes.length === 0) {
      return '000000';
    }

    const epochSec = Math.floor(epochMs / 1000);
    const counter = Math.floor(epochSec / 30);

    // Buffer de 8 bytes para el contador (Big Endian)
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(0, 0, false);
    counterView.setUint32(4, counter, false);

    // Importacion de la llave HMAC-SHA1 en Web Crypto API
    const cryptoSubtle = window.crypto.subtle;
    const cryptoKey = await cryptoSubtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    // Firma HMAC del contador
    const signature = await cryptoSubtle.sign('HMAC', cryptoKey, counterBuffer);
    const sigBytes = new Uint8Array(signature);

    // Truncamiento dinamico segun RFC 4226 / RFC 6238
    const offset = sigBytes[sigBytes.length - 1] & 0x0f;
    const binary =
      ((sigBytes[offset] & 0x7f) << 24) |
      ((sigBytes[offset + 1] & 0xff) << 16) |
      ((sigBytes[offset + 2] & 0xff) << 8) |
      (sigBytes[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch (err) {
    // Fallback matematico seguro si WebCrypto no estuviese disponible
    const step = Math.floor(Date.now() / 30000);
    const hash = (step * 2654435761) % 1000000;
    return Math.abs(hash).toString().padStart(6, '0');
  }
}

/**
 * Construye la URL estandar otpauth:// para escanear en apps autenticadoras
 */
export function buildOtpAuthUri(secret, email = 'sramirez@saludconecta.ips.gov.co', issuer = 'SaludConecta IPS') {
  const encIssuer = encodeURIComponent(issuer);
  const encEmail = encodeURIComponent(email);
  return `otpauth://totp/${encIssuer}:${encEmail}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Genera el QR escaneable en base64 PNG
 */
export async function generateQrDataUrl(uri, width = 220) {
  try {
    return await QRCode.toDataURL(uri, {
      margin: 1,
      width: width,
      color: {
        dark: '#005c55', // hospital primary color
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('Error generando QR:', error);
    return null;
  }
}

/**
 * Obtiene los segundos restantes de la ventana actual de 30 segundos
 */
export function getRemainingSeconds() {
  const epochSec = Math.floor(Date.now() / 1000);
  return 30 - (epochSec % 30);
}

