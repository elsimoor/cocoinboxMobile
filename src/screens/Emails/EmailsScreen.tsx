import React, { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '@/components/Card';
import { useEmails } from '@/hooks/useEmails';
import { useNavigation } from '@react-navigation/native';

export default function EmailsScreen() {
  const [alias, setAlias] = useState('');
  const navigation = useNavigation<any>();
  const { emails, loading, error, createEmail, deleteEmail, refetch } = useEmails();

  const handleCreate = async () => {
    try {
      await createEmail(alias || undefined);
      setAlias('');
    } catch (err: any) {
      Alert.alert('Unable to create email', err.message);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete email', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteEmail(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ephemeral Emails</Text>
        <Text style={styles.subtitle}>Create Mailchimp-powered inboxes or freemium aliases.</Text>
      </View>

      <View style={styles.actions}>
        <TextInput placeholder="Alias (optional)" style={styles.input} value={alias} onChangeText={setAlias} />
        <TouchableOpacity style={styles.button} onPress={handleCreate}>
          <Text style={styles.buttonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={emails}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.email}>{item.email_address}</Text>
            <Text style={styles.helper}>
              {item.provider === 'mailchimp' ? 'Mailchimp inbox' : 'Freemium address'} · Expires{' '}
              {new Date(item.expires_at).toLocaleString()}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => navigation.navigate('EmailDetail', { emailId: item.id })}>
                <Text style={styles.link}>Open inbox</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={[styles.link, { color: '#dc2626' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.helper}>No emails yet. Create one above.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f4f5' },
  header: { marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#6b7280', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  input: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  button: { backgroundColor: '#0ea5e9', paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  email: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  helper: { color: '#6b7280', marginTop: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  link: { color: '#0284c7', fontWeight: '600' },
  error: { color: '#dc2626', marginBottom: 8 },
});
