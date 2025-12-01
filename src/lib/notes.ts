import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { sha256 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { utf8ToBytes } from '@noble/hashes/utils';
import { gcm } from '@noble/ciphers/aes';
import { base64ToBytes, bytesToBase64 } from '@/lib/base64';
import CryptoJS from 'crypto-js';

export type NoteAlgo = 'AES-GCM' | 'AES-CBC-HMAC';

export interface NotePayload {
  encryptedTitle: string;
  encryptedContent: string;
  iv: string;
  salt: string;
  algo: NoteAlgo;
  kdfIterations: number;
  mac?: string; // present for AES-CBC-HMAC
}

async function randomBytes(length: number): Promise<Uint8Array> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return Uint8Array.from(bytes);
}

// Chunked asynchronous PBKDF2 (HMAC-SHA256) with periodic yielding to keep UI responsive
async function asyncPbkdf2Sha256(password: string | Uint8Array, salt: Uint8Array, iterations: number, dkLen: number, onChunk?: (fraction: number) => void): Promise<Uint8Array> {
  const pwdBytes = typeof password === 'string' ? utf8ToBytes(password) : password;
  const hLen = 32; // sha256 output size
  const l = Math.ceil(dkLen / hLen);
  const DK = new Uint8Array(l * hLen);
  const totalOps = l * iterations;
  const block = new Uint8Array(salt.length + 4);
  block.set(salt);
  for (let i = 1; i <= l; i++) {
    // INT(i) big-endian
    block[salt.length] = (i >>> 24) & 0xff;
    block[salt.length + 1] = (i >>> 16) & 0xff;
    block[salt.length + 2] = (i >>> 8) & 0xff;
    block[salt.length + 3] = i & 0xff;
    let U = hmac(sha256, pwdBytes, block);
    let T = U.slice();
    // Iterations 2..c
    for (let c = 2; c <= iterations; c++) {
      U = hmac(sha256, pwdBytes, U);
      for (let k = 0; k < hLen; k++) T[k] ^= U[k];
      if (c % 1000 === 0) {
        onChunk?.((( (i - 1) * iterations) + c) / totalOps);
        // Yield to event loop so UI can update
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    DK.set(T, (i - 1) * hLen);
    onChunk?.((i * iterations) / totalOps);
  }
  return DK.slice(0, dkLen);
}

// Iterations configurable via app config extras (Expo), with safe low defaults for Expo Go
const extras = (Constants?.expoConfig?.extra || (Constants as any)?.manifest?.extra) || {};
const VAULT_KDF_ITERATIONS_DEFAULT = Number(extras?.vaultKdfIter ?? 15000);
const NOTE_KDF_ITERATIONS_DEFAULT = Number(extras?.noteKdfIter ?? 30000);

// Session cache for derived 64-byte keys per (algo, salt, iterations, password)
const dkCache = new Map<string, Uint8Array>();
function cacheKey(password: string, salt: Uint8Array, iterations: number, algo: NoteAlgo) {
  const pwdHash = bytesToBase64(sha256(utf8ToBytes(password)));
  return `${algo}|${iterations}|${bytesToBase64(salt)}|${pwdHash}`;
}
async function getDerived64(password: string, salt: Uint8Array, iterations: number, algo: NoteAlgo, onProgress?: (f:number)=>void) {
  const key = cacheKey(password, salt, iterations, algo);
  const cached = dkCache.get(key);
  if (cached) return cached;
  const dk = await asyncPbkdf2Sha256(password, salt, iterations, 64, onProgress);
  dkCache.set(key, dk);
  return dk;
}

export async function encryptNoteFields(
  title: string,
  content: string,
  password: string,
  algo: NoteAlgo = 'AES-GCM',
  iterations = NOTE_KDF_ITERATIONS_DEFAULT,
  onProgress?: (fraction: number) => void
): Promise<NotePayload> {
  const salt = await randomBytes(16);
  if (algo === 'AES-GCM') {
    const iv = await randomBytes(12);
    // Derive 64 bytes to split into two independent AES keys for title/content (cached)
    const keyBits = await getDerived64(password, salt, iterations, algo, onProgress);
    const keyTitle = keyBits.slice(0, 32);
    const keyContent = keyBits.slice(32, 64);
    const cipherTitle = gcm(keyTitle, iv);
    const cipherContent = gcm(keyContent, iv);
    const encTitle = cipherTitle.encrypt(utf8ToBytes(title));
    const encContent = cipherContent.encrypt(utf8ToBytes(content));
    return {
      encryptedTitle: bytesToBase64(encTitle),
      encryptedContent: bytesToBase64(encContent),
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
      algo: 'AES-GCM',
      kdfIterations: iterations,
    };
  } else {
    const iv = await randomBytes(16);
    const bits = await getDerived64(password, salt, iterations, algo, onProgress);
    const encKeyBytes = bits.slice(0, 32);
    const macKeyBytes = bits.slice(32, 64);
    const encKeyWA = CryptoJS.lib.WordArray.create(encKeyBytes as any, encKeyBytes.length);
    const ivWA = CryptoJS.lib.WordArray.create(iv as any, iv.length);
    const titleWA = CryptoJS.enc.Utf8.parse(title);
    const contentWA = CryptoJS.enc.Utf8.parse(content);
    const ctTitleParams = CryptoJS.AES.encrypt(titleWA, encKeyWA, { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const ctContentParams = CryptoJS.AES.encrypt(contentWA, encKeyWA, { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const ctTitleB64 = ctTitleParams.ciphertext.toString(CryptoJS.enc.Base64);
    const ctContentB64 = ctContentParams.ciphertext.toString(CryptoJS.enc.Base64);
    const macDataBytes = new Uint8Array([...iv, ...base64ToBytes(ctContentB64)]);
    const macDataWA = CryptoJS.lib.WordArray.create(macDataBytes as any, macDataBytes.length);
    const macKeyWA = CryptoJS.lib.WordArray.create(macKeyBytes as any, macKeyBytes.length);
    const mac = CryptoJS.HmacSHA256(macDataWA, macKeyWA).toString(CryptoJS.enc.Base64);
    return {
      encryptedTitle: ctTitleB64,
      encryptedContent: ctContentB64,
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
      algo: 'AES-CBC-HMAC',
      kdfIterations: iterations,
      mac,
    };
  }
}

// Utility decode bytes -> utf8 (TextDecoder supported in RN Hermes)
function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export async function decryptNoteContent(meta: NotePayload, encrypted: string, password: string) {
  const iv = base64ToBytes(meta.iv);
  const salt = base64ToBytes(meta.salt);
  if (meta.algo === 'AES-GCM') {
    // Use content half of derived key
    const keyBits = await getDerived64(password, salt, meta.kdfIterations, meta.algo);
    const key = keyBits.slice(32, 64); // content key second half
    const cipher = gcm(key, iv);
    const bytes = cipher.decrypt(base64ToBytes(encrypted));
    return bytesToUtf8(bytes);
  } else {
    const bits = await getDerived64(password, salt, meta.kdfIterations, meta.algo);
    const encKeyBytes = bits.slice(0, 32);
    const macKeyBytes = bits.slice(32, 64);
    const macKeyWA = CryptoJS.lib.WordArray.create(macKeyBytes as any, macKeyBytes.length);
    // Verify MAC
    if (meta.mac) {
      const macDataBytes = new Uint8Array([...iv, ...base64ToBytes(encrypted)]);
      const macDataWA = CryptoJS.lib.WordArray.create(macDataBytes as any, macDataBytes.length);
      const expected = CryptoJS.HmacSHA256(macDataWA, macKeyWA).toString(CryptoJS.enc.Base64);
      if (expected !== meta.mac) throw new Error('MAC verification failed');
    }
    const encKeyWA = CryptoJS.lib.WordArray.create(encKeyBytes as any, encKeyBytes.length);
    const ivWA = CryptoJS.lib.WordArray.create(iv as any, iv.length);
    const cipherWA = CryptoJS.enc.Base64.parse(encrypted);
    const params = CryptoJS.lib.CipherParams.create({ ciphertext: cipherWA });
    const pt = CryptoJS.AES.decrypt(params, encKeyWA, { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return CryptoJS.enc.Utf8.stringify(pt);
  }
}

export async function deriveVaultId(userId: string, password: string, algo: NoteAlgo = 'AES-GCM', iterations = VAULT_KDF_ITERATIONS_DEFAULT, onProgress?: (fraction: number) => void) {
  const salt = utf8ToBytes(`vault:${userId}:${algo}`);
  const key = await asyncPbkdf2Sha256(password, salt, iterations, 32, onProgress);
  return bytesToBase64(key);
}

export async function decryptNoteTitle(meta: NotePayload, encrypted: string, password: string) {
  // Same logic as content but without MAC verification for AES-CBC-HMAC title (frontend parity)
  const iv = base64ToBytes(meta.iv);
  const salt = base64ToBytes(meta.salt);
  if (meta.algo === 'AES-GCM') {
    // Title uses first half of derived key
    const keyBits = await getDerived64(password, salt, meta.kdfIterations, meta.algo);
    const key = keyBits.slice(0, 32);
    const cipher = gcm(key, iv);
    const bytes = cipher.decrypt(base64ToBytes(encrypted));
    return bytesToUtf8(bytes);
  } else {
    const bits = await getDerived64(password, salt, meta.kdfIterations, meta.algo);
    const encKeyBytes = bits.slice(0, 32);
    const encKeyWA = CryptoJS.lib.WordArray.create(encKeyBytes as any, encKeyBytes.length);
    const ivWA = CryptoJS.lib.WordArray.create(iv as any, iv.length);
    const cipherWA = CryptoJS.enc.Base64.parse(encrypted);
    const params = CryptoJS.lib.CipherParams.create({ ciphertext: cipherWA });
    const pt = CryptoJS.AES.decrypt(params, encKeyWA, { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return CryptoJS.enc.Utf8.stringify(pt);
  }
}

// Single-pass decrypt for both title and content to avoid double KDF
export async function decryptNoteBoth(meta: NotePayload, password: string, onProgress?: (fraction: number) => void) {
  const iv = base64ToBytes(meta.iv);
  const salt = base64ToBytes(meta.salt);
  if (meta.algo === 'AES-GCM') {
    const keyBits = await getDerived64(password, salt, meta.kdfIterations, meta.algo, onProgress);
    const keyTitle = keyBits.slice(0, 32);
    const keyContent = keyBits.slice(32, 64);
    const cipherTitle = gcm(keyTitle, iv);
    const cipherContent = gcm(keyContent, iv);
    const title = bytesToUtf8(cipherTitle.decrypt(base64ToBytes(meta.encryptedTitle)));
    const content = bytesToUtf8(cipherContent.decrypt(base64ToBytes(meta.encryptedContent)));
    return { title, content };
  } else {
    const bits = await getDerived64(password, salt, meta.kdfIterations, meta.algo, onProgress);
    const encKeyBytes = bits.slice(0, 32);
    const macKeyBytes = bits.slice(32, 64);
    // Verify MAC for content if provided
    if (meta.mac) {
      const macDataBytes = new Uint8Array([...iv, ...base64ToBytes(meta.encryptedContent)]);
      const macDataWA = CryptoJS.lib.WordArray.create(macDataBytes as any, macDataBytes.length);
      const macKeyWA = CryptoJS.lib.WordArray.create(macKeyBytes as any, macKeyBytes.length);
      const expected = CryptoJS.HmacSHA256(macDataWA, macKeyWA).toString(CryptoJS.enc.Base64);
      if (expected !== meta.mac) throw new Error('MAC verification failed');
    }
    const encKeyWA = CryptoJS.lib.WordArray.create(encKeyBytes as any, encKeyBytes.length);
    const ivWA = CryptoJS.lib.WordArray.create(iv as any, iv.length);
    // Title
    const titleCipherWA = CryptoJS.enc.Base64.parse(meta.encryptedTitle);
    const titleParams = CryptoJS.lib.CipherParams.create({ ciphertext: titleCipherWA });
    const titlePT = CryptoJS.AES.decrypt(titleParams, encKeyWA, { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const title = CryptoJS.enc.Utf8.stringify(titlePT);
    // Content
    const contentCipherWA = CryptoJS.enc.Base64.parse(meta.encryptedContent);
    const contentParams = CryptoJS.lib.CipherParams.create({ ciphertext: contentCipherWA });
    const contentPT = CryptoJS.AES.decrypt(contentParams, encKeyWA, { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const content = CryptoJS.enc.Utf8.stringify(contentPT);
    return { title, content };
  }
}
