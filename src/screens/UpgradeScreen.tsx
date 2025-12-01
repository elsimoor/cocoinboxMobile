import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { FRONTEND_BASE_URL } from '@/api/client';
import { UPGRADE_REFRESH_DEBOUNCE, UPGRADE_RETRY_DELAYS } from '@/config/billing';
import Toast from '@/components/Toast';

export default function UpgradeScreen() {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<any>();
  const [checking, setChecking] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const lastRefetch = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);

  const attemptRefresh = useCallback(async () => {
    if (!user?.is_pro) {
      const now = Date.now();
      if (now - lastRefetch.current < UPGRADE_REFRESH_DEBOUNCE) return;
      lastRefetch.current = now;
      setChecking(true);
      try {
        setToastMsg('Checking status…');
        await refreshUser();
        if (user?.is_pro) setToastMsg('Upgrade successful 🎉');
      } finally {
        setChecking(false);
      }
    }
  }, [refreshUser, user?.is_pro]);
  // Backoff polling if user indicates detection via deep link or manual return but still not pro
  useEffect(() => {
    if (!user?.is_pro && !retryTimerRef.current && checking) {
      const schedule = () => {
        if (user?.is_pro) {
          setToastMsg('Upgrade successful 🎉');
          return;
        }
        const attempt = retriesRef.current;
        if (attempt >= UPGRADE_RETRY_DELAYS.length) {
          setToastMsg('Upgrade pending. Please wait or refresh later.');
          return;
        }
        const delay = UPGRADE_RETRY_DELAYS[attempt];
        retriesRef.current += 1;
        retryTimerRef.current = setTimeout(async () => {
          retryTimerRef.current = null;
          setToastMsg(`Auto check ${attempt + 1}…`);
          try {
            await refreshUser();
            if (user?.is_pro) {
              setToastMsg('Upgrade successful 🎉');
              return;
            }
          } finally {
            if (!user?.is_pro) schedule();
          }
        }, delay);
      };
      schedule();
    }
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [user?.is_pro, checking, refreshUser, user]);

  // When screen gains focus, re-check status (useful after returning from browser)
  useFocusEffect(
    useCallback(() => {
      attemptRefresh();
    }, [attemptRefresh])
  );

  // When app returns to foreground, attempt refresh.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') attemptRefresh();
    });
    return () => sub.remove();
  }, [attemptRefresh]);

  const openWeb = () => {
    Linking.openURL(`${FRONTEND_BASE_URL}/upgrade`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{user?.is_pro ? 'You are Pro 🎉' : 'Upgrade to Pro'}</Text>
      <Text style={styles.sub}>
        {user?.is_pro
          ? 'All premium features are unlocked. Explore secure files, notes, SMS, eSIM data and more.'
          : 'Unlock secure files, notes, SMS numbers, eSIM travel data and more.'}
      </Text>
      {!user?.is_pro && (
        <>
          <View style={styles.perks}>
            <Text style={styles.perk}>• Encrypted file vault</Text>
            <Text style={styles.perk}>• Zero-knowledge secure notes</Text>
            <Text style={styles.perk}>• Temporary phone numbers & SMS inbox</Text>
            <Text style={styles.perk}>• Travel eSIM data packs</Text>
            <Text style={styles.perk}>• Advanced workspace stats</Text>
          </View>
          <TouchableOpacity style={styles.cta} onPress={openWeb} disabled={checking}>
            <Text style={styles.ctaText}>{checking ? 'Checking…' : 'Open in Browser'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: '#1e40af' }]}
            onPress={() => navigation.navigate('UpgradeWeb')}
            disabled={checking}
          >
            <Text style={styles.ctaText}>{checking ? 'Checking…' : 'Upgrade In-App'}</Text>
          </TouchableOpacity>
        </>
      )}
      {user && user.proGraceUntil && (
        <Text style={styles.grace}>Grace period until {new Date(user.proGraceUntil).toLocaleDateString()}</Text>
      )}
      {user?.is_pro && (
        <TouchableOpacity style={[styles.cta, { marginTop: 24 }]} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.ctaText}>Go to Dashboard</Text>
        </TouchableOpacity>
      )}
      <Toast message={toastMsg || ''} visible={!!toastMsg} onHide={() => { if (user?.is_pro) setToastMsg(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f4f4f5' },
  heading: { fontSize: 28, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  sub: { color: '#52525b', marginBottom: 18 },
  perks: { marginBottom: 24, gap: 6 },
  perk: { color: '#0f172a' },
  cta: { backgroundColor: '#0ea5e9', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  grace: { marginTop: 16, color: '#6b7280' },
});
