// Office floor plan: generated from the company's real departments, painted once to an offscreen cache.

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Seat extends Pt { angle: number } // angle = direction the seated person faces

export type RoomKind = 'lobby' | 'meeting' | 'training' | 'office' | 'cafe';

export interface Desk extends Rect { seat: Seat; monitor: Rect }

export interface Room extends Rect {
  id: string;
  name: string;
  kind: RoomKind;
  hue: number;
  door: Pt;          // center of the doorway, on the wall
  doorInside: Pt;    // a step inside the room from the door
  corridorY: number; // center line of the corridor this room opens onto
  seats: Seat[];     // non-desk seats (meeting chairs, sofas, cafe chairs…)
  desks: Desk[];
  standing: Pt[];    // overflow spots
}

export interface Floor {
  width: number;
  height: number;
  rooms: Room[];
  corridors: Rect[];
  spineX: number;                    // x of the vertical hallway connecting corridors
  deptRoom: Map<string, Room>;
  deskByEmployee: Map<string, Desk>;
  bounds: Rect;                      // whole lot incl. grounds
  entrance: Pt;
  road: Rect;
  signature: string;
}

export const GENERAL_DEPT = 'General';
const WALL = 6;
const COR = 72;
const SPINE = 84;
const POD_W = 132;
const POD_H = 122;
const PODS_PER_ROW = 3;
const BAND_MAX = 1320;
const TOP_H = 236;
const CAFE_H = 250;
const MARGIN = 190;
const ROAD_H = 96;

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const deptHue = (name: string) => hash(name) % 360;

const SKIN = ['#f3cfb1', '#e3b08c', '#c98f66', '#a86f4a', '#80513a', '#5e3c29'];
const HAIR = ['#1d1916', '#3a2a20', '#5b3b24', '#8b5b2c', '#c49c6c', '#2d2d2d', '#77716a', '#6b2e1f'];

export function appearance(id: string, hue: number) {
  const h = hash(id);
  const shirtHue = (hue + ((h >>> 7) % 36) - 18 + 360) % 360;
  return {
    skin: SKIN[h % SKIN.length],
    hair: HAIR[(h >>> 3) % HAIR.length],
    shirt: `hsl(${shirtHue} 48% ${42 + ((h >>> 11) % 16)}%)`,
    shirtDark: `hsl(${shirtHue} 45% ${30 + ((h >>> 11) % 10)}%)`,
  };
}

function makeRoom(id: string, name: string, kind: RoomKind, r: Rect, doorSide: 'top' | 'bottom', corridorY: number, hue: number): Room {
  const doorX = r.x + Math.min(r.w / 2, 90);
  const door = { x: doorX, y: doorSide === 'top' ? r.y : r.y + r.h };
  return {
    id, name, kind, hue, ...r,
    door,
    doorInside: { x: doorX, y: doorSide === 'top' ? r.y + 26 : r.y + r.h - 26 },
    corridorY,
    seats: [],
    desks: [],
    standing: [],
  };
}

/** depts: department name → employee ids (sorted for stable seat assignment). */
export function buildFloor(depts: Map<string, string[]>): Floor {
  const names = [...depts.keys()].sort((a, b) => a.localeCompare(b));
  const signature = names.map((n) => `${n}:${depts.get(n)!.length}`).join('|');

  // ── Office bands (packed left → right, wrapping) ──
  type Pending = { name: string; ids: string[]; w: number; h: number; cols: number; pods: number };
  const pending: Pending[] = names.map((name) => {
    const ids = depts.get(name)!;
    const pods = Math.max(1, Math.ceil(ids.length / 4));
    const cols = Math.min(pods, PODS_PER_ROW);
    const rows = Math.ceil(pods / cols);
    return { name, ids, pods, cols, w: 56 + cols * POD_W, h: 78 + rows * POD_H };
  });
  const bands: Pending[][] = [];
  let bandW = 0;
  for (const p of pending) {
    if (!bands.length || (bandW + p.w > BAND_MAX && bands[bands.length - 1].length)) {
      bands.push([]);
      bandW = 0;
    }
    bands[bands.length - 1].push(p);
    bandW += p.w;
  }
  if (!bands.length) bands.push([]);

  const topW = 340 + 360 + 340;
  const width = Math.max(SPINE + topW, SPINE + Math.max(...bands.map((b) => b.reduce((s, p) => s + p.w, 0))), 1180);

  const rooms: Room[] = [];
  const corridors: Rect[] = [];

  // ── Top row: lobby (incl. spine column), boardroom, training ──
  let y = 0;
  const cor0 = { x: 0, y: TOP_H, w: width, h: COR };
  const cor0Y = cor0.y + COR / 2;
  const lobbyW = SPINE + 340;
  const trainingW = width - lobbyW - 360;
  rooms.push(makeRoom('lobby', 'Reception', 'lobby', { x: 0, y, w: lobbyW, h: TOP_H }, 'bottom', cor0Y, 38));
  rooms.push(makeRoom('meeting', 'Boardroom', 'meeting', { x: lobbyW, y, w: 360, h: TOP_H }, 'bottom', cor0Y, 210));
  rooms.push(makeRoom('training', 'Training', 'training', { x: lobbyW + 360, y, w: trainingW, h: TOP_H }, 'bottom', cor0Y, 45));
  corridors.push(cor0);
  y = cor0.y + COR;

  // ── Department offices ──
  const deptRoom = new Map<string, Room>();
  const deskByEmployee = new Map<string, Desk>();
  for (const band of bands) {
    const bandH = Math.max(200, ...band.map((p) => p.h));
    let x = SPINE;
    const corAbove = corridors[corridors.length - 1];
    band.forEach((p, i) => {
      const w = i === band.length - 1 ? width - x : p.w;
      const room = makeRoom(`dept:${p.name}`, p.name, 'office', { x, y, w, h: bandH }, 'top', corAbove.y + COR / 2, deptHue(p.name));
      layoutOffice(room, p.pods, p.cols, p.ids, deskByEmployee);
      rooms.push(room);
      deptRoom.set(p.name, room);
      x += w;
    });
    y += bandH;
    const cor = { x: 0, y, w: width, h: COR };
    corridors.push(cor);
    y += COR;
  }

  // ── Cafeteria ──
  const lastCor = corridors[corridors.length - 1];
  rooms.push(makeRoom('cafe', 'Cafeteria & Lounge', 'cafe', { x: 0, y, w: width, h: CAFE_H }, 'top', lastCor.y + COR / 2, 28));
  const height = y + CAFE_H;

  for (const r of rooms) {
    if (r.kind === 'lobby') layoutLobby(r);
    if (r.kind === 'meeting') layoutMeeting(r);
    if (r.kind === 'training') layoutTraining(r);
    if (r.kind === 'cafe') layoutCafe(r);
    layoutStanding(r);
  }

  const bounds = { x: -MARGIN, y: -MARGIN, w: width + MARGIN * 2 + 280, h: height + MARGIN * 2 + ROAD_H };
  const road = { x: bounds.x, y: height + MARGIN, w: bounds.w, h: ROAD_H };
  const entrance = { x: SPINE + 150, y: -40 };

  return { width, height, rooms, corridors, spineX: SPINE / 2, deptRoom, deskByEmployee, bounds, entrance, road, signature };
}

function layoutOffice(room: Room, pods: number, cols: number, ids: string[], deskByEmployee: Map<string, Desk>) {
  const padX = (room.w - cols * POD_W) / 2;
  let seatIdx = 0;
  for (let p = 0; p < pods; p++) {
    const ox = room.x + padX + (p % cols) * POD_W;
    const oy = room.y + 56 + Math.floor(p / cols) * POD_H;
    for (let d = 0; d < 4; d++) {
      const left = d % 2 === 0;
      const top = d < 2;
      const dx = ox + 12 + (left ? 0 : 54);
      const dy = oy + (top ? 30 : 58);
      const desk: Desk = {
        x: dx, y: dy, w: 52, h: 28,
        seat: { x: dx + 26, y: top ? dy - 14 : dy + 28 + 14, angle: top ? Math.PI / 2 : -Math.PI / 2 },
        monitor: { x: dx + 14, y: top ? dy + 18 : dy + 4, w: 24, h: 5 },
      };
      room.desks.push(desk);
      const id = ids[seatIdx++];
      if (id) deskByEmployee.set(id, desk);
    }
  }
}

function layoutLobby(r: Room) {
  // two sofas facing each other near the windows
  const sx = r.x + r.w - 190;
  for (let i = 0; i < 3; i++) r.seats.push({ x: sx + 30 + i * 36, y: r.y + 58, angle: Math.PI / 2 });
  for (let i = 0; i < 3; i++) r.seats.push({ x: sx + 30 + i * 36, y: r.y + 142, angle: -Math.PI / 2 });
}

function layoutMeeting(r: Room) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2 + 6;
  const rx = Math.min(120, r.w / 2 - 70);
  const ry = 44;
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    r.seats.push({ x: cx + Math.cos(a) * (rx + 22), y: cy + Math.sin(a) * (ry + 20), angle: a + Math.PI });
  }
}

function layoutTraining(r: Room) {
  const rows = 3;
  const cols = Math.max(3, Math.floor((r.w - 80) / 46));
  const x0 = r.x + (r.w - (cols - 1) * 46) / 2;
  for (let row = 0; row < rows; row++)
    for (let c = 0; c < cols; c++) r.seats.push({ x: x0 + c * 46, y: r.y + 104 + row * 40, angle: -Math.PI / 2 });
}

function layoutCafe(r: Room) {
  const tables = Math.max(3, Math.floor((r.w - 380) / 150));
  for (let row = 0; row < 2; row++) {
    for (let t = 0; t < tables; t++) {
      const cx = r.x + 110 + t * 150 + (row ? 75 : 0);
      const cy = r.y + 78 + row * 92;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        r.seats.push({ x: cx + Math.cos(a) * 30, y: cy + Math.sin(a) * 30, angle: a + Math.PI });
      }
    }
  }
}

function layoutStanding(r: Room) {
  for (let y = r.y + 50; y < r.y + r.h - 30; y += 34)
    for (let x = r.x + 40; x < r.x + r.w - 30; x += 38) r.standing.push({ x, y });
  // spread overflow around the room rather than filling one corner
  r.standing.sort((a, b) => hash(`${a.x},${a.y}`) - hash(`${b.x},${b.y}`));
}

// ─────────────────────────── Painting (static layer) ───────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function seeded(seed: number) {
  let s = seed || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296;
}

export function paintStatic(ctx: CanvasRenderingContext2D, f: Floor) {
  paintGrounds(ctx, f);

  // building drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 14;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#20262f';
  ctx.fillRect(-8, -8, f.width + 16, f.height + 16);
  ctx.restore();

  // corridors: polished concrete
  ctx.fillStyle = '#b9bcc0';
  ctx.fillRect(0, 0, f.width, f.height);
  const rnd = seeded(7);
  for (let i = 0; i < f.width * f.height / 900; i++) {
    ctx.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.025 + rnd() * 0.03})`;
    ctx.fillRect(rnd() * f.width, rnd() * f.height, 2 + rnd() * 10, 1 + rnd() * 2);
  }

  for (const r of f.rooms) paintFloor(ctx, r);
  for (const r of f.rooms) paintFurniture(ctx, r);
  paintCorridorDecor(ctx, f);
  for (const r of f.rooms) paintWalls(ctx, r);
  paintExterior(ctx, f);
  for (const r of f.rooms) paintLabel(ctx, r);
}

function paintGrounds(ctx: CanvasRenderingContext2D, f: Floor) {
  const b = f.bounds;
  // grass with mottling
  ctx.fillStyle = '#5b7f45';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  const rnd = seeded(42);
  for (let i = 0; i < (b.w * b.h) / 260; i++) {
    const g = 90 + rnd() * 50;
    ctx.fillStyle = `rgba(${g * 0.55 | 0},${g | 0},${g * 0.4 | 0},${0.12 + rnd() * 0.18})`;
    ctx.beginPath();
    ctx.arc(b.x + rnd() * b.w, b.y + rnd() * b.h, 2 + rnd() * 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // road + sidewalk
  const road = f.road;
  ctx.fillStyle = '#c9c4b8';
  ctx.fillRect(road.x, road.y - 18, road.w, 18);
  ctx.fillStyle = '#3b3f45';
  ctx.fillRect(road.x, road.y, road.w, road.h);
  ctx.strokeStyle = '#e8d27a';
  ctx.lineWidth = 3;
  ctx.setLineDash([34, 26]);
  ctx.beginPath();
  ctx.moveTo(road.x, road.y + road.h / 2);
  ctx.lineTo(road.x + road.w, road.y + road.h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // parking lot (right of building)
  const px = f.width + 70;
  const pw = 250;
  ctx.fillStyle = '#4a4e55';
  rr(ctx, px, 40, pw, f.height - 40, 10);
  ctx.fill();
  ctx.fillStyle = '#4a4e55';
  ctx.fillRect(px + pw / 2 - 40, f.height, 80, road.y - f.height); // driveway
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  const carColors = ['#c0392b', '#ecf0f1', '#2c3e50', '#2980b9', '#7f8c8d', '#f1c40f', '#16a085', '#8e44ad'];
  const prnd = seeded(99);
  for (let sy = 70; sy < f.height - 60; sy += 58) {
    for (const side of [0, 1]) {
      const sx = side ? px + pw - 92 : px + 14;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 78, sy);
      ctx.stroke();
      if (prnd() > 0.35) paintCar(ctx, sx + 39, sy + 29, side ? Math.PI : 0, carColors[(prnd() * carColors.length) | 0]);
    }
  }

  // entrance path from the road to the lobby
  ctx.fillStyle = '#d8d2c4';
  ctx.fillRect(f.entrance.x - 30, b.y, 60, -b.y);
  ctx.fillRect(b.x, b.y + 40, b.w - 290, 26); // footpath along the top

  // trees + hedges (deterministic)
  const trnd = seeded(2024);
  const spots: Pt[] = [];
  for (let i = 0; i < 70; i++) {
    const side = i % 4;
    const p =
      side === 0 ? { x: b.x + 30 + trnd() * (b.w - 360), y: b.y + 90 + trnd() * 60 } :
      side === 1 ? { x: b.x + 20 + trnd() * 120, y: b.y + 100 + trnd() * (f.height + 60) } :
      side === 2 ? { x: b.x + 30 + trnd() * (b.w - 60), y: f.height + 40 + trnd() * 70 } :
                   { x: f.width + 340 + trnd() * 80, y: b.y + 90 + trnd() * (f.height + 80) };
    if (Math.abs(p.x - f.entrance.x) < 60 && p.y < 0) continue;
    if (p.x > -30 && p.x < f.width + 30 && p.y > -30 && p.y < f.height + 30) continue;
    if (p.x > f.width + 60 && p.x < f.width + 330 && p.y > 20 && p.y < f.height + 10) continue;
    spots.push(p);
  }
  for (const p of spots) paintTree(ctx, p.x, p.y, 16 + trnd() * 14, trnd);
}

export function paintCar(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, -33, -14, 70, 32, 9);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, -34, -16, 68, 32, 9);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  rr(ctx, -12, -13, 30, 26, 5); // cabin glass
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, -7, -11, 18, 22, 3); // roof
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  rr(ctx, -6, -10, 16, 6, 2);
  ctx.fill();
  ctx.fillStyle = '#fff6c9';
  ctx.fillRect(30, -13, 3, 6);
  ctx.fillRect(30, 7, 3, 6);
  ctx.restore();
}

function paintTree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rnd: () => number) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.35, y + r * 0.45, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  const base = 70 + rnd() * 30;
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * r * 0.45;
    const g = base + i * 6;
    ctx.fillStyle = `rgb(${g * 0.45 | 0},${g + 30 | 0},${g * 0.35 | 0})`;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.55 + rnd() * 0.3), 0, Math.PI * 2);
    ctx.fill();
  }
  const hl = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
  hl.addColorStop(0, 'rgba(210,255,170,0.35)');
  hl.addColorStop(1, 'rgba(210,255,170,0)');
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function paintFloor(ctx: CanvasRenderingContext2D, r: Room) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const rnd = seeded(hash(r.id));
  if (r.kind === 'office') {
    // carpet tiles tinted by department
    ctx.fillStyle = `hsl(${r.hue} 14% 34%)`;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    for (let y = r.y; y < r.y + r.h; y += 40)
      for (let x = r.x; x < r.x + r.w; x += 40) {
        ctx.fillStyle = `hsla(${r.hue} 16% ${31 + rnd() * 6}% / 1)`;
        ctx.fillRect(x + 0.5, y + 0.5, 39, 39);
      }
    for (let i = 0; i < (r.w * r.h) / 30; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.035})`;
      ctx.fillRect(r.x + rnd() * r.w, r.y + rnd() * r.h, 1.5, 1.5);
    }
  } else if (r.kind === 'meeting' || r.kind === 'training') {
    // warm wooden planks
    ctx.fillStyle = r.kind === 'meeting' ? '#8a6a4a' : '#9a7a55';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    for (let y = r.y; y < r.y + r.h; y += 14) {
      let x = r.x - rnd() * 120;
      while (x < r.x + r.w) {
        const len = 70 + rnd() * 90;
        const l = 34 + rnd() * 10;
        ctx.fillStyle = `hsl(28 ${32 + rnd() * 10}% ${l}%)`;
        ctx.fillRect(x + 1, y + 1, len - 1, 13);
        x += len;
      }
    }
  } else if (r.kind === 'lobby') {
    // polished stone tiles
    for (let y = r.y; y < r.y + r.h; y += 48)
      for (let x = r.x; x < r.x + r.w; x += 48) {
        const l = 80 + rnd() * 6;
        ctx.fillStyle = `hsl(35 10% ${l}%)`;
        ctx.fillRect(x, y, 48, 48);
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(x + 0.5, y + 0.5, 47, 47);
      }
    const g = ctx.createRadialGradient(r.x + r.w * 0.4, r.y + r.h * 0.4, 10, r.x + r.w * 0.4, r.y + r.h * 0.4, r.w * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  } else {
    // cafe: terracotta / cream checker
    for (let y = r.y, j = 0; y < r.y + r.h; y += 32, j++)
      for (let x = r.x, i = 0; x < r.x + r.w; x += 32, i++) {
        ctx.fillStyle = (i + j) % 2 ? '#d9cdb8' : '#c9b89c';
        ctx.fillRect(x, y, 32, 32);
      }
  }
  ctx.restore();
}

function chair(ctx: CanvasRenderingContext2D, s: Seat, color = '#2f3540') {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(1.5, 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, -9, -9, 18, 18, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  rr(ctx, -9, -9, 5, 18, 3); // backrest
  ctx.fill();
  ctx.restore();
}

function plant(ctx: CanvasRenderingContext2D, x: number, y: number, r = 11) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(x + 2, y + 3, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e9e4da';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  const rnd = seeded(hash(`${x},${y}`));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd();
    ctx.fillStyle = i % 2 ? '#3f8a43' : '#56a35a';
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.55, r * 0.28, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sofa(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, facingDown: boolean, color: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rr(ctx, x + 3, y + 4, w, 34, 8);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, x, y, w, 34, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  rr(ctx, x, facingDown ? y : y + 24, w, 10, 5); // backrest
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 1; i < 3; i++) ctx.fillRect(x + (w / 3) * i, y + (facingDown ? 12 : 4), 1.5, 18);
}

function paintFurniture(ctx: CanvasRenderingContext2D, r: Room) {
  if (r.kind === 'office') {
    for (const d of r.desks) {
      chair(ctx, d.seat);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      rr(ctx, d.x + 2, d.y + 3, d.w, d.h, 3);
      ctx.fill();
      ctx.fillStyle = '#e8e2d6';
      rr(ctx, d.x, d.y, d.w, d.h, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(d.x, d.y + d.h - 3, d.w, 3);
      // monitor + keyboard
      ctx.fillStyle = '#1b1f26';
      rr(ctx, d.monitor.x, d.monitor.y, d.monitor.w, d.monitor.h, 1.5);
      ctx.fill();
      const kbY = d.seat.angle > 0 ? d.y + 5 : d.y + d.h - 9;
      ctx.fillStyle = '#b9b3a8';
      rr(ctx, d.x + 16, kbY, 20, 4, 1);
      ctx.fill();
    }
    plant(ctx, r.x + r.w - 26, r.y + 30);
    plant(ctx, r.x + 26, r.y + r.h - 26);
    // filing cabinets along the back wall
    ctx.fillStyle = '#6b7280';
    for (let i = 0; i < 3; i++) {
      rr(ctx, r.x + r.w - 40, r.y + r.h - 34 - i * 30, 26, 24, 2);
      ctx.fill();
    }
  }

  if (r.kind === 'lobby') {
    // curved reception desk
    const cx = r.x + 150;
    const cy = r.y + 118;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 4, 70, 30, 0, Math.PI, 0);
    ctx.lineTo(cx + 73, cy + 18);
    ctx.lineTo(cx - 67, cy + 18);
    ctx.fill();
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#6d4c35';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 64, 26, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e8e2d6';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 64, 26, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    chair(ctx, { x: cx, y: cy - 2, angle: -Math.PI / 2 }, '#1f2937');
    const sx = r.x + r.w - 190;
    sofa(ctx, sx + 6, r.y + 44, 120, true, '#38506e');
    sofa(ctx, sx + 6, r.y + 128, 120, false, '#38506e');
    ctx.fillStyle = '#e9e4da'; // coffee table
    rr(ctx, sx + 30, r.y + 88, 72, 30, 6);
    ctx.fill();
    plant(ctx, r.x + 24, r.y + 26, 14);
    plant(ctx, r.x + r.w - 26, r.y + r.h - 28, 13);
    plant(ctx, sx - 18, r.y + 100, 12);
    // company logo on floor
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '800 34px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AEVORA', r.x + 150, r.y + r.h - 44);
    ctx.restore();
  }

  if (r.kind === 'meeting') {
    for (const s of r.seats) chair(ctx, s, '#232a35');
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2 + 6;
    const rx = Math.min(120, r.w / 2 - 70);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 5, rx, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(cx - rx, cy - 44, cx + rx, cy + 44);
    g.addColorStop(0, '#5a3d2a');
    g.addColorStop(1, '#3f2a1d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // screen on the wall
    ctx.fillStyle = '#111';
    ctx.fillRect(cx - 60, r.y + 10, 120, 7);
    plant(ctx, r.x + 26, r.y + r.h - 26, 12);
    plant(ctx, r.x + r.w - 26, r.y + r.h - 26, 12);
  }

  if (r.kind === 'training') {
    // whiteboard + lectern
    ctx.fillStyle = '#f5f5f2';
    ctx.fillRect(r.x + r.w / 2 - 110, r.y + 12, 220, 8);
    ctx.fillStyle = '#6d4c35';
    rr(ctx, r.x + r.w / 2 - 16, r.y + 40, 32, 22, 3);
    ctx.fill();
    for (const s of r.seats) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(s.x - 17, s.y - 23, 36, 10);
      ctx.fillStyle = '#d8d2c4'; // flip-desk
      rr(ctx, s.x - 18, s.y - 24, 36, 9, 2);
      ctx.fill();
      chair(ctx, s, '#39414f');
    }
    plant(ctx, r.x + r.w - 26, r.y + 30, 12);
  }

  if (r.kind === 'cafe') {
    const tables = Math.max(3, Math.floor((r.w - 380) / 150));
    for (const s of r.seats) chair(ctx, s, '#7a4f33');
    for (let row = 0; row < 2; row++)
      for (let t = 0; t < tables; t++) {
        const cx = r.x + 110 + t * 150 + (row ? 75 : 0);
        const cy = r.y + 78 + row * 92;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(cx + 3, cy + 4, 21, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f2ede4';
        ctx.beginPath();
        ctx.arc(cx, cy, 21, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hash(`${t}${row}`) % 2 ? '#c0392b' : '#27ae60'; // a mug
        ctx.beginPath();
        ctx.arc(cx + 6, cy - 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    // kitchen counter along the right
    const kx = r.x + r.w - 230;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(kx + 3, r.y + r.h - 50, 210, 36);
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(kx, r.y + r.h - 54, 210, 36);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(kx, r.y + r.h - 54, 210, 5);
    ctx.fillStyle = '#111827'; // coffee machine
    rr(ctx, kx + 20, r.y + r.h - 50, 26, 24, 3);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(kx + 30, r.y + r.h - 44, 6, 3);
    ctx.fillStyle = '#e5e7eb'; // fridge
    ctx.fillRect(kx + 160, r.y + r.h - 52, 40, 32);
    // lounge sofas
    sofa(ctx, kx + 10, r.y + 40, 190, true, '#7c5a3a');
    ctx.fillStyle = '#e9e4da';
    rr(ctx, kx + 60, r.y + 84, 90, 32, 8);
    ctx.fill();
    plant(ctx, r.x + 26, r.y + 30, 13);
    plant(ctx, kx - 20, r.y + r.h - 30, 13);
  }
}

function paintCorridorDecor(ctx: CanvasRenderingContext2D, f: Floor) {
  for (const c of f.corridors) {
    // runner rug
    ctx.fillStyle = 'rgba(40,50,70,0.18)';
    ctx.fillRect(c.x + SPINE, c.y + c.h / 2 - 10, c.w - SPINE - 20, 20);
    for (let x = c.x + SPINE + 160; x < c.x + c.w - 60; x += 320) plant(ctx, x, c.y + 14, 9);
  }
  // spine rug
  const top = f.corridors[0].y;
  const bottom = f.corridors[f.corridors.length - 1].y + COR;
  ctx.fillStyle = 'rgba(40,50,70,0.18)';
  ctx.fillRect(SPINE / 2 - 10, top, 20, bottom - top);
}

function wallRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillRect(x, y, w, h);
}

function paintWalls(ctx: CanvasRenderingContext2D, r: Room) {
  const glass = r.kind === 'meeting';
  const DOOR = 46;
  ctx.fillStyle = glass ? 'rgba(170,215,255,0.55)' : '#2a2f37';
  const t = glass ? 4 : WALL;
  const doorTop = r.door.y === r.y;
  // top & bottom walls with door gap
  for (const side of ['top', 'bottom'] as const) {
    const y = side === 'top' ? r.y - t / 2 : r.y + r.h - t / 2;
    const hasDoor = (side === 'top') === doorTop;
    if (hasDoor) {
      wallRect(ctx, r.x, y, r.door.x - DOOR / 2 - r.x, t);
      wallRect(ctx, r.door.x + DOOR / 2, y, r.x + r.w - (r.door.x + DOOR / 2), t);
    } else wallRect(ctx, r.x, y, r.w, t);
  }
  wallRect(ctx, r.x - t / 2, r.y, t, r.h);
  wallRect(ctx, r.x + r.w - t / 2, r.y, t, r.h);
  if (glass) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  // open door leaf
  ctx.strokeStyle = 'rgba(42,47,55,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const dy = r.door.y;
  const dir = doorTop ? 1 : -1;
  ctx.moveTo(r.door.x - DOOR / 2, dy);
  ctx.arc(r.door.x - DOOR / 2, dy, DOOR, 0, (dir * Math.PI) / 2, dir < 0);
  ctx.stroke();
}

function paintExterior(ctx: CanvasRenderingContext2D, f: Floor) {
  const T = 12;
  ctx.fillStyle = '#1c2027';
  ctx.fillRect(-T, -T, f.width + T * 2, T);
  ctx.fillRect(-T, f.height, f.width + T * 2, T);
  ctx.fillRect(-T, 0, T, f.height);
  ctx.fillRect(f.width, 0, T, f.height);
  // windows
  ctx.fillStyle = '#9fd0f2';
  for (let x = 30; x < f.width - 40; x += 64) {
    if (Math.abs(x + 20 - f.entrance.x) < 50) continue;
    ctx.fillRect(x, -T + 3, 42, T - 6);
    ctx.fillRect(x, f.height + 3, 42, T - 6);
  }
  for (let y = 30; y < f.height - 40; y += 64) {
    ctx.fillRect(-T + 3, y, T - 6, 42);
    ctx.fillRect(f.width + 3, y, T - 6, 42);
  }
  // main entrance: glass doors
  ctx.fillStyle = '#d9eefc';
  ctx.fillRect(f.entrance.x - 30, -T, 60, T);
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(f.entrance.x - 1, -T, 2, T);
}

function paintLabel(ctx: CanvasRenderingContext2D, r: Room) {
  const text = r.name.toUpperCase();
  ctx.font = '700 12px Inter, sans-serif';
  const w = ctx.measureText(text).width + 18;
  const x = r.x + 12;
  const y = r.kind === 'office' || r.kind === 'cafe' ? r.y + 12 : r.y + r.h - 34;
  ctx.fillStyle = 'rgba(12,16,24,0.72)';
  rr(ctx, x, y, w, 22, 6);
  ctx.fill();
  ctx.fillStyle = r.kind === 'office' ? `hsl(${r.hue} 70% 72%)` : '#e5e7eb';
  ctx.fillRect(x + 7, y + 8, 3, 6);
  ctx.fillStyle = '#f3f4f6';
  ctx.fillText(text, x + 14, y + 15);
}
