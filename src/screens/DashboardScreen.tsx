import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useIsPro } from '@/hooks/useIsPro';
import { apiRequest } from '@/api/client';
import { Card } from '@/components/Card';
import { GlassCard } from '@/components/GlassCard';
import { GradientBackground } from '@/components/GradientBackground';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Pressable } from 'react-native';

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
    <View style={styles.container}>
      <GradientBackground style={StyleSheet.absoluteFillObject as any} />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { loadStats(); refreshUser(); }} />}>
        <LinearGradient colors={['#0ea5e9', '#6366f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroGreeting}>Hello,</Text>
          <Text style={styles.heroTitle}>{user?.name || user?.email}</Text>
          <Text style={styles.heroSubtitle}>Your secure workspace is synced across devices.</Text>
        </LinearGradient>

        <View style={styles.grid}>
          <GlassCard style={styles.cardAccent}>
            <Text style={styles.cardLabel}>Ephemeral Emails</Text>
            <Text style={styles.cardValue}>{stats?.emails?.activeCount ?? 0}</Text>
            <Text style={styles.cardHelper}>Active aliases</Text>
          </GlassCard>
          <GlassCard style={styles.cardAccent}>
            <Text style={styles.cardLabel}>SMS Numbers</Text>
            <Text style={styles.cardValue}>{stats?.sms?.availableNumbers ?? 0}</Text>
            <Text style={styles.cardHelper}>Temporary numbers</Text>
          </GlassCard>
          <GlassCard style={styles.cardAccent}>
            <Text style={styles.cardLabel}>Secure Files</Text>
            <Text style={styles.cardValue}>{stats?.storage?.files ?? 0}</Text>
            <Text style={styles.cardHelper}>Encrypted items</Text>
          </GlassCard>
        </View>

        {!isPro && (
          <GlassCard style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>Upgrade for full workspace</Text>
            <Text style={{ color: '#475569', marginTop: 6 }}>
              Files, secure notes, SMS numbers, eSIM travel data and more are available on Pro.
            </Text>
            {inGraceAfterDowngrade && proGraceUntil && (
              <Text style={{ color: '#dc2626', marginTop: 8 }}>
                Grace period active until {proGraceUntil.toLocaleDateString()}. Upgrade to retain data access.
              </Text>
            )}
          </GlassCard>
        )}

        {isPro && (
          <View style={styles.quickGrid}>
            {[
              { t: 'Secure Files', s: 'Manage uploads', nav: 'Files', colors: ['#0ea5e9', '#6366f1'] as const },
              { t: 'Secure Notes', s: 'Unlock vault', nav: 'Notes', colors: ['#22c55e', '#06b6d4'] as const },
              { t: 'Travel eSIM', s: 'Buy data', nav: 'Esim', colors: ['#f59e0b', '#ef4444'] as const },
              { t: 'Data View', s: 'Workspace snapshot', nav: 'Data', colors: ['#8b5cf6', '#6366f1'] as const },
            ].map((q, idx) => (
              <TouchableOpacity key={idx} onPress={() => navigation.navigate(q.nav as any)} style={{ flexBasis: '48%' }}>
                <LinearGradient colors={q.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickCard}>
                  <Text style={styles.quickTitle}>{q.t}</Text>
                  <Text style={styles.quickSubtitle}>{q.s}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
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
