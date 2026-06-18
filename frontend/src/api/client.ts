const API_BASE = '';

function getToken(): string | null {
  return localStorage.getItem('eddit_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  register: (data: { name: string; username: string; email: string; password: string; city?: string }) =>
    request<{ access_token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: async (username: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json() as Promise<{ access_token: string }>;
  },

  me: () => request<import('../types').User>('/api/auth/me'),

  getHome: () => request<import('../types').HomeFeed>('/api/home'),
  getRankings: () => request<import('../types').Rankings>('/api/rankings'),

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
    const res = await fetch(`${API_BASE}/api/videos/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json() as Promise<import('../types').Video>;
  },

  vote: (top5_item_id: string, vote_type: 'like' | 'dislike') =>
    request<{ message: string }>('/api/votes', {
      method: 'POST',
      body: JSON.stringify({ top5_item_id, vote_type }),
    }),
};

export function setToken(token: string) {
  localStorage.setItem('eddit_token', token);
}

export function clearToken() {
  localStorage.removeItem('eddit_token');
}

export function mediaUrl(path: string) {
  if (path.startsWith('http')) return path;
  return path;
}
