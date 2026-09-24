'use client';

import { useEffect, useState } from 'react';
import {
  Brain, CalendarCheck, Mail, Radar, Tags, FileText, ShieldAlert, Workflow, Settings2, X, type LucideIcon,
} from 'lucide-react';
import { chairmanFetch } from '../lib/api';
import { timeAgo } from './ui';

interface FeedItem {
  id: string;
  at: string;
  kind: string;
  outcome?: string;
  title: string;
  detail: string;
  reason?: string;
}

const KIND: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  REVIEW: { icon: Brain, color: '#a78bfa', label: 'Business review' },
  WEEKLY_REPORT: { icon: CalendarCheck, color: '#4f8cff', label: 'Weekly report' },
  FOLLOW_UP: { icon: Mail, color: '#34d399', label: 'Follow-up' },
  LEAD_GEN: { icon: Radar, color: '#22d3ee', label: 'Lead search' },
  CATEGORY: { icon: Tags, color: '#fbbf24', label: 'Lead targeting' },
  SCRIPT: { icon: FileText, color: '#fb923c', label: 'Email script' },
  ESCALATION: { icon: ShieldAlert, color: '#f87171', label: 'Needs you' },
  DECISION: { icon: Workflow, color: '#60a5fa', label: 'Decision' },
  PIPELINE: { icon: Settings2, color: '#94a3b8', label: 'Pipeline' },
};

/** Last 5 CEO actions as a timeline; click one for the full story in a slide-out panel. */
export default function CeoActivityCard() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<FeedItem | null>(null);

  useEffect(() => {
    const load = async () => {
      const r = await chairmanFetch<FeedItem[]>('/ceo/feed');
      setItems(r.data ?? []);
      setError(r.error);
    };
    load();
    window.addEventListener('aevora:ceo.activity', load);
    window.addEventListener('aevora:ceo.weekly_report', load);
    return () => {
      window.removeEventListener('aevora:ceo.activity', load);
      window.removeEventListener('aevora:ceo.weekly_report', load);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <section className="section">
      <div className="section-title">CEO activity</div>
      <div className="card" style={{ padding: 8 }}>
        {!items && <div className="card-sub" style={{ padding: 12 }}>Loading…</div>}
        {error && <div className="card-sub" style={{ padding: 12, color: 'var(--status-critical)' }}>⚠ {error}</div>}
        {items?.length === 0 && !error && (
          <div className="card-sub" style={{ padding: 12 }}>No CEO activity yet. The CEO reviews the business every simulation hour once the simulation is running.</div>
        )}
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items?.slice(0, 5).map((it, i) => {
            const k = KIND[it.kind] ?? KIND.PIPELINE;
            const Icon = k.icon;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setOpen(it)}
                  style={{
                    width: '100%', display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 12, alignItems: 'center',
                    padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer',
                    color: 'inherit', textAlign: 'left', font: 'inherit',
                    borderTop: i ? '1px solid var(--border-subtle)' : 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(79,140,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: `${k.color}1f`, color: k.color }}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="truncate" style={{ display: 'block', fontSize: '0.88rem' }}>{it.title}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{k.label}{it.outcome && it.outcome !== 'EXECUTED' ? ` · ${it.outcome.toLowerCase()}` : ''}</span>
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{timeAgo(it.at)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {open && (
        <div className="dialog-overlay" style={{ justifyContent: 'flex-end', alignItems: 'stretch' }} onClick={() => setOpen(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="ceo-activity-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(440px, 100vw)', height: '100%', overflowY: 'auto', background: 'var(--bg-elevated)',
              borderLeft: '1px solid var(--border-default)', boxShadow: 'var(--shadow-elevated)', padding: 24,
              animation: 'slide-in 0.2s ease both',
            }}
          >
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: (KIND[open.kind] ?? KIND.PIPELINE).color }}>
                {(KIND[open.kind] ?? KIND.PIPELINE).label}
              </span>
              <button className="close-btn" onClick={() => setOpen(null)} aria-label="Close"><X size={15} /></button>
            </div>
            <h3 id="ceo-activity-title" style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.35, marginBottom: 6 }}>{open.title}</h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 18 }}>
              {new Date(open.at).toLocaleString('en-IN')}{open.outcome ? ` · ${open.outcome.toLowerCase()}` : ''}
            </div>
            {open.detail.split(/\n\s*\n/).map((p, i) => (
              <p key={i} style={{ lineHeight: 1.65, marginBottom: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{p}</p>
            ))}
          </aside>
        </div>
      )}
    </section>
  );
}
