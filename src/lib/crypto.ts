import * as Random from 'expo-random';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { aes256gcm } from '@noble/ciphers/aes.js';
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
  const key = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: iterations, dkLen: 32 });
  const gcm = aes256gcm(key);
  const encrypted = gcm.encrypt(iv, data);
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
  const key = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: iterations, dkLen: 32 });
  const gcm = aes256gcm(key);
  return gcm.decrypt(iv, encrypted);
}
