import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export type SeverityBand = { label: string; n: number; c: string };

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="chart-tip">
      <b>{p.value}</b> {p.name}
    </div>
  );
}

export function SeverityDonut({ bands }: { bands: SeverityBand[] }) {
  const data = bands.filter((b) => b.n > 0);
  const total = data.reduce((s, b) => s + b.n, 0);
  if (total === 0) return <div className="sub">No scored findings.</div>;
  return (
    <div className="severity-donut">
      <div className="severity-donut-chart">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data} dataKey="n" nameKey="label" innerRadius={44} outerRadius={64}
              paddingAngle={data.length > 1 ? 3 : 0} stroke="none" isAnimationActive
            >
              {data.map((b) => <Cell key={b.label} fill={b.c} />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="severity-donut-total"><b>{total}</b><span>scored</span></div>
      </div>
      <div className="sev-legend">
        {bands.map((b) => <span key={b.label}><i style={{ background: b.c }} />{b.label}: <b className="mono">{b.n}</b></span>)}
      </div>
    </div>
  );
}
