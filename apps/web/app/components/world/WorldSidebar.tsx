'use client';

import { StatusBadge } from '../ui';
import Link from 'next/link';

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
  if (!data) return <div className="world-sidebar empty">Loading World...</div>;

  const { simulation, employees, projects, alerts } = data;
  const activeEmployees = employees.length;
  const working = employees.filter((e: any) => e.activity === 'WORKING').length;
  const idle = employees.filter((e: any) => e.activity === 'IDLE').length;
  const meetings = employees.filter((e: any) => e.activity === 'IN_MEETING').length;

  const selectedEmp = selectedEmpId ? employees.find((e: any) => e.id === selectedEmpId) : null;

  return (
    <div className="world-sidebar">
      <div className="sidebar-header">
        <h3>Company World</h3>
        <StatusBadge status={simulation.status} />
      </div>

      <div className="sidebar-section">
        <h4>Simulation</h4>
        <div className="sim-controls">
          <div className="speed-buttons">
            {[1, 2, 5, 10, 50, 100].map(s => (
              <button
                key={s}
                className={simulation.speedMultiplier === s ? 'active' : ''}
                onClick={() => onAction('setSpeed', s)}
              >
                {s}x
              </button>
            ))}
          </div>
          <div className="play-pause">
            <button onClick={() => onAction('pause')} disabled={simulation.status !== 'RUNNING'}>⏸ Pause</button>
            <button onClick={() => onAction('resume')} disabled={simulation.status !== 'PAUSED'}>▶ Resume</button>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h4>Overview</h4>
        <div className="stats-grid">
          <div className="stat"><span className="label">Total</span><span className="value">{activeEmployees}</span></div>
          <div className="stat"><span className="label">Working</span><span className="value">{working}</span></div>
          <div className="stat"><span className="label">Idle</span><span className="value">{idle}</span></div>
          <div className="stat"><span className="label">Meeting</span><span className="value">{meetings}</span></div>
        </div>
        <div className="stats-grid mt-2">
          <div className="stat"><span className="label">Projects</span><span className="value">{projects?.length || 0}</span></div>
          <div className="stat"><span className="label">Alerts</span><span className="value">{alerts?.length || 0}</span></div>
        </div>
      </div>

      {selectedEmp && (
        <div className="sidebar-section selected-entity">
          <div className="flex-between">
            <h4>Inspector</h4>
            <button className="close-btn" onClick={onDeselect}>×</button>
          </div>
          <div className="entity-card">
            <div className="entity-name">{selectedEmp.name}</div>
            <div className="entity-sub">{selectedEmp.role || 'Employee'} · {selectedEmp.departmentName || 'No Dept'}</div>
            
            <div className="entity-details mt-2">
              <div className="detail-row"><span className="label">Status:</span> <StatusBadge status={selectedEmp.status} /></div>
              <div className="detail-row"><span className="label">Activity:</span> <StatusBadge status={selectedEmp.activity} /></div>
              {selectedEmp.currentTaskTitle && (
                <div className="detail-row"><span className="label">Task:</span> <span className="value truncate" title={selectedEmp.currentTaskTitle}>{selectedEmp.currentTaskTitle}</span></div>
              )}
            </div>
            
            <Link href={`/employees/${selectedEmp.id}`} className="btn btn-outline btn-sm mt-3 full-width">View Full Details</Link>
          </div>
        </div>
      )}
    </div>
  );
}
