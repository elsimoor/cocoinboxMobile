import { useCallback, useState } from 'react';
import { apiRequest } from '@/api/client';
import Constants from 'expo-constants';
import { useAuth } from '@/context/AuthContext';
import { encryptNoteFields, decryptNoteContent, decryptNoteTitle, deriveVaultId, NoteAlgo } from '@/lib/notes';

export interface SecureNote {
  id: string;
  crypto_algo: NoteAlgo;
  iv: string;
  salt: string;
  encrypted_title: string;
  encrypted_content: string;
  kdf_iterations: number;
  mac?: string;
  auto_delete_after_read: boolean;
  expires_at?: string;
  created_at: string;
  title_plain?: string; // added locally after decryption
}

export const useSecureNotes = () => {
  const { token, user } = useAuth();
  const [notes, setNotes] = useState<SecureNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptProgress, setDecryptProgress] = useState<number>(0);
  const [encryptProgress, setEncryptProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const listNotes = useCallback(
    async (password: string, algo: NoteAlgo = 'AES-GCM', onStage?: (stage: string) => void) => {
      if (!token || !user) return [];
      setError(null);
      try {
        setLoading(true);
        onStage?.('Deriving vault key…');
        const vId = await deriveVaultId(user.id, password, algo);
        onStage?.('Fetching notes list…');
        const res = await apiRequest<SecureNote[]>('/api/notes/vault-list', {
          method: 'POST',
          token,
          body: JSON.stringify({ cryptoAlgo: algo, vaultId: vId }),
        });
        setNotes(res);
        const extras = (Constants?.expoConfig?.extra || (Constants as any)?.manifest?.extra) || {};
        const decryptOnUnlock = !!extras?.decryptTitlesOnUnlock; // default false for Expo Go performance
        if (decryptOnUnlock && res.length) {
          onStage?.('Decrypting titles…');
          setDecrypting(true);
          setDecryptProgress(0);
          for (let i = 0; i < res.length; i++) {
            const n = res[i];
            try {
              const meta = {
                encryptedTitle: n.encrypted_title,
                encryptedContent: n.encrypted_content,
                iv: n.iv,
                salt: n.salt,
                algo: n.crypto_algo as NoteAlgo,
                kdfIterations: (n as any).kdf_iterations || n.kdf_iterations || 30000,
                mac: (n as any).mac,
              };
              const titlePlain = await decryptNoteTitle(meta as any, n.encrypted_title, password);
              setNotes(prev => prev.map(p => p.id === n.id ? { ...p, title_plain: titlePlain } : p));
            } catch {
              setNotes(prev => prev.map(p => p.id === n.id ? { ...p, title_plain: '[decrypt failed]' } : p));
            }
            if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
            setDecryptProgress((i + 1)/res.length);
          }
          setDecrypting(false);
        }
        onStage?.('Done');
        return res;
      } catch (err: any) {
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [token, user]
  );

  const createNote = async (
    title: string,
    content: string,
    password: string,
    algo: NoteAlgo = 'AES-GCM',
    opts?: { autoDeleteAfterRead?: boolean; expiresInMinutes?: number }
  ) => {
    if (!token || !user) return;
    setError(null);
    try {
      setLoading(true);
      setEncryptProgress(0);
      const payload = await encryptNoteFields(title, content, password, algo, undefined, (f)=> setEncryptProgress(f));
      const vaultId = await deriveVaultId(user.id, password, algo);
      await apiRequest('/api/notes/create', {
        method: 'POST',
        token,
        body: JSON.stringify({
          encryptedTitle: payload.encryptedTitle,
          encryptedContent: payload.encryptedContent,
          cryptoAlgo: payload.algo,
          kdfIterations: payload.kdfIterations,
          iv: payload.iv,
          salt: payload.salt,
          mac: payload.mac,
          autoDeleteAfterRead: !!opts?.autoDeleteAfterRead,
          expiresInMinutes: opts?.expiresInMinutes,
          vaultId,
        }),
      });
      await listNotes(password, algo);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!token) return;
    try {
      await apiRequest(`/api/notes/${id}`, { method: 'DELETE', token });
      setNotes((prev) => prev.filter((note) => note.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const readNote = async (id: string, password: string) => {
    if (!token) return null;
    setError(null);
    const note = await apiRequest<SecureNote>(`/api/notes/${id}`, { token });
    const meta = {
      encryptedTitle: note.encrypted_title,
      encryptedContent: note.encrypted_content,
      iv: note.iv,
      salt: note.salt,
      algo: note.crypto_algo as NoteAlgo,
      kdfIterations: (note as any).kdf_iterations || 250000,
      mac: (note as any).mac,
    };
    const title = await decryptNoteTitle(meta as any, note.encrypted_title, password);
    const content = await decryptNoteContent(meta as any, note.encrypted_content, password);
    return { title, content };
  };

  return { notes, loading, error, decrypting, decryptProgress, encryptProgress, listNotes, createNote, deleteNote, readNote };
};
