import { useCallback, useState } from 'react';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { encryptNoteFields, decryptNoteContent, decryptNoteTitle, deriveVaultId } from '@/lib/notes';

export interface SecureNote {
  id: string;
  crypto_algo: 'AES-GCM';
  iv: string;
  salt: string;
  encrypted_title: string;
  encrypted_content: string;
  kdf_iterations: number;
  auto_delete_after_read: boolean;
  expires_at?: string;
  created_at: string;
}

export const useSecureNotes = () => {
  const { token, user } = useAuth();
  const [notes, setNotes] = useState<SecureNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listNotes = useCallback(
    async (password: string) => {
      if (!token || !user) return [];
      setError(null);
      try {
        setLoading(true);
        const vId = await deriveVaultId(user.id, password);
        const res = await apiRequest<SecureNote[]>('/api/notes/vault-list', {
          method: 'POST',
          token,
          body: JSON.stringify({ cryptoAlgo: 'AES-GCM', vaultId: vId }),
        });
        setNotes(res);
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

  const createNote = async (title: string, content: string, password: string) => {
    if (!token || !user) return;
    setError(null);
    try {
      setLoading(true);
      const payload = await encryptNoteFields(title, content, password);
      const vaultId = await deriveVaultId(user.id, password);
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
          autoDeleteAfterRead: false,
          vaultId,
        }),
      });
      await listNotes(password);
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
      algo: 'AES-GCM' as const,
      kdfIterations: (note as any).kdf_iterations || 200000,
    };
    const title = await decryptNoteTitle(meta, note.encrypted_title, password);
    const content = await decryptNoteContent(meta, note.encrypted_content, password);
    return { title, content };
  };

  return { notes, loading, error, listNotes, createNote, deleteNote, readNote };
};
