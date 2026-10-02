import { useState } from 'react';
import type { StressFinding } from '../../data/stress-findings';

const PALETTE = [
  { chip: 'linear-gradient(140deg, #ff7a3d, #fe3b0f)', panel: 'linear-gradient(150deg, rgba(255,90,32,0.22), rgba(20,10,7,0.7))', border: '#ff7a3d', pill: 'ember' },
  { chip: 'linear-gradient(140deg, #ffcf6b, #ffb020)', panel: 'linear-gradient(150deg, rgba(255,176,32,0.2), rgba(20,10,7,0.7))', border: '#ffb020', pill: 'amber' },
  { chip: 'linear-gradient(140deg, #6fe7b3, #3fcf8e)', panel: 'linear-gradient(150deg, rgba(63,207,142,0.2), rgba(20,10,7,0.7))', border: '#3fcf8e', pill: 'moss' },
  { chip: '#2a211c', panel: 'linear-gradient(150deg, #241a14, rgba(20,10,7,0.7))', border: 'rgba(255,255,255,0.3)', pill: 'neutral' },
] as const;

export function StressRoadmap({ items }: { items: StressFinding[] }) {
  const [open, setOpen] = useState(0);
  const cur = items[open];
  const c = PALETTE[open % PALETTE.length];

  return (
    <div className="v2-road">
      <div className="v2-road-path">
        {items.map((f, i) => {
          const p = PALETTE[i % PALETTE.length];
          const active = i === open;
          return (
            <button key={f.id} className={`v2-road-node ${active ? 'is-active' : ''}`} onClick={() => setOpen(i)}>
              <span className="v2-road-chip" style={{ background: p.chip, boxShadow: active ? `0 0 0 5px rgba(255,255,255,0.06)` : 'none' }}>{f.stat1[0]}</span>
              <span className="v2-road-text">
                <b>{f.id}</b>
                <span>{f.stat1[1]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="v2-road-detail" style={{ background: c.panel, border: `1px solid ${c.border}` }}>
        <span className={`v2-pill ${c.pill}`}>{cur.tag}</span>
        <h3>{cur.id}</h3>
        <p>{cur.impact}</p>
        <div className="v2-road-stats">
          <div><b>{cur.stat1[0]}</b><span>{cur.stat1[1]}</span></div>
          <div><b>{cur.stat2[0]}</b><span>{cur.stat2[1]}</span></div>
        </div>
      </div>
    </div>
  );
}
