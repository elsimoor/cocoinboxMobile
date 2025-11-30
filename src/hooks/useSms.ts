import { useEffect, useState } from 'react';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export interface MobileTempNumber {
  id: string;
  phone_number: string;
  expires_at?: string;
  is_active: boolean;
}

export interface SmsMessage {
  id: string;
  to: string;
  from: string;
  body: string;
  received_at: string;
}

export const useSms = () => {
  const { token } = useAuth();
  const [numbers, setNumbers] = useState<MobileTempNumber[]>([]);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [twilioConfigured, setTwilioConfigured] = useState<boolean | null>(null);

  const fetchNumbers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await apiRequest<MobileTempNumber[]>('/api/sms/numbers', { token });
      setNumbers(list || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (number?: string) => {
    if (!token) return;
    try {
      const query = number ? `?number=${encodeURIComponent(number)}` : '';
      const list = await apiRequest<SmsMessage[]>(`/api/sms/messages${query}`, { token });
      setMessages(list || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const assignNumber = async (expiresInMinutes?: number) => {
    if (!token) return;
    try {
      await apiRequest('/api/sms/assign', {
        method: 'POST',
        token,
        body: JSON.stringify({ expiresInMinutes }),
      });
      await fetchNumbers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const releaseNumber = async (id: string) => {
    if (!token) return;
    try {
      await apiRequest(`/api/sms/numbers/${id}`, {
        method: 'DELETE',
        token,
      });
      await fetchNumbers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const config = await apiRequest<{ twilioConfigured?: boolean }>('/api/config/public');
        setTwilioConfigured(!!config?.twilioConfigured);
      } catch {
        setTwilioConfigured(null);
      }
    })();
  }, []);

  useEffect(() => {
    fetchNumbers();
    fetchMessages();
  }, [token]);

  return {
    numbers,
    messages,
    loading,
    error,
    twilioConfigured,
    assignNumber,
    releaseNumber,
    fetchMessages,
    refetch: fetchNumbers,
  };
};
