/** Admin session helpers: token storage and an authenticated fetch. */

import { config } from '@/lib/config';

const KEY = 'airquiz.adminToken';

export const getAdminToken = (): string | null => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setAdminToken = (token: string | null) => {
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable (private mode) — session simply won't persist */
  }
};

export async function adminLogin(password: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${config.apiUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAdminToken((await res.json()).token);
      return { ok: true };
    }
    if (res.status === 429) return { ok: false, message: 'Too many attempts. Wait a few minutes and try again.' };
    return { ok: false, message: 'Incorrect password.' };
  } catch {
    return { ok: false, message: 'Cannot reach the AirQuiz server. Is it running?' };
  }
}

/** fetch() with the admin token attached. A 401 clears the session and sends the teacher to login. */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAdminToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${config.apiUrl}${path}`, { ...init, headers });
  if (res.status === 401) {
    setAdminToken(null);
    window.location.assign('/admin');
  }
  return res;
}

export const adminDownloadUrl = (path: string): string =>
  `${config.apiUrl}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(getAdminToken() ?? '')}`;
