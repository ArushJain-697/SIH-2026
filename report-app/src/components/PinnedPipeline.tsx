import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';

export type Stage = { icon: ReactNode; title: string; body: string; stat: string; file: string };

// Scroll-pinned stepper: the section sticks while scroll progress fills the rail and swaps the detail panel.
export function PinnedPipeline({ stages, head }: { stages: Stage[]; head?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const fill = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const i = Math.min(stages.length - 1, Math.max(0, Math.floor(p * stages.length)));
    setActive((prev) => (prev === i ? prev : i));
  });

  const s = stages[active];
  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.offsetTop + ((i + 0.5) / stages.length) * (el.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div ref={ref} className="pin" style={{ ['--pin-h' as string]: `${stages.length * 50 + 50}vh` }}>
      <div className="pin-inner">
        {head}
        <div className="pp">
          <ol className="pp-list">
            <span className="pp-track" aria-hidden><motion.span className="pp-fill" style={{ height: fill }} /></span>
            {stages.map((st, i) => (
              <li key={st.title}>
                <button type="button" className={`pp-item${i === active ? ' on' : ''}${i < active ? ' done' : ''}`} onClick={() => jump(i)} aria-current={i === active ? 'step' : undefined}>
                  <span className="pp-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="pp-name">{st.title}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="pp-panel surface-dark" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                className="pp-body"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="pp-icon">{s.icon}</div>
                <div className="pp-step">Step {active + 1} of {stages.length}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <div className="pp-stat">{s.stat}</div>
                <code className="pp-file">{s.file}</code>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Static fallback (phones, reduced motion): every step visible, no pinning */}
      <ol className="pp-static">
        {stages.map((st, i) => (
          <li key={st.title} className="card">
            <span className="pp-num">{String(i + 1).padStart(2, '0')}</span>
            <h4>{st.title}</h4>
            <p>{st.body}</p>
            <div className="pp-stat sm">{st.stat}</div>
            <code className="pp-file">{st.file}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}
