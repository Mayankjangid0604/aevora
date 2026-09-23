const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let _jwtToken: string | null = null;

export function setToken(token: string) {
  _jwtToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('aevora_jwt', token);
  }
}

export function getToken(): string | null {
  if (_jwtToken) return _jwtToken;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('aevora_jwt');
    if (stored) {
      _jwtToken = stored;
      return _jwtToken;
    }
  }
  return null;
}

export function clearToken() {
  _jwtToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('aevora_jwt');
  }
}

interface FetchOptions {
  method?: string;
  body?: any;
  chairmanId?: string;
}

export async function chairmanFetch<T = any>(path: string, opts: FetchOptions = {}): Promise<{ data: T | null; error: string | null; loading: false }> {
  try {
    const token = getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { data: null, error: errBody.message || `HTTP ${res.status}`, loading: false };
    }

    const data = await res.json();
    return { data, error: null, loading: false };
  } catch (e: any) {
    return { data: null, error: e.message || 'Network error', loading: false };
  }
}

// ── Typed API helpers ──

export const api = {
  overview: () => chairmanFetch('/chairman/overview'),
  financials: () => chairmanFetch('/chairman/financials'),
  employees: () => chairmanFetch('/chairman/employees'),
  employee: (id: string) => chairmanFetch(`/chairman/employees/${id}`),
  projects: () => chairmanFetch('/chairman/projects'),
  project: (id: string) => chairmanFetch(`/chairman/projects/${id}`),
  departments: () => chairmanFetch('/chairman/departments'),
  alerts: () => chairmanFetch('/chairman/alerts'),
  decisions: () => chairmanFetch('/chairman/decisions'),
  activity: () => chairmanFetch('/chairman/activity'),
  simulation: () => chairmanFetch('/chairman/simulation'),
  world: () => chairmanFetch('/chairman/world'),

  approveDecision: (id: string) => chairmanFetch(`/chairman/decisions/${id}/approve`, { method: 'POST' }),
  rejectDecision: (id: string) => chairmanFetch(`/chairman/decisions/${id}/reject`, { method: 'POST' }),

  pauseSimulation: () => chairmanFetch('/chairman/simulation/pause', { method: 'POST' }),
  resumeSimulation: () => chairmanFetch('/chairman/simulation/resume', { method: 'POST' }),
  setSimulationSpeed: (speed: number) => chairmanFetch('/chairman/simulation/speed', { method: 'POST', body: { speed } }),

  // Communication (Phase 10)
  conversations: () => chairmanFetch('/chairman/communication/conversations'),
  conversation: (id: string) => chairmanFetch(`/chairman/communication/conversations/${id}`),
  meetings: () => chairmanFetch('/chairman/communication/meetings'),
  meeting: (id: string) => chairmanFetch(`/chairman/communication/meetings/${id}`),
  notifications: () => chairmanFetch('/chairman/communication/notifications'),

  // Knowledge (Phase 11)
  knowledge: () => chairmanFetch('/chairman/knowledge'),
  knowledgeRecord: (id: string) => chairmanFetch(`/chairman/knowledge/${id}`),
  knowledgeProvenance: (id: string) => chairmanFetch(`/chairman/knowledge/${id}/provenance`),
  validateKnowledge: (id: string, result: 'SUPPORTED' | 'UNSUPPORTED', reason?: string) => chairmanFetch(`/chairman/knowledge/${id}/validate`, { method: 'POST', body: { result, reason } }),
};
