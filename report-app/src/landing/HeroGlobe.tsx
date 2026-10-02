import { useEffect, useRef } from 'react';
import Globe from 'globe.gl';

type Arc = { sLat: number; sLng: number; eLat: number; eLng: number };

// Offline-safe fallback if the OpenFlights fetch fails: arcs between major hubs.
const HUBS: [number, number][] = [
  [28.6, 77.2], [19.1, 72.9], [51.5, -0.5], [40.6, -73.8], [25.2, 55.4], [1.36, 103.99],
  [35.5, 139.8], [37.6, -122.4], [-33.9, 151.2], [-23.4, -46.5], [50.0, 8.6], [55.4, 37.4],
  [30.1, 31.4], [-1.3, 36.9], [22.3, 114.2], [43.7, -79.6],
];
function fallbackArcs(): Arc[] {
  const out: Arc[] = [];
  for (let i = 0; i < HUBS.length; i++)
    for (let j = i + 1; j < HUBS.length; j++)
      if ((i * 7 + j * 3) % 4 === 0) out.push({ sLat: HUBS[i][0], sLng: HUBS[i][1], eLat: HUBS[j][0], eLng: HUBS[j][1] });
  return out;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function loadRoutes(): Promise<Arc[]> {
  const base = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/';
  const [aTxt, rTxt] = await Promise.all([
    fetch(base + 'airports.dat').then((r) => r.text()),
    fetch(base + 'routes.dat').then((r) => r.text()),
  ]);
  const ap = new Map<string, [number, number]>();
  for (const line of aTxt.split('\n')) {
    const f = parseCsvLine(line);
    const iata = f[4]?.replace(/"/g, '');
    const lat = parseFloat(f[6]);
    const lng = parseFloat(f[7]);
    if (iata && iata.length === 3 && Number.isFinite(lat) && Number.isFinite(lng)) ap.set(iata, [lat, lng]);
  }
  const arcs: Arc[] = [];
  let k = 0;
  for (const line of rTxt.split('\n')) {
    const f = line.split(',');
    if (f[7] !== '0') continue;
    const s = ap.get(f[2]);
    const e = ap.get(f[4]);
    if (!s || !e) continue;
    // long-haul only keeps the arcs readable; sample so the globe stays smooth.
    if (Math.abs(s[1] - e[1]) < 25 && Math.abs(s[0] - e[0]) < 20) continue;
    if (k++ % 9 !== 0) continue;
    arcs.push({ sLat: s[0], sLng: s[1], eLat: e[0], eLng: e[1] });
  }
  return arcs.length > 40 ? arcs : fallbackArcs();
}

export function HeroGlobe() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let globe: InstanceType<typeof Globe>;
    try {
      globe = new Globe(el, { animateIn: !reduced })
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg')
        .atmosphereColor('#ff5a1f')
        .atmosphereAltitude(0.2)
        .pointOfView({ lat: 22, lng: 78, altitude: 2.15 })
        .arcStartLat((d: object) => (d as Arc).sLat)
        .arcStartLng((d: object) => (d as Arc).sLng)
        .arcEndLat((d: object) => (d as Arc).eLat)
        .arcEndLng((d: object) => (d as Arc).eLng)
        .arcColor(() => ['rgba(255,150,70,0.5)', 'rgba(255,40,20,0.5)'])
        .arcStroke(0.32)
        .arcDashLength(0.28)
        .arcDashGap(1.2)
        .arcDashInitialGap(() => Math.random())
        .arcDashAnimateTime(reduced ? 0 : 4200)
        .arcsTransitionDuration(0);
    } catch {
      // WebGL unavailable (e.g. no GPU context) — the hero mark still works without the globe.
      return;
    }

    const controls = globe.controls();
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.55;
    controls.enableZoom = false; // never hijack page scroll
    controls.enablePan = false;

    const size = () => globe.width(el.clientWidth).height(el.clientHeight);
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    let alive = true;
    loadRoutes()
      .catch(() => fallbackArcs())
      .then((arcs) => { if (alive) globe.arcsData(arcs); });

    return () => {
      alive = false;
      ro.disconnect();
      // globe.gl tears down its renderer + listeners here.
      (globe as unknown as { _destructor?: () => void })._destructor?.();
      el.innerHTML = '';
    };
  }, []);

  return <div ref={host} className="sx-globe" aria-hidden="true" />;
}
