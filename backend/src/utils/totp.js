const crypto = require('crypto');

// Base32 alphabet characters (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 TOTP secret string (160 bits / 32 chars)
 */
function generateTOTPSecret(length = 32) {
  const randomBytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[randomBytes[i] % 32];
  }
  return secret;
}

/**
 * Decode Base32 string to Buffer
 */
function base32ToBuffer(base32Str) {
  const clean = base32Str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < clean.length; i++) {
    const charIndex = BASE32_CHARS.indexOf(clean[i]);
    if (charIndex === -1) continue;

    value = (value << 5) | charIndex;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a 6-digit TOTP code for a secret and timestamp (RFC 6238)
 */
function generateTOTPCode(secret, timeStepSec = 30, timestampMs = Date.now()) {
  const counter = Math.floor(timestampMs / 1000 / timeStepSec);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  const keyBuffer = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', keyBuffer).update(counterBuffer).digest();

  // Dynamic Truncation
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP code with +- 1 time-step window for clock drift tolerance
 */
function verifyTOTPCode(token, secret, timeStepSec = 30, window = 1) {
  if (!token || !secret) return false;
  const cleanToken = String(token).trim();

  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const checkTime = now + i * timeStepSec * 1000;
    const generated = generateTOTPCode(secret, timeStepSec, checkTime);
    if (generated === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Format otpauth:// URI for authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)
 */
function getTOTPUri(secret, accountName = 'SuperAdmin', issuer = 'OPS-SaaS') {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = {
  generateTOTPSecret,
  generateTOTPCode,
  verifyTOTPCode,
  getTOTPUri,
};
