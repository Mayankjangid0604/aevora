import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:13000';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ConnectedDevice {
  id: string;
  type: string;
  name: string | null;
  status: string;
  lastSeen: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiPost(path: string, body: any, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiPost('/auth/login', { actorId: email, credential: password });
      localStorage.setItem('aevora_token', data.access_token);
      onLogin(data.access_token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">AEVORA</div>
        <div className="subtitle">Windows Command Center</div>
        <form onSubmit={handleLogin}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error-msg">{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="hint">Connected to: {API_BASE}</div>
      </div>
    </div>
  );
}

// ── Dashboard Screen ──────────────────────────────────────────────────────────
function DashboardScreen({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [pairingCode, setPairingCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [connected, setConnected] = useState(true);
  const [countdown, setCountdown] = useState(0);

  const fetchDevices = useCallback(async () => {
    try {
      const data = await apiGet('/devices', token);
      setDevices(data);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 15000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  // Countdown timer for pairing code
  useEffect(() => {
    if (!pairingCode) return;
    const expiry = new Date(pairingCode.expiresAt).getTime();
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        setPairingCode(null);
        clearInterval(tick);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [pairingCode]);

  const generatePairingCode = async () => {
    setPairingLoading(true);
    try {
      const data = await apiPost('/devices/pairing/generate', {}, token);
      setPairingCode(data);
      setCountdown(600); // 10 min
    } catch (e: any) {
      alert('Failed to generate pairing code: ' + e.message);
    } finally {
      setPairingLoading(false);
    }
  };

  const revokeDevice = async (deviceId: string) => {
    if (!confirm('Revoke this device?')) return;
    try {
      await fetch(`${API_BASE}/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDevices();
    } catch (e: any) {
      alert('Failed to revoke: ' + e.message);
    }
  };

  return (
    <div className="dash-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">AEVORA</div>
        <nav className="nav">
          <div className="nav-item active">🖥 Dashboard</div>
          <div className="nav-item">📱 Devices</div>
          <div className="nav-item">🔔 Notifications</div>
          <div className="nav-item">📊 Analytics</div>
          <div className="nav-item">⚙️ Settings</div>
        </nav>
        <button className="logout-btn" onClick={onLogout}>Sign Out</button>
      </div>

      {/* Main */}
      <div className="main">
        {/* Top bar */}
        <div className="topbar">
          <h1 className="page-title">Chairman Control Center</h1>
          <div className={`status-badge ${connected ? 'connected' : 'offline'}`}>
            <span className="status-dot"></span>
            {connected ? 'API Connected' : 'Offline'}
          </div>
        </div>

        {/* Cards */}
        <div className="cards-grid">

          {/* Pairing Card */}
          <div className="card">
            <h2 className="card-title">📱 Pair Android Device</h2>
            <p className="card-meta">Generate a code on this Windows app, then enter it in the AEVORA Android app.</p>

            {pairingCode ? (
              <div className="pairing-display">
                <div className="pairing-code">{pairingCode.code}</div>
                <div className="pairing-timer">Expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</div>
                <button className="btn-secondary" onClick={() => setPairingCode(null)}>Cancel</button>
              </div>
            ) : (
              <button className="btn-primary" onClick={generatePairingCode} disabled={pairingLoading}>
                {pairingLoading ? 'Generating...' : 'Generate Pairing Code'}
              </button>
            )}
          </div>

          {/* Devices Card */}
          <div className="card">
            <h2 className="card-title">🖥 Connected Devices</h2>
            {devices.length === 0 ? (
              <p className="card-meta">No devices connected yet. Pair your Android device above.</p>
            ) : (
              <div className="device-list">
                {devices.map((d) => (
                  <div key={d.id} className="device-row">
                    <div>
                      <div className="device-name">{d.name || d.type}</div>
                      <div className="device-meta">
                        Last seen: {new Date(d.lastSeen).toLocaleString()}
                      </div>
                    </div>
                    <div className="device-actions">
                      <span className={`status-pill ${d.status.toLowerCase()}`}>{d.status}</span>
                      <button className="btn-danger-sm" onClick={() => revokeDevice(d.id)}>Revoke</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-secondary" onClick={fetchDevices} style={{ marginTop: 12 }}>
              ↻ Refresh
            </button>
          </div>

          {/* API Status Card */}
          <div className="card">
            <h2 className="card-title">🔗 Backend Status</h2>
            <div className="card-meta">
              <div>URL: <code>{API_BASE}</code></div>
              <div style={{ marginTop: 8 }}>Status: <strong style={{ color: connected ? '#22c55e' : '#ef4444' }}>{connected ? '✓ Online' : '✗ Offline'}</strong></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aevora_token'));

  const handleLogout = () => {
    localStorage.removeItem('aevora_token');
    setToken(null);
  };

  if (!token) return <LoginScreen onLogin={setToken} />;
  return <DashboardScreen token={token} onLogout={handleLogout} />;
}
