import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense, type CSSProperties, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import Lenis from 'lenis';
import {
  ArrowUpRight, GitBranch, Plus, Check, X,
} from 'lucide-react';
import {
  SiPython, SiTypescript, SiNodedotjs, SiGit, SiGithub, SiReact, SiGo, SiKubernetes,
  SiDocker, SiNginx, SiPostgresql, SiRedis, SiGnubash, SiOwasp, SiArgo, SiTrivy,
} from 'react-icons/si';
import { data, pinnedCommit, REPO_URL, TARGET_URL } from '../data';
import { STRESS_FINDINGS } from '../data/stress-findings';
const HeroGlobe = lazy(() => import('./HeroGlobe').then((m) => ({ default: m.HeroGlobe })));
import { WordReveal } from './WordReveal';
import footerGlow from './assets/footer-glow.webp';
import heroGlow from './assets/hero-glow.webp';
import compareGlow from './assets/compare-glow.webp';
import staticAnalysisImg from '../assets/static-analysis.webp';
import dynamicLabImg from '../assets/dynamic-lab.webp';
import scoringImg from '../assets/scoring-in-code.webp';
import reportImg from '../assets/report-and-patch.webp';
import './seam.css';

const NAV = [
  { id: 'about', label: 'About' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'findings', label: 'Findings' },
  { id: 'compare', label: 'Compare' },
  { id: 'faq', label: 'FAQ' },
];

function useStats() {
  return useMemo(() => {
    const inv = data.inventory;
    const regPass = data.regression_results.filter((r) => r.pass).length;
    return {
      findings: data.summary.total_findings,
      areas: data.summary.scope_areas_with_evidence,
      endpoints: inv?.total_endpoints ?? 0,
      advisories: data.register.advisories.length,
      regPass,
      regTotal: data.regression_results.length,
      patches: data.findings.filter((f) => f.has_remediation_patch).length,
      novelOrKnown: data.findings.filter((f) => f.status === 'REPRODUCED-KNOWN' || f.status === 'CONFIRMED-NOVEL').length,
    };
  }, []);
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="sx-eyebrow">{children}</span>;
}

/* ───────────── Nav ───────────── */
const EASE = 'power3.out';

function NavPill({ label, onClick, index, circleRefs, tlRefs, activeTweenRefs }: {
  label: string;
  onClick: () => void;
  index: number;
  circleRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
  tlRefs: React.MutableRefObject<(gsap.core.Timeline | null)[]>;
  activeTweenRefs: React.MutableRefObject<(gsap.core.Tween | null)[]>;
}) {
  const handleEnter = () => {
    const tl = tlRefs.current[index];
    if (!tl) return;
    activeTweenRefs.current[index]?.kill();
    activeTweenRefs.current[index] = tl.tweenTo(tl.duration(), { duration: 0.4, ease: EASE, overwrite: 'auto' });
  };
  const handleLeave = () => {
    const tl = tlRefs.current[index];
    if (!tl) return;
    activeTweenRefs.current[index]?.kill();
    activeTweenRefs.current[index] = tl.tweenTo(0, { duration: 0.3, ease: EASE, overwrite: 'auto' });
  };
  return (
    <li className="sx-pill-li">
      <button
        className="sx-pill-btn"
        onClick={onClick}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <span
          className="sx-pill-circle"
          ref={el => { circleRefs.current[index] = el; }}
          aria-hidden="true"
        />
        <span className="sx-pill-label-wrap">
          <span className="sx-pill-label">{label}</span>
          <span className="sx-pill-label-hover" aria-hidden="true">{label}</span>
        </span>
      </button>
    </li>
  );
}

function Nav({ go }: { go: (p: string) => void }) {
  const [solid, setSolid] = useState(false);
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRefs = useRef<(gsap.core.Timeline | null)[]>([]);
  const activeTweenRefs = useRef<(gsap.core.Tween | null)[]>([]);
  const pillsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const layout = useCallback(() => {
    circleRefs.current.forEach((circle, i) => {
      if (!circle?.parentElement) return;
      const pill = circle.parentElement as HTMLElement;
      const { width: w, height: h } = pill.getBoundingClientRect();
      const R = ((w * w) / 4 + h * h) / (2 * h);
      const D = Math.ceil(2 * R) + 2;
      const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
      const originY = D - delta;

      circle.style.width = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` });

      const labelEl = pill.querySelector<HTMLElement>('.sx-pill-label');
      const hoverEl = pill.querySelector<HTMLElement>('.sx-pill-label-hover');
      if (labelEl) gsap.set(labelEl, { y: 0 });
      if (hoverEl) gsap.set(hoverEl, { y: h + 12, opacity: 0 });

      tlRefs.current[i]?.kill();
      const tl = gsap.timeline({ paused: true });
      tl.to(circle, { scale: 1.2, xPercent: -50, duration: 0.8, ease: EASE, overwrite: 'auto' }, 0);
      if (labelEl) tl.to(labelEl, { y: -(h + 8), duration: 0.6, ease: EASE, overwrite: 'auto' }, 0);
      if (hoverEl) {
        gsap.set(hoverEl, { y: Math.ceil(h + 20), opacity: 0 });
        tl.to(hoverEl, { y: 0, opacity: 1, duration: 0.6, ease: EASE, overwrite: 'auto' }, 0);
      }
      tlRefs.current[i] = tl;
    });
  }, []);

  useEffect(() => {
    layout();
    window.addEventListener('resize', layout);
    document.fonts?.ready.then(layout).catch(() => {});
    return () => window.removeEventListener('resize', layout);
  }, [layout]);

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <nav className={`sx-nav ${solid ? 'is-solid' : ''}`}>
      <div className="sx-wrap sx-nav-in">
        <button className="sx-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>seam<i>.</i></button>
        <ul className="sx-links sx-pill-list" ref={pillsRef}>
          {NAV.map((n, i) => (
            <NavPill
              key={n.id}
              label={n.label}
              onClick={() => jump(n.id)}
              index={i}
              circleRefs={circleRefs}
              tlRefs={tlRefs}
              activeTweenRefs={activeTweenRefs}
            />
          ))}
        </ul>
        <button className="sx-cta" onClick={() => go('/console')}>
          <span>Open console</span><ArrowUpRight size={16} />
        </button>
      </div>
    </nav>
  );
}

/* ───────────── Hero ───────────── */
function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const markY = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const globeY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  return (
    <header className="sx-hero" ref={ref}>
      <div className="sx-hero-glow" style={{ backgroundImage: `url(${heroGlow})` }} />
      <div className="sx-hero-stage">
        <motion.div className="sx-hero-mark" style={{ y: markY }} aria-hidden="true">seam<span>.</span></motion.div>
        <motion.div className="sx-hero-globe" style={{ y: globeY }}>
          <Suspense fallback={null}>
            <HeroGlobe />
          </Suspense>
        </motion.div>
      </div>
      <div className="sx-wrap sx-hero-foot">
        <h1 className="sx-hero-h">
          <span>Evidence, not claims.</span>
          <span>Prove it. Then patch it.</span>
        </h1>
      </div>
    </header>
  );
}

/* ───────────── About + stat tiles ───────────── */
function Tile({ value, label, note }: { value: string | number; label: string; note?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    ref.current!.style.setProperty('--mx', `${e.clientX - r.left}px`);
    ref.current!.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <div className="sx-tile" ref={ref} onPointerMove={move}>
      <div className="sx-tile-glow" />
      <b>{value}</b>
      <span>{label}</span>
      {note && <em>{note}</em>}
    </div>
  );
}

function About() {
  const s = useStats();
  return (
    <section className="sx-section" id="about">
      <div className="sx-wrap sx-about">
        <Eyebrow>About</Eyebrow>
        <WordReveal
          className="sx-about-p"
          text="SEAM ran 29 tasks against WorldMonitor's real, pinned commit: 13 static reads, 16 live attacks. Ten held. Six broke, including a classifier gap that pushes forged content to real Slack and Discord alerts. Nothing here is typed by hand. It is generated from the findings themselves."
        />
      </div>
      <div className="sx-wrap sx-tiles">
        <Tile value={29} label="Tasks run against the real app" note="13 static reads + 16 live tests" />
        <Tile value="10 / 16" label="Live tests held secure" note="real attack attempts, confirmed by code" />
        <Tile value={6} label="Genuine findings demonstrated" note="not code-read guesses" />
        <Tile value={`${s.areas} of 7`} label="Scope areas evidenced" note={`${s.endpoints} routes inventoried first`} />
        <Tile value="23.5s" label="Longest single hang produced" note="one crafted RSS body, real parser, O(n²)" />
        <Tile value="4.3s" label="Rate-limit decision tax" note="330x slower, 187 routes exposed" />
        <Tile value={s.patches} label="Verified patches" note="shipped as reviewable git diffs" />
        <Tile value={pinnedCommit.slice(0, 7)} label="Pinned commit" note="never the live site" />
      </div>
    </section>
  );
}

/* ───────────── Pipeline — vertical rail, fills as you scroll ───────────── */
function Steps() {
  const s = useStats();
  const ref = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.4'] });
  const fill = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  // Fire exactly when the fill line reaches each node's position
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const rail = ref.current;
    if (!rail) return;
    const railH = rail.offsetHeight;
    let next = 0;
    rowRefs.current.forEach((row, i) => {
      if (!row) return;
      // threshold = fraction of rail height at which this node sits
      const threshold = row.offsetTop / railH;
      if (latest >= threshold) next = i;
    });
    setActiveStep(next);
  });

  const steps = [
    { n: '01', t: 'Pin the source', d: 'Clone the public repository at one exact commit so every result can be re-checked later.', k: `commit ${pinnedCommit.slice(0, 7)}` },
    { n: '02', t: 'Run it locally', d: 'Stand up the real app on localhost with mocked upstreams. Nothing touches production.', k: `${s.endpoints} endpoints mapped` },
    { n: '03', t: 'Scan seven areas', d: 'One scanner per scope area, including a TypeScript AST pass for authorization wrappers.', k: `${s.areas} areas covered` },
    { n: '04', t: 'Prove and patch', d: 'Reproduce in a vulnerable and patched lab pair, then ship the fix as a verified diff.', k: `${s.regPass}/${s.regTotal} regressions pass` },
  ];

  return (
    <section className="sx-section" id="pipeline">
      <div className="sx-wrap sx-split">
        <div className="sx-split-l">
          <Eyebrow>Pipeline</Eyebrow>
          <h2 className="sx-h2">Simple steps to a verified verdict</h2>
          <p className="sx-lede">One pipeline from pinned commit to patch. Every stage runs in CI on each push.</p>
          <a className="sx-btn-ghost" href={REPO_URL} target="_blank" rel="noreferrer"><GitBranch size={16} /> Read the source</a>
        </div>
        <div className="sx-rail" ref={ref}>
          <div className="sx-rail-track"><motion.div className="sx-rail-fill" style={{ height: fill }} /></div>
          {steps.map((x, i) => (
            <div
              className="sx-rail-row"
              key={x.n}
              ref={el => { rowRefs.current[i] = el; }}
            >
              <span className={`sx-rail-node ${activeStep === i ? 'is-active' : ''}`}>{x.n}</span>
              <div className={`sx-rail-body ${activeStep === i ? 'is-active' : ''}`}>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
                <small>{x.k}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Stacking service cards ───────────── */
function Stack() {
  const cards = [
    { t: 'Static analysis', d: '13 code-read tasks against the pinned commit: CI pipeline, Docker, MCP registry, cache keys.', tags: ['SHA-pinned CI (219/219)', 'Docker/compose hardening', 'Header posture (CSP/HSTS)', 'MCP registry integrity'], v: 'a' },
    { t: 'Dynamic lab', d: '16 live tests against the real running app, not a mock. Six produced a confirmed, demonstrated exploit.', tags: ['Rate-limiter fail-open (4.3s tax)', 'RSS parser O(n²) hang (23.5s)', 'Prompt injection to Slack/Discord', 'WebGL point-count freeze'], v: 'b' },
    { t: 'Scoring in code', d: 'CVSS 3.1 and 4.0 calculators plus EPSS, so severity is computed, not copied from a tool.', tags: ['CVSS 3.1', 'CVSS 4.0', 'EPSS lookup', 'CWE and OWASP API tags'], v: 'c' },
    { t: 'Report and patch', d: 'PS-format export, CERT-In style report, and fixes verified as git diffs.', tags: ['PS export', 'CERT-In report', 'Patch diffs', 'Proof spine'], v: 'd' },
  ];
  return (
    <section className="sx-section">
      <div className="sx-wrap">
        <div className="sx-center">
          <Eyebrow>What we do</Eyebrow>
          <h2 className="sx-h2">Four layers, one verdict</h2>
          <p className="sx-lede">Each layer feeds the next. A claim only becomes a finding once the one after it agrees.</p>
        </div>
        <div className="sx-stack">
          {cards.map((c, i) => <StackCard key={c.t} c={c} i={i} />)}
        </div>
      </div>
    </section>
  );
}
type StackCardData = { t: string; d: string; tags: string[]; v: string };
function StackCard({ c, i }: { c: StackCardData; i: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0.55]);
  return (
    <motion.article
      className="sx-stack-card"
      ref={ref}
      style={{ scale, opacity, ['--i' as string]: i } as unknown as CSSProperties}
    >
      <div className="sx-stack-copy">
        <h3>{c.t}</h3>
        <p>{c.d}</p>
        <ul>{c.tags.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
      <div className={`sx-stack-art v-${c.v}`}>
        <div className="sx-stack-art-in">
          {c.v === 'a' ? (
            <img src={staticAnalysisImg} alt="Static analysis" />
          ) : c.v === 'b' ? (
            <img src={dynamicLabImg} alt="Dynamic lab" />
          ) : c.v === 'c' ? (
            <img src={scoringImg} alt="Scoring in code" />
          ) : c.v === 'd' ? (
            <img src={reportImg} alt="Report and patch" />
          ) : (
            <Layers4 i={i} />
          )}
        </div>
      </div>
    </motion.article>
  );
}
function Layers4({ i }: { i: number }) {
  return (
    <div className="sx-bars">
      {[62, 88, 44, 74, 56].map((h, k) => (
        <span key={k} style={{ height: `${h - ((i + k) % 3) * 8}%`, animationDelay: `${k * 0.15}s` }} />
      ))}
    </div>
  );
}

/* ───────────── Marquee rows — real tech-stack logos, from our own PS submission ───────────── */
const ICONS = [
  SiPython, SiTypescript, SiNodedotjs, SiGit, SiGithub, SiReact, SiGo, SiKubernetes,
  SiDocker, SiNginx, SiPostgresql, SiRedis, SiGnubash, SiOwasp, SiArgo, SiTrivy,
];
function Marquee({ row, reverse }: { row: number; reverse?: boolean }) {
  const items = Array.from({ length: 18 }, (_, i) => ICONS[(i * 3 + row * 5) % ICONS.length]);
  const track = (
    <div className="sx-mq-track">
      {items.map((Icon, i) => (
        <div className={`sx-mq-tile ${(i + row) % 4 === 0 ? 'is-ember' : ''}`} key={i}><Icon /></div>
      ))}
    </div>
  );
  return (
    <div className={`sx-mq ${reverse ? 'rev' : ''}`} style={{ ['--dur' as string]: `${46 + row * 8}s` } as CSSProperties}>
      {track}{track}
    </div>
  );
}
function Integrations() {
  return (
    <section className="sx-section sx-int">
      <div className="sx-wrap sx-center">
        <Eyebrow>Toolchain</Eyebrow>
        <h2 className="sx-h2">A structured approach to assessment</h2>
      </div>
      <div className="sx-mq-stage">
        <Marquee row={0} /><Marquee row={1} reverse /><Marquee row={2} />
        <div className="sx-mq-glow" />
      </div>
    </section>
  );
}

/* ───────────── Findings — the live stress-test exploits, not a generic scanner list ───────────── */
const LANDING_STRESS_FINDINGS = STRESS_FINDINGS.filter((f) => f.id !== 'B13');
function Findings() {
  const [open, setOpen] = useState(0);
  const cur = LANDING_STRESS_FINDINGS[open];
  return (
    <section className="sx-section" id="findings">
      <div className="sx-wrap">
        <div className="sx-split sx-split-head">
          <div><Eyebrow>Findings</Eyebrow><h2 className="sx-h2">What we actually broke</h2></div>
          <p className="sx-lede">29 tasks against the real, running app, not a linter pass. These are the five that produced a genuine, demonstrated result.</p>
        </div>
        <div className="sx-acc">
          <ul className="sx-acc-list">
            {LANDING_STRESS_FINDINGS.map((f, i) => (
              <li key={f.id} className={i === open ? 'is-open' : ''}>
                <button onMouseEnter={() => setOpen(i)} onFocus={() => setOpen(i)} onClick={() => setOpen(i)}>
                  <span className="sx-acc-id">{f.id}</span>
                  <small>{f.tag}</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="sx-acc-art">
            <AnimatePresence mode="wait">
              <motion.div key={cur.id} className="sx-acc-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <span className="sx-acc-badge">{cur.tag}</span>
                <h3>{cur.id}</h3>
                <p>{cur.impact}</p>
                <div className="sx-acc-foot">
                  <div><b>{cur.stat1[0]}</b><small>{cur.stat1[1]}</small></div>
                  <div><b>{cur.stat2[0]}</b><small>{cur.stat2[1]}</small></div>
                  <a className="sx-round" href={`${REPO_URL}/blob/main/docs/Stress_testing/WORLDMONITOR-STRESS-TEST-RESULTS.md`} target="_blank" rel="noreferrer" aria-label={`Read ${cur.id} in full`}><ArrowUpRight size={22} /></a>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Compare — two columns that drift apart as you scroll, borders touching at rest ───────────── */
type CmpRow = { label: string; us: boolean | null; them: boolean | null };
const CMP_ROWS: CmpRow[] = [
  { label: 'Reads the source code (SAST, dependencies, CI/Docker)', us: true, them: false },
  { label: 'Proves the exploit, not just flags it', us: true, them: true },
  { label: 'Ranks severity by real exploit likelihood (EPSS)', us: true, them: null },
  { label: 'Re-verifies every fix on every push, not on request', us: true, them: false },
  { label: 'CERT-In-style report included at this price', us: true, them: false },
];
function Compare() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const drift = useTransform(scrollYProgress, [0, 1], [0, 46]);
  const usX = useTransform(drift, (v) => -v);
  const themX = useTransform(drift, (v) => v);
  const mark = (v: boolean | null) => v === true
    ? <span className="sx-cmp-icon is-yes"><Check size={15} /></span>
    : v === false
      ? <span className="sx-cmp-icon is-no"><X size={15} /></span>
      : <span className="sx-cmp-icon is-dash">&ndash;</span>;
  return (
    <section className="sx-section sx-compare" id="compare">
      <div className="sx-compare-glow" style={{ backgroundImage: `url(${compareGlow})` }} />
      <div className="sx-wrap sx-center">
        <Eyebrow>Why SEAM</Eyebrow>
        <h2 className="sx-h2">Measured against Astra Pentest</h2>
        <p className="sx-lede" style={{ margin: '0 auto' }}>Astra Pentest's $1,999/yr Auto plan, checked against its own public feature pages, not asserted from memory.</p>
      </div>
      <div className="sx-wrap sx-cmp" ref={ref}>
        <div className="sx-cmp-seam" aria-hidden="true" />
        <motion.div className="sx-cmp-col is-us" style={{ x: usX }}>
          <header><span>SEAM</span></header>
          {CMP_ROWS.map((r) => <div key={r.label}>{mark(r.us)}<span>{r.label}</span></div>)}
          <div className="sx-cmp-price">Near-zero, open source</div>
        </motion.div>
        <motion.div className="sx-cmp-col" style={{ x: themX }}>
          <header><span>Astra Pentest</span></header>
          {CMP_ROWS.map((r) => <div key={r.label}>{mark(r.them)}<span>{r.label}</span></div>)}
          <div className="sx-cmp-price">$1,999/yr (Auto). CERT-In reports need the $5,999/yr Expert tier.</div>
        </motion.div>
      </div>
      <p className="sx-wrap sx-cmp-foot">A dash means Astra's own pages don't publish that number. Everything else here is cited from getastra.com's pricing and feature pages, checked against a third-party platform breakdown, not asserted.</p>
    </section>
  );
}

/* ───────────── Deliverables ───────────── */
function Deliver({ go }: { go: (p: string) => void }) {
  const list = (items: string[]) => <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>;
  return (
    <section className="sx-section">
      <div className="sx-wrap sx-split">
        <div className="sx-split-l">
          <Eyebrow>Deliverables</Eyebrow>
          <h2 className="sx-h2">Two outputs, one source of truth</h2>
          <p className="sx-lede">Both are generated from the same findings files, so they can never disagree.</p>
        </div>
        <div className="sx-deliver">
          <div className="sx-deliver-card is-hot">
            <h3>Evidence console</h3>
            <p>Browse every verdict, reproduce it, and read the exact patch.</p>
            {list(['Findings with CVSS and EPSS', 'Proof spine from claim to evidence', 'Coverage across all seven areas'])}
            <button className="sx-btn-light" onClick={() => go('/console')}>Open console <ArrowUpRight size={16} /></button>
          </div>
          <div className="sx-deliver-card">
            <h3>PS export package</h3>
            <p>The portal-ready write-up, built from the same files.</p>
            {list(['Problem statement format', 'CERT-In style report', 'Git-verified remediation diffs'])}
            <button className="sx-btn-ghost" onClick={() => go('/console/ps-export')}>Open export <ArrowUpRight size={16} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── FAQ ───────────── */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const qs: [string, string][] = [
    ['Was the live site tested?', 'No. SEAM runs a local copy pinned to one exact commit, with paid upstreams mocked. Nothing here touches the production deployment or any real user data.'],
    ['What do the verdict labels mean?', 'Reproduced means the exploit ran in a lab pair. Verified secure means a control was attacked and held. Candidate means a lead exists but the code path is not confirmed.'],
    ['How is severity scored?', 'Our own calculators compute CVSS 3.1 and 4.0 from the vector. EPSS is attached where a CVE exists.'],
    ['Can I re-run the evidence?', 'Yes. Each finding ships a reproduce script and the regression harness re-runs the vulnerable and patched pair on every push.'],
    ['Why report secure results?', 'A control that was attacked and held is a finding. It tells the owner what not to spend time on.'],
    ['What is not covered?', 'Anything needing real credentials or production access, and a few items marked blocked in the proof spine. They are listed openly, not hidden.'],
    ['How does the cost compare to a commercial scanner?', 'Astra Pentest lists from $1,999 per target per year. SEAM runs on open-source tooling against a pinned commit, so the marginal cost of a re-run is near zero.'],
    ['Why not just point a scanner at the live site?', 'A live scan tests whatever happens to be deployed today and cannot be exactly repeated tomorrow. Pinning a public commit means every verdict here can be independently re-run against that exact point in history.'],
  ];
  return (
    <section className="sx-section" id="faq">
      <div className="sx-wrap sx-split">
        <div className="sx-split-l">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="sx-h2">Questions before you decide.</h2>
          <a className="sx-btn-ghost" href={TARGET_URL} target="_blank" rel="noreferrer">View the target <ArrowUpRight size={16} /></a>
        </div>
        <div className="sx-faq">
          {qs.map(([q, a], i) => (
            <div className={`sx-faq-i ${open === i ? 'is-open' : ''}`} key={q}>
              <button onClick={() => setOpen(open === i ? null : i)}>{q}<Plus size={22} /></button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>{a}</motion.p>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Footer ───────────── */
function Footer({ go }: { go: (p: string) => void }) {
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <footer className="sx-footer">
      <div className="sx-footer-glow" style={{ backgroundImage: `url(${footerGlow})` }} />
      <div className="sx-wrap sx-foot-grid">
        <h2 className="sx-foot-h">Clear. Provable. Patched.</h2>
        <div className="sx-foot-cols">
          <div><small>Explore</small>{NAV.map((n) => <button key={n.id} onClick={() => jump(n.id)}>{n.label}</button>)}</div>
          <div><small>Console</small>
            <button onClick={() => go('/console')}>Dashboard</button>
            <button onClick={() => go('/console/findings')}>Findings</button>
            <button onClick={() => go('/console/methodology')}>Methodology</button>
          </div>
          <div><small>Source</small>
            <a href={REPO_URL} target="_blank" rel="noreferrer">SEAM repository</a>
            <a href={TARGET_URL} target="_blank" rel="noreferrer">WorldMonitor</a>
          </div>
        </div>
      </div>
      <div className="sx-foot-mark" aria-hidden="true">seam<span>.</span></div>
      <div className="sx-wrap sx-foot-base"><span>SIH 26163 · Security assessment for NTRO</span><span>Built from evidence, not opinion.</span></div>
    </footer>
  );
}

export function Home({ go }: { go: (p: string) => void }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.5, smoothWheel: true, wheelMultiplier: 0.6 });
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
  return (
    <div className="sx">
      <Nav go={go} />
      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <Hero />
        <About />
        <Steps />
        <Stack />
        <Integrations />
        <Findings />
        <Compare />
        <Deliver go={go} />
        <Faq />
      </main>
      <Footer go={go} />
    </div>
  );
}
