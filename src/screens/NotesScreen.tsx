import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Switch, ActivityIndicator } from 'react-native';
import { Card } from '@/components/Card';
import { useIsPro } from '@/hooks/useIsPro';
import { useSecureNotes } from '@/hooks/useSecureNotes';
import { NoteAlgo } from '@/lib/notes';

export default function NotesScreen() {
  const { isPro } = useIsPro();
  const { notes, loading, error, listNotes, createNote, deleteNote, readNote } = useSecureNotes();
  const [vaultPassword, setVaultPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [viewing, setViewing] = useState<{ title: string; content: string } | null>(null);
  const [algo, setAlgo] = useState<NoteAlgo>('AES-GCM');
  const [autoDelete, setAutoDelete] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState<string>('');

  const unlock = async () => {
    if (!vaultPassword || unlocking) return;
    setUnlocking(true);
    try {
      await listNotes(vaultPassword, algo);
      setUnlocked(true);
    } catch {
      // keep locked so user can retry
    } finally {
      setUnlocking(false);
    }
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
    const data = await readNote(id, vaultPassword);
    if (data) setViewing(data);
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
                <Text style={styles.primaryText}>Unlocking…</Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>Unlock vault</Text>
            )}
          </TouchableOpacity>
          {unlocking && (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={styles.loadingHint}>Deriving keys…</Text>
            </View>
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
              <Text style={styles.loadingHint}>{unlocking ? 'Loading vault…' : 'Processing…'}</Text>
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
          ListEmptyComponent={loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={styles.loadingHint}>Loading notes…</Text>
            </View>
          ) : (
            <Text style={styles.empty}>No notes yet</Text>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
});
