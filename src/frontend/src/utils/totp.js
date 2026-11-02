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
 * SHA-1 (FIPS 180-4) sobre bytes. Respaldo para entornos sin Web Crypto: crypto.subtle solo existe
 * en contextos seguros (HTTPS o localhost), y el despliegue por HTTP en la red local no lo es (DEF-47).
 */
function sha1(bytes) {
  const ml = bytes.length;
  const totalLength = (((ml + 8) >> 6) + 1) << 6;
  const data = new Uint8Array(totalLength);
  data.set(bytes);
  data[ml] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(totalLength - 8, Math.floor((ml * 8) / 0x100000000), false);
  view.setUint32(totalLength - 4, (ml * 8) >>> 0, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  const rotl = (x, n) => (x << n) | (x >>> (32 - n));

  for (let block = 0; block < totalLength; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4, false);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f;
      let k;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30) >>> 0;
      b = a;
      a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => outView.setUint32(i * 4, h, false));
  return out;
}

// HMAC-SHA1 segun RFC 2104 (bloque de 64 bytes).
function hmacSha1(key, message) {
  const k = key.length > 64 ? sha1(key) : key;
  const padded = new Uint8Array(64);
  padded.set(k);
  const inner = new Uint8Array(64 + message.length);
  const outer = new Uint8Array(64 + 20);
  for (let i = 0; i < 64; i++) {
    inner[i] = padded[i] ^ 0x36;
    outer[i] = padded[i] ^ 0x5c;
  }
  inner.set(message, 64);
  outer.set(sha1(inner), 64);
  return sha1(outer);
}

async function hmacSha1WithFallback(keyBytes, counterBytes) {
  const cryptoSubtle = globalThis.crypto && globalThis.crypto.subtle;
  if (cryptoSubtle) {
    try {
      const cryptoKey = await cryptoSubtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: { name: 'SHA-1' } },
        false,
        ['sign']
      );
      return new Uint8Array(await cryptoSubtle.sign('HMAC', cryptoKey, counterBytes));
    } catch {
      // Algunas combinaciones de entorno rechazan la operacion; se usa la implementacion local.
    }
  }
  return hmacSha1(keyBytes, counterBytes);
}

/**
 * Calcula el codigo TOTP de 6 digitos segun RFC 6238 (HMAC-SHA1 nativo o implementacion local)
 */
export async function calculateTotpCode(secretBase32, epochMs = Date.now()) {
  const keyBytes = base32ToBytes(secretBase32);
  if (!keyBytes || keyBytes.length === 0) {
    return '000000';
  }

  const epochSec = Math.floor(epochMs / 1000);
  const counter = Math.floor(epochSec / 30);

  // Contador de 8 bytes Big Endian; la parte alta cubre instantes posteriores al ano 2106.
  const counterBytes = new Uint8Array(8);
  const counterView = new DataView(counterBytes.buffer);
  counterView.setUint32(0, Math.floor(counter / 0x100000000), false);
  counterView.setUint32(4, counter >>> 0, false);

  // DEF-47: el respaldo anterior devolvia un numero derivado de Date.now() sin usar el secreto.
  const sigBytes = await hmacSha1WithFallback(keyBytes, counterBytes);

  // Truncamiento dinamico segun RFC 4226 / RFC 6238
  const offset = sigBytes[sigBytes.length - 1] & 0x0f;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Construye la URL estandar otpauth:// para escanear en apps autenticadoras
 */
export function buildOtpAuthUri(secret, email = 'svelez@saludconecta.ips.gov.co', issuer = 'SaludConecta IPS') {
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

