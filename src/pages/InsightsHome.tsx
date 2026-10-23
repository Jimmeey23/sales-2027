import React from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useApp } from '../App';
import { LOCATION_COLORS, planningLocations } from '../data/locations';

export default function InsightsHome() {
  const { boot, studioId, setStudioId } = useApp();
  if (studioId) return <Navigate to={`/studios/${studioId}`} replace />;
  return (
    <div className="ws-page">
      <div className="ws-hero compact">
        <div>
          <p className="eyebrow">INSIGHTS</p>
          <h1>Pick a location to see its evidence</h1>
          <p>Historical revenue, attendance, customer segments and offer history are studio-specific.</p>
        </div>
      </div>
      <div className="ws-tool-grid">
        {planningLocations(boot.studios).map(s => (
          <button
            key={s.id}
            className="ws-tool"
            style={{ borderTopColor: LOCATION_COLORS[s.name] }}
            onClick={() => setStudioId(s.id)}
          >
            <strong>{s.name}</strong>
            <span>
              <MapPin size={12} /> {s.city}
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}
