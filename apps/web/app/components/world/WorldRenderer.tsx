'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, Sun, Moon } from 'lucide-react';
import {
  appearance, buildFloor, deptHue, Floor, GENERAL_DEPT, paintCar, paintStatic, Pt, Room,
} from './floorplan';

export const ACTIVITY_COLORS: Record<string, string> = {
  WORKING: '#4f8cff',
  IN_MEETING: '#a78bfa',
  TRAINING: '#fbbf24',
  ON_BREAK: '#fb923c',
  IDLE: '#94a3b8',
  BLOCKED: '#f87171',
  OFFLINE: '#475569',
};

const WALK_SPEED = 90; // world px / second
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

interface Person {
  id: string;
  pos: Pt;
  path: Pt[];
  angle: number;
  targetKey: string;
  roomId: string;
  seatAngle: number;
  walkPhase: number;
}

type Hover = { id: string; x: number; y: number } | null;

/** 0 = night, 1 = full daylight, from the simulation clock. */
export function daylight(date: Date) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 8 && h <= 17) return 1;
  if (h > 17 && h < 20) return 1 - (h - 17) / 3;
  if (h > 5 && h < 8) return (h - 5) / 3;
  return 0;
}

function roomFor(floor: Floor, emp: any) {
  return floor.deptRoom.get(emp.departmentName || GENERAL_DEPT) ?? floor.deptRoom.get(GENERAL_DEPT) ?? floor.rooms[0];
}

export default function WorldRenderer({
  data,
  selectedEmpId,
  onSelectEmployee,
}: {
  data: any;
  selectedEmpId: string | null;
  onSelectEmployee: (id: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1, fitted: false });
  const floorRef = useRef<Floor | null>(null);
  const cacheRef = useRef<{ canvas: HTMLCanvasElement; scale: number } | null>(null);
  const peopleRef = useRef(new Map<string, Person>());
  const dataRef = useRef<any>(data);
  const selectedRef = useRef(selectedEmpId);
  const hoverRef = useRef<Hover>(null);
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const forceNightRef = useRef<boolean | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [lightMode, setLightMode] = useState<'auto' | 'day' | 'night'>('auto');

  selectedRef.current = selectedEmpId;
  forceNightRef.current = lightMode === 'auto' ? null : lightMode === 'night';

  // ── Data → floor plan + movement targets ──
  useEffect(() => {
    dataRef.current = data;
    if (!data?.employees) return;
    const visible = data.employees.filter((e: any) => e.status === 'ACTIVE');

    const depts = new Map<string, string[]>();
    for (const d of data.departments ?? []) depts.set(d.name, []);
    for (const e of visible) {
      const name = e.departmentName || GENERAL_DEPT;
      if (!depts.has(name)) depts.set(name, []);
      depts.get(name)!.push(e.id);
    }
    if (!depts.size) depts.set(GENERAL_DEPT, []);
    for (const ids of depts.values()) ids.sort();

    const signature = [...depts.entries()].map(([n, ids]) => `${n}:${ids.join(',')}`).sort().join('|');
    let floor = floorRef.current;
    const rebuilt = !floor || (floor as any).fullSig !== signature;
    if (rebuilt) {
      floor = buildFloor(depts);
      (floor as any).fullSig = signature;
      floorRef.current = floor;
      cacheRef.current = null; // repaint static layer
    }
    const f = floor!;

    // group by activity so shared rooms hand out seats deterministically
    const shared: Record<string, Room> = {
      IN_MEETING: f.rooms.find((r) => r.kind === 'meeting')!,
      TRAINING: f.rooms.find((r) => r.kind === 'training')!,
      ON_BREAK: f.rooms.find((r) => r.kind === 'cafe')!,
      IDLE: f.rooms.find((r) => r.kind === 'cafe')!,
    };
    const used = new Map<string, number>();
    const people = peopleRef.current;
    const seen = new Set<string>();

    for (const e of [...visible].sort((a: any, b: any) => a.id.localeCompare(b.id))) {
      if (e.activity === 'OFFLINE') continue;
      seen.add(e.id);
      let room: Room;
      let spot: Pt;
      let seatAngle = Math.PI / 2;
      const sharedRoom = shared[e.activity];
      if (sharedRoom) {
        room = sharedRoom;
        const i = used.get(room.id) ?? 0;
        used.set(room.id, i + 1);
        const seat = room.seats[i];
        spot = seat ?? room.standing[(i - room.seats.length) % room.standing.length];
        seatAngle = seat?.angle ?? Math.PI / 2;
      } else {
        room = roomFor(f, e);
        const desk = f.deskByEmployee.get(e.id);
        if (desk) {
          spot = desk.seat;
          seatAngle = desk.seat.angle;
        } else {
          const i = used.get(room.id) ?? 0;
          used.set(room.id, i + 1);
          spot = room.standing[i % room.standing.length];
        }
      }
      const key = `${room.id}@${Math.round(spot.x)},${Math.round(spot.y)}`;
      const p = people.get(e.id);

      if (!p) {
        // first load: place people directly; later arrivals walk in from the entrance
        const arriving = people.size > 0 && !rebuilt;
        const lobby = f.rooms.find((r) => r.kind === 'lobby')!;
        people.set(e.id, {
          id: e.id,
          pos: arriving ? { ...f.entrance } : { ...spot },
          path: arriving ? routeBetween(f, lobby, room, spot, { x: f.entrance.x, y: 20 }) : [],
          angle: seatAngle,
          targetKey: key,
          roomId: room.id,
          seatAngle,
          walkPhase: 0,
        });
      } else if (rebuilt) {
        // the building changed shape; old coordinates are meaningless, so just seat everyone
        p.pos = { ...spot };
        p.path = [];
        p.angle = seatAngle;
        p.targetKey = key;
        p.roomId = room.id;
        p.seatAngle = seatAngle;
      } else if (p.targetKey !== key) {
        const from = f.rooms.find((r) => r.id === p.roomId) ?? room;
        p.path = routeBetween(f, from, room, spot);
        p.targetKey = key;
        p.roomId = room.id;
        p.seatAngle = seatAngle;
      }
    }
    for (const id of [...people.keys()]) if (!seen.has(id)) people.delete(id);
  }, [data]);

  // ── Render loop (set up once) ──
  useEffect(() => {
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = container.clientWidth;
      h = container.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const f = floorRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0b1018';
      ctx.fillRect(0, 0, w, h);

      if (f) {
        if (!cameraRef.current.fitted && w > 0) fit(f, w, h);
        if (!cacheRef.current) cacheRef.current = renderCache(f);
        const cam = cameraRef.current;
        const simTime = new Date(dataRef.current?.simulation?.simulationTime ?? Date.now());
        const forced = forceNightRef.current;
        const day = forced === null ? daylight(simTime) : forced ? 0 : 1;

        ctx.save();
        ctx.translate(cam.x, cam.y);
        ctx.scale(cam.zoom, cam.zoom);
        ctx.imageSmoothingQuality = 'high';
        const c = cacheRef.current;
        ctx.drawImage(c.canvas, f.bounds.x, f.bounds.y, c.canvas.width / c.scale, c.canvas.height / c.scale);

        drawTraffic(ctx, f, now / 1000, day);
        stepPeople(dt);
        drawMonitors(ctx, f, day);
        drawPeople(ctx, f, now / 1000);
        drawLighting(ctx, f, day, now / 1000);
        ctx.restore();
        drawLabels(ctx, f);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0015));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
    };

    // ── helpers (closures over ctx/size) ──
    function renderCache(f: Floor) {
      const scale = Math.min(2, 4096 / f.bounds.w, 4096 / f.bounds.h);
      const off = document.createElement('canvas');
      off.width = Math.ceil(f.bounds.w * scale);
      off.height = Math.ceil(f.bounds.h * scale);
      const octx = off.getContext('2d')!;
      octx.scale(scale, scale);
      octx.translate(-f.bounds.x, -f.bounds.y);
      paintStatic(octx, f);
      return { canvas: off, scale };
    }

    function stepPeople(dt: number) {
      for (const p of peopleRef.current.values()) {
        let budget = WALK_SPEED * dt;
        while (budget > 0 && p.path.length) {
          const t = p.path[0];
          const dx = t.x - p.pos.x;
          const dy = t.y - p.pos.y;
          const d = Math.hypot(dx, dy);
          if (d <= budget) {
            p.pos = { x: t.x, y: t.y };
            p.path.shift();
            budget -= d;
          } else {
            p.pos.x += (dx / d) * budget;
            p.pos.y += (dy / d) * budget;
            p.angle = Math.atan2(dy, dx);
            budget = 0;
          }
          p.walkPhase += dt * 11;
        }
        if (!p.path.length) {
          // settle into the seat's facing direction
          const diff = Math.atan2(Math.sin(p.seatAngle - p.angle), Math.cos(p.seatAngle - p.angle));
          p.angle += diff * Math.min(1, dt * 6);
        }
      }
    }

    function drawMonitors(ctx: CanvasRenderingContext2D, f: Floor, day: number) {
      const emps = dataRef.current?.employees ?? [];
      for (const e of emps) {
        if (e.activity !== 'WORKING' && e.activity !== 'BLOCKED') continue;
        const desk = f.deskByEmployee.get(e.id);
        const p = peopleRef.current.get(e.id);
        if (!desk || !p || p.path.length) continue;
        const m = desk.monitor;
        const color = e.activity === 'BLOCKED' ? '248,113,113' : '120,190,255';
        ctx.fillStyle = `rgba(${color},0.95)`;
        ctx.fillRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
        const glowY = desk.seat.angle > 0 ? m.y : m.y + m.h;
        const g = ctx.createRadialGradient(m.x + m.w / 2, glowY, 1, m.x + m.w / 2, glowY, 26);
        g.addColorStop(0, `rgba(${color},${0.18 + (1 - day) * 0.3})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(m.x - 26, glowY - 26, m.w + 52, 52);
      }
    }

    function drawPeople(ctx: CanvasRenderingContext2D, f: Floor, t: number) {
      const emps = new Map<string, any>((dataRef.current?.employees ?? []).map((e: any) => [e.id, e]));
      const sorted = [...peopleRef.current.values()].sort((a, b) => a.pos.y - b.pos.y);
      for (const p of sorted) {
        const e = emps.get(p.id);
        if (!e) continue;
        const look = appearance(p.id, deptHue(e.departmentName || GENERAL_DEPT));
        const moving = p.path.length > 0;
        const selected = selectedRef.current === p.id;
        const hovered = hoverRef.current?.id === p.id;
        const { x, y } = p.pos;

        if (selected || hovered) {
          const pulse = selected ? 1 + Math.sin(t * 4) * 0.12 : 1;
          ctx.beginPath();
          ctx.arc(x, y, 17 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = selected ? 'rgba(79,140,255,0.18)' : 'rgba(255,255,255,0.1)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = selected ? '#7fb0ff' : 'rgba(255,255,255,0.6)';
          ctx.stroke();
        }

        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + 2, y + 3, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle);
        if (moving) {
          // stepping feet
          const s = Math.sin(p.walkPhase) * 4;
          ctx.fillStyle = '#23262c';
          ctx.beginPath();
          ctx.ellipse(s + 2, -4, 3.5, 2.4, 0, 0, Math.PI * 2);
          ctx.ellipse(-s + 2, 4, 3.5, 2.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // shoulders + arms
        const swing = moving ? Math.sin(p.walkPhase) * 2.2 : 0;
        ctx.fillStyle = look.shirtDark;
        ctx.beginPath();
        ctx.ellipse(swing, -8.5, 3.2, 2.6, 0, 0, Math.PI * 2);
        ctx.ellipse(-swing, 8.5, 3.2, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = look.shirt;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.6, 9.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // collar
        ctx.fillStyle = look.shirtDark;
        ctx.beginPath();
        ctx.ellipse(1, 0, 3.4, 5.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // head seen from above: mostly hair, with the face peeking out at the front
        ctx.fillStyle = look.skin;
        ctx.beginPath();
        ctx.ellipse(2.4, 0, 4.6, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = look.hair;
        ctx.beginPath();
        ctx.ellipse(0.4, 0, 4.9, 4.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.14)'; // hair sheen
        ctx.beginPath();
        ctx.ellipse(-0.6, -1.6, 2.2, 1.2, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = look.skin; // nose tip
        ctx.beginPath();
        ctx.arc(6.3, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // activity status dot
        const color = ACTIVITY_COLORS[e.activity] ?? '#94a3b8';
        ctx.beginPath();
        ctx.arc(x + 8, y - 9, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(10,14,22,0.9)';
        ctx.stroke();

        if (e.activity === 'BLOCKED') {
          const by = y - 24 + Math.sin(t * 3) * 1.5;
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.roundRect(x - 6, by - 7, 12, 13, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '800 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', x, by + 3.5);
          ctx.textAlign = 'left';
        }
      }
    }

    function drawTraffic(ctx: CanvasRenderingContext2D, f: Floor, t: number, day: number) {
      const r = f.road;
      const cars = [
        { speed: 110, offset: 0, lane: 0.27, color: '#e5e7eb' },
        { speed: 140, offset: 900, lane: 0.27, color: '#b91c1c' },
        { speed: 95, offset: 400, lane: 0.73, color: '#1d4ed8' },
        { speed: 125, offset: 1500, lane: 0.73, color: '#374151' },
      ];
      for (const c of cars) {
        const dir = c.lane < 0.5 ? 1 : -1;
        const span = r.w + 200;
        const pos = ((t * c.speed + c.offset) % span + span) % span;
        const x = dir > 0 ? r.x - 100 + pos : r.x + r.w + 100 - pos;
        const y = r.y + r.h * c.lane;
        paintCar(ctx, x, y, dir > 0 ? 0 : Math.PI, c.color);
        if (day < 0.6) {
          const hx = x + dir * 34;
          const g = ctx.createRadialGradient(hx, y, 2, hx + dir * 40, y, 70);
          g.addColorStop(0, `rgba(255,240,190,${0.5 * (1 - day)})`);
          g.addColorStop(1, 'rgba(255,240,190,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(hx, y - 6);
          ctx.lineTo(hx + dir * 110, y - 34);
          ctx.lineTo(hx + dir * 110, y + 34);
          ctx.lineTo(hx, y + 6);
          ctx.fill();
        }
      }
    }

    function drawLighting(ctx: CanvasRenderingContext2D, f: Floor, day: number, t: number) {
      const dark = 1 - day;
      if (dark <= 0.01) {
        // gentle daylight from the windows
        ctx.fillStyle = 'rgba(255,244,214,0.05)';
        ctx.fillRect(0, 0, f.width, f.height);
        return;
      }
      const b = f.bounds;
      // outside: deep night; inside: lights on, only slightly dimmer
      ctx.fillStyle = `rgba(6,10,28,${0.62 * dark})`;
      ctx.beginPath();
      ctx.rect(b.x, b.y, b.w, b.h);
      ctx.rect(f.width + 12, -12, -(f.width + 24), f.height + 24); // counter-clockwise hole = building
      ctx.fill('evenodd');
      ctx.fillStyle = `rgba(10,14,34,${0.2 * dark})`;
      ctx.fillRect(-12, -12, f.width + 24, f.height + 24);

      // warm ceiling lights in occupied rooms
      const occupied = new Set([...peopleRef.current.values()].map((p) => p.roomId));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const r of f.rooms) {
        const on = occupied.has(r.id) || r.kind === 'lobby';
        if (!on) continue;
        for (let lx = r.x + 90; lx < r.x + r.w; lx += 180)
          for (let ly = r.y + 70; ly < r.y + r.h; ly += 150) {
            const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 120);
            g.addColorStop(0, `rgba(255,214,150,${0.1 * dark})`);
            g.addColorStop(1, 'rgba(255,214,150,0)');
            ctx.fillStyle = g;
            ctx.fillRect(lx - 120, ly - 120, 240, 240);
          }
      }
      // windows glow outward + street lamps
      ctx.fillStyle = `rgba(255,210,140,${0.55 * dark})`;
      for (let x = 30; x < f.width - 40; x += 64) {
        ctx.fillRect(x, -9, 42, 6);
        ctx.fillRect(x, f.height + 3, 42, 6);
      }
      for (let lx = f.road.x + 120; lx < f.road.x + f.road.w; lx += 260) {
        const ly = f.road.y - 10;
        const flicker = 0.95 + Math.sin(t * 7 + lx) * 0.05;
        const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 90);
        g.addColorStop(0, `rgba(255,220,160,${0.55 * dark * flicker})`);
        g.addColorStop(1, 'rgba(255,220,160,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - 90, ly - 90, 180, 180);
      }
      ctx.restore();
    }

    function drawLabels(ctx: CanvasRenderingContext2D, f: Floor) {
      const cam = cameraRef.current;
      const emps = new Map<string, any>((dataRef.current?.employees ?? []).map((e: any) => [e.id, e]));
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      for (const p of peopleRef.current.values()) {
        const show = cam.zoom >= 1.35 || selectedRef.current === p.id || hoverRef.current?.id === p.id;
        if (!show) continue;
        const e = emps.get(p.id);
        if (!e) continue;
        const sx = p.pos.x * cam.zoom + cam.x;
        const sy = p.pos.y * cam.zoom + cam.y + 16 * cam.zoom + 6;
        if (sx < -50 || sy < -20 || sx > w + 50 || sy > h + 20) continue;
        const text = e.name.split(' ')[0];
        const tw = ctx.measureText(text).width + 12;
        ctx.fillStyle = selectedRef.current === p.id ? 'rgba(79,140,255,0.92)' : 'rgba(10,14,22,0.78)';
        ctx.beginPath();
        ctx.roundRect(sx - tw / 2, sy - 9, tw, 17, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(text, sx, sy + 3.5);
      }
      ctx.textAlign = 'left';
    }
  }, []);

  function fit(f: Floor, w: number, h: number) {
    const pad = 60;
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min((w - pad) / (f.width + 40), (h - pad) / (f.height + 40))));
    cameraRef.current = { zoom, x: (w - f.width * zoom) / 2, y: (h - f.height * zoom) / 2, fitted: true };
  }

  function zoomAt(mx: number, my: number, factor: number) {
    const cam = cameraRef.current;
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * factor));
    const wx = (mx - cam.x) / cam.zoom;
    const wy = (my - cam.y) / cam.zoom;
    cameraRef.current = { ...cam, zoom, x: mx - wx * zoom, y: my - wy * zoom };
  }

  function personAt(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cam = cameraRef.current;
    const wx = (clientX - rect.left - cam.x) / cam.zoom;
    const wy = (clientY - rect.top - cam.y) / cam.zoom;
    let best: Person | null = null;
    let bestD = Math.max(14, 10 / cam.zoom);
    for (const p of peopleRef.current.values()) {
      const d = Math.hypot(p.pos.x - wx, p.pos.y - wy);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const cam = cameraRef.current;
    dragRef.current = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      cameraRef.current = { ...cameraRef.current, x: d.cx + dx, y: d.cy + dy };
      return;
    }
    const p = personAt(e.clientX, e.clientY);
    const rect = canvasRef.current!.getBoundingClientRect();
    const next = p ? { id: p.id, x: e.clientX - rect.left, y: e.clientY - rect.top } : null;
    hoverRef.current = next;
    setHover((prev) => (prev?.id === next?.id && (!next || Math.abs(prev!.x - next.x) + Math.abs(prev!.y - next.y) < 4) ? prev : next));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved) onSelectEmployee(personAt(e.clientX, e.clientY)?.id ?? null);
  };

  const zoomButton = (factor: number) => {
    const c = containerRef.current!;
    zoomAt(c.clientWidth / 2, c.clientHeight / 2, factor);
  };

  const hoveredEmp = hover ? data?.employees?.find((e: any) => e.id === hover.id) : null;
  const counts = (data?.employees ?? []).reduce((m: Record<string, number>, e: any) => {
    if (e.status === 'ACTIVE') m[e.activity] = (m[e.activity] ?? 0) + 1;
    return m;
  }, {});

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { hoverRef.current = null; setHover(null); }}
        style={{ display: 'block', cursor: hover ? 'pointer' : 'grab', touchAction: 'none' }}
        role="img"
        aria-label="Company office floor plan showing employees and what they are doing"
      />

      {!data && <div className="world-hud top-left"><div className="hud-pill">Loading the office…</div></div>}

      <div className="world-hud top-right">
        <button className="hud-btn" title={`Lighting: ${lightMode}`} aria-label={`Lighting mode ${lightMode}, click to change`}
          onClick={() => setLightMode((m) => (m === 'auto' ? 'day' : m === 'day' ? 'night' : 'auto'))}>
          {lightMode === 'night' ? <Moon size={16} /> : <Sun size={16} style={{ opacity: lightMode === 'auto' ? 0.6 : 1 }} />}
        </button>
      </div>

      <div className="world-hud bottom-right">
        <button className="hud-btn" aria-label="Zoom in" onClick={() => zoomButton(1.25)}><Plus size={16} /></button>
        <button className="hud-btn" aria-label="Zoom out" onClick={() => zoomButton(0.8)}><Minus size={16} /></button>
        <button className="hud-btn" aria-label="Fit office to view"
          onClick={() => { const c = containerRef.current!; if (floorRef.current) fit(floorRef.current, c.clientWidth, c.clientHeight); }}>
          <Maximize2 size={15} />
        </button>
      </div>

      <div className="world-legend" aria-hidden="true">
        {Object.entries(ACTIVITY_COLORS).map(([act, color]) => (
          <div key={act} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: color, color }} />
            {act.replace('_', ' ').toLowerCase()} <span style={{ opacity: 0.55 }}>{counts[act] ?? 0}</span>
          </div>
        ))}
      </div>

      {hover && hoveredEmp && (
        <div className="world-tooltip" style={{ left: hover.x, top: hover.y }}>
          <div className="tt-name">{hoveredEmp.name}</div>
          <div className="tt-sub">{hoveredEmp.role || 'Employee'} · {hoveredEmp.departmentName || GENERAL_DEPT}</div>
          <div className="tt-sub" style={{ color: ACTIVITY_COLORS[hoveredEmp.activity] }}>
            {hoveredEmp.activity.replace('_', ' ').toLowerCase()}
            {hoveredEmp.currentTaskTitle ? ` — ${hoveredEmp.currentTaskTitle.slice(0, 40)}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

/** Walk out of the current room, along corridors (via the spine if needed), into the target room. */
function routeBetween(f: Floor, from: Room, to: Room, target: Pt, start?: Pt): Pt[] {
  if (from.id === to.id && !start) return [target];
  const path: Pt[] = [];
  if (start) path.push(start);
  path.push(from.doorInside, { x: from.door.x, y: from.corridorY });
  if (from.corridorY !== to.corridorY) {
    path.push({ x: f.spineX, y: from.corridorY }, { x: f.spineX, y: to.corridorY });
  }
  path.push({ x: to.door.x, y: to.corridorY }, to.doorInside, target);
  return path;
}
