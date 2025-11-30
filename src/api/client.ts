import Constants from 'expo-constants';

const API_BASE_URL =
  Constants?.expoConfig?.extra?.apiUrl ||
  Constants?.manifest?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:4000';

const FRONTEND_BASE_URL =
  Constants?.expoConfig?.extra?.frontendUrl ||
  Constants?.manifest?.extra?.frontendUrl ||
  process.env.EXPO_PUBLIC_FRONTEND_URL ||
  'https://coco-inbox-frontend.vercel.app';

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data;
}

export { API_BASE_URL, FRONTEND_BASE_URL };
