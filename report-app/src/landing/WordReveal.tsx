import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';

function Word({ w, i, n, p }: { w: string; i: number; n: number; p: MotionValue<number> }) {
  const opacity = useTransform(p, [i / n, Math.min(1, (i + 2.5) / n)], [0.16, 1]);
  return <motion.span style={{ opacity }}>{w} </motion.span>;
}

/** Paragraph whose words light up one by one as it scrolls through the viewport. */
export function WordReveal({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.82', 'end 0.45'] });
  const words = text.split(' ');
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => <Word key={i} w={w} i={i} n={words.length} p={scrollYProgress} />)}
    </p>
  );
}
