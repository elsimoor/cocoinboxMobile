import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSms } from '@/hooks/useSms';
import { Card } from '@/components/Card';

export default function SmsScreen() {
  const { numbers, messages, loading, error, twilioConfigured, assignNumber, releaseNumber, fetchMessages } = useSms();
  const [expires, setExpires] = useState('60');
  const [selected, setSelected] = useState<string | null>(null);

  const handleAssign = async () => {
    try {
      await assignNumber(Number(expires));
    } catch (err: any) {
      Alert.alert('Unable to assign number', err.message);
    }
  };

  const handleSelect = (num: string) => {
    setSelected(num);
    fetchMessages(num);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Temporary SMS Numbers</Text>
      <Text style={styles.subtitle}>Receive verification codes and transactional SMS securely.</Text>
      {twilioConfigured === false && (
        <Text style={styles.warning}>Twilio is not configured. Add TWILIO credentials on the backend to enable SMS.</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <TextInput style={styles.input} value={expires} onChangeText={setExpires} keyboardType="number-pad" />
        <TouchableOpacity style={styles.button} onPress={handleAssign}>
          <Text style={styles.buttonText}>Get number</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={numbers}
        keyExtractor={(item) => item.id}
        horizontal
        style={{ marginBottom: 20 }}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <Card style={[styles.numberCard, selected === item.phone_number && styles.numberCardActive]}>
            <Text style={styles.numberText}>{item.phone_number}</Text>
            <Text style={styles.helper}>Expires {item.expires_at ? new Date(item.expires_at).toLocaleString() : '—'}</Text>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleSelect(item.phone_number)}>
                <Text style={styles.link}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => releaseNumber(item.id)}>
                <Text style={[styles.link, { color: '#dc2626' }]}>Release</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.helper}>No numbers assigned yet.</Text>}
      />

      <Text style={styles.sectionHeading}>Messages {selected ? `(${selected})` : ''}</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.inboxSubject}>From {item.from}</Text>
            <Text style={styles.helper}>{new Date(item.received_at).toLocaleString()}</Text>
            <Text style={{ marginTop: 8 }}>{item.body}</Text>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.helper}>Select a number to view messages.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f4f5' },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#6b7280', marginTop: 4, marginBottom: 12 },
  warning: { backgroundColor: '#fef9c3', borderRadius: 12, padding: 12, color: '#854d0e', marginBottom: 12 },
  error: { color: '#dc2626', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  button: { backgroundColor: '#0ea5e9', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600' },
  numberCard: { width: 220 },
  numberCardActive: { borderColor: '#0ea5e9' },
  numberText: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  helper: { color: '#6b7280', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  link: { color: '#0ea5e9', fontWeight: '600' },
  sectionHeading: { fontSize: 20, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  inboxSubject: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
});
