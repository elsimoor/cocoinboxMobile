import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useIsPro } from '@/hooks/useIsPro';
import { apiRequest } from '@/api/client';
import { Card } from '@/components/Card';
import { LinearGradient } from 'expo-linear-gradient';

interface StatsResponse {
  emails?: { activeCount: number };
  sms?: { availableNumbers: number };
  storage?: { files: number };
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { token, user, refreshUser } = useAuth();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<StatsResponse>('/api/stats/user', { token });
      setStats(data);
    } catch (err) {
      console.warn('Failed to load stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [token]);

  const { isPro, inGraceAfterDowngrade, proGraceUntil } = useIsPro();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { loadStats(); refreshUser(); }} />}
    >
      <LinearGradient colors={['#0f172a', '#1e1b4b']} style={styles.hero}>
        <Text style={styles.heroGreeting}>Hello,</Text>
        <Text style={styles.heroTitle}>{user?.name || user?.email}</Text>
        <Text style={styles.heroSubtitle}>Your secure workspace is synced across devices.</Text>
      </LinearGradient>

      <View style={styles.grid}>
        <Card style={styles.cardAccent}>
          <Text style={styles.cardLabel}>Ephemeral Emails</Text>
          <Text style={styles.cardValue}>{stats?.emails?.activeCount ?? 0}</Text>
          <Text style={styles.cardHelper}>Active aliases</Text>
        </Card>
        <Card style={styles.cardAccent}>
          <Text style={styles.cardLabel}>SMS Numbers</Text>
          <Text style={styles.cardValue}>{stats?.sms?.availableNumbers ?? 0}</Text>
          <Text style={styles.cardHelper}>Temporary numbers</Text>
        </Card>
        <Card style={styles.cardAccent}>
          <Text style={styles.cardLabel}>Secure Files</Text>
          <Text style={styles.cardValue}>{stats?.storage?.files ?? 0}</Text>
          <Text style={styles.cardHelper}>Encrypted items</Text>
        </Card>
      </View>

      {!isPro && (
        <Card style={{ backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a' }}>Upgrade for full workspace</Text>
          <Text style={{ color: '#6b7280', marginTop: 6 }}>
            Files, secure notes, SMS numbers, eSIM travel data and more are available on Pro.
          </Text>
          {inGraceAfterDowngrade && proGraceUntil && (
            <Text style={{ color: '#dc2626', marginTop: 8 }}>
              Grace period active until {proGraceUntil.toLocaleDateString()}. Upgrade to retain data access.
            </Text>
          )}
        </Card>
      )}

      {isPro && (
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Files')}>
            <Text style={styles.quickTitle}>Secure Files</Text>
            <Text style={styles.quickSubtitle}>Manage uploads</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Notes')}>
            <Text style={styles.quickTitle}>Secure Notes</Text>
            <Text style={styles.quickSubtitle}>Unlock vault</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Esim')}>
            <Text style={styles.quickTitle}>Travel eSIM</Text>
            <Text style={styles.quickSubtitle}>Buy data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Data')}>
            <Text style={styles.quickTitle}>Data View</Text>
            <Text style={styles.quickSubtitle}>Workspace snapshot</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 20, gap: 18 },
  hero: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 12,
  },
  heroGreeting: { color: '#c4b5fd', fontSize: 16 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '700', marginTop: 4 },
  heroSubtitle: { color: '#e0e7ff', marginTop: 8 },
  grid: { gap: 14 },
  cardAccent: { backgroundColor: '#fff', borderWidth: 0 },
  cardLabel: { color: '#71717a', fontSize: 14 },
  cardValue: { fontSize: 32, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  cardHelper: { color: '#6b7280' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: {
    flexBasis: '48%',
    backgroundColor: '#0ea5e9',
    borderRadius: 20,
    padding: 18,
  },
  quickTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  quickSubtitle: { color: '#e0f2fe', marginTop: 4 },
});
