// Mirrors ALLOWED_HOSTS and the host check in engine/probe/safe-http.mjs, evaluated in the browser.
// Tap a host: a packet travels to the gate and either passes into the lab or is stopped.
import { useId, useRef, useState } from 'react';
import { motion, useAnimate, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Lock, Plus, ScanLine, X } from 'lucide-react';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const PRESETS = ['localhost:3000', '127.0.0.1:8080', 'worldmonitor.app', 'worldmonitor.app.evil.com'];
const EASE = [0.23, 1, 0.32, 1] as const;

type Kind = 'allow' | 'deny' | 'invalid';
type Verdict = { kind: Kind; host: string; raw: string };

function judge(raw: string): Verdict {
  const text = raw.trim();
  try {
    const url = new URL(text.includes('://') ? text : `http://${text}`);
    const host = url.hostname.toLowerCase();
    return { kind: ALLOWED_HOSTS.has(host) ? 'allow' : 'deny', host, raw: text };
  } catch {
    return { kind: 'invalid', host: text, raw: text };
  }
}

export function SafetyGate() {
  const id = useId();
  const reduce = useReducedMotion();
  const [, animate] = useAnimate();
  const stage = useRef<HTMLDivElement>(null);
  const scan = useRef<HTMLDivElement>(null);
  const gate = useRef<HTMLDivElement>(null);
  const lab = useRef<HTMLDivElement>(null);
  const packet = useRef<HTMLSpanElement>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Verdict | null>(null);
  const [seen, setSeen] = useState<Record<string, Kind>>({});
  const [flash, setFlash] = useState<'lab' | 'net' | null>(null);
  const [custom, setCustom] = useState(false);
  const [value, setValue] = useState('');

  const run = async (raw: string) => {
    if (busy || !raw.trim()) return;
    const v = judge(raw);
    setBusy(v.raw);
    setResult(null);
    setFlash(null);

    const s = stage.current, sc = scan.current, g = gate.current, l = lab.current, p = packet.current;
    const play = async () => {
      if (!(s && sc && g && l && p)) return;
      const sr = s.getBoundingClientRect();
      const mid = (r: DOMRect) => r.top - sr.top + r.height / 2 - 7;
      const scr = sc.getBoundingClientRect(), gr = g.getBoundingClientRect();
      await animate(p, { x: scr.right - sr.left + 4, y: mid(scr), opacity: 0, scale: 0.5 }, { duration: 0 });
      await animate(p, { opacity: 1, scale: 1 }, { duration: 0.12 });
      await animate(p, { x: gr.left - sr.left - 18 }, { duration: 0.45, ease: EASE });
      if (v.kind === 'allow') {
        const lr = l.getBoundingClientRect();
        await animate(p, { x: gr.right - sr.left + 4 }, { duration: 0.18 });
        await animate(p, { x: lr.left - sr.left + 22, y: mid(lr) }, { duration: 0.42, ease: EASE });
        animate(p, { opacity: 0, scale: 1.8 }, { duration: 0.28 });
      } else {
        animate(g, { x: [0, -6, 6, -3, 3, 0] }, { duration: 0.34 });
        await animate(p, { opacity: 0, scale: 2.2 }, { duration: 0.28 });
      }
    };
    // A stalled animation (background tab, dropped frames) must never lock the buttons.
    if (!reduce) await Promise.race([play(), new Promise((r) => window.setTimeout(r, 1700))]);

    setResult(v);
    setSeen((m) => ({ ...m, [v.raw]: v.kind }));
    setFlash(v.kind === 'allow' ? 'lab' : 'net');
    setBusy(null);
    window.setTimeout(() => setFlash(null), 1000);
  };

  const untouched = Object.keys(seen).length === 0 && !busy;

  return (
    <div className="sg">
      <div className="sg-head">
        <h3>Try to reach production</h3>
        <span>Pick a host. The gate decides.</span>
      </div>

      <div className="sg-hosts" role="group" aria-label="Send a scanner request to a host">
        {PRESETS.map((h, i) => {
          const k = seen[h];
          return (
            <button
              key={h}
              type="button"
              className={`sg-host${k ? ` ${k === 'allow' ? 'ok' : 'no'}` : ''}${busy === h ? ' busy' : ''}${untouched && i === 2 ? ' hint' : ''}`}
              title={h}
              onClick={() => run(h)}
              disabled={!!busy}
            >
              <span className="sg-host-name">{h}</span>
              <span className="sg-host-end">
                {k === 'allow' ? <><Check size={14} aria-hidden />Allowed</> : k ? <><X size={14} aria-hidden />Refused</> : <>Send<ArrowRight size={14} aria-hidden /></>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="sg-stage" ref={stage} aria-hidden>
        <div className="sg-node" ref={scan}><ScanLine size={16} /><span>Scanner</span></div>
        <div className={`sg-wall ${result && !busy ? result.kind : ''}`} ref={gate}><Lock size={15} /><span>safe-http</span></div>
        <div className="sg-zones">
          <div className={`sg-zone lab${flash === 'lab' ? ' flash' : ''}`} ref={lab}>Local lab</div>
          <div className={`sg-zone net${flash === 'net' ? ' flash' : ''}`}>Production and the internet</div>
        </div>
        <span className="sg-packet" ref={packet} />
      </div>

      <div className="sg-result" aria-live="polite">
          <motion.div
            key={busy ? 'busy' : result ? `${result.raw}-${result.kind}` : 'idle'}
            className={`sg-res ${busy ? 'wait' : result?.kind ?? 'idle'}`}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            {busy && <>Checking <code>{busy}</code></>}
            {!busy && !result && <>Nothing sent yet.</>}
            {!busy && result?.kind === 'allow' && <><Check size={15} aria-hidden /> <span><b>Allowed.</b> <code>{result.host}</code> is inside the lab.</span></>}
            {!busy && result?.kind === 'deny' && <><X size={15} aria-hidden /> <span><b>Refused.</b> <code>HostNotAllowedError</code>, thrown before any network call.</span></>}
            {!busy && result?.kind === 'invalid' && <><X size={15} aria-hidden /> <span><b>Refused.</b> Not a valid URL.</span></>}
          </motion.div>
      </div>

      {custom ? (
        <form className="sg-field" onSubmit={(e) => { e.preventDefault(); run(value); }}>
          <label htmlFor={id} className="sr-only">Your own host</label>
          <input id={id} value={value} onChange={(e) => setValue(e.target.value)} placeholder="type any host, e.g. 10.0.0.5" spellCheck={false} autoComplete="off" autoCapitalize="off" autoFocus disabled={!!busy} />
          <button type="submit" className="sg-send" disabled={!!busy || !value.trim()}>Send</button>
        </form>
      ) : (
        <button type="button" className="sg-own" onClick={() => setCustom(true)}><Plus size={14} aria-hidden /> Try your own host</button>
      )}
    </div>
  );
}
