import { useEffect, useRef } from 'react';

/** Animated film grain. Low-res noise, re-seeded ~14fps, scaled up with pixelated sampling. */
export function Grain({ className = '', size = 200 }: { className?: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = size;
    c.height = size;
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const paint = () => {
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    paint();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 70) {
        last = t;
        paint();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return <canvas ref={ref} className={`sx-grain ${className}`} aria-hidden="true" />;
}
