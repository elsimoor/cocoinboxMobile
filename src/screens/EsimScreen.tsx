import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card } from '@/components/Card';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useIsPro } from '@/hooks/useIsPro';

interface EsimPlan {
  id: string;
  name: string;
  dataGB: number;
  validityDays: number;
  priceUSD: number;
}

interface EsimProfile {
  id: string;
  name: string;
  status: string;
  activationCode: string;
}

export default function EsimScreen() {
  const { token } = useAuth();
  const { isPro } = useIsPro();
  const [country, setCountry] = useState('FR');
  const [plans, setPlans] = useState<EsimPlan[]>([]);
  const [profiles, setProfiles] = useState<EsimProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ plans: EsimPlan[] }>(`/api/esim/plans?country=${country}`, { token });
      setPlans(res.plans || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ profiles: EsimProfile[] }>('/api/esim/profiles', { token });
      setProfiles(res.profiles || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const purchasePlan = async (planId: string) => {
    if (!token) return;
    try {
      const res = await apiRequest<{ profile: EsimProfile }>('/api/esim/purchase', {
        method: 'POST',
        token,
        body: JSON.stringify({ planId }),
      });
      Alert.alert('Plan purchased', `Activation code: ${res.profile.activationCode}`);
      await fetchProfiles();
    } catch (err: any) {
      Alert.alert('Failed to purchase', err.message);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchProfiles();
  }, [token, country]);

  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Travel eSIM</Text>
        <Text style={styles.subtitle}>Provision secure data plans in one tap.</Text>
        <Text style={styles.error}>Pro subscription required to access travel eSIM plans.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Travel eSIM</Text>
      <Text style={styles.subtitle}>Provision secure data plans in one tap.</Text>
      <TextInput value={country} onChangeText={setCountry} style={styles.input} maxLength={2} autoCapitalize="characters" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.sectionHeading}>Available Plans</Text>
      <FlatList
        data={plans}
        horizontal
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, marginBottom: 18 }}
        renderItem={({ item }) => (
          <Card style={{ width: 220 }}>
            <Text style={styles.planName}>{item.name}</Text>
            <Text style={styles.planDetail}>{item.dataGB}GB · {item.validityDays} days</Text>
            <Text style={styles.planPrice}>${item.priceUSD.toFixed(2)}</Text>
            <TouchableOpacity style={styles.planButton} onPress={() => purchasePlan(item.id)}>
              <Text style={styles.planButtonText}>Purchase</Text>
            </TouchableOpacity>
          </Card>
        )}
      />

      <Text style={styles.sectionHeading}>My Profiles</Text>
      {profiles.length === 0 ? (
        <Card><Text style={styles.helper}>No profiles yet.</Text></Card>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.planName}>{item.name}</Text>
              <Text style={styles.helper}>Status: {item.status}</Text>
              <Text style={styles.helper}>Activation: {item.activationCode}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f4f5' },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#6b7280', marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    width: 120,
    marginBottom: 16,
  },
  error: { color: '#dc2626', marginBottom: 12 },
  sectionHeading: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  planName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  planDetail: { color: '#6b7280', marginTop: 4 },
  planPrice: { fontSize: 20, fontWeight: '700', marginVertical: 8 },
  planButton: { backgroundColor: '#0ea5e9', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  planButtonText: { color: '#fff', fontWeight: '600' },
  helper: { color: '#6b7280' },
});
