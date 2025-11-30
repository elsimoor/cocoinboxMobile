import * as Random from 'expo-random';
import { pbkdf2 } from '@stablelib/pbkdf2';
import { sha256 } from '@stablelib/sha256';
import { encodeUTF8, decodeUTF8 } from '@stablelib/utf8';
import { AESGCM } from '@stablelib/aes-gcm';
import { base64ToBytes, bytesToBase64 } from '@/lib/base64';

export interface EncryptionResult {
  data: Uint8Array;
  iv: string;
  salt: string;
  algo: string;
  kdfIterations: number;
}

async function randomBytes(length: number): Promise<Uint8Array> {
  const bytes = await Random.getRandomBytesAsync(length);
  return Uint8Array.from(bytes);
}

export async function encryptBytes(data: Uint8Array, password: string, iterations = 250000): Promise<EncryptionResult> {
  const iv = await randomBytes(12);
  const salt = await randomBytes(16);
  const key = pbkdf2(sha256, encodeUTF8(password), salt, iterations, 32);
  const aes = new AESGCM(key);
  const encrypted = aes.seal(iv, data);
  return {
    data: encrypted,
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    algo: 'AES-GCM',
    kdfIterations: iterations,
  };
}

export async function decryptBytes(encrypted: Uint8Array, password: string, ivB64: string, saltB64: string, iterations: number) {
  const iv = base64ToBytes(ivB64);
  const salt = base64ToBytes(saltB64);
  const key = pbkdf2(sha256, encodeUTF8(password), salt, iterations, 32);
  const aes = new AESGCM(key);
  return aes.open(iv, encrypted);
}
