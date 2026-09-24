'use client';

import Link from 'next/link';
import { Pause, Play, Users, Briefcase, Coffee, Presentation, FolderKanban, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../ui';
import { ACTIVITY_COLORS } from './WorldRenderer';
import { appearance, deptHue, GENERAL_DEPT } from './floorplan';

export default function WorldSidebar({
  data,
  selectedEmpId,
  onDeselect,
  onAction,
}: {
  data: any;
  selectedEmpId: string | null;
  onDeselect: () => void;
  onAction: (action: string, payload?: any) => void;
}) {
  if (!data) return <div className="world-sidebar empty">Loading world…</div>;

  const { simulation, projects, alerts } = data;
  const employees = (data.employees ?? []).filter((e: any) => e.status === 'ACTIVE');
  const by = (a: string) => employees.filter((e: any) => e.activity === a).length;
  const simTime = simulation?.simulationTime ? new Date(simulation.simulationTime) : null;

  const depts = new Map<string, { total: number; working: number }>();
  for (const e of employees) {
    const d = depts.get(e.departmentName || GENERAL_DEPT) ?? { total: 0, working: 0 };
    d.total++;
    if (e.activity === 'WORKING') d.working++;
    depts.set(e.departmentName || GENERAL_DEPT, d);
  }

  const selectedEmp = selectedEmpId ? data.employees.find((e: any) => e.id === selectedEmpId) : null;
  const look = selectedEmp ? appearance(selectedEmp.id, deptHue(selectedEmp.departmentName || GENERAL_DEPT)) : null;

  return (
    <div className="world-sidebar">
      <div className="sidebar-header">
        <div>
          <h3>Company World</h3>
          {simTime && (
            <div className="world-clock">
              {simTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
              {simTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <StatusBadge status={simulation?.status ?? 'UNKNOWN'} />
      </div>

      {selectedEmp && look && (
        <div className="sidebar-section selected-entity">
          <div className="flex-between" style={{ marginBottom: 10 }}>
            <h4 style={{ margin: 0 }}>Inspector</h4>
            <button className="close-btn" onClick={onDeselect} aria-label="Close inspector">×</button>
          </div>
          <div className="entity-card">
            <div className="entity-head">
              <div className="entity-avatar" style={{ background: look.shirt, boxShadow: `0 0 0 3px ${ACTIVITY_COLORS[selectedEmp.activity] ?? '#94a3b8'}` }}>
                {selectedEmp.name.split(' ').map((s: string) => s[0]).slice(0, 2).join('')}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="entity-name truncate">{selectedEmp.name}</div>
                <div className="entity-sub truncate">{selectedEmp.role || 'Employee'} · {selectedEmp.departmentName || GENERAL_DEPT}</div>
              </div>
            </div>
            <div className="entity-details mt-3">
              <div className="detail-row"><span className="label">Status</span><StatusBadge status={selectedEmp.status} /></div>
              <div className="detail-row"><span className="label">Activity</span><StatusBadge status={selectedEmp.activity} /></div>
              {selectedEmp.currentTaskTitle && (
                <div className="detail-row"><span className="label">Task</span><span className="truncate" title={selectedEmp.currentTaskTitle}>{selectedEmp.currentTaskTitle}</span></div>
              )}
            </div>
            <Link href={`/employees/${selectedEmp.id}`} className="btn btn-outline btn-sm mt-3 full-width">View full profile</Link>
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <h4>Simulation</h4>
        <div className="sim-controls">
          <div className="speed-buttons" role="group" aria-label="Simulation speed">
            {[1, 2, 5, 10, 50, 100].map((s) => (
              <button key={s} className={simulation?.speedMultiplier === s ? 'active' : ''} onClick={() => onAction('setSpeed', s)}>
                {s}×
              </button>
            ))}
          </div>
          <div className="play-pause">
            <button onClick={() => onAction('pause')} disabled={simulation?.status !== 'RUNNING'}><Pause size={14} /> Pause</button>
            <button onClick={() => onAction('resume')} disabled={simulation?.status !== 'PAUSED'}><Play size={14} /> Resume</button>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h4>Right now</h4>
        <div className="stats-grid">
          <Stat icon={<Users size={13} />} label="On site" value={employees.filter((e: any) => e.activity !== 'OFFLINE').length} />
          <Stat icon={<Briefcase size={13} color={ACTIVITY_COLORS.WORKING} />} label="Working" value={by('WORKING')} />
          <Stat icon={<Presentation size={13} color={ACTIVITY_COLORS.IN_MEETING} />} label="In meetings" value={by('IN_MEETING')} />
          <Stat icon={<Coffee size={13} color={ACTIVITY_COLORS.ON_BREAK} />} label="On break / idle" value={by('ON_BREAK') + by('IDLE')} />
          <Stat icon={<FolderKanban size={13} />} label="Active projects" value={projects?.length ?? 0} />
          <Stat icon={<AlertTriangle size={13} color={alerts?.length ? '#f87171' : undefined} />} label="Alerts" value={alerts?.length ?? 0} />
        </div>
      </div>

      <div className="sidebar-section">
        <h4>Departments</h4>
        <div className="dept-list">
          {[...depts.entries()].sort((a, b) => b[1].total - a[1].total).map(([name, d]) => (
            <div key={name} className="dept-row">
              <span className="truncate">{name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{d.working}/{d.total}</span>
              <div className="bar" title={`${d.working} of ${d.total} working`}>
                <span style={{ width: `${(d.working / Math.max(1, d.total)) * 100}%`, background: `hsl(${deptHue(name)} 65% 60%)` }} />
              </div>
            </div>
          ))}
          {!depts.size && <div className="card-sub">No active employees yet</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="stat">
      <span className="label">{icon}{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}
