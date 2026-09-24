'use client';

import { useEffect, useState } from 'react';
import { api } from './lib/api';
import CeoActivityCard from './components/CeoActivityCard';
import AskCeoCard from './components/AskCeoCard';
import { StatusBadge, formatINRWhole, formatAC } from './components/ui';
import {
  Landmark, Coins, TrendingUp, Receipt, Scale, Users, FolderKanban, AlertTriangle, Gavel, Hourglass, Banknote,
  type LucideIcon,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
        <p>Chairman overview <StatusBadge status={data.company?.status || 'UNKNOWN'} /></p>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Treasury"
          icon={Landmark}
          value={data.treasury?.realMoney !== null ? formatINRWhole(data.treasury.realMoney) : null}
          className="money"
        />
        <MetricCard
          label="AC Treasury"
          icon={Coins}
          value={data.treasury?.ac !== null ? formatAC(data.treasury.ac) : null}
          className="ac"
        />
        <MetricCard
          label="Revenue"
          icon={TrendingUp}
          value={fin ? formatINRWhole(fin.realizedRevenue) : null}
          sub={fin ? `Expected: ${formatINRWhole(fin.expectedRevenue)}` : undefined}
          className="money"
        />
        <MetricCard
          label="Expenses"
          icon={Receipt}
          value={fin ? formatINRWhole(fin.paidExpenses) : null}
          className="danger"
        />
        <MetricCard
          label="Operating Result"
          icon={Scale}
          value={fin ? formatINRWhole(fin.operatingResult) : null}
          className={fin && fin.operatingResult >= 0 ? 'money' : 'danger'}
        />
        <MetricCard
          label="Employees"
          icon={Users}
          value={`${data.employees?.active ?? '—'}`}
          sub={`${data.employees?.total ?? 0} total`}
          className="info"
        />
        <MetricCard
          label="Active Projects"
          icon={FolderKanban}
          value={`${data.projects?.active ?? '—'}`}
          sub={`${data.projects?.total ?? 0} total`}
          className="info"
        />
        <MetricCard
          label="Alerts"
          icon={AlertTriangle}
          value={`${data.alerts ?? '—'}`}
          className={data.alerts > 0 ? 'danger' : 'info'}
        />
        <MetricCard
          label="Pending Decisions"
          icon={Gavel}
          value={`${data.pendingDecisions ?? '—'}`}
          className={data.pendingDecisions > 0 ? 'danger' : 'info'}
        />
        <MetricCard
          label="Runway"
          icon={Hourglass}
          value={fin?.runway || 'INSUFFICIENT_DATA'}
          className="info"
        />
        <MetricCard
          label="Cash Position"
          icon={Banknote}
          value={fin ? formatINRWhole(fin.cashPosition) : null}
          className="money"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
        <CeoActivityCard />
        <AskCeoCard />
      </div>
    </>
  );
}

function MetricCard({ label, icon: Icon, value, sub, className }: {
  label: string;
  icon: LucideIcon;
  value: string | null;
  sub?: string;
  className?: string;
}) {
  return (
    <div className="card">
      <div className="card-label"><Icon size={14} aria-hidden="true" />{label}</div>
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
