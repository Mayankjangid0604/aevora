'use client';

import { useEffect, useRef, useState } from 'react';

// Hardcoded visualization map layout
const MAP_ROOMS = [
  { id: 'reception', name: 'Reception', deptName: 'Reception', x: 50, y: 50, w: 200, h: 150, color: '#1e293b' },
  { id: 'management', name: 'Management', deptName: 'Management', x: 300, y: 50, w: 250, h: 200, color: '#1e293b' },
  { id: 'engineering', name: 'Engineering', deptName: 'Engineering', x: 50, y: 250, w: 500, h: 300, color: '#1e293b' },
  { id: 'research', name: 'Research', deptName: 'Research', x: 600, y: 50, w: 300, h: 250, color: '#1e293b' },
  { id: 'finance', name: 'Finance', deptName: 'Finance', x: 600, y: 350, w: 150, h: 200, color: '#1e293b' },
  { id: 'hr', name: 'HR', deptName: 'HR', x: 800, y: 350, w: 150, h: 200, color: '#1e293b' },
  { id: 'sales', name: 'Sales', deptName: 'Sales', x: 950, y: 50, w: 200, h: 300, color: '#1e293b' },
  { id: 'meeting', name: 'Meeting Area', deptName: 'Meeting', x: 600, y: 600, w: 300, h: 200, color: '#1e293b' },
  { id: 'training', name: 'Training', deptName: 'Training', x: 950, y: 400, w: 200, h: 200, color: '#1e293b' },
  { id: 'cafeteria', name: 'Cafeteria', deptName: 'Cafeteria', x: 50, y: 600, w: 400, h: 200, color: '#1e293b' },
];

const ACTIVITY_COLORS: Record<string, string> = {
  WORKING: '#3b82f6',     // blue
  IDLE: '#64748b',        // slate
  IN_MEETING: '#8b5cf6',  // purple
  TRAINING: '#eab308',    // yellow
  ON_BREAK: '#f97316',    // orange
  BLOCKED: '#ef4444',     // red
  OFFLINE: '#334155',
};

interface Point { x: number; y: number }

export default function WorldRenderer({
  data,
  selectedEmpId,
  onSelectEmployee
}: {
  data: any;
  selectedEmpId: string | null;
  onSelectEmployee: (id: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragCamStartRef = useRef({ x: 0, y: 0 });

  // Render loop tracking
  const reqRef = useRef<number>();
  
  // Pre-calculate target positions for employees so they don't jitter
  // In a real app we might tween towards these. For now, static placement per tick
  const empPositionsRef = useRef<Record<string, Point>>({});

  useEffect(() => {
    // Generate static positions for employees within their assigned rooms
    if (!data?.employees) return;
    
    const newPositions: Record<string, Point> = { ...empPositionsRef.current };
    const roomCounts: Record<string, number> = {};
    
    data.employees.forEach((emp: any) => {
      // Determine which room they belong in
      let targetRoom = MAP_ROOMS.find(r => r.deptName === emp.departmentName);
      
      // Override for specific activities
      if (emp.activity === 'IN_MEETING') targetRoom = MAP_ROOMS.find(r => r.id === 'meeting') || targetRoom;
      if (emp.activity === 'TRAINING') targetRoom = MAP_ROOMS.find(r => r.id === 'training') || targetRoom;
      if (emp.activity === 'ON_BREAK' || emp.activity === 'IDLE') targetRoom = MAP_ROOMS.find(r => r.id === 'cafeteria') || targetRoom;
      
      // Fallback
      if (!targetRoom) targetRoom = MAP_ROOMS.find(r => r.id === 'reception')!;

      // Simple grid placement within the room
      if (!roomCounts[targetRoom.id]) roomCounts[targetRoom.id] = 0;
      const count = roomCounts[targetRoom.id]++;
      
      const cols = Math.floor(targetRoom.w / 40);
      const row = Math.floor(count / cols);
      const col = count % cols;
      
      const px = targetRoom.x + 20 + col * 40;
      const py = targetRoom.y + 40 + row * 40;
      
      // If position changed significantly or is new, update it (allows simple teleporting for now)
      newPositions[emp.id] = { x: px, y: py };
    });
    
    empPositionsRef.current = newPositions;
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const resize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // Render loop
    const render = () => {
      const { x: cx, y: cy, zoom } = cameraRef.current;
      
      // Clear
      ctx.fillStyle = '#0f172a'; // dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      
      // Draw grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 50;
      const viewW = canvas.width / zoom;
      const viewH = canvas.height / zoom;
      const startX = -cx / zoom;
      const startY = -cy / zoom;
      
      ctx.beginPath();
      for (let x = startX - (startX % gridSize); x < startX + viewW; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + viewH);
      }
      for (let y = startY - (startY % gridSize); y < startY + viewH; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + viewW, y);
      }
      ctx.stroke();

      // Draw Rooms
      MAP_ROOMS.forEach(room => {
        ctx.fillStyle = room.color;
        ctx.fillRect(room.x, room.y, room.w, room.h);
        
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(room.x, room.y, room.w, room.h);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillText(room.name, room.x + 10, room.y + 20);
      });

      // Draw Employees
      if (data?.employees) {
        data.employees.forEach((emp: any) => {
          const pos = empPositionsRef.current[emp.id];
          if (!pos) return;
          
          const color = ACTIVITY_COLORS[emp.activity] || '#94a3b8';
          const isSelected = selectedEmpId === emp.id;
          
          // Draw Selection Highlight
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Draw Avatar (Circle)
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          
          // Draw Task Indicator (small dot if working)
          if (emp.activity === 'WORKING' && emp.currentTaskId) {
            ctx.beginPath();
            ctx.arc(pos.x + 6, pos.y - 6, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981'; // emerald
            ctx.fill();
          }
          
          // Draw Name Label
          ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
          ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(emp.name.split(' ')[0], pos.x, pos.y + 20);
          ctx.textAlign = 'left'; // reset
        });
      }

      ctx.restore();
      reqRef.current = requestAnimationFrame(render);
    };

    reqRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [data, selectedEmpId]);

  // Input Handling
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    // Zoom around mouse cursor
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const oldZoom = cameraRef.current.zoom;
    let newZoom = Math.max(0.1, Math.min(oldZoom + delta, 5));
    
    const worldX = (mx - cameraRef.current.x) / oldZoom;
    const worldY = (my - cameraRef.current.y) / oldZoom;
    
    cameraRef.current.zoom = newZoom;
    cameraRef.current.x = mx - worldX * newZoom;
    cameraRef.current.y = my - worldY * newZoom;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragCamStartRef.current = { x: cameraRef.current.x, y: cameraRef.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      cameraRef.current.x = dragCamStartRef.current.x + dx;
      cameraRef.current.y = dragCamStartRef.current.y + dy;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // If it was a click (not a drag), select employee
    if (isDraggingRef.current) {
      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      const dy = Math.abs(e.clientY - dragStartRef.current.y);
      if (dx < 3 && dy < 3) {
        // It's a click
        handleClick(e);
      }
    }
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!data?.employees) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const { x: cx, y: cy, zoom } = cameraRef.current;
    const worldX = (mx - cx) / zoom;
    const worldY = (my - cy) / zoom;
    
    // Find closest employee
    let clickedId: string | null = null;
    let minDist = 12; // Click radius
    
    data.employees.forEach((emp: any) => {
      const pos = empPositionsRef.current[emp.id];
      if (!pos) return;
      const dist = Math.sqrt(Math.pow(pos.x - worldX, 2) + Math.pow(pos.y - worldY, 2));
      if (dist < minDist) {
        minDist = dist;
        clickedId = emp.id;
      }
    });
    
    onSelectEmployee(clickedId);
  };

  return (
    <div 
      ref={containerRef} 
      className="world-renderer-container" 
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab', display: 'block' }}
      />
      
      {/* Legend Overlay */}
      <div className="world-legend">
        {Object.entries(ACTIVITY_COLORS).map(([act, color]) => (
          <div key={act} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: color }}></span>
            {act}
          </div>
        ))}
      </div>
    </div>
  );
}
