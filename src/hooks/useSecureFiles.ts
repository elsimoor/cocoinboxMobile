import { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL, apiRequest } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { encryptBytes } from '@/lib/crypto';
import { bytesToBase64, base64ToBytes } from '@/lib/base64';

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

export const useSecureFiles = () => {
  const { token, user } = useAuth();
  const [files, setFiles] = useState<SecureFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const fetchFiles = async () => {
    if (!token || !user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await apiRequest<SecureFile[]>(`/api/files/user/${user.id}`, { token });
      setFiles(list || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [token]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
    if (result.type === 'cancel') return null;
    setSelectedFile(result.assets?.[0] ?? null);
    return result.assets?.[0] ?? null;
  };

  const uploadFile = async (password: string, options: { expiresAt?: string; maxDownloads?: number }) => {
    if (!token || !user || !selectedFile) return;
    setError(null);
    setLoading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, { encoding: FileSystem.EncodingType.Base64 });
      const bytes = base64ToBytes(base64);
      const encrypted = await encryptBytes(bytes, password);

      const uploadUrlRes = await apiRequest<{ storagePath: string; uploadUrl: string }>('/api/files/upload-url', {
        method: 'POST',
        token,
        body: JSON.stringify({ filename: selectedFile.name, contentType: 'application/octet-stream' }),
      });

      const tempUri = FileSystem.cacheDirectory + `${Date.now()}-enc.bin`;
      await FileSystem.writeAsStringAsync(tempUri, bytesToBase64(encrypted.data), { encoding: FileSystem.EncodingType.Base64 });

      await FileSystem.uploadAsync(uploadUrlRes.uploadUrl, tempUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      await FileSystem.deleteAsync(tempUri, { idempotent: true });

      await apiRequest('/api/files/create', {
        method: 'POST',
        token,
        body: JSON.stringify({
          filename: selectedFile.name,
          storagePath: uploadUrlRes.storagePath,
          fileSize: encrypted.data.length,
          passwordProtected: true,
          password,
          expiresAt: options.expiresAt,
          maxDownloads: options.maxDownloads,
          watermarkEnabled: selectedFile.mimeType?.startsWith('image/'),
          iv: encrypted.iv,
          salt: encrypted.salt,
          algo: encrypted.algo,
          kdfIterations: encrypted.kdfIterations,
        }),
      });

      await fetchFiles();
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = async (fileId: string) => {
    if (!token) return;
    setError(null);
    try {
      await apiRequest(`/api/files/${fileId}`, {
        method: 'DELETE',
        token,
        body: JSON.stringify({}),
      });
      await fetchFiles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return { files, selectedFile, loading, error, pickFile, uploadFile, removeFile };
};
