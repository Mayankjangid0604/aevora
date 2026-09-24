'use client';

import { useEffect, useState } from 'react';
import { api, setToken, getToken, clearToken } from './lib/api';
import { StatusBadge, formatINRWhole, formatAC } from './components/ui';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showLogin, setShowLogin] = useState(false); // Kept for type safety if needed, but not used

  useEffect(() => {
    async function load() {
      // Auth disabled - proceed directly to fetching data
      const res = await api.overview();
      if (res.error) {
        setError(res.error);
      } else {
        setData(res.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="state-loading">Loading command center…</div>;
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
