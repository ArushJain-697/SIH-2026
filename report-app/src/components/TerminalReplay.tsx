import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { data } from '../data';

type Line = { text: string; kind: 'cmd' | 'ok' | 'fail' | 'dim' | 'plain' | 'strong' };

function buildLines(): Line[] {
  const results = data.regression_results;
  const failures = results.filter((r) => !r.pass).length;
  const lines: Line[] = [
    { text: 'node framework/regression-harness/run.mjs', kind: 'cmd' },
    { text: 'Advisory-Aware Regression Harness — auto-discovering lab/repro-services/*/manifest.mjs', kind: 'dim' },
    { text: `Discovered ${results.length} reproduction manifest(s)`, kind: 'plain' },
    { text: '', kind: 'plain' },
  ];
  for (const r of results) {
    lines.push({ text: `[${r.pass ? 'PASS' : 'FAIL'}] ${r.advisory}`, kind: r.pass ? 'ok' : 'fail' });
    lines.push({ text: `       ${r.detail}`, kind: 'dim' });
  }
  lines.push({ text: '', kind: 'plain' });
  lines.push({ text: `${results.length} manifest(s) checked, ${failures} regression(s)`, kind: 'strong' });
  return lines;
}

export function TerminalReplay({ startDelay = 0 }: { startDelay?: number }) {
  const lines = useMemo(buildLines, []);
  const [shown, setShown] = useState(0);
  const [typed, setTyped] = useState(0);
  const [run, setRun] = useState(0);

  const cmd = lines[0].text;

  useEffect(() => {
    setShown(0);
    setTyped(0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setTyped(cmd.length);
      setShown(lines.length);
      return;
    }
    let t = run === 0 ? startDelay : 0;
    const timers: number[] = [];
    for (let i = 1; i <= cmd.length; i++) {
      t += 28;
      timers.push(window.setTimeout(() => setTyped(i), t));
    }
    t += 350;
    for (let i = 1; i <= lines.length; i++) {
      t += lines[i - 1]?.kind === 'dim' ? 140 : 320;
      timers.push(window.setTimeout(() => setShown(i), t));
    }
    return () => timers.forEach(clearTimeout);
  }, [run, cmd.length, lines, startDelay]);

  const done = shown >= lines.length;

  return (
    <div className="surface-dark terminal">
      <div className="terminal-bar">
        <div className="traffic"><span /><span /><span /></div>
        <div className="terminal-title">seam: regression harness</div>
        <span className="badge dark">REPLAY</span>
      </div>
      <div className="terminal-body" aria-live="polite">
        <div className="cmd">
          {cmd.slice(0, typed)}
          {shown === 0 && <span className="caret" />}
        </div>
        {lines.slice(1, shown).map((l, i) => (
          <div key={i} className={l.kind === 'plain' ? undefined : l.kind}>
            {l.text || ' '}
          </div>
        ))}
        {shown > 0 && !done && <span className="caret" />}
      </div>
      <div className="terminal-foot">
        <span>Replay of captured output · {new Date(data.generated_at).toISOString().slice(0, 10)}</span>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => setRun((n) => n + 1)} disabled={!done}>
          <RotateCcw size={13} /> Replay
        </button>
      </div>
    </div>
  );
}
