import { useEffect, useRef, useState } from 'react';

export function RadialProgress({
  value, total, size = 84, stroke = 9, color = 'var(--color-primary-500)', label, sub,
}: {
  value: number; total: number; size?: number; stroke?: number; color?: string; label?: string; sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const [animated, setAnimated] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        requestAnimationFrame(() => setAnimated(pct));
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [pct]);

  return (
    <div className="radial-progress" ref={ref} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-neutral-200)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - animated)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="radial-progress-text">
        <b>{value}/{total}</b>
        {label && <span>{label}</span>}
      </div>
      {sub && <div className="radial-progress-sub">{sub}</div>}
    </div>
  );
}
