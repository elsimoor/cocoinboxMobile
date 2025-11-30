import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '@/components/Card';
import { apiRequest, FRONTEND_BASE_URL } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

interface NotesStats {
  secureNotes: { activeCount: number };
}

export default function NotesScreen() {
  const { token } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const data = await apiRequest<NotesStats>('/api/stats/user', { token });
        setCount(data.secureNotes.activeCount || 0);
      } catch {}
    })();
  }, [token]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Secure Notes</Text>
      <Text style={styles.subtitle}>Client-side encrypted notebooks. Unlock vaults to view content.</Text>
      <Card>
        <Text style={styles.cardValue}>{count}</Text>
        <Text style={styles.cardHelper}>notes awaiting in your vault.</Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>How to unlock on mobile</Text>
        <Text style={styles.paragraph}>
          To preserve zero-knowledge encryption, vault operations currently happen in the Cocoinbox web dashboard. We’re working on a mobile crypto module, but for now tap below to open the secure vault experience in your browser.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(`${FRONTEND_BASE_URL}/notes`)}>
          <Text style={styles.buttonText}>Open vault in browser</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#6b7280' },
  cardValue: { fontSize: 40, fontWeight: '700', color: '#0f172a' },
  cardHelper: { color: '#6b7280' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#0f172a' },
  paragraph: { color: '#475569', marginBottom: 16 },
  button: { backgroundColor: '#0ea5e9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
