const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  errors?: Array<{ field: string; message: string }>;

  constructor(message: string, status: number, errors?: Array<{ field: string; message: string }>) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (res.status === 403) {
    throw new ApiError('Access Denied', 403);
  }

  // Handle file downloads
  const contentType = res.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('text/csv') || contentType.includes('application/octet-stream'))) {
    const blob = await res.blob();
    return blob as unknown as T;
  }

  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new ApiError(
      json.error || json.message || 'Request failed',
      res.status,
      json.errors,
    );
  }
  return json;
}

export async function downloadFile(path: string, filename: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });

  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const json = await res.json();
      message = json.message || json.error || message;
    } catch {
      // response body was not JSON — keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export { API_BASE };
