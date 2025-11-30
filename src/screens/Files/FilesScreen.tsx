import React from 'react';
import { Alert, FlatList, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFiles } from '@/hooks/useFiles';
import { Card } from '@/components/Card';
import { FRONTEND_BASE_URL } from '@/api/client';

export default function FilesScreen() {
  const { files, loading, error, refresh, deleteFile } = useFiles();

  const handleCopyLink = async (id: string) => {
    const url = `${FRONTEND_BASE_URL}/f/${id}`;
    try {
      await Share.share({ message: url });
    } catch (err: any) {
      Alert.alert('Unable to share link', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Files</Text>
      <Text style={styles.subtitle}>Your encrypted drops are safe and ready to share.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.fileName}>{item.filename}</Text>
            <Text style={styles.helper}>Downloads {item.download_count}/{item.max_downloads ?? '∞'}</Text>
            {item.expires_at && <Text style={styles.helper}>Expires {new Date(item.expires_at).toLocaleString()}</Text>}
            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleCopyLink(item.id)}>
                <Text style={styles.link}>Share link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete file', 'This removes the encrypted blob from Cocoinbox.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteFile(item.id) },
                  ])
                }
              >
                <Text style={[styles.link, { color: '#dc2626' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Card>
            <Text style={styles.helper}>No secure files yet. Upload from the Cocoinbox web dashboard.</Text>
          </Card>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f4f5' },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#6b7280', marginBottom: 12 },
  error: { color: '#dc2626', marginBottom: 12 },
  fileName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  helper: { color: '#6b7280', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  link: { color: '#0ea5e9', fontWeight: '600' },
});
