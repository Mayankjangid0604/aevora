'use client';

export type EmployeeActivity = 'WORKING' | 'WALKING' | 'MEETING' | 'IDLE';

export interface CharacterProps {
  name: string;
  activity: EmployeeActivity;
  x: number; // screen x of the feet
  y: number; // screen y of the feet
  color: string; // department colour
  isSelected: boolean;
  bubbleText?: string;
  onClick: () => void;
}

// Canvas text is always on the dark office floor, in both app themes.
const LABEL = '#CBD5E1';

/**
 * Minimal 2.5D person in plain SVG. Animation is CSS (see .char-* in globals.css): typing arms while
 * WORKING, a walking bob + leg swing while WALKING — no per-frame React renders.
 */
export default function EmployeeCharacter({ name, activity, x, y, color, isSelected, bubbleText, onClick }: CharacterProps) {
  const first = name.split(/\s+/)[0];
  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={`char char-${activity.toLowerCase()}`}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      role="button"
      tabIndex={0}
      aria-label={`${name}, ${activity.toLowerCase()}`}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      <ellipse cx="0" cy="0" rx="9" ry="4" fill="rgba(0,0,0,0.35)" />
      {isSelected && <ellipse cx="0" cy="0" rx="15" ry="6" fill="none" stroke="#818CF8" strokeWidth="2" />}

      <g className="char-body">
        {/* legs */}
        <rect className="char-leg-l" x="-5" y="-14" width="4" height="13" rx="2" fill="#1E293B" />
        <rect className="char-leg-r" x="1" y="-14" width="4" height="13" rx="2" fill="#1E293B" />
        {/* torso */}
        <rect x="-7" y="-30" width="14" height="18" rx="3" fill={color} />
        {/* arms */}
        <rect className="char-arm-l" x="-10" y="-29" width="3.5" height="12" rx="1.75" fill={color} />
        <rect className="char-arm-r" x="6.5" y="-29" width="3.5" height="12" rx="1.75" fill={color} />
        {/* head + hair */}
        <circle cx="0" cy="-37" r="6.5" fill="#E8B998" />
        <path d="M-6.5,-38 a6.5,6.5 0 0 1 13,0 q-6.5,-3 -13,0z" fill="#27272A" />
      </g>

      <text x="0" y="12" textAnchor="middle" fontSize="9" fill={LABEL} fontFamily="Inter, sans-serif" style={{ pointerEvents: 'none' }}>
        {first}
      </text>

      {bubbleText && <Bubble text={bubbleText} />}
    </g>
  );
}

/** Speech bubble above the head: up to two lines of ~26 characters. */
function Bubble({ text }: { text: string }) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const lines = [clean.slice(0, 26), clean.length > 26 ? `${clean.slice(26, 50)}${clean.length > 50 ? '…' : ''}` : ''].filter(Boolean);
  const w = 150;
  const h = 12 + lines.length * 11;
  return (
    <g transform={`translate(${-w / 2}, ${-58 - h})`} style={{ pointerEvents: 'none' }}>
      <rect width={w} height={h} rx="6" fill="#F8FAFC" stroke="#CBD5E1" />
      <path d={`M${w / 2 - 6},${h} l6,7 l6,-7`} fill="#F8FAFC" stroke="#CBD5E1" />
      <rect x={w / 2 - 5} y={h - 1} width="10" height="2" fill="#F8FAFC" />
      {lines.map((l, i) => (
        <text key={i} x="8" y={15 + i * 11} fontSize="9" fill="#0F172A" fontFamily="Inter, sans-serif">
          {l}
        </text>
      ))}
    </g>
  );
}
