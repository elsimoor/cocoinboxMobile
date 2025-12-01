import * as Random from 'expo-random';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils.js';
import { aes256gcm } from '@noble/ciphers/aes.js';
import { base64ToBytes, bytesToBase64 } from '@/lib/base64';

export interface NotePayload {
  encryptedTitle: string;
  encryptedContent: string;
  iv: string;
  salt: string;
  algo: 'AES-GCM';
  kdfIterations: number;
}

async function randomBytes(length: number): Promise<Uint8Array> {
  const bytes = await Random.getRandomBytesAsync(length);
  return Uint8Array.from(bytes);
}

export async function encryptNoteFields(title: string, content: string, password: string, iterations = 200000): Promise<NotePayload> {
  const salt = await randomBytes(16);
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
}

export async function decryptNoteContent(meta: NotePayload, encrypted: string, password: string) {
  const iv = base64ToBytes(meta.iv);
  const salt = base64ToBytes(meta.salt);
  const key = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: meta.kdfIterations, dkLen: 32 });
  const gcm = aes256gcm(key);
  const bytes = gcm.decrypt(iv, base64ToBytes(encrypted));
  return bytesToUtf8(bytes);
}

export async function deriveVaultId(userId: string, password: string, iterations = 120000) {
  const salt = utf8ToBytes(`vault:${userId}:AES-GCM`);
  const key = await pbkdf2(sha256, utf8ToBytes(password), salt, { c: iterations, dkLen: 32 });
  return bytesToBase64(key);
}

export const decryptNoteTitle = decryptNoteContent;
