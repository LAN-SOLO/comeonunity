/**
 * Secure encryption utilities for developer documentation
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Derive key from the encryption key env var
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('Invalid ENCRYPTION_KEY - must be 64 hex characters');
  }
  return Buffer.from(key, 'hex');
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine encrypted data with auth tag
  const combined = encrypted + authTag.toString('hex');

  return {
    encrypted: combined,
    iv: iv.toString('hex'),
  };
}

export function decrypt(encryptedData: string, ivHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');

  // Extract auth tag from the end
  const authTag = Buffer.from(encryptedData.slice(-AUTH_TAG_LENGTH * 2), 'hex');
  const encrypted = encryptedData.slice(0, -AUTH_TAG_LENGTH * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Generate a secure developer key
export function generateDeveloperKey(): string {
  return crypto.randomUUID();
}

// Hash for comparing sensitive values
export function secureHash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
