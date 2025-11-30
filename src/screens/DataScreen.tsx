import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

interface WorkspaceStats {
  ephemeralEmails: { activeCount: number };
  secureNotes: { activeCount: number };
  secureFiles: { activeCount: number };
  sms: { activeNumbers: number };
}

export default function DataScreen() {
  const { token } = useAuth();
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<WorkspaceStats>('/api/stats/user', { token });
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [token]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, gap: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
    >
      <Text style={styles.title}>Workspace Data</Text>
      <Text style={styles.subtitle}>Live snapshot of your encrypted assets.</Text>

      <Card style={styles.card}>
        <Text style={styles.cardLabel}>Ephemeral Emails</Text>
        <Text style={styles.cardValue}>{stats?.ephemeralEmails.activeCount ?? 0}</Text>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.cardLabel}>Secure Notes</Text>
        <Text style={styles.cardValue}>{stats?.secureNotes.activeCount ?? 0}</Text>
        <Text style={styles.cardHelper}>Manage vaults from the web dashboard.</Text>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.cardLabel}>Secure Files</Text>
        <Text style={styles.cardValue}>{stats?.secureFiles.activeCount ?? 0}</Text>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.cardLabel}>SMS Numbers</Text>
        <Text style={styles.cardValue}>{stats?.sms.activeNumbers ?? 0}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#6b7280', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderWidth: 0 },
  cardLabel: { color: '#71717a' },
  cardValue: { fontSize: 32, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  cardHelper: { color: '#6b7280', marginTop: 6 },
});
