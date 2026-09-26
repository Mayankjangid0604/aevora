'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chairmanFetch } from '../lib/api';
import EmployeeCharacter, { type EmployeeActivity } from './EmployeeCharacter';
import { CEO_VISITOR_SPOT, ROOMS, roomForDepartment, seatsFor, toIso, type Room, type RoomType } from './office-layout';

export interface WorldEmployee {
  id: string;
  name: string;
  role: string | null;
  departmentName: string | null;
  status: string;
  activity: string;
  currentTaskTitle: string | null;
}

type Point = { x: number; y: number };

export const DEPT_COLORS: Record<string, string> = {
  Executive: '#6366F1',
  Sales: '#10B981',
  Development: '#3B82F6',
  Marketing: '#F59E0B',
  Management: '#8B5CF6',
  'New Ventures': '#EF4444',
};

const FLOOR: Record<RoomType, string> = {
  CEO_OFFICE: '#1E1B4B',
  SALES: '#064E3B',
  DEVELOPMENT: '#1E3A5F',
  MARKETING: '#451A03',
  MANAGEMENT: '#2E1065',
  COMMON: '#1C1917',
};
const WALL = '#27272A';
const WALL_TOP = '#3F3F46';
const WALL_H = 34;
const WALK_MS = 1600;
const VISIT_MS = 3000;
const BUBBLE_MS = 8000;

const isCeo = (e: WorldEmployee) => /\b(ceo|chief executive)\b/i.test(e.role ?? '');
const deptColor = (dept: string | null) => DEPT_COLORS[dept ?? ''] ?? (dept?.startsWith('Venture') ? DEPT_COLORS['New Ventures'] : '#94A3B8');
const pts = (arr: Point[]) => arr.map((p) => `${p.x},${p.y}`).join(' ');
const iso = (p: Point) => toIso(p.x, p.y);

function toActivity(a: string): EmployeeActivity {
  if (a === 'WORKING') return 'WORKING';
  if (a === 'IN_MEETING' || a === 'MEETING') return 'MEETING';
  return 'IDLE';
}

/** Stable seats: CEO at the CEO desk, everyone else in their department's room, sorted by name. */
function assignSeats(employees: WorldEmployee[]): Map<string, Point> {
  const byRoom = new Map<string, WorldEmployee[]>();
  for (const e of employees) {
    const room = isCeo(e) ? ROOMS.find((r) => r.type === 'CEO_OFFICE')! : roomForDepartment(e.departmentName);
    byRoom.set(room.id, [...(byRoom.get(room.id) ?? []), e]);
  }
  const seats = new Map<string, Point>();
  for (const [roomId, people] of byRoom) {
    const room = ROOMS.find((r) => r.id === roomId)!;
    const free = seatsFor(room);
    people
      .sort((a, b) => Number(isCeo(b)) - Number(isCeo(a)) || a.name.localeCompare(b.name))
      .forEach((e, i) => {
        // More people than desks: extra people stand in a row along the front of the room.
        const seat = free[i] ?? { x: room.x + 0.6 + ((i - free.length) % (room.w - 1)), y: room.y + room.h - 0.35 };
        seats.set(e.id, { x: seat.x + 0.35, y: seat.y + 0.2 });
      });
  }
  return seats;
}

interface Walk { id: string; from: Point; to: Point; start: number; phase: 'there' | 'visit' | 'back' }

export default function IsometricOffice({ employees }: { employees: WorldEmployee[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [walk, setWalk] = useState<Walk | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ceoBubble, setCeoBubble] = useState<{ text: string; until: number } | null>(null);
  const lastFeedId = useRef<string | null>(null);

  const people = useMemo(() => employees.filter((e) => e.status !== 'TERMINATED'), [employees]);
  const seats = useMemo(() => assignSeats(people), [people]);
  const ceo = people.find(isCeo);

  // CEO speech bubble for real events: a new item in the CEO feed.
  useEffect(() => {
    const load = async () => {
      const r = await chairmanFetch<{ id: string; title: string }[]>('/ceo/feed');
      const latest = r.data?.[0];
      if (!latest) return;
      if (lastFeedId.current && lastFeedId.current !== latest.id) setCeoBubble({ text: latest.title, until: Date.now() + BUBBLE_MS });
      lastFeedId.current = latest.id;
    };
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  // Animation clock — runs only while someone is walking or a bubble is showing.
  useEffect(() => {
    if (!walk && !ceoBubble) return;
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [walk, ceoBubble]);

  // Walk state machine: there → visit (CEO replies) → back → done.
  useEffect(() => {
    if (!walk) return;
    const elapsed = now - walk.start;
    if (walk.phase === 'there' && elapsed >= WALK_MS) {
      setWalk({ ...walk, phase: 'visit', start: now });
      setCeoBubble({ text: 'Reviewing your work…', until: now + VISIT_MS });
    } else if (walk.phase === 'visit' && elapsed >= VISIT_MS) {
      setWalk({ ...walk, phase: 'back', start: now, from: walk.to, to: walk.from });
    } else if (walk.phase === 'back' && elapsed >= WALK_MS) {
      setWalk(null);
    }
    if (ceoBubble && now > ceoBubble.until) setCeoBubble(null);
  }, [now, walk, ceoBubble]);

  const walkToCeo = useCallback(
    (id: string) => {
      const home = seats.get(id);
      if (!home || walk) return;
      setWalk({ id, from: home, to: CEO_VISITOR_SPOT, start: Date.now(), phase: 'there' });
    },
    [seats, walk],
  );

  const positionOf = (id: string): { grid: Point; walking: boolean } => {
    const home = seats.get(id)!;
    if (!walk || walk.id !== id) return { grid: home, walking: false };
    if (walk.phase === 'visit') return { grid: walk.to, walking: false };
    const t = Math.min(1, (now - walk.start) / WALK_MS);
    const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    return { grid: { x: walk.from.x + (walk.to.x - walk.from.x) * ease, y: walk.from.y + (walk.to.y - walk.from.y) * ease }, walking: true };
  };

  // Desks and people share one depth-sorted list so nearer things draw on top.
  const drawables: { key: string; depth: number; node: JSX.Element }[] = [];
  for (const room of ROOMS) {
    seatsFor(room).forEach((s, i) => drawables.push({ key: `desk-${room.id}-${i}`, depth: iso(s).y, node: <Desk key={`desk-${room.id}-${i}`} seat={s} /> }));
  }
  for (const e of people) {
    const { grid, walking } = positionOf(e.id);
    const screen = iso(grid);
    const bubble = ceo && e.id === ceo.id && ceoBubble ? ceoBubble.text : undefined;
    drawables.push({
      key: e.id,
      depth: screen.y + 0.5,
      node: (
        <EmployeeCharacter
          key={e.id}
          name={e.name}
          activity={walking ? 'WALKING' : toActivity(e.activity)}
          x={screen.x}
          y={screen.y}
          color={deptColor(e.departmentName)}
          isSelected={selected === e.id}
          bubbleText={bubble}
          onClick={() => setSelected(selected === e.id ? null : e.id)}
        />
      ),
    });
  }
  drawables.sort((a, b) => a.depth - b.depth);

  const selectedEmp = people.find((e) => e.id === selected);
  const origin = toIso(0, 0);
  const right = toIso(12, 0);
  const left = toIso(0, 6);
  const up = (p: Point) => ({ x: p.x, y: p.y - WALL_H });

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ background: '#0A0A0F', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <svg viewBox="-215 -95 630 420" width="100%" style={{ display: 'block', maxHeight: '70vh' }} role="img" aria-label="Isometric view of the SAAHVIK Tech office">
          {ROOMS.map((room) => (
            <Floor key={room.id} room={room} />
          ))}

          {/* Back walls of the building */}
          <polygon points={pts([origin, right, up(right), up(origin)])} fill={WALL} />
          <polygon points={pts([origin, left, up(left), up(origin)])} fill="#1F1F23" />
          <polyline points={pts([up(left), up(origin), up(right)])} fill="none" stroke={WALL_TOP} strokeWidth="3" />

          {drawables.map((d) => d.node)}

          {/* Labels last so furniture never hides them; they sit on each room's empty front corner. */}
          {ROOMS.map((room) => (
            <RoomLabel key={`label-${room.id}`} room={room} />
          ))}
        </svg>
      </div>

      {selectedEmp && (
        <div className="card" style={{ position: 'absolute', top: 'var(--space-4)', left: 'var(--space-4)', width: 250, padding: 'var(--space-4)' }}>
          <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{selectedEmp.name}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 2 }}>{selectedEmp.role ?? 'Employee'}</div>
            </div>
            <span className={`badge ${walk?.id === selectedEmp.id ? 'badge-accent' : selectedEmp.activity === 'WORKING' ? 'badge-success' : 'badge-neutral'}`}>
              {walk?.id === selectedEmp.id ? 'walking' : selectedEmp.activity.toLowerCase().replace(/_/g, ' ')}
            </span>
          </div>
          <div className="divider" style={{ margin: 'var(--space-2) 0' }} />
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Department</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: 'var(--space-3)' }}>{selectedEmp.departmentName ?? '—'}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Current task</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: 'var(--space-3)' }}>{selectedEmp.currentTaskTitle ?? 'None in progress'}</div>
          {!isCeo(selectedEmp) && (
            <button className="btn btn-secondary btn-block" disabled={!!walk} onClick={() => walkToCeo(selectedEmp.id)}>
              Walk to CEO office
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
        {Object.entries(DEPT_COLORS).map(([dept, color]) => (
          <span key={dept} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {dept}
          </span>
        ))}
      </div>
    </div>
  );
}

function Floor({ room }: { room: Room }) {
  const corners = [toIso(room.x, room.y), toIso(room.x + room.w, room.y), toIso(room.x + room.w, room.y + room.h), toIso(room.x, room.y + room.h)];
  const grid: JSX.Element[] = [];
  for (let i = 1; i < room.w; i++) grid.push(<line key={`c${i}`} {...line(toIso(room.x + i, room.y), toIso(room.x + i, room.y + room.h))} />);
  for (let j = 1; j < room.h; j++) grid.push(<line key={`r${j}`} {...line(toIso(room.x, room.y + j), toIso(room.x + room.w, room.y + j))} />);
  return (
    <g>
      <polygon points={pts(corners)} fill={FLOOR[room.type]} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <g stroke="rgba(255,255,255,0.04)">{grid}</g>
      {room.type === 'CEO_OFFICE' && <polygon points={pts(corners)} fill="none" stroke="#6366F1" strokeWidth="2" strokeDasharray="4 3" />}
    </g>
  );
}

const line = (a: Point, b: Point) => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });

function RoomLabel({ room }: { room: Room }) {
  const c = toIso(room.x + room.w - 0.45, room.y + room.h - 0.45);
  const text = room.name.toUpperCase();
  const w = text.length * 6 + 12;
  return (
    <g transform={`translate(${c.x}, ${c.y})`} style={{ pointerEvents: 'none' }}>
      <rect x={-w / 2} y={-8} width={w} height={14} rx="3" fill="rgba(0,0,0,0.55)" />
      <text y="2" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.75)" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.08em">
        {text}
      </text>
    </g>
  );
}

/** Small isometric desk (top + two faces) with a monitor, just behind the seat. */
function Desk({ seat }: { seat: Point }) {
  const h = 9;
  const a = toIso(seat.x, seat.y - 0.35);
  const b = toIso(seat.x + 0.7, seat.y - 0.35);
  const c = toIso(seat.x + 0.7, seat.y + 0.05);
  const d = toIso(seat.x, seat.y + 0.05);
  const top = [a, b, c, d].map((p) => ({ x: p.x, y: p.y - h }));
  const mid = toIso(seat.x + 0.35, seat.y - 0.2);
  return (
    <g style={{ pointerEvents: 'none' }}>
      <polygon points={pts([d, c, { x: c.x, y: c.y - h }, { x: d.x, y: d.y - h }])} fill="#5B4520" />
      <polygon points={pts([c, b, { x: b.x, y: b.y - h }, { x: c.x, y: c.y - h }])} fill="#4A3818" />
      <polygon points={pts(top)} fill="#8B6A2F" />
      <rect x={mid.x - 7} y={mid.y - h - 14} width="14" height="10" rx="1" fill="#0F172A" stroke="#334155" strokeWidth="0.8" />
      <rect x={mid.x - 1.5} y={mid.y - h - 4} width="3" height="3" fill="#334155" />
    </g>
  );
}
