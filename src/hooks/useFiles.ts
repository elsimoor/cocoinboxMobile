import { useEffect, useState } from 'react';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

export interface SecureFile {
  id: string;
  filename: string;
  file_size: number;
  download_count: number;
  max_downloads?: number;
  expires_at?: string;
  created_at: string;
  watermark_enabled: boolean;
  password_protected: boolean;
}

export const useFiles = () => {
  const { token, user } = useAuth();
  const [files, setFiles] = useState<SecureFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    if (!token || !user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<SecureFile[]>(`/api/files/user/${user.id}`, { token });
      setFiles(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (id: string) => {
    if (!token) return;
    try {
      await apiRequest(`/api/files/${id}`, {
        method: 'DELETE',
        token,
        body: JSON.stringify({}),
      });
      await fetchFiles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [token, user]);

  return { files, loading, error, refresh: fetchFiles, deleteFile };
};
