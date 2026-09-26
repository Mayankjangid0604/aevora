'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { Pause, Play } from '@phosphor-icons/react';
import { chairmanFetch } from '../lib/api';
import type { WorldEmployee } from './IsometricOffice';

interface WorldData {
  simulation: { status: string; currentTick: number };
  employees: WorldEmployee[];
}

const IsometricOffice = dynamic(() => import('./IsometricOffice'), {
  ssr: false,
  loading: () => <div className="state-loading" style={{ height: 480 }}>Loading office…</div>,
});

const TIPS = [
  { title: 'Click an employee', desc: 'See their role, department and current task.' },
  { title: 'Walk to CEO', desc: 'Send the selected employee to the CEO office and back.' },
  { title: 'Chat bubbles', desc: 'New CEO actions appear as a speech bubble above ARIA.' },
];

export default function WorldPage() {
  const [data, setData] = useState<WorldData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await chairmanFetch<WorldData>('/chairman/world');
    if (r.data) setData(r.data);
    setError(r.error);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const status = data?.simulation.status ?? 'STOPPED';

  async function toggleSim() {
    setBusy(true);
    const path = status === 'RUNNING' ? '/simulation/pause' : status === 'PAUSED' ? '/simulation/resume' : '/simulation/start';
    const r = await chairmanFetch(path, { method: 'POST' });
    if (r.error) setError(r.error);
    await load();
    setBusy(false);
  }

  const people = data?.employees.filter((e) => e.status !== 'TERMINATED') ?? [];

  return (
    <>
      <div className="page-header flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">Company World</h1>
          <p className="page-desc">{people.length} employees — click any person to see their work</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className={`badge ${status === 'RUNNING' ? 'badge-success' : 'badge-neutral'}`}>{status.toLowerCase()}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
            Tick {(data?.simulation.currentTick ?? 0).toLocaleString()}
          </span>
          <button className="btn btn-secondary" onClick={toggleSim} disabled={busy || !data}>
            {status === 'RUNNING' ? <><Pause size={14} aria-hidden="true" /> Pause</> : <><Play size={14} aria-hidden="true" /> {status === 'PAUSED' ? 'Resume' : 'Start'}</>}
          </button>
        </div>
      </div>

      {error && <div className="state-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      {data ? <IsometricOffice employees={data.employees} /> : <div className="state-loading" style={{ height: 480 }}>Loading office…</div>}

      <section className="section" style={{ marginTop: 'var(--space-6)' }}>
        <div className="section-title">How to use</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          {TIPS.map((tip) => (
            <div key={tip.title} className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text)', marginBottom: 'var(--space-1)' }}>{tip.title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>{tip.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
