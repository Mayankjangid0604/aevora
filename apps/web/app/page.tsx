'use client';

import { useEffect, useState } from 'react';
import { api, setToken, getToken, clearToken } from './lib/api';
import { StatusBadge, formatINRWhole, formatAC } from './components/ui';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showLogin, setShowLogin] = useState(false);
  const [actorId, setActorId] = useState('');
  const [credential, setCredential] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    async function load() {
      const token = getToken();
      if (!token) {
        setShowLogin(true);
        setLoading(false);
        return;
      }

      const res = await api.overview();
      if (res.error) {
        if (res.error.includes('401') || res.error.includes('Unauthorized')) {
          clearToken();
          setShowLogin(true);
          setError(null);
        } else {
          setError(res.error);
        }
      } else {
        setData(res.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId, credential })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        setShowLogin(false);
        setLoading(true);
        const overviewRes = await api.overview();
        if (overviewRes.error) {
          setError(overviewRes.error);
        } else {
          setData(overviewRes.data);
        }
        setLoading(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        setLoginError(errData.message || 'Login failed');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Network error');
    }
  };

  if (loading) return <div className="state-loading">Loading command center…</div>;
  if (showLogin) return (
    <div className="login-container" style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto', background: '#1e1e1e', borderRadius: '8px' }}>
      <h2>System Login</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <input 
          type="text" 
          placeholder="Actor ID" 
          value={actorId} 
          onChange={e => setActorId(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #333', background: '#2d2d2d', color: '#fff' }}
        />
        <input 
          type="password" 
          placeholder="Credential" 
          value={credential} 
          onChange={e => setCredential(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #333', background: '#2d2d2d', color: '#fff' }}
        />
        <button type="submit" style={{ padding: '0.75rem', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Authenticate
        </button>
        {loginError && <div style={{ color: '#f44336', fontSize: '0.9rem' }}>{loginError}</div>}
      </form>
    </div>
  );
  if (error) return <div className="state-error">⚠ {error}</div>;
  if (!data) return <div className="state-empty">No data available</div>;

  const fin = data.financials;

  return (
    <>
      <div className="page-header">
        <h2>{data.company?.name || 'AEVORA'}</h2>
        <p>Company Status: <StatusBadge status={data.company?.status || 'UNKNOWN'} /></p>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="💰 Treasury"
          value={data.treasury?.realMoney !== null ? formatINRWhole(data.treasury.realMoney) : null}
          className="money"
        />
        <MetricCard
          label="🟣 AC Treasury"
          value={data.treasury?.ac !== null ? formatAC(data.treasury.ac) : null}
          className="ac"
        />
        <MetricCard
          label="📈 Revenue"
          value={fin ? formatINRWhole(fin.realizedRevenue) : null}
          sub={fin ? `Expected: ${formatINRWhole(fin.expectedRevenue)}` : undefined}
          className="money"
        />
        <MetricCard
          label="💸 Expenses"
          value={fin ? formatINRWhole(fin.paidExpenses) : null}
          className="danger"
        />
        <MetricCard
          label="📊 Operating Result"
          value={fin ? formatINRWhole(fin.operatingResult) : null}
          className={fin && fin.operatingResult >= 0 ? 'money' : 'danger'}
        />
        <MetricCard
          label="👥 Employees"
          value={`${data.employees?.active ?? '—'}`}
          sub={`${data.employees?.total ?? 0} total`}
          className="info"
        />
        <MetricCard
          label="📁 Active Projects"
          value={`${data.projects?.active ?? '—'}`}
          sub={`${data.projects?.total ?? 0} total`}
          className="info"
        />
        <MetricCard
          label="⚠️ Alerts"
          value={`${data.alerts ?? '—'}`}
          className={data.alerts > 0 ? 'danger' : 'info'}
        />
        <MetricCard
          label="🔴 Pending Decisions"
          value={`${data.pendingDecisions ?? '—'}`}
          className={data.pendingDecisions > 0 ? 'danger' : 'info'}
        />
        <MetricCard
          label="⏳ Runway"
          value={fin?.runway || 'INSUFFICIENT_DATA'}
          className="info"
        />
        <MetricCard
          label="💵 Cash Position"
          value={fin ? formatINRWhole(fin.cashPosition) : null}
          className="money"
        />
      </div>
    </>
  );
}

function MetricCard({ label, value, sub, className }: {
  label: string;
  value: string | null;
  sub?: string;
  className?: string;
}) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      {value !== null ? (
        <>
          <div className={`card-value ${className || ''}`}>{value}</div>
          {sub && <div className="card-sub">{sub}</div>}
        </>
      ) : (
        <div className="card-unavailable">Unavailable</div>
      )}
    </div>
  );
}
