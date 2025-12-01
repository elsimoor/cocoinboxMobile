import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Switch, ActivityIndicator } from 'react-native';
import { Card } from '@/components/Card';
import { useIsPro } from '@/hooks/useIsPro';
import { useSecureNotes } from '@/hooks/useSecureNotes';
import { NoteAlgo } from '@/lib/notes';

export default function NotesScreen() {
  const { isPro } = useIsPro();
  const { notes, loading, error, decrypting, decryptProgress, encryptProgress, listNotes, createNote, deleteNote, readNote, debugLogs, decryptTitlesOnUnlock, setDecryptTitlesOnUnlock, cancelTitleDecrypt } = useSecureNotes();
  const [vaultPassword, setVaultPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [viewing, setViewing] = useState<{ title: string; content: string } | null>(null);
  const [algo, setAlgo] = useState<NoteAlgo>('AES-GCM');
  const [autoDelete, setAutoDelete] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [readingNote, setReadingNote] = useState(false);

  const unlock = () => {
    if (!vaultPassword || unlocking) return;
    setUnlockError(null);
    setUnlocking(true);
    setProgress('Starting…');
    setShowSlowHint(false);
    const slowTimer = setTimeout(() => setShowSlowHint(true), 4000);
    const hardTimeout = setTimeout(() => {
      if (unlocking) {
        setUnlockError('Unlock is taking too long. Please retry.');
        setUnlocking(false);
        setProgress(null);
      }
    }, 25000);
    setTimeout(async () => {
      try {
        await listNotes(vaultPassword, algo, (stage) => setProgress(stage));
        setUnlocked(true);
      } catch (e:any) {
        setUnlockError(e?.message || 'Failed to unlock');
      } finally {
        clearTimeout(slowTimer);
        clearTimeout(hardTimeout);
        setUnlocking(false);
        setProgress(null);
        setShowSlowHint(false);
      }
    }, 60);
  };

  const create = async () => {
    if (!title || !content || !vaultPassword) {
      Alert.alert('Missing info');
      return;
    }
    const expiryNum = expiryMinutes ? parseInt(expiryMinutes, 10) : undefined;
    await createNote(title, content, vaultPassword, algo, { autoDeleteAfterRead: autoDelete, expiresInMinutes: expiryNum });
    setTitle('');
    setContent('');
    setExpiryMinutes('');
    setAutoDelete(false);
  };

  const openNote = async (id: string) => {
    if (!vaultPassword) return;
    setReadingNote(true);
    try {
      const data = await readNote(id, vaultPassword);
      if (data) setViewing(data);
    } finally {
      setReadingNote(false);
    }
  };

  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Secure Notes</Text>
        <Text style={styles.subtitle}>Zero-knowledge vault for secrets.</Text>
        <Text style={styles.error}>Pro subscription required to use secure notes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Notes</Text>
      <Text style={styles.subtitle}>Zero-knowledge vault for secrets.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={[styles.primary, { backgroundColor: '#334155', marginVertical: 10 }]} onPress={() => setShowLogs(!showLogs)}>
        <Text style={styles.primaryText}>{showLogs ? 'Hide Debug Logs' : 'Show Debug Logs'}</Text>
      </TouchableOpacity>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleAlgo, algo === 'AES-GCM' && styles.toggleAlgoActive]}
          onPress={() => setAlgo('AES-GCM')}
          disabled={unlocked}
        >
          <Text style={[styles.toggleAlgoText, algo === 'AES-GCM' && styles.toggleAlgoTextActive]}>AES-GCM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleAlgo, algo === 'AES-CBC-HMAC' && styles.toggleAlgoActive]}
          onPress={() => setAlgo('AES-CBC-HMAC')}
          disabled={unlocked}
        >
          <Text style={[styles.toggleAlgoText, algo === 'AES-CBC-HMAC' && styles.toggleAlgoTextActive]}>AES-CBC-HMAC</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.rowBetween}>
        <View style={styles.inlineRow}>
          <Switch value={decryptTitlesOnUnlock} onValueChange={setDecryptTitlesOnUnlock} />
          <Text style={[styles.smallLabel, styles.inlineSpacing]}>Decrypt titles on unlock</Text>
        </View>
        {decrypting && !readingNote && (
          <TouchableOpacity onPress={cancelTitleDecrypt}>
            <Text style={[styles.link, { color: '#dc2626' }]}>Cancel decrypt</Text>
          </TouchableOpacity>
        )}
      </View>
      {!unlocked ? (
        <Card>
          <TextInput
            placeholder="Vault password"
            style={styles.input}
            value={vaultPassword}
            onChangeText={setVaultPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.primary, (!vaultPassword || unlocking) && { opacity: 0.6 }]}
            disabled={!vaultPassword || unlocking}
            onPress={unlock}
          >
            {unlocking ? (
              <View style={styles.buttonRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.primaryText}>{progress || 'Unlocking…'}</Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>Unlock vault</Text>
            )}
          </TouchableOpacity>
          {unlocking && (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={styles.loadingHint}>{progress || 'Preparing…'}</Text>
            </View>
          )}
          {showSlowHint && unlocking && (
            <Text style={styles.slowHint}>Still working… heavy key derivation running.</Text>
          )}
          {unlockError && !unlocking && (
            <Text style={styles.error}>{unlockError}</Text>
          )}
          {unlocking && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setUnlocking(false); setProgress(null); setUnlockError('Cancelled'); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Card>
      ) : (
        <Card>
          <TextInput placeholder="Title" style={styles.input} value={title} onChangeText={setTitle} />
          <TextInput
            placeholder="Content"
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            multiline
            value={content}
            onChangeText={setContent}
          />
          <View style={styles.rowBetween}> 
            <View style={styles.inlineRow}>
              <Switch value={autoDelete} onValueChange={setAutoDelete} />
              <Text style={[styles.smallLabel, styles.inlineSpacing]}>Auto-delete after read</Text>
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.smallLabel}>Expiry (min)</Text>
              <TextInput
                placeholder="e.g. 60"
                keyboardType="numeric"
                style={[styles.input, styles.expiryInput]}
                value={expiryMinutes}
                onChangeText={setExpiryMinutes}
              />
            </View>
          </View>
          <TouchableOpacity style={[styles.primary, loading && { opacity: 0.7 }]} disabled={loading} onPress={create}>
            <Text style={styles.primaryText}>{loading ? 'Saving…' : 'Create note'}</Text>
          </TouchableOpacity>
          {(unlocking || loading) && (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={styles.loadingHint}>{unlocking ? 'Loading vault…' : (encryptProgress ? `Encrypting ${Math.round(encryptProgress*100)}%` : 'Processing…')}</Text>
            </View>
          )}
        </Card>
      )}

      {unlocked && (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.noteTitle}>{item.title_plain || item.id.slice(-6)}</Text>
              <Text style={styles.metaLine}>
                {item.auto_delete_after_read ? 'Auto-delete' : 'Persistent'}
                {item.expires_at ? ` · Exp ${new Date(item.expires_at).toLocaleDateString()}` : ''}
                {item.crypto_algo === 'AES-CBC-HMAC' ? ' · CBC-HMAC' : ' · GCM'}
              </Text>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => openNote(item.id)}>
                  <Text style={styles.link}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteNote(item.id)}>
                  <Text style={[styles.link, { color: '#dc2626' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
          ListEmptyComponent={(loading || decrypting) ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={styles.loadingHint}>{decrypting ? `Decrypting titles ${Math.round(decryptProgress*100)}%…` : 'Loading notes…'}</Text>
            </View>
          ) : (
            <Text style={styles.empty}>No notes yet</Text>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Decrypting a single note overlay */}
      <Modal visible={readingNote} transparent animationType="fade">
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="small" color="#0ea5e9" />
            <Text style={styles.loadingHint}>Decrypting note… {decryptProgress ? `${Math.round(decryptProgress*100)}%` : ''}</Text>
          </View>
        </View>
      </Modal>

      {showLogs && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.noteTitle}>Debug Logs</Text>
          <View style={{ marginTop: 8 }}>
            {debugLogs?.length ? (
              debugLogs.slice(-200).map((line, idx) => (
                <Text key={idx} style={styles.logItem}>{line}</Text>
              ))
            ) : (
              <Text style={styles.helper}>No logs yet. Unlock or create a note.</Text>
            )}
          </View>
        </View>
      )}

      <Modal visible={!!viewing} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{viewing?.title}</Text>
            <Text style={styles.modalBody}>{viewing?.content}</Text>
            <TouchableOpacity style={styles.primary} onPress={() => setViewing(null)}>
              <Text style={styles.primaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5', padding: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#6b7280' },
  error: { color: '#dc2626' },
  helper: { color: '#6b7280', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    color: '#0f172a',
  },
  toggleRow: { flexDirection: 'row', marginBottom: 12 },
  toggleAlgo: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e4e4e7' },
  toggleAlgoActive: { backgroundColor: '#0f172a' },
  toggleAlgoText: { color: '#0f172a', fontWeight: '600' },
  toggleAlgoTextActive: { color: '#fff' },
  primary: { backgroundColor: '#0ea5e9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '600' },
  noteTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  metaLine: { fontSize: 12, color: '#52525b', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  link: { color: '#0ea5e9', fontWeight: '600' },
  smallLabel: { fontSize: 12, color: '#0f172a' },
  loadingHint: { marginLeft: 8, fontSize: 12, color: '#6b7280' },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  listContent: { paddingBottom: 80 },
  separator: { height: 12 },
  inlineRow: { flexDirection: 'row', alignItems: 'center' },
  inlineSpacing: { marginLeft: 8 },
  expiryInput: { width: 90, paddingVertical: 8, marginBottom: 0 },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  emptyWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 24 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalBody: { color: '#0f172a' },
  slowHint: { marginTop: 8, fontSize: 12, color: '#64748b' },
  cancelBtn: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#e2e8f0' },
  cancelText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  logItem: { color: '#374151', fontSize: 12 },
});
