import { motion } from 'motion/react';

const SLATS = 6;

/** Full-screen wipe: angled slats sweep in, hold while the route swaps, then sweep out. */
export function Transition({ phase }: { phase: 'idle' | 'cover' | 'reveal' }) {
  if (phase === 'idle') return null;
  return (
    <div className="sx-wipe" aria-hidden="true">
      {Array.from({ length: SLATS }).map((_, i) => (
        <motion.div
          key={i}
          className="sx-wipe-slat"
          style={{ left: `${(i / SLATS) * 100 - 6}%`, width: `${100 / SLATS + 14}%` }}
          initial={{ y: phase === 'cover' ? '-110%' : '0%' }}
          animate={{ y: phase === 'cover' ? '0%' : '110%' }}
          transition={{ duration: 0.72, delay: i * 0.06, ease: [0.76, 0, 0.24, 1] }}
        />
      ))}
      <motion.div
        className="sx-wipe-mark"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'cover' ? 1 : 0 }}
        transition={{ duration: 0.35, delay: phase === 'cover' ? 0.4 : 0.05 }}
      >
        seam
      </motion.div>
    </div>
  );
}
