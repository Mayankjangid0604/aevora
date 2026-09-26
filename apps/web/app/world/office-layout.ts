// 2.5D isometric office layout. Grid units; one cell = a 64×32 px isometric tile.

export type RoomType = 'CEO_OFFICE' | 'SALES' | 'DEVELOPMENT' | 'MARKETING' | 'MANAGEMENT' | 'COMMON';

export interface Room {
  id: string;
  name: string;
  x: number; // grid column
  y: number; // grid row
  w: number; // width in cells
  h: number; // height in cells
  type: RoomType;
}

export const ROOMS: Room[] = [
  { id: 'sales', name: 'Sales', x: 0, y: 0, w: 4, h: 3, type: 'SALES' },
  { id: 'dev', name: 'Development', x: 4, y: 0, w: 4, h: 3, type: 'DEVELOPMENT' },
  { id: 'ceo', name: 'CEO Office', x: 8, y: 0, w: 4, h: 3, type: 'CEO_OFFICE' },
  { id: 'marketing', name: 'Marketing', x: 0, y: 3, w: 4, h: 3, type: 'MARKETING' },
  { id: 'management', name: 'Management', x: 4, y: 3, w: 4, h: 3, type: 'MANAGEMENT' },
  { id: 'common', name: 'Common Area', x: 8, y: 3, w: 4, h: 3, type: 'COMMON' },
];

/** Which room a department works in. Venture teams ("Venture: X") and anything unknown use the common area. */
export function roomForDepartment(department: string | null | undefined): Room {
  const id: Record<string, string> = { Executive: 'ceo', Sales: 'sales', Development: 'dev', Marketing: 'marketing', Management: 'management' };
  return ROOMS.find((r) => r.id === id[department ?? '']) ?? ROOMS.find((r) => r.id === 'common')!;
}

/** Desk positions inside a room, front rows first. The CEO office has a single central desk. */
export function seatsFor(room: Room): { x: number; y: number }[] {
  if (room.type === 'CEO_OFFICE') return [{ x: room.x + 1.5, y: room.y + 1.2 }, { x: room.x + 2.8, y: room.y + 2 }];
  const seats: { x: number; y: number }[] = [];
  for (let row = 0; row < room.h - 1; row++) {
    for (let col = 0; col < room.w - 1; col++) seats.push({ x: room.x + 0.9 + col, y: room.y + 0.8 + row * 1.2 });
  }
  return seats;
}

/** Where a visitor stands in the CEO office (in front of the CEO's desk). */
export const CEO_VISITOR_SPOT = { x: 10.6, y: 2.3 };

export const ISO_TILE_W = 64;
export const ISO_TILE_H = 32;

export function toIso(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: (gridX - gridY) * (ISO_TILE_W / 2),
    y: (gridX + gridY) * (ISO_TILE_H / 2),
  };
}
