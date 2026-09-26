'use client';

// Company World — walkable Three.js office (public/office/Aevora_Office_3D_v3.html) in an iframe.
// The office posts CLICK_ROOM / ROOM_ENTER / OFFICE_READY; this page answers with live company data.
// The CSS 3D building lives on at /world-classic as the lightweight fallback.

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowsOut, Pause, Play } from '@phosphor-icons/react';
import { chairmanFetch } from '../lib/api';
import { DEPARTMENTS, FLOOR_NAMES, getEmployeeColor, groupByRoom, type Department, type WorldEmployee } from './office-layout';
import { useLiveValues } from './useLiveValues';

interface WorldData {
  simulation: { status: string; currentTick: number };
  employees: WorldEmployee[];
}
interface OfficeMessage { source: 'aevora-office'; type: string; data?: { key?: string; name?: string } }

const OFFICE_SRC = '/office/Aevora_Office_3D_v3.html';
/** Office zone key (e.g. ENGINEERING_IT) → department, derived from the department names. */
const zoneKey = (n: string) => n.toUpperCase().replace(/[^A-Z]+/g, '_').replace(/^_|_$/g, '');
const DEPT_BY_ZONE = new Map(DEPARTMENTS.map((d) => [zoneKey(d.name), d]));

const CONTROLS = [
  ['Overview / Walk', 'switch camera (or double-click the building)'],
  ['Drag · scroll', 'orbit and zoom'],
  ['W A S D', 'walk, Shift to run'],
  ['Click a room', 'live department data'],
  ['Esc', 'back to overview'],
];

export default function WorldPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<WorldData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [room, setRoom] = useState<{ key: string; name: string } | null>(null);
  const [here, setHere] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const liveValues = useLiveValues();

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

  useEffect(() => {
    function onMessage(e: MessageEvent<OfficeMessage>) {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.source !== 'aevora-office') return;
      const { type, data: d } = e.data;
      if (type === 'OFFICE_READY') setReady(true);
      if (type === 'ROOM_ENTER') setHere(d?.name ?? '');
      if (type === 'CLICK_ROOM' && d?.key) { setRoom({ key: d.key, name: d.name ?? d.key }); setPersonId(null); }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const status = data?.simulation.status ?? 'STOPPED';
  async function toggleSim() {
    setBusy(true);
    const path = status === 'RUNNING' ? '/simulation/pause' : status === 'PAUSED' ? '/simulation/resume' : '/simulation/start';
    const r = await chairmanFetch(path, { method: 'POST' });
    if (r.error) setError(r.error);
    await load();
    setBusy(false);
  }

  function focusRoom(key: string) {
    frameRef.current?.contentWindow?.postMessage({ target: 'aevora-office', type: 'FOCUS_ZONE', data: { key } }, window.location.origin);
  }

  const employees = (data?.employees ?? []).filter((e) => e.status !== 'TERMINATED');
  const { byRoom } = groupByRoom(employees);
  const dept: Department | undefined = room ? DEPT_BY_ZONE.get(room.key) : undefined;
  const people = dept ? byRoom.get(dept.id) ?? [] : [];
  const person = employees.find((e) => e.id === personId) ?? null;

  return (
    <>
      <div className="page-header flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">Company World</h1>
          <p className="page-desc">
            {employees.length} employees · walk through AEVORA HQ and click a room for live data
            {here ? ` · you are in: ${here}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className={`badge ${status === 'RUNNING' ? 'badge-success' : 'badge-neutral'}`}>{status.toLowerCase()}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
            Tick {(data?.simulation.currentTick ?? 0).toLocaleString()}
          </span>
          <button className="btn btn-secondary" onClick={toggleSim} disabled={busy || !data}>
            {status === 'RUNNING' ? <><Pause size={14} aria-hidden="true" /> Pause</> : <><Play size={14} aria-hidden="true" /> {status === 'PAUSED' ? 'Resume' : 'Start'}</>}
          </button>
          <button className="btn btn-secondary" onClick={() => viewRef.current?.requestFullscreen?.()} aria-label="Full screen" title="Full screen">
            <ArrowsOut size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && <div className="state-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      <div ref={viewRef} style={{ position: 'relative', height: 'max(560px, calc(100vh - 220px))', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', background: '#161826' }}>
        <iframe ref={frameRef} src={OFFICE_SRC} title="AEVORA HQ — walkable 3D office" style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />

        {!ready && (
          <div className="state-loading" style={{ position: 'absolute', inset: 0, background: '#161826', color: '#a5a0ff', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.3em', fontSize: 'var(--text-xl)' }}>AEVORA</div>
            <div style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.15em' }}>BUILDING THE 3D OFFICE…</div>
          </div>
        )}

        {room && (
          <aside className="card" aria-label={`${room.name} details`} style={{ position: 'absolute', top: 12, right: 12, width: 260, maxHeight: 'calc(100% - 24px)', overflowY: 'auto', padding: 'var(--space-4)', zIndex: 2 }}>
            {person ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{person.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: 'var(--space-3)' }}>{person.role ?? 'Employee'}</div>
                <Field label="Department" value={person.departmentName ?? '—'} />
                {person.currentTaskTitle && <Field label="Current task" value={person.currentTaskTitle} />}
                <span className={`badge ${person.activity === 'WORKING' ? 'badge-success' : person.activity === 'IN_MEETING' ? 'badge-accent' : 'badge-neutral'}`}>
                  {person.activity.toLowerCase().replace('_', ' ')}
                </span>
                <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setPersonId(null)}>Back to {room.name.toLowerCase()}</button>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: dept?.color ?? 'var(--text)' }}>{dept?.name ?? titleCase(room.name)}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: 'var(--space-3)' }}>{dept?.subtitle ?? 'Shared space'}</div>
                {dept && <Field label="Floor (classic view)" value={FLOOR_NAMES[dept.floorLevel]} />}
                {dept && liveValues[dept.id] && <Field label="Live" value={liveValues[dept.id]} />}
                {dept && (
                  <>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: 2 }}>Employees</div>
                    {people.length === 0 && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>Nobody assigned yet</div>}
                    {people.map((e) => (
                      <button key={e.id} type="button" onClick={() => setPersonId(e.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '3px 0', border: 0, background: 'none', color: 'var(--text-2)', fontSize: 'var(--text-xs)', textAlign: 'left', cursor: 'pointer' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: getEmployeeColor(e.departmentName) }} />
                        {e.name} · {e.role ?? 'Employee'}
                        <span style={{ marginLeft: 'auto', color: e.activity === 'WORKING' ? 'var(--success)' : 'var(--text-3)' }}>{e.activity.toLowerCase().replace('_', ' ')}</span>
                      </button>
                    ))}
                  </>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => focusRoom(room.key)}>Fly here</button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRoom(null)}>Dismiss</button>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2) var(--space-6)', marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
        {CONTROLS.map(([k, d]) => (
          <span key={k}><strong style={{ color: 'var(--text)' }}>{k}</strong> <span style={{ color: 'var(--text-3)' }}>{d}</span></span>
        ))}
        <Link href="/world-classic" style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>Classic view (lighter)</Link>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: 'var(--space-3)' }}>{value}</div>
    </>
  );
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
