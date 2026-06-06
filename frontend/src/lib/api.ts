const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

/**
 * Central API fetch with:
 *  - JWT Bearer token injection
 *  - CSRF header (X-Requested-With)
 *  - Auto-redirect on 401
 *  - Rate-limit (429) feedback
 */
export async function fetchApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  let propertyId = null;
  if (typeof window !== 'undefined') {
    const impersonated = localStorage.getItem('impersonated_property');
    if (impersonated) {
      try { propertyId = JSON.parse(impersonated).id; } catch (e) {}
    }
    if (!propertyId) {
      const selected = localStorage.getItem('selected_property');
      if (selected) {
        try { propertyId = JSON.parse(selected).id; } catch (e) {}
      }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(propertyId ? { 'X-Property-Id': String(propertyId) } : {}),
    ...(options.headers as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    // Network error — backend not reachable
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า Backend กำลังทำงานอยู่');
  }

  // Auto-logout on unauthorized
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  // Rate limited
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(`ระบบรับคำขอมากเกินไป กรุณารอ ${retryAfter ?? 30} วินาที`);
  }

  // Empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || `Error ${response.status}`);
  }

  return data as T;
}

/**
 * POST with JSON body — shorthand
 */
export async function postApi<T = unknown>(endpoint: string, body: unknown): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PATCH with JSON body — shorthand
 */
export async function patchApi<T = unknown>(endpoint: string, body: unknown): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE — shorthand
 */
export async function deleteApi<T = unknown>(endpoint: string): Promise<T> {
  return fetchApi<T>(endpoint, { method: 'DELETE' });
}

/**
 * POST FormData (for file uploads — slip, images)
 */
export async function uploadApi<T = unknown>(endpoint: string, formData: FormData, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
    body: formData,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Upload failed');
  return data as T;
}
