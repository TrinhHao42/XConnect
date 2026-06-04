import * as crypto from 'crypto';

// The key must be exactly 32 bytes (256 bits) for aes-256-cbc.
const ENCRYPTION_KEY = (process.env.TOKEN_ENCRYPTION_KEY || 'xconnect_token_encryption_key_32').substring(0, 32).padEnd(32, '0');
const IV_LENGTH = 16;

export function encryptUserId(userId: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(userId);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptUserId(encryptedText: string): string {
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedTextBuffer = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedTextBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // If decryption fails (e.g. legacy/unencrypted token), fallback to returning original string
    return encryptedText;
  }
}
