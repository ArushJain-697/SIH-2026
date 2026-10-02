import { useState } from 'react';
import type { StressFinding } from '../data/stress-findings';

const PALETTE = [
  { bg: 'var(--color-primary-500)', soft: 'var(--color-primary-50)', text: 'var(--color-primary-600)' },
  { bg: 'var(--color-secondary-500)', soft: 'var(--color-secondary-100)', text: 'var(--color-secondary-700)' },
  { bg: 'var(--color-accent-500)', soft: 'var(--color-accent-100)', text: 'var(--color-accent-700)' },
  { bg: '#222225', soft: 'var(--color-neutral-100)', text: 'var(--color-neutral-700)' },
];

export function StressRoadmap({ items }: { items: StressFinding[] }) {
  const [open, setOpen] = useState(0);
  const cur = items[open];
  const curColor = PALETTE[open % PALETTE.length];

  return (
    <div className="roadmap">
      <div className="roadmap-path">
        {items.map((f, i) => {
          const c = PALETTE[i % PALETTE.length];
          const active = i === open;
          return (
            <button key={f.id} className={`roadmap-node ${active ? 'is-active' : ''}`} onClick={() => setOpen(i)}>
              <span className="roadmap-dot" style={{ background: c.bg, boxShadow: active ? `0 0 0 5px ${c.soft}` : 'none' }}>{f.stat1[0]}</span>
              <span className="roadmap-label">
                <b>{f.id}</b>
                <span>{f.stat1[1]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="roadmap-detail" style={{ borderColor: curColor.bg }}>
        <span className="roadmap-tag" style={{ background: curColor.soft, color: curColor.text }}>{cur.tag}</span>
        <h3>{cur.id}</h3>
        <p>{cur.impact}</p>
        <div className="roadmap-stats">
          <div><b style={{ color: curColor.text }}>{cur.stat1[0]}</b><span>{cur.stat1[1]}</span></div>
          <div><b style={{ color: curColor.text }}>{cur.stat2[0]}</b><span>{cur.stat2[1]}</span></div>
        </div>
      </div>
    </div>
  );
}
