import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/api/client';
import { Card } from '@/components/Card';

interface InboundMessage {
  id: string;
  from: string;
  subject?: string;
  text?: string;
  received_at: string;
}

interface SentMessage {
  id?: string;
  to: string;
  subject: string;
  text?: string;
  sent_at: string;
}

interface ThreadResponse {
  email: { id: string; email_address: string; provider?: string };
  inbound: InboundMessage[];
  sent: SentMessage[];
  meta: {
    inboundPage: number;
    inboundLimit: number;
    inboundTotal: number;
    sentPage: number;
    sentLimit: number;
    sentTotal: number;
  };
}

export default function EmailDetailScreen() {
  const route = useRoute<RouteProp<{ params: { emailId: string } }, 'params'>>();
  const { token } = useAuth();
  const emailId = route.params?.emailId;
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const loadThread = async (nextInbound?: number, nextSent?: number) => {
    if (!token || !emailId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        inboundPage: String(nextInbound ?? thread?.meta.inboundPage ?? 1),
        sentPage: String(nextSent ?? thread?.meta.sentPage ?? 1),
      });
      const data = await apiRequest<ThreadResponse>(`/api/emails/${emailId}/messages?${params.toString()}`, { token });
      setThread(data);
    } catch (err: any) {
      Alert.alert('Unable to load inbox', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!token || !emailId) return;
    if (!composeTo || !composeSubject || !composeBody) {
      Alert.alert('Please fill in recipient, subject, and message body.');
      return;
    }
    try {
      await apiRequest('/api/mail/send', {
        method: 'POST',
        token,
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          text: composeBody,
          fromEmailId: emailId,
        }),
      });
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      await loadThread();
    } catch (err: any) {
      Alert.alert('Unable to send message', err.message);
    }
  };

  useEffect(() => {
    loadThread();
  }, [emailId, token]);

  const inboundTotalPages = thread ? Math.max(1, Math.ceil(thread.meta.inboundTotal / thread.meta.inboundLimit)) : 1;
  const sentTotalPages = thread ? Math.max(1, Math.ceil(thread.meta.sentTotal / thread.meta.sentLimit)) : 1;

  return (
    <FlatList
      style={styles.container}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>{thread?.email.email_address || 'Mailbox'}</Text>
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Compose</Text>
            <TextInput placeholder="Recipient email" style={styles.input} value={composeTo} onChangeText={setComposeTo} />
            <TextInput placeholder="Subject" style={styles.input} value={composeSubject} onChangeText={setComposeSubject} />
            <TextInput
              placeholder="Message"
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              multiline
              value={composeBody}
              onChangeText={setComposeBody}
            />
            <TouchableOpacity style={styles.button} onPress={handleSend}>
              <Text style={styles.buttonText}>Send</Text>
            </TouchableOpacity>
          </Card>
          <Text style={styles.sectionHeading}>Inbox</Text>
        </>
      }
      data={thread?.inbound || []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.inboxSubject}>{item.subject || '(No subject)'}</Text>
          <Text style={styles.inboxMeta}>From {item.from} · {new Date(item.received_at).toLocaleString()}</Text>
          <Text style={styles.inboxBody}>{item.text || '(No body)'}</Text>
        </Card>
      )}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadThread()} />}
      ListFooterComponent={
        <>
          <View style={styles.paginationRow}>
            <TouchableOpacity onPress={() => loadThread(Math.max(1, (thread?.meta.inboundPage || 1) - 1))} disabled={(thread?.meta.inboundPage || 1) <= 1}>
              <Text style={styles.link}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.helper}>
              Page {thread?.meta.inboundPage || 1} / {inboundTotalPages}
            </Text>
            <TouchableOpacity
              onPress={() => loadThread(Math.min(inboundTotalPages, (thread?.meta.inboundPage || 1) + 1))}
              disabled={(thread?.meta.inboundPage || 1) >= inboundTotalPages}
            >
              <Text style={styles.link}>Next</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeading}>Sent</Text>
          {(thread?.sent || []).map((msg) => (
            <Card key={msg.id || msg.sent_at} style={{ marginBottom: 12 }}>
              <Text style={styles.inboxSubject}>{msg.subject}</Text>
              <Text style={styles.inboxMeta}>To {msg.to} · {new Date(msg.sent_at).toLocaleString()}</Text>
              <Text style={styles.inboxBody}>{msg.text || '(No body)'}</Text>
            </Card>
          ))}
          <View style={styles.paginationRow}>
            <TouchableOpacity onPress={() => loadThread(undefined, Math.max(1, (thread?.meta.sentPage || 1) - 1))} disabled={(thread?.meta.sentPage || 1) <= 1}>
              <Text style={styles.link}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.helper}>
              Page {thread?.meta.sentPage || 1} / {sentTotalPages}
            </Text>
            <TouchableOpacity
              onPress={() => loadThread(undefined, Math.min(sentTotalPages, (thread?.meta.sentPage || 1) + 1))}
              disabled={(thread?.meta.sentPage || 1) >= sentTotalPages}
            >
              <Text style={styles.link}>Next</Text>
            </TouchableOpacity>
          </View>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5', padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  sectionHeading: { fontSize: 20, fontWeight: '700', marginVertical: 16, color: '#0f172a' },
  inboxSubject: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  inboxMeta: { color: '#6b7280', marginTop: 4 },
  inboxBody: { marginTop: 8, color: '#0f172a' },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  link: { color: '#3b82f6', fontWeight: '600' },
  helper: { color: '#6b7280' },
});
