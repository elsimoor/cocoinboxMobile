import React, { useState } from 'react';
import { Alert, FlatList, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSecureFiles } from '@/hooks/useSecureFiles';
import { useIsPro } from '@/hooks/useIsPro';
import { Card } from '@/components/Card';
import { GradientBackground } from '@/components/GradientBackground';
import { GradientButton } from '@/components/GradientButton';
import { FRONTEND_BASE_URL } from '@/api/client';

export default function FilesScreen() {
  const { isPro } = useIsPro();
  const { files, selectedFile, loading, error, encryptProgress, pickFile, uploadFile, removeFile, debugLogs } = useSecureFiles();
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxDownloads, setMaxDownloads] = useState<string>('');
  const [showLogs, setShowLogs] = useState(false);

  const startUpload = async () => {
    if (!password) {
      Alert.alert('Password required');
      return;
    }
    await uploadFile(password, {
      expiresAt: expiresAt || undefined,
      maxDownloads: maxDownloads ? Number(maxDownloads) : undefined,
    });
    setPassword('');
    setExpiresAt('');
    setMaxDownloads('');
  };

  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Secure Files</Text>
        <Text style={styles.subtitle}>Encrypt and share sensitive attachments.</Text>
        <Text style={styles.error}>Pro subscription required to use encrypted file vault.</Text>
      </View>
    );
  }

  return (
    <GradientBackground style={styles.container}>
      <Text style={styles.title}>Secure Files</Text>
      <Text style={styles.subtitle}>Encrypt and share sensitive attachments.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card>
        <TouchableOpacity style={styles.picker} onPress={pickFile}>
          <Text style={styles.pickerText}>{selectedFile?.name ?? 'Choose file'}</Text>
        </TouchableOpacity>
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
        <TextInput placeholder="Expires at (optional)" style={styles.input} value={expiresAt} onChangeText={setExpiresAt} />
        <TextInput
          placeholder="Max downloads"
          style={styles.input}
          value={maxDownloads}
          onChangeText={setMaxDownloads}
          keyboardType="numeric"
        />
        {loading ? (
          <View style={[styles.primary, { backgroundColor: '#0ea5e9' }]}>
            <Text style={styles.primaryText}>{`Encrypting ${Math.round(encryptProgress*100)}%…`}</Text>
          </View>
        ) : (
          <GradientButton title={'Encrypt & Upload'} onPress={startUpload} disabled={!selectedFile} />
        )}
        <TouchableOpacity style={[styles.primary, { backgroundColor: '#334155', marginTop: 10 }]} onPress={() => setShowLogs(!showLogs)}>
          <Text style={styles.primaryText}>{showLogs ? 'Hide Debug Logs' : 'Show Debug Logs'}</Text>
        </TouchableOpacity>
      </Card>

      {showLogs && (
        <Card>
          <Text style={styles.fileName}>Debug Logs</Text>
          <View style={{ marginTop: 8 }}>
            {debugLogs?.length ? (
              debugLogs.slice(-200).map((line, idx) => (
                <Text key={idx} style={styles.logItem}>{line}</Text>
              ))
            ) : (
              <Text style={styles.helper}>No logs yet. Perform an upload.</Text>
            )}
          </View>
        </Card>
      )}

      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
        refreshing={loading}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.fileName}>{item.filename}</Text>
            <Text style={styles.helper}>Downloads {item.download_count}/{item.max_downloads ?? '∞'}</Text>
            {item.expires_at && <Text style={styles.helper}>Expires {new Date(item.expires_at).toLocaleString()}</Text>}
            <View style={styles.row}>
              <TouchableOpacity onPress={() => Share.share({ message: `${FRONTEND_BASE_URL}/f/${item.id}` })}>
                <Text style={styles.link}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete file', 'Remove this encrypted upload?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => removeFile(item.id) },
                  ])
                }
              >
                <Text style={[styles.link, { color: '#dc2626' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#6b7280' },
  error: { color: '#dc2626' },
  picker: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pickerText: { color: '#0f172a' },
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
  fileName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  helper: { color: '#6b7280', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  link: { color: '#0ea5e9', fontWeight: '600' },
  logItem: { color: '#374151', fontSize: 12 },
});
