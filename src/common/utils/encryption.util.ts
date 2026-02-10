import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encripta un objeto JSON usando AES-256-GCM
 * El resultado es un string base64url seguro para URLs
 */
export function encryptPayload(payload: object, encryptionKey: string): string {
  const key = crypto.scryptSync(encryptionKey, 'pool-and-chill-salt', 32);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const jsonString = JSON.stringify(payload);

  let encrypted = cipher.update(jsonString, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combinar: iv + authTag + encrypted → base64url
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64url');
}

/**
 * Desencripta un string base64url a un objeto JSON usando AES-256-GCM
 */
export function decryptPayload<T = any>(encryptedData: string, encryptionKey: string): T {
  const key = crypto.scryptSync(encryptionKey, 'pool-and-chill-salt', 32);
  const combined = Buffer.from(encryptedData, 'base64url');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return JSON.parse(decrypted.toString('utf8'));
}
