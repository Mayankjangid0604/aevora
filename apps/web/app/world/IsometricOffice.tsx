'use client';

// CompanyBuilding — multi-floor cutaway of the company (file name kept for the dynamic import in page.tsx).

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { chairmanFetch } from '../lib/api';
import { DEPARTMENTS, FLOOR_NAMES, type Department } from './office-layout';

export interface WorldEmployee {
  id: string;
  name: string;
  role: string | null;
  departmentName: string | null;
  status: string;
  activity: string;
  currentTaskTitle: string | null;
}

const DEPT_COLORS: Record<string, string> = {
  Executive: '#6366F1',
  Sales: '#10B981',
  Development: '#3B82F6',
  Marketing: '#F59E0B',
  Management: '#8B5CF6',
  'New Ventures': '#EF4444',
  'Customer Support': '#F97316',
  'Human Resources': '#A78BFA',
};

/** Fallback room for employees whose role title matches no room's role list. */
const ROOM_FOR_DEPARTMENT: Record<string, string> = {
  Executive: 'ceo',
  Sales: 'sales',
  Development: 'engineering',
  Marketing: 'marketing',
  Management: 'projects',
  'New Ventures': 'product',
  'Customer Support': 'support',
  'Human Resources': 'hr',
  Finance: 'finance',
};

function getEmployeeColor(dept: string | null): string {
  if (!dept) return '#6366F1';
  return DEPT_COLORS[dept] ?? (dept.startsWith('Venture') ? DEPT_COLORS['New Ventures'] : '#6366F1');
}

const isCeo = (e: WorldEmployee) => /\b(ceo|chief executive)\b/i.test(e.role ?? '');

/** Each employee lands in exactly one room: CEO → CEO office, then role match, then department fallback. */
function roomIdFor(e: WorldEmployee): string | null {
  if (isCeo(e)) return 'ceo';
  const role = (e.role ?? '').toLowerCase();
  if (role) {
    const hit = DEPARTMENTS.find((d) => d.employeeRoles.some((r) => role.includes(r.toLowerCase()) || r.toLowerCase().includes(role)));
    if (hit) return hit.id;
  }
  const dept = e.departmentName ?? '';
  return ROOM_FOR_DEPARTMENT[dept] ?? (dept.startsWith('Venture') ? 'product' : null);
}

// Tiny animated person
function Person({ x, y, color, activity, selected, onClick }: {
  x: number; y: number; color: string; activity: string; selected: boolean;
  onClick: (e: MouseEvent<SVGGElement>) => void;
}) {
  const [tick, setTick] = useState(0);
  const isWorking = activity === 'WORKING';
  const isWalking = activity === 'WALKING';

  useEffect(() => {
    if (!isWorking && !isWalking) return;
    const id = setInterval(() => setTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, [isWorking, isWalking]);

  const headBob = isWalking ? Math.sin(tick * 0.5) * 1.5 : 0;
  const armSwing = isWorking ? Math.sin(tick * 0.4) * 6 : 0;
  const legSwing = isWalking ? Math.sin(tick * 0.5) * 20 : 0;

  return (
    <g transform={`translate(${x}, ${y + headBob})`} style={{ cursor: 'pointer' }} onClick={onClick}>
      {selected && <circle cx="8" cy="22" r="10" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8" />}
      <ellipse cx="8" cy="26" rx="5" ry="1.5" fill="rgba(0,0,0,0.3)" />
      <rect x="4" y="12" width="8" height="10" rx="1" fill={color} opacity="0.9" />
      <circle cx="8" cy="8" r="5" fill="#FBBF24" />
      <ellipse cx="8" cy="5" rx="5" ry="2.5" fill="#1F2937" />
      <rect x="0" y="13" width="3" height="6" rx="1.5" fill={color} style={{ transformOrigin: '1.5px 13px', transform: `rotate(${armSwing}deg)` }} />
      <rect x="13" y="13" width="3" height="6" rx="1.5" fill={color} style={{ transformOrigin: '14.5px 13px', transform: `rotate(${-armSwing}deg)` }} />
      <rect x="4" y="21" width="3" height="5" rx="1.5" fill="#1F2937" style={{ transformOrigin: '5.5px 21px', transform: `rotate(${legSwing}deg)` }} />
      <rect x="9" y="21" width="3" height="5" rx="1.5" fill="#1F2937" style={{ transformOrigin: '10.5px 21px', transform: `rotate(${-legSwing}deg)` }} />
    </g>
  );
}

function ChatBubble({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const maxLen = 32;
  const display = text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
  const w = Math.max(80, display.length * 4.2 + 16);
  return (
    <g transform={`translate(${x - w / 2}, ${y - 30})`} style={{ pointerEvents: 'none' }}>
      <rect x="0" y="0" width={w} height="20" rx="4" fill="#1E1E2E" stroke={color} strokeWidth="1" />
      <polygon points={`${w / 2 - 4},20 ${w / 2 + 4},20 ${w / 2},26`} fill="#1E1E2E" stroke={color} strokeWidth="1" />
      <text x="8" y="13.5" fontSize="7.5" fill="#F0F0F0" fontFamily="Inter, sans-serif">{display}</text>
    </g>
  );
}

function RoomScreen({ x, y, w, h, color, icon, value }: {
  x: number; y: number; w: number; h: number; color: string; icon: string; value?: string;
}) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#050510" stroke={color} strokeWidth="1" opacity="0.9" />
      <rect x={x} y={y} width={w} height="2" rx="3" fill={color} opacity="0.15" />
      <text x={x + w / 2} y={y + h / 2 + (value ? 1 : 4)} textAnchor="middle" fontSize="12" fill={color} fontFamily="monospace" opacity={blink ? 1 : 0.6}>{icon}</text>
      {value && <text x={x + w / 2} y={y + h - 4} textAnchor="middle" fontSize="6" fill={color} fontFamily="Inter, sans-serif" opacity="0.8">{value}</text>}
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: 'none' }}>
      <rect x="2" y="8" width="6" height="6" rx="1" fill="#4B3010" />
      <ellipse cx="5" cy="7" rx="5" ry="6" fill="#166534" opacity="0.8" />
      <ellipse cx="3" cy="4" rx="3" ry="4" fill="#15803D" opacity="0.7" />
      <ellipse cx="7" cy="5" rx="3" ry="4" fill="#15803D" opacity="0.7" />
    </g>
  );
}

const MAX_SHOWN = 4;

function RoomPanel({ dept, x, y, w, h, employees, selectedEmpId, bubble, onEmployeeClick, onRoomClick, liveValue, active }: {
  dept: Department;
  x: number; y: number; w: number; h: number;
  employees: WorldEmployee[];
  selectedEmpId: string | null;
  bubble?: { empId: string; text: string };
  onEmployeeClick: (emp: WorldEmployee) => void;
  onRoomClick: () => void;
  liveValue?: string;
  active: boolean;
}) {
  const special = dept.id === 'ceo' || dept.id === 'chairman';
  const shown = employees.slice(0, MAX_SHOWN);
  const cols = Math.min(2, shown.length);
  const screenW = Math.min(44, w * 0.3);
  const screenH = Math.min(30, h * 0.3);
  const seat = (i: number) => ({ px: x + w * 0.42 + (i % cols) * (w * 0.24), py: y + h * 0.3 + Math.floor(i / cols) * 32 });

  return (
    <g onClick={onRoomClick} style={{ cursor: 'pointer' }}>
      <rect x={x} y={y} width={w} height={h} rx="4" fill={dept.bgColor} stroke={dept.color}
        strokeWidth={special || active ? 2 : 1} opacity={special ? 1 : 0.9} />
      {/* Floor surface */}
      <rect x={x + 2} y={y + h - 20} width={w - 4} height={16} rx="2" fill={dept.color} opacity="0.05" />

      <text x={x + w / 2} y={y + 14} textAnchor="middle" fontSize={special ? 8 : 7} fontWeight={special ? 700 : 600}
        fill={dept.color} fontFamily="DM Sans, sans-serif" letterSpacing="0.04em">
        {dept.name.toUpperCase()}
      </text>
      <text x={x + w / 2} y={y + 22} textAnchor="middle" fontSize="5.5" fill={dept.color} opacity="0.5" fontFamily="Inter, sans-serif">
        {dept.subtitle}
      </text>

      {/* Wall display — bottom-left so it never collides with the room title */}
      <RoomScreen x={x + 6} y={y + h - screenH - 8} w={screenW} h={screenH} color={dept.screenColor} icon={dept.icon} value={liveValue} />

      {/* Desks */}
      {shown.map((emp, i) => {
        const { px, py } = seat(i);
        return <rect key={`desk-${emp.id}`} x={px - w * 0.03} y={py + 18} width={w * 0.18} height={8} rx="1" fill="#8B6914" opacity="0.6" />;
      })}

      {/* People */}
      {shown.map((emp, i) => {
        const { px, py } = seat(i);
        return (
          <g key={emp.id}>
            <Person x={px} y={py} color={getEmployeeColor(emp.departmentName)} activity={emp.activity}
              selected={selectedEmpId === emp.id}
              onClick={(e) => { e.stopPropagation(); onEmployeeClick(emp); }} />
            {bubble?.empId === emp.id && <ChatBubble x={px + 8} y={py} text={bubble.text} color={dept.color} />}
          </g>
        );
      })}
      {employees.length > MAX_SHOWN && (
        <text x={x + w - 22} y={y + 34} textAnchor="end" fontSize="7" fill={dept.color} opacity="0.7" fontFamily="Inter, sans-serif">
          +{employees.length - MAX_SHOWN}
        </text>
      )}

      {dept.id === 'ceo' && (
        <rect x={x} y={y} width={w} height={h} rx="4" fill="none" stroke="#6366F1" strokeWidth="2" opacity="0.4" style={{ filter: 'blur(1px)' }} />
      )}

      {w > 80 && <Plant x={x + w - 16} y={y + h - 20} />}
    </g>
  );
}

function AtriumGlobe({ cx, cy }: { cx: number; cy: number }) {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRotation((r) => (r + 2) % 360), 50);
    return () => clearInterval(id);
  }, []);
  // Rotating meridian: an ellipse whose width follows cos(rotation).
  const meridianRx = Math.abs(Math.cos((rotation * Math.PI) / 180)) * 18;

  return (
    <g transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: 'none' }}>
      <ellipse cx="0" cy="12" rx="32" ry="6" fill="none" stroke="#6366F1" strokeWidth="1" opacity="0.3" />
      <circle cx="0" cy="-8" r="22" fill="none" stroke="#6366F1" strokeWidth="1" opacity="0.2" />
      <circle cx="0" cy="-8" r="18" fill="#0A0A1A" stroke="#6366F1" strokeWidth="1" opacity="0.8" />
      {[-6, 0, 6].map((oy) => (
        <ellipse key={oy} cx="0" cy={-8 + oy} rx={oy === 0 ? 18 : 16} ry="4" fill="none" stroke="#6366F1" strokeWidth="0.5" opacity="0.35" />
      ))}
      <ellipse cx="0" cy="-8" rx={meridianRx} ry="18" fill="none" stroke="#818CF8" strokeWidth="0.7" opacity="0.6" />
      <circle cx="0" cy="-8" r="3" fill="#6366F1" opacity="0.8" />
      <text x="0" y="24" textAnchor="middle" fontSize="7" fill="#6366F1" fontFamily="DM Sans, sans-serif" fontWeight="700" letterSpacing="0.15em" opacity="0.9">AEVORA</text>
      <text x="0" y="32" textAnchor="middle" fontSize="5" fill="#6366F1" fontFamily="Inter, sans-serif" opacity="0.5" letterSpacing="0.1em">PEOPLE · IDEAS · IMPACT</text>
    </g>
  );
}

// ---- Building geometry (viewBox 1000 × 720) ----
const W = 1000;
const H = 720;
const VIEW_TOP = 44; // trims the empty band above the top floor
const FLOOR_H = [140, 140, 160, 120]; // ground, floor 2, floor 3, top
const FLOOR_Y = [
  H - FLOOR_H[0] - 10,
  H - FLOOR_H[0] - FLOOR_H[1] - 20,
  H - FLOOR_H[0] - FLOOR_H[1] - FLOOR_H[2] - 30,
  H - FLOOR_H[0] - FLOOR_H[1] - FLOOR_H[2] - FLOOR_H[3] - 40,
];
// Perspective: floors narrow going up
const FLOOR_W = [W - 20, W - 60, W - 120, W - 200];
const FLOOR_X = [10, 30, 60, 100];
const POSITION_ORDER: Department['position'][] = ['left', 'center-left', 'center', 'center-right', 'right'];

interface PlacedRoom { dept: Department; x: number; y: number; w: number; h: number }

function layoutFloor(level: number): PlacedRoom[] {
  const rooms = DEPARTMENTS.filter((d) => d.floorLevel === level);
  const sorted = POSITION_ORDER.flatMap((p) => rooms.filter((r) => r.position === p));
  const gap = 6;
  const fw = FLOOR_W[level];
  const hasCenter = sorted.some((r) => r.position === 'center');
  const centerW = hasCenter ? Math.min(200, fw * 0.25) : 0;
  const sideCount = sorted.length - (hasCenter ? 1 : 0);
  const sideW = (fw - centerW - gap * (sorted.length - 1)) / Math.max(1, sideCount);

  let cursor = FLOOR_X[level];
  return sorted.map((dept) => {
    const w = dept.position === 'center' ? centerW : sideW;
    const room = { dept, x: cursor, y: FLOOR_Y[level], w, h: FLOOR_H[level] - 8 };
    cursor += w + gap;
    return room;
  });
}

const ALL_ROOMS: PlacedRoom[] = [0, 1, 2, 3].flatMap(layoutFloor);

const panelStyle = { position: 'absolute' as const, top: '1rem', right: '1rem', width: '220px', padding: '1rem' };
const dismissStyle = {
  display: 'block', width: '100%', marginTop: '0.75rem', padding: '6px', fontSize: 'var(--text-xs)',
  background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius)',
  color: 'var(--text-2)', cursor: 'pointer',
};
const labelStyle = { fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: '2px' };

export default function CompanyBuilding({ employees: allEmployees }: { employees: WorldEmployee[] }) {
  const employees = allEmployees.filter((e) => e.status !== 'TERMINATED');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [liveValues, setLiveValues] = useState<Record<string, string>>({});

  const loadLiveValues = useCallback(async () => {
    const [surv, leads] = await Promise.all([
      chairmanFetch<{ status?: string; currentStatus?: string; balancePaise?: number }>('/survival/status'),
      chairmanFetch<unknown[]>('/lead-gen/leads'),
    ]);
    const vals: Record<string, string> = {};
    if (surv.data) {
      if (typeof surv.data.balancePaise === 'number') vals.finance = `₹${Math.round(surv.data.balancePaise / 100).toLocaleString('en-IN')}`;
      const status = surv.data.status ?? surv.data.currentStatus;
      if (status) vals.reception = status;
    }
    if (leads.data) vals.sales = `${Array.isArray(leads.data) ? leads.data.length : 0} leads`;
    setLiveValues(vals);
  }, []);

  useEffect(() => {
    loadLiveValues();
    const t = setInterval(loadLiveValues, 15000);
    return () => clearInterval(t);
  }, [loadLiveValues]);

  const byRoom = new Map<string, WorldEmployee[]>();
  for (const e of [...employees].sort((a, b) => a.name.localeCompare(b.name))) {
    const id = roomIdFor(e);
    if (id) byRoom.set(id, [...(byRoom.get(id) ?? []), e]);
  }
  const unplaced = employees.filter((e) => !roomIdFor(e));

  // The CEO's current task shows as a speech bubble.
  const ceo = employees.find(isCeo);
  const ceoBubble = ceo?.currentTaskTitle ? { empId: ceo.id, text: ceo.currentTaskTitle } : undefined;

  const selected = employees.find((e) => e.id === selectedId) ?? null;
  const reception = ALL_ROOMS.find((r) => r.dept.id === 'reception');
  const globeX = reception ? reception.x + reception.w / 2 + 20 : W / 2;
  const globeY = reception ? reception.y + reception.h / 2 + 8 : H / 2;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ background: '#050508', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <svg width="100%" viewBox={`0 ${VIEW_TOP} ${W} ${H - VIEW_TOP}`} style={{ display: 'block', minHeight: '500px' }} role="img" aria-label="Company building cutaway">
          <rect y={VIEW_TOP} width={W} height={H - VIEW_TOP} fill="#050508" />

          {/* Building shell: slabs under each floor */}
          {[0, 1, 2, 3].map((level) => (
            <rect key={`slab-${level}`} x={FLOOR_X[level] - 4} y={FLOOR_Y[level] + FLOOR_H[level] - 6}
              width={FLOOR_W[level] + 8} height="4" rx="1" fill="rgba(99,102,241,0.18)" />
          ))}

          {/* Floor labels, above each floor */}
          {FLOOR_NAMES.map((name, level) => (
            <text key={name} x={FLOOR_X[level] + 2} y={FLOOR_Y[level] - 5} fontSize="6" fill="rgba(255,255,255,0.3)"
              fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.1em">
              {name.toUpperCase()}
            </text>
          ))}

          {ALL_ROOMS.map(({ dept, x, y, w, h }) => (
            <RoomPanel key={dept.id} dept={dept} x={x} y={y} w={w} h={h}
              employees={byRoom.get(dept.id) ?? []}
              selectedEmpId={selectedId}
              bubble={ceoBubble && dept.id === 'ceo' ? ceoBubble : undefined}
              onEmployeeClick={(emp) => { setSelectedId(selectedId === emp.id ? null : emp.id); }}
              onRoomClick={() => { setSelectedId(null); setSelectedDept(selectedDept?.id === dept.id ? null : dept); }}
              liveValue={liveValues[dept.id]}
              active={selectedDept?.id === dept.id} />
          ))}

          {/* Atrium globe sits in the reception lobby */}
          <AtriumGlobe cx={globeX} cy={globeY} />

          <text x="16" y="62" fontSize="11" fontWeight="700" fill="#6366F1" fontFamily="DM Sans, sans-serif" letterSpacing="0.2em">AEVORA</text>
          <text x="16" y="72" fontSize="6" fill="rgba(99,102,241,0.5)" fontFamily="Inter, sans-serif" letterSpacing="0.15em">AUTONOMOUS AI COMPANY</text>
          {unplaced.length > 0 && (
            <text x={W - 16} y="62" textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="Inter, sans-serif">
              {unplaced.length} employee{unplaced.length === 1 ? '' : 's'} without a room
            </text>
          )}
        </svg>
      </div>

      {selected && (
        <div className="card" style={{ ...panelStyle, background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{selected.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: '2px' }}>{selected.role ?? 'Employee'}</div>
          </div>
          <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
          <div style={labelStyle}>Department</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: '0.75rem' }}>{selected.departmentName ?? '—'}</div>
          {selected.currentTaskTitle && (
            <>
              <div style={labelStyle}>Current task</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: '0.75rem' }}>{selected.currentTaskTitle}</div>
            </>
          )}
          <span className={`badge ${selected.activity === 'WORKING' ? 'badge-success' : selected.activity === 'IN_MEETING' ? 'badge-accent' : 'badge-neutral'}`}>
            {selected.activity}
          </span>
          <button style={dismissStyle} onClick={() => setSelectedId(null)}>Dismiss</button>
        </div>
      )}

      {selectedDept && !selected && (
        <div className="card" style={panelStyle}>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: selectedDept.color, marginBottom: '4px' }}>{selectedDept.name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: '0.75rem' }}>{selectedDept.subtitle}</div>
          <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
          <div style={labelStyle}>Employees</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>{(byRoom.get(selectedDept.id) ?? []).length} active</div>
          {(byRoom.get(selectedDept.id) ?? []).map((e) => (
            <button key={e.id} onClick={() => setSelectedId(e.id)}
              style={{ display: 'block', background: 'none', border: 'none', padding: '2px 0', color: 'var(--text-2)', fontSize: 'var(--text-xs)', cursor: 'pointer', textAlign: 'left' }}>
              {e.name} · {e.role ?? 'Employee'}
            </button>
          ))}
          {liveValues[selectedDept.id] && (
            <>
              <div style={{ ...labelStyle, marginTop: '0.5rem' }}>Live</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>{liveValues[selectedDept.id]}</div>
            </>
          )}
          <button style={dismissStyle} onClick={() => setSelectedDept(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
