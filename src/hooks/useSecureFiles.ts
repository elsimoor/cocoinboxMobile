import { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
// Use legacy API to avoid runtime errors on Expo SDK 54
import * as FileSystem from 'expo-file-system/legacy';
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
  const [encryptProgress, setEncryptProgress] = useState(0);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const log = (msg: string, extra?: any) => {
    const ts = new Date().toISOString();
    const line = extra !== undefined ? `${ts} | ${msg} | ${JSON.stringify(extra)}` : `${ts} | ${msg}`;
    setDebugLogs((prev) => [...prev, line]);
    // Also emit to console for Metro logs
    // eslint-disable-next-line no-console
    console.log('[SecureFiles]', line);
  };

  const fetchFiles = async () => {
    if (!token || !user) return;
    setLoading(true);
    setError(null);
    try {
      log('Fetching files list', { userId: user.id });
      const list = await apiRequest<SecureFile[]>(`/api/files/user/${user.id}`, { token });
      setFiles(list || []);
      log('Fetched files count', { count: list?.length ?? 0 });
    } catch (err: any) {
      setError(err.message);
      log('Fetch files failed', { message: err.message, stack: err.stack });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [token]);

  const pickFile = async () => {
    log('Opening document picker');
    // Ensure we get a file:// URI by copying to cache
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.type === 'cancel') return null;
    const asset = result.assets?.[0] ?? null;
    if (asset) {
      try {
        const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
        const scheme = asset.uri.startsWith('file://') ? 'file' : (asset.uri.startsWith('content://') ? 'content' : 'other');
        log('Picked file', { name: asset.name, uri: asset.uri, scheme, mimeType: asset.mimeType, size: info.size });
      } catch (e: any) {
        log('Failed to get picked file info', { message: e.message });
      }
    }
    setSelectedFile(asset);
    return asset;
  };

  const uploadFile = async (password: string, options: { expiresAt?: string; maxDownloads?: number }) => {
    if (!token || !user || !selectedFile) return;
    setError(null);
    setLoading(true);
    try {
      log('Starting upload', { filename: selectedFile.name, uri: selectedFile.uri, mimeType: selectedFile.mimeType });
      try {
        const pickedInfo = await FileSystem.getInfoAsync(selectedFile.uri, { size: true });
        log('Picked file info', { size: pickedInfo.size });
      } catch (e: any) {
        log('Picked file info failed', { message: e.message });
      }

      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, { encoding: FileSystem.EncodingType.Base64 });
      log('Read file as base64', { length: base64.length });
      const bytes = base64ToBytes(base64);
      log('Converted base64 to bytes', { length: bytes.length });
      setEncryptProgress(0);
      const encrypted = await encryptBytes(bytes, password, undefined, (f)=> {
        setEncryptProgress(f);
        // Only log on notable thresholds to reduce noise
        const pct = Math.round(f * 100);
        if (pct % 10 === 0) log('Encrypt progress', { percent: pct });
      });
      log('Encryption complete', { algo: encrypted.algo, kdfIterations: encrypted.kdfIterations, outLen: encrypted.data.length });

      const uploadUrlRes = await apiRequest<{ storagePath: string; uploadUrl: string }>('/api/files/upload-url', {
        method: 'POST',
        token,
        body: JSON.stringify({ filename: selectedFile.name, contentType: 'application/octet-stream' }),
      });
      log('Obtained upload URL', { storagePath: uploadUrlRes.storagePath });

      const tempUri = FileSystem.cacheDirectory + `${Date.now()}-enc.bin`;
      const b64 = bytesToBase64(encrypted.data);
      try {
        await FileSystem.writeAsStringAsync(tempUri, b64, { encoding: FileSystem.EncodingType.Base64 as any });
        log('Wrote encrypted temp file (enum encoding)', { tempUri });
      } catch (_) {
        // Fallback for environments where EncodingType enum is unavailable
        await FileSystem.writeAsStringAsync(tempUri, b64, { encoding: 'base64' as any });
        log('Wrote encrypted temp file (string encoding fallback)', { tempUri });
      }

      try {
        const tempInfo = await FileSystem.getInfoAsync(tempUri, { size: true });
        log('Temp file info', { size: tempInfo.size });
      } catch (e: any) {
        log('Temp file info failed', { message: e.message });
      }

      const uploadRes = await FileSystem.uploadAsync(uploadUrlRes.uploadUrl, tempUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      log('Upload response', { status: uploadRes.status });
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
      log('Deleted temp file', { tempUri });

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
      log('Create metadata success');

      await fetchFiles();
      log('Refreshed files after upload');
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message);
      log('Upload failed', { message: err.message, stack: err.stack });
    } finally {
      setLoading(false);
      setEncryptProgress(0);
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

  // Expose debugLogs to aid troubleshooting
  return { files, selectedFile, loading, error, encryptProgress, pickFile, uploadFile, removeFile, debugLogs };
};
