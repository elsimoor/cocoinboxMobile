import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card } from '@/components/Card';
import { useSecureNotes } from '@/hooks/useSecureNotes';

export default function NotesScreen() {
  const { notes, loading, error, listNotes, createNote, deleteNote, readNote } = useSecureNotes();
  const [vaultPassword, setVaultPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [viewing, setViewing] = useState<{ title: string; content: string } | null>(null);

  const unlock = async () => {
    if (!vaultPassword) return;
    const res = await listNotes(vaultPassword);
    if (res.length >= 0) setUnlocked(true);
  };

  const create = async () => {
    if (!title || !content || !vaultPassword) {
      Alert.alert('Missing info');
      return;
    }
    await createNote(title, content, vaultPassword);
    setTitle('');
    setContent('');
  };

  const openNote = async (id: string) => {
    if (!vaultPassword) return;
    const data = await readNote(id, vaultPassword);
    if (data) setViewing(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Notes</Text>
      <Text style={styles.subtitle}>Zero-knowledge vault for secrets.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!unlocked ? (
        <Card>
          <TextInput placeholder="Vault password" style={styles.input} value={vaultPassword} onChangeText={setVaultPassword} secureTextEntry />
          <TouchableOpacity style={styles.primary} onPress={unlock}>
            <Text style={styles.primaryText}>Unlock vault</Text>
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.primary} onPress={create}>
            <Text style={styles.primaryText}>Create note</Text>
          </TouchableOpacity>
        </Card>
      )}

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.noteTitle}>{item.id.slice(-6)}</Text>
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
      />

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
  container: { flex: 1, backgroundColor: '#f4f4f5', padding: 20, gap: 12 },
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
  primary: { backgroundColor: '#0ea5e9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '600' },
  noteTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  link: { color: '#0ea5e9', fontWeight: '600' },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalBody: { color: '#0f172a' },
});
