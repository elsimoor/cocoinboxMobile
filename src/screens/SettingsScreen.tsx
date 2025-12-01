import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '@/components/Card';
import { useAuth } from '@/context/AuthContext';
import { useIsPro } from '@/hooks/useIsPro';
import { apiRequest, FRONTEND_BASE_URL } from '@/api/client';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, token, signOut } = useAuth();
  const { isPro, inGraceAfterDowngrade, proGraceUntil } = useIsPro();

  const openWeb = (path: string) => Linking.openURL(`${FRONTEND_BASE_URL}${path}`);

  const deleteAccount = async () => {
    Alert.alert('Delete account', 'This permanently removes your Cocoinbox profile and encrypted data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest('/api/auth/me', { method: 'DELETE', token });
            await signOut();
          } catch (err: any) {
            Alert.alert('Unable to delete account', err.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.helper}>{user?.email}</Text>
        <Text style={styles.helper}>Plan: {isPro ? 'Pro' : inGraceAfterDowngrade ? 'Grace (expired Pro)' : 'Free'}</Text>
        {inGraceAfterDowngrade && proGraceUntil && (
          <Text style={[styles.helper, { color: '#dc2626', marginTop: 6 }]}>Grace ends {proGraceUntil.toLocaleDateString()}</Text>
        )}
        {isPro && user?.subscriptionStatus && (
          <Text style={[styles.helper, { marginTop: 6 }]}>Status: {user.subscriptionStatus}</Text>
        )}
        <View style={styles.row}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => openWeb('/subscription')}>
            <Text style={styles.primaryText}>{isPro ? 'Manage billing' : 'View plans'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
            <Text style={styles.secondaryText}>Sign out</Text>
          </TouchableOpacity>
        </View>
        {!isPro && (
          <TouchableOpacity style={[styles.primaryButton, { marginTop: 12, backgroundColor: '#1e40af' }]} onPress={() => navigation.navigate('UpgradeWeb')}>
            <Text style={styles.primaryText}>Upgrade In-App</Text>
          </TouchableOpacity>
        )}
      </Card>

      {isPro && (
        <Card>
          <Text style={styles.title}>Workspace</Text>
          <View style={styles.linkRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Files')}>
              <Text style={styles.link}>Secure Files</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Notes')}>
              <Text style={styles.link}>Secure Notes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Esim')}>
              <Text style={styles.link}>eSIM</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Data')}>
              <Text style={styles.link}>Data View</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <Card>
        <Text style={styles.title}>Security</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => openWeb('/settings')}>
          <Text style={styles.secondaryText}>Update password</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => openWeb('/2fa')}>
          <Text style={styles.secondaryText}>Configure 2FA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.destructiveButton} onPress={deleteAccount}>
          <Text style={styles.destructiveText}>Delete account</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f4f5', gap: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  helper: { color: '#6b7280' },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primaryButton: { flex: 1, backgroundColor: '#0ea5e9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondaryButton: { flex: 1, backgroundColor: '#eceff5', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: '#0f172a', fontWeight: '600' },
  destructiveButton: { marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f87171' },
  destructiveText: { color: '#b91c1c', fontWeight: '600' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  link: { color: '#2563eb', fontWeight: '600' },
});
