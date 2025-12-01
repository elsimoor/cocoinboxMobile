import { useCallback, useMemo, useState } from 'react';
import { apiRequest } from '@/api/client';
import Constants from 'expo-constants';
import { useAuth } from '@/context/AuthContext';
import { encryptNoteFields, decryptNoteContent, decryptNoteTitle, deriveVaultId, NoteAlgo, decryptNoteBoth } from '@/lib/notes';

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
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const log = useCallback((msg: string) => {
    const ts = new Date().toISOString().split('T')[1]?.replace('Z','');
    const line = `[${ts}] ${msg}`;
    // Console for metro debugging and UI log list
    console.log(line);
    setDebugLogs(prev => [...prev, line].slice(-500));
  }, []);

  const listNotes = useCallback(
    async (password: string, algo: NoteAlgo = 'AES-GCM', onStage?: (stage: string) => void) => {
      if (!token || !user) return [];
      setError(null);
      try {
        setLoading(true);
        onStage?.('Deriving vault key…');
        log(`listNotes: deriving vault id for algo=${algo}`);
        const vId = await deriveVaultId(user.id, password, algo);
        log('listNotes: derived vault id');
        onStage?.('Fetching notes list…');
        const res = await apiRequest<SecureNote[]>('/api/notes/vault-list', {
          method: 'POST',
          token,
          body: JSON.stringify({ cryptoAlgo: algo, vaultId: vId }),
        });
        log(`listNotes: fetched ${res.length} notes`);
        setNotes(res);
        const extras = (Constants?.expoConfig?.extra || (Constants as any)?.manifest?.extra) || {};
        const decryptOnUnlock = !!extras?.decryptTitlesOnUnlock; // default false for Expo Go performance
        if (decryptOnUnlock && res.length) {
          onStage?.('Decrypting titles…');
          log('listNotes: decryptTitlesOnUnlock=true, starting bulk title decrypt');
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
              if ((i + 1) % 5 === 0 || i === res.length - 1) {
                log(`listNotes: decrypted titles ${i + 1}/${res.length}`);
              }
            } catch {
              setNotes(prev => prev.map(p => p.id === n.id ? { ...p, title_plain: '[decrypt failed]' } : p));
              log(`listNotes: title decrypt failed for note ${n.id}`);
            }
            if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
            setDecryptProgress((i + 1)/res.length);
          }
          setDecrypting(false);
          log('listNotes: finished bulk title decrypt');
        }
        onStage?.('Done');
        log('listNotes: done');
        return res;
      } catch (err: any) {
        setError(err.message);
        log(`listNotes: error ${err?.message || err}`);
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
      log(`createNote: encrypting with algo=${algo}`);
      const payload = await encryptNoteFields(title, content, password, algo, undefined, (f)=> {
        setEncryptProgress(f);
        if (f === 0 || f === 1 || (f*100)%10===0) {
          log(`createNote: encrypt progress ${Math.round(f*100)}%`);
        }
      });
      const vaultId = await deriveVaultId(user.id, password, algo);
      log('createNote: derived vault id, posting to API');
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
      log('createNote: created, refreshing list');
      await listNotes(password, algo);
    } catch (err: any) {
      setError(err.message);
      log(`createNote: error ${err?.message || err}`);
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
    try {
      log(`readNote: fetching ${id}`);
      const note = await apiRequest<SecureNote>(`/api/notes/${id}`, { token });
      const meta = {
        encryptedTitle: note.encrypted_title,
        encryptedContent: note.encrypted_content,
        iv: note.iv,
        salt: note.salt,
        algo: note.crypto_algo as NoteAlgo,
        kdfIterations: (note as any).kdf_iterations || note.kdf_iterations || 30000,
        mac: (note as any).mac,
      };
      setDecrypting(true);
      setDecryptProgress(0);
      log('readNote: decrypting (single-pass)…');
      const { title, content } = await decryptNoteBoth(meta as any, password, (f) => {
        setDecryptProgress(f);
        if (f === 0 || f === 1 || (f*100)%10===0) {
          log(`readNote: KDF progress ${Math.round(f*100)}%`);
        }
      });
      log('readNote: decrypt done');
      return { title, content };
    } catch (err:any) {
      setError(err.message);
      log(`readNote: error ${err?.message || err}`);
      return null;
    } finally {
      setDecrypting(false);
    }
  };

  return { notes, loading, error, decrypting, decryptProgress, encryptProgress, listNotes, createNote, deleteNote, readNote, debugLogs };
};
