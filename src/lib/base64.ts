import { toByteArray, fromByteArray } from 'base64-js';

export function bytesToBase64(bytes: Uint8Array): string {
  return fromByteArray(bytes);
}

export function base64ToBytes(b64: string): Uint8Array {
  return toByteArray(b64);
}
