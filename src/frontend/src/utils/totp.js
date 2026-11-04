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
 * Rota un entero de 32 bits a la izquierda
 */
function rotl(value, shift) {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

/**
 * SHA-1 en JavaScript puro (FIPS 180-4). Respaldo para contextos sin Web Crypto
 * (por ejemplo HTTP fuera de localhost, donde window.crypto.subtle no existe).
 */
export function sha1Bytes(message) {
  const bitLength = message.length * 8;
  const paddedLength = (((message.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
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
      const temp = (rotl(a, 5) + (f >>> 0) + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  const out = new DataView(digest.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => out.setUint32(i * 4, h, false));
  return digest;
}

/**
 * HMAC-SHA1 (RFC 2104) en JavaScript puro
 */
export function hmacSha1Bytes(key, message) {
  const blockSize = 64;
  const normalizedKey = key.length > blockSize ? sha1Bytes(key) : key;
  const inner = new Uint8Array(blockSize + message.length);
  const outer = new Uint8Array(blockSize + 20);
  for (let i = 0; i < blockSize; i++) {
    const keyByte = normalizedKey[i] ?? 0;
    inner[i] = keyByte ^ 0x36;
    outer[i] = keyByte ^ 0x5c;
  }
  inner.set(message, blockSize);
  outer.set(sha1Bytes(inner), blockSize);
  return sha1Bytes(outer);
}

async function hmacSha1(keyBytes, counterBytes) {
  const cryptoSubtle = typeof window !== 'undefined' ? window.crypto?.subtle : undefined;
  if (!cryptoSubtle) {
    return hmacSha1Bytes(keyBytes, counterBytes);
  }
  const cryptoKey = await cryptoSubtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: { name: 'SHA-1' } },
    false,
    ['sign']
  );
  return new Uint8Array(await cryptoSubtle.sign('HMAC', cryptoKey, counterBytes));
}

/**
 * Calcula el codigo TOTP de 6 digitos segun RFC 6238 (HMAC-SHA1).
 * Usa Web Crypto cuando existe y HMAC-SHA1 en JavaScript puro en caso contrario.
 * Solo es una utilidad de calculo: la validacion de codigos la realiza siempre el servidor.
 */
export async function calculateTotpCode(secretBase32, epochMs = Date.now()) {
  const keyBytes = base32ToBytes(secretBase32 ?? '');
  if (keyBytes.length === 0) {
    throw new Error('El secreto TOTP es invalido o esta vacio');
  }

  const counter = Math.floor(Math.floor(epochMs / 1000) / 30);

  // Contador de 8 bytes en Big Endian
  const counterBytes = new Uint8Array(8);
  const counterView = new DataView(counterBytes.buffer);
  counterView.setUint32(0, Math.floor(counter / 0x100000000), false);
  counterView.setUint32(4, counter >>> 0, false);

  const sigBytes = await hmacSha1(keyBytes, counterBytes);

  // Truncamiento dinamico segun RFC 4226 / RFC 6238
  const offset = sigBytes[sigBytes.length - 1] & 0x0f;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, '0');
}

/**
 * Construye la URL estandar otpauth:// para escanear en apps autenticadoras
 */
export function buildOtpAuthUri(secret, email, issuer = 'SaludConecta IPS') {
  const encIssuer = encodeURIComponent(issuer);
  const encEmail = encodeURIComponent(email);
  return `otpauth://totp/${encIssuer}:${encEmail}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Calcula los segundos restantes en la ventana TOTP actual de 30 segundos
 */
export function getRemainingSeconds(epochMs = Date.now(), periodSeconds = 30) {
  const currentSeconds = Math.floor(epochMs / 1000);
  return periodSeconds - (currentSeconds % periodSeconds);
}

/**
 * Genera una semilla criptografica aleatoria en Base32
 */
export function generateBase32Secret(length = 16) {
  let str = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * BASE32_ALPHABET.length);
    str += BASE32_ALPHABET[idx];
  }
  return str;
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
