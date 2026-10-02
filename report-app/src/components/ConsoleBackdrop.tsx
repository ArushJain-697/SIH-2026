import { useEffect, useRef } from 'react';
import './console-backdrop.css';

// Dim (always-on) + black (bright) plus-sign tiles. The bright layer is masked by a
// radial spotlight that follows the cursor anywhere on the page, so pluses light up
// under the pointer even when it's over content sitting above this fixed layer.
const plusTile = (color: string, opacity: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><path d="M22 15v14M15 22h14" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-opacity="${opacity}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

export function ConsoleBackdrop({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const ref = useRef<HTMLDivElement>(null);
  const color = theme === 'dark' ? '#fff' : '#000';

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty('--cb-x', `${e.clientX}px`);
      el.style.setProperty('--cb-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className={`console-bg ${theme === 'dark' ? 'is-transparent' : ''}`} ref={ref} aria-hidden="true">
      <div className="console-bg-grid is-dim" style={{ backgroundImage: plusTile(color, theme === 'dark' ? 0.08 : 0.14) }} />
      <div className="console-bg-grid is-hot" style={{ backgroundImage: plusTile(color, theme === 'dark' ? 0.5 : 0.85) }} />
    </div>
  );
}
