import { useCallback, useState } from 'react';
import { apiRequest } from '@/api/client';
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
  const [error, setError] = useState<string | null>(null);

  const listNotes = useCallback(
    async (password: string, algo: NoteAlgo = 'AES-GCM') => {
      if (!token || !user) return [];
      setError(null);
      try {
        setLoading(true);
        const vId = await deriveVaultId(user.id, password, algo);
        const res = await apiRequest<SecureNote[]>('/api/notes/vault-list', {
          method: 'POST',
          token,
          body: JSON.stringify({ cryptoAlgo: algo, vaultId: vId }),
        });
        const decorated = await Promise.all(
          res.map(async (n) => {
            try {
              const meta = {
                encryptedTitle: n.encrypted_title,
                encryptedContent: n.encrypted_content,
                iv: n.iv,
                salt: n.salt,
                algo: n.crypto_algo as NoteAlgo,
                kdfIterations: (n as any).kdf_iterations || n.kdf_iterations || 250000,
                mac: (n as any).mac,
              };
              const titlePlain = await decryptNoteTitle(meta as any, n.encrypted_title, password);
              return { ...n, title_plain: titlePlain } as SecureNote;
            } catch {
              return { ...n, title_plain: '[decrypt failed]' } as SecureNote;
            }
          })
        );
        setNotes(decorated);
        return decorated;
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
      const payload = await encryptNoteFields(title, content, password, algo);
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

  return { notes, loading, error, listNotes, createNote, deleteNote, readNote };
};
