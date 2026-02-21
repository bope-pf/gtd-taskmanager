import { API_BASE_URL } from '../constants/config';

function getPin(): string {
  return localStorage.getItem('gtd_pin') || '';
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ success: boolean; data: T | null; message: string }> {
  const pin = getPin();
  if (!pin && !path.startsWith('/auth')) {
    return { success: false, data: null, message: 'PINが設定されていません' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(pin ? { 'X-Auth-Pin': pin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    return json;
  } catch {
    return { success: false, data: null, message: 'ネットワークエラー' };
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
