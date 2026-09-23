'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import WorldRenderer from '../components/world/WorldRenderer';
import WorldSidebar from '../components/world/WorldSidebar';

export default function CompanyWorldPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // Polling loop
  useEffect(() => {
    let active = true;
    
    async function tick() {
      const res = await api.world();
      if (!active) return;
      
      if (res.error) {
        setError(res.error);
      } else {
        setData(res.data);
      }
      
      // Poll every 2 seconds for fresh world state
      setTimeout(tick, 2000);
    }
    
    tick();
    return () => { active = false; };
  }, []);

  const handleAction = async (action: string, payload?: any) => {
    if (action === 'pause') await api.pauseSimulation();
    if (action === 'resume') await api.resumeSimulation();
    if (action === 'setSpeed') await api.setSimulationSpeed(payload);
    
    // Immediately fetch updated state
    const res = await api.world();
    if (res.data) setData(res.data);
  };

  if (error) return <div className="state-error">⚠ {error}</div>;

  return (
    <div className="world-layout">
      <div className="world-canvas-wrapper">
        <WorldRenderer 
          data={data} 
          selectedEmpId={selectedEmpId} 
          onSelectEmployee={setSelectedEmpId} 
        />
      </div>
      <WorldSidebar 
        data={data} 
        selectedEmpId={selectedEmpId} 
        onDeselect={() => setSelectedEmpId(null)}
        onAction={handleAction}
      />
    </div>
  );
}
