import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export type Band = { label: string; n: number; c: string };

function DonutTip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return <div className="v2-tip"><b>{p.value}</b> {p.name}</div>;
}

export function V2Donut({ bands, centerLabel }: { bands: Band[]; centerLabel: string }) {
  const data = bands.filter((b) => b.n > 0);
  const total = data.reduce((s, b) => s + b.n, 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.3rem', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <ResponsiveContainer width={150} height={150}>
          <PieChart>
            <Pie data={data} dataKey="n" nameKey="label" innerRadius={48} outerRadius={70} paddingAngle={data.length > 1 ? 3 : 0} stroke="none" isAnimationActive>
              {data.map((b) => <Cell key={b.label} fill={b.c} />)}
            </Pie>
            <Tooltip content={<DonutTip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <b style={{ fontSize: '1.4rem', fontWeight: 800 }}>{total}</b>
          <span style={{ fontSize: '0.64rem', color: 'var(--v2-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{centerLabel}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {bands.map((b) => (
          <span key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--v2-muted)' }}>
            <i style={{ width: 8, height: 8, borderRadius: '50%', background: b.c, display: 'inline-block' }} />
            {b.label}: <b style={{ color: '#fff' }}>{b.n}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
