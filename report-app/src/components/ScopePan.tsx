import { useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { data } from '../data';
import { VerdictBadge } from './ui';
import { verdictMeta } from '../lib/status';

// Scroll-pinned horizontal pan: vertical scroll progress drives the track sideways.
export function ScopePan({ go, head }: { go: (p: string) => void; head?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const cells = Object.values(data.coverage_matrix);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const x = useTransform(scrollYProgress, (p) => {
    const t = track.current;
    if (!t) return 0;
    return -p * Math.max(0, t.scrollWidth - t.parentElement!.clientWidth);
  });
  const bar = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const i = Math.min(cells.length - 1, Math.round(p * (cells.length - 1)));
    setIdx((prev) => (prev === i ? prev : i));
  });

  return (
    <div ref={ref} className="pin pan" style={{ ['--pin-h' as string]: `${cells.length * 40 + 60}vh` }}>
      <div className="pin-inner pan-inner">
        {head}
        <div className="pan-viewport">
          <motion.div ref={track} className="pan-track" style={{ x }}>
            <aside className="pan-key">
              <h4>Reading the colours</h4>
              <p><b>Red:</b> a real, published vulnerability class was reproduced in that area.</p>
              <p><b>Green:</b> we attacked the control and it held.</p>
              <p><b>Amber:</b> suspicious, but not yet provable, so not claimed.</p>
              <span className="pan-hint" aria-hidden>Keep scrolling</span>
            </aside>
            {cells.map((c) => (
              <article key={c.area_number} className="pan-card" style={{ ['--tone' as string]: verdictMeta(c.verdict).dot }}>
                <div className="pan-n" aria-hidden>{String(c.area_number).padStart(2, '0')}</div>
                <h3>{c.label}</h3>
                <VerdictBadge verdict={c.verdict} />
                <ul className="pan-list">
                  {c.finding_ids.map((id) => {
                    const f = data.findings.find((x) => x.id === id);
                    return (
                      <li key={id}>
                        <button type="button" onClick={() => go(`/console/findings/${id}`)}>
                          <span className="id-chip">{id}</span>
                          <span className="pan-t">{f?.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </motion.div>
        </div>
        <div className="pan-meter" aria-hidden>
          <span className="pan-count">{String(idx + 1).padStart(2, '0')} / {String(cells.length).padStart(2, '0')}</span>
          <span className="pan-bar"><motion.span style={{ width: bar }} /></span>
        </div>
      </div>
    </div>
  );
}
