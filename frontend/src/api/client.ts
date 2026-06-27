import { formatArtistName } from '../utils/formatArtistName';

/** Always same-origin /api — Vite dev proxy or production server.js proxy. */
function getApiBase(): string {
  return '';
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const contentType = res.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        'Server returned HTML instead of JSON. The /api proxy is not reaching the backend — on Railway, set API_URL on the frontend service to your backend public URL (e.g. https://xxx.up.railway.app).'
      );
    }
    throw new Error(text || res.statusText || 'Unexpected response from server');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response from server');
  }
}

function isArtistRecord(record: Record<string, unknown>): boolean {
  if (typeof record.name !== 'string') return false;
  if ('username' in record) return false;
  if ('position' in record && 'artist' in record) return false;
  return (
    'rating' in record ||
    'billboard_top_10' in record ||
    'billboard_number_1' in record ||
    'albums_sold' in record ||
    'singles_sold' in record ||
    'youtube_views' in record ||
    'spotify_monthly_listeners' in record
  );
}

function normalizeArtistNames(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(normalizeArtistNames);
  if (typeof data !== 'object') return data;

  const record = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === 'name' && isArtistRecord(record)) {
      result[key] = formatArtistName(value as string);
    } else {
      result[key] = normalizeArtistNames(value);
    }
  }

  return result;
}

function getToken(): string | null {
  return localStorage.getItem('eddit_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path}`;

  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(url, { ...options, headers }).catch((e) => {
    throw new Error(
      `Could not reach the API (${url}). ${e instanceof Error ? e.message : 'network error'}`
    );
  });
  if (!res.ok) {
    const err = await parseJsonResponse<{ detail?: unknown }>(res).catch((e) => ({
      detail: e instanceof Error ? e.message : res.statusText,
    }));
    const detail = err.detail;
    let message: string;
    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      // FastAPI 422 validation errors: [{loc, msg, type}]
      message = detail
        .map((d) => (typeof d === 'object' && d !== null && 'msg' in d ? String((d as Record<string, unknown>).msg) : JSON.stringify(d)))
        .join('; ');
    } else {
      message = 'Request failed';
    }
    throw new Error(message || 'Request failed');
  }
  const data = await parseJsonResponse<T>(res);
  return normalizeArtistNames(data) as T;
}

export const api = {
  register: (data: { name: string; username: string; email: string; password: string; city?: string }) =>
    request<{ access_token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: async (username: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);
    const base = getApiBase();
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return parseJsonResponse<{ access_token: string }>(res);
  },

  me: () => request<import('../types').User>('/api/auth/me'),

  getHome: () => request<import('../types').HomeFeed>('/api/home'),
  getRankings: () => request<import('../types').Rankings>('/api/rankings'),

  getPeople: () => request<import('../types').UserPeopleItem[]>('/api/people'),

  getArtists: (skip = 0, limit = 50) =>
    request<import('../types').Artist[]>(`/api/artists?skip=${skip}&limit=${limit}`),

  getArtist: (id: string) => request<import('../types').Artist>(`/api/artists/${id}`),
  getArtistStats: (id: string) => request<import('../types').ArtistStats>(`/api/artists/${id}/stats`),

  getTeams: () => request<import('../types').Artist[]>(`/api/teams`),
  getTeam: (id: string) => request<import('../types').TeamStats>(`/api/teams/${id}`),

  getUser: (username: string) => request<import('../types').User>(`/api/users/${username}`),
  getTop5: (username: string) => request<import('../types').Top5>(`/api/users/${username}/top5`),

  updateTop5: (items: { artist_id: string; position: number }[]) =>
    request<import('../types').Top5>('/api/users/me/top5', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  joinTeam: (artist_id: string) =>
    request<{ message: string }>('/api/users/me/team', {
      method: 'POST',
      body: JSON.stringify({ artist_id }),
    }),

  search: (q: string) =>     request<import('../types').SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),

  getArguments: (target_type: string, target_id: string) =>
    request<import('../types').Argument[]>(
      `/api/arguments?target_type=${target_type}&target_id=${target_id}`
    ),

  getReplies: (argumentId: string) =>
    request<import('../types').Argument[]>(`/api/arguments/${argumentId}/replies`),

  createArgument: (data: {
    target_type: string;
    target_id: string;
    text_content?: string;
    parent_argument_id?: string;
    video_id?: string;
  }) =>
    request<import('../types').Argument>('/api/arguments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadVideo: async (blob: Blob, duration_seconds: number) => {
    const form = new FormData();
    form.append('file', blob, 'argument.webm');
    form.append('duration_seconds', String(duration_seconds));
    const token = getToken();
    const base = getApiBase();
    const res = await fetch(`${base}/api/videos/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    return parseJsonResponse<import('../types').Video>(res);
  },

  uploadProfilePhoto: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const token = getToken();
    const base = getApiBase();
    const res = await fetch(`${base}/api/users/me/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await parseJsonResponse<{ detail?: string }>(res).catch((e) => ({
        detail: e instanceof Error ? e.message : res.statusText,
      }));
      throw new Error(err.detail || 'Upload failed');
    }
    return parseJsonResponse<import('../types').User>(res);
  },

  vote: (top5_item_id: string, vote_type: 'like' | 'dislike') =>
    request<{ message: string }>('/api/votes', {
      method: 'POST',
      body: JSON.stringify({ top5_item_id, vote_type }),
    }),

  voteUserProfile: (target_user_id: string, vote_type: 'like' | 'dislike') =>
    request<{ message: string; my_vote: 'like' | 'dislike' | null }>('/api/profile-votes', {
      method: 'POST',
      body: JSON.stringify({ target_user_id, vote_type }),
    }),
};

export function getApiBaseUrl(): string {
  const base = getApiBase();
  return base || '(same-origin /api proxy)';
}

export function setToken(token: string) {
  localStorage.setItem('eddit_token', token);
}

export function clearToken() {
  localStorage.removeItem('eddit_token');
}

export function mediaUrl(path: string) {
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  return `${getApiBase()}${path}`;
}
