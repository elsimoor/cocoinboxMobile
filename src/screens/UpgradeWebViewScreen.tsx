import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { FRONTEND_BASE_URL } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { UPGRADE_SUCCESS_PATH_KEYWORDS, UPGRADE_REFRESH_DEBOUNCE, UPGRADE_RETRY_DELAYS } from '@/config/billing';
import Toast from '@/components/Toast';

function looksLikeSuccess(url: string) {
  if (!url.startsWith(FRONTEND_BASE_URL)) return false;
  return UPGRADE_SUCCESS_PATH_KEYWORDS.some(k => url.includes(k));
}

export default function UpgradeWebViewScreen() {
  const { user, refreshUser } = useAuth();
  const [detected, setDetected] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNav = useCallback(
    async (navState: any) => {
      const url = navState?.url || '';
      if (!detected && looksLikeSuccess(url)) {
        setDetected(true);
        setToastMsg('Processing payment…');
        const now = Date.now();
        if (now - lastRefreshRef.current > UPGRADE_REFRESH_DEBOUNCE) {
          lastRefreshRef.current = now;
          await refreshUser();
          if (user?.is_pro) setToastMsg('Upgrade successful 🎉');
        }
      }
      // If user is already pro but we never detected, mark detected to show success card
      if (!detected && user?.is_pro) {
        setDetected(true);
        setToastMsg('Upgrade successful 🎉');
      }
    },
    [detected, refreshUser, user?.is_pro, user]
  );

  // Exponential backoff polling after detection but before pro flag appears
  useEffect(() => {
    if (detected && !user?.is_pro && !retryTimerRef.current) {
      const schedule = () => {
        if (user?.is_pro) {
          setToastMsg('Upgrade successful 🎉');
          return;
        }
        const attempt = retriesRef.current;
        if (attempt >= UPGRADE_RETRY_DELAYS.length) {
          setToastMsg('Still pending… will stop auto checks.');
          return;
        }
        const delay = UPGRADE_RETRY_DELAYS[attempt];
        retriesRef.current += 1;
        retryTimerRef.current = setTimeout(async () => {
          retryTimerRef.current = null;
          setToastMsg(`Checking status… (${attempt + 1})`);
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
  }, [detected, user?.is_pro, refreshUser, user]);

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: `${FRONTEND_BASE_URL}/upgrade` }}
        startInLoadingState
        onNavigationStateChange={handleNav}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" />
          </View>
        )}
      />
      <Toast message={toastMsg || ''} visible={!!toastMsg} onHide={() => { if (user?.is_pro) setToastMsg(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
