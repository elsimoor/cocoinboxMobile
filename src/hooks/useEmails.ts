import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export interface MobileEphemeralEmail {
  id: string;
  email_address: string;
  alias_name?: string;
  expires_at: string;
  created_at: string;
  provider?: string;
  is_active: boolean;
}

export const useEmails = () => {
  const { token, user } = useAuth();
  const [emails, setEmails] = useState<MobileEphemeralEmail[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await apiRequest<MobileEphemeralEmail[]>(`/api/emails/user/${user.id}`, { token });
      setEmails(list || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createEmail = async (alias?: string) => {
    if (!token || !user) return;
    try {
      await apiRequest('/api/emails/create', {
        method: 'POST',
        token,
        body: JSON.stringify({ userId: user.id, aliasName: alias }),
      });
      await fetchEmails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteEmail = async (id: string) => {
    if (!token || !user) return;
    try {
      await apiRequest(`/api/emails/${id}`, {
        method: 'DELETE',
        token,
        body: JSON.stringify({ userId: user.id }),
      });
      await fetchEmails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return { emails, loading, error, createEmail, deleteEmail, refetch: fetchEmails };
};
