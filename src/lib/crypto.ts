import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { sha256 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { utf8ToBytes } from '@noble/hashes/utils';
import { gcm } from '@noble/ciphers/aes';
import { base64ToBytes, bytesToBase64 } from '@/lib/base64';

export interface EncryptionResult {
  data: Uint8Array;
  iv: string;
  salt: string;
  algo: string;
  kdfIterations: number;
}

async function randomBytes(length: number): Promise<Uint8Array> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return Uint8Array.from(bytes);
}

// Configurable iteration defaults via Expo extras with low defaults for Expo Go
const extras = (Constants?.expoConfig?.extra || (Constants as any)?.manifest?.extra) || {};
const FILE_KDF_ITERATIONS_DEFAULT = Number(extras?.fileKdfIter ?? 30000);

// Async PBKDF2 (HMAC-SHA256) with yielding to keep UI responsive
async function asyncPbkdf2Sha256(password: string | Uint8Array, salt: Uint8Array, iterations: number, dkLen: number, onChunk?: (fraction: number) => void): Promise<Uint8Array> {
  const pwdBytes = typeof password === 'string' ? utf8ToBytes(password) : password;
  const hLen = 32;
  const l = Math.ceil(dkLen / hLen);
  const DK = new Uint8Array(l * hLen);
  const totalOps = l * iterations;
  const block = new Uint8Array(salt.length + 4);
  block.set(salt);
  for (let i = 1; i <= l; i++) {
    block[salt.length] = (i >>> 24) & 0xff;
    block[salt.length + 1] = (i >>> 16) & 0xff;
    block[salt.length + 2] = (i >>> 8) & 0xff;
    block[salt.length + 3] = i & 0xff;
    let U = hmac(sha256, pwdBytes, block);
    let T = U.slice();
    for (let c = 2; c <= iterations; c++) {
      U = hmac(sha256, pwdBytes, U);
      for (let k = 0; k < hLen; k++) T[k] ^= U[k];
      if (c % 1000 === 0) {
        onChunk?.((( (i - 1) * iterations) + c) / totalOps);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    DK.set(T, (i - 1) * hLen);
    onChunk?.((i * iterations) / totalOps);
  }
  return DK.slice(0, dkLen);
}

export async function encryptBytes(data: Uint8Array, password: string, iterations = FILE_KDF_ITERATIONS_DEFAULT, onProgress?: (fraction: number) => void): Promise<EncryptionResult> {
  const iv = await randomBytes(12);
  const salt = await randomBytes(16);
  const key = await asyncPbkdf2Sha256(password, salt, iterations, 32, onProgress);
  const cipher = gcm(key, iv);
  const encrypted = cipher.encrypt(data);
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
  const key = await asyncPbkdf2Sha256(password, salt, iterations, 32);
  const cipher = gcm(key, iv);
  return cipher.decrypt(encrypted);
}
