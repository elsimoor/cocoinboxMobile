import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>C</Text>
      <Text style={styles.title}>Cocoinbox</Text>
      <Text style={styles.subtitle}>Encrypted mailboxes, SMS, notes, and files in one workspace.</Text>
      <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.primaryText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.secondaryText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0f172a' },
  logo: { fontSize: 64, color: '#38bdf8', fontWeight: '700', marginBottom: 8 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700' },
  subtitle: { color: '#cbd5f5', textAlign: 'center', marginVertical: 16 },
  primary: { backgroundColor: '#38bdf8', borderRadius: 16, paddingVertical: 16, width: '100%', marginBottom: 12 },
  primaryText: { color: '#0f172a', textAlign: 'center', fontWeight: '700' },
  secondary: { borderRadius: 16, borderWidth: 1, borderColor: '#475569', paddingVertical: 16, width: '100%' },
  secondaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
