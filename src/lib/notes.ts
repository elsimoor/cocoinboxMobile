import * as Crypto from 'expo-crypto';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils.js';
import { aes256gcm } from '@noble/ciphers/aes.js';
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

export async function encryptNoteFields(
  title: string,
  content: string,
  password: string,
  algo: NoteAlgo = 'AES-GCM',
  iterations = 250000
): Promise<NotePayload> {
  const salt = await randomBytes(16);
  if (algo === 'AES-GCM') {
    const iv = await randomBytes(12);
    const key = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: iterations, dkLen: 32 });
    const gcm = aes256gcm(key);
    const encTitle = gcm.encrypt(iv, utf8ToBytes(title));
    const encContent = gcm.encrypt(iv, utf8ToBytes(content));
    return {
      encryptedTitle: bytesToBase64(encTitle),
      encryptedContent: bytesToBase64(encContent),
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
      algo: 'AES-GCM',
      kdfIterations: iterations,
    };
  } else {
    // AES-CBC-HMAC (encrypt-then-MAC) with shared derived bits (64 bytes)
    const iv = await randomBytes(16);
    const bits = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: iterations, dkLen: 64 });
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
    // MAC over iv + encryptedContent bytes
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

export async function decryptNoteContent(meta: NotePayload, encrypted: string, password: string) {
  const iv = base64ToBytes(meta.iv);
  const salt = base64ToBytes(meta.salt);
  if (meta.algo === 'AES-GCM') {
    const key = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: meta.kdfIterations, dkLen: 32 });
    const gcm = aes256gcm(key);
    const bytes = gcm.decrypt(iv, base64ToBytes(encrypted));
    return bytesToUtf8(bytes);
  } else {
    const bits = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: meta.kdfIterations, dkLen: 64 });
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

export async function deriveVaultId(userId: string, password: string, algo: NoteAlgo = 'AES-GCM', iterations = 120000) {
  const salt = utf8ToBytes(`vault:${userId}:${algo}`);
  const key = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: iterations, dkLen: 32 });
  return bytesToBase64(key);
}

export async function decryptNoteTitle(meta: NotePayload, encrypted: string, password: string) {
  // Same logic as content but without MAC verification for AES-CBC-HMAC title (frontend parity)
  const iv = base64ToBytes(meta.iv);
  const salt = base64ToBytes(meta.salt);
  if (meta.algo === 'AES-GCM') {
    const key = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: meta.kdfIterations, dkLen: 32 });
    const gcm = aes256gcm(key);
    const bytes = gcm.decrypt(iv, base64ToBytes(encrypted));
    return bytesToUtf8(bytes);
  } else {
    const bits = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: meta.kdfIterations, dkLen: 64 });
    const encKeyBytes = bits.slice(0, 32);
    const encKeyWA = CryptoJS.lib.WordArray.create(encKeyBytes as any, encKeyBytes.length);
    const ivWA = CryptoJS.lib.WordArray.create(iv as any, iv.length);
    const cipherWA = CryptoJS.enc.Base64.parse(encrypted);
    const params = CryptoJS.lib.CipherParams.create({ ciphertext: cipherWA });
    const pt = CryptoJS.AES.decrypt(params, encKeyWA, { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return CryptoJS.enc.Utf8.stringify(pt);
  }
}
