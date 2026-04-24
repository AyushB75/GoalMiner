import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import type { DistributionAnalytics } from '../../types';

const POSITION_COLORS: Record<string, string> = {
  GK: '#d29922', DF: '#388bfd', MF: '#3fb950', FW: '#f85149',
};

const LEAGUE_COLORS = ['#00d4aa', '#f78166', '#79c0ff', '#ffa657', '#d2a8ff'];

function fmtVal(v: number) {
  return v >= 1e6 ? `€${(v / 1e6).toFixed(1)}M` : `€${(v / 1e3).toFixed(0)}K`;
}

export default function ValueDistribution({ data }: { data: DistributionAnalytics }) {
  return (
    <div className="space-y-6">
      {/* Value Histogram */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
          Player Value Distribution
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.histogram}>
            <defs>
              <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="range" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }}
              labelStyle={{ color: '#f0f6fc' }} itemStyle={{ color: '#00d4aa' }}
            />
            <Area type="monotone" dataKey="count" stroke="#00d4aa" fill="url(#valGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Position Breakdown */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
            Position Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.position_breakdown} dataKey="count" nameKey="position"
                cx="50%" cy="50%" outerRadius={80} label={(props) => {
                  const pos = (props as { position?: string }).position ?? '';
                  const pct = typeof props.percent === 'number' ? props.percent : 0;
                  return `${pos} ${(pct * 100).toFixed(0)}%`;
                }}
                labelLine={{ stroke: '#30363d' }}
              >
                {data.position_breakdown.map((entry, i) => (
                  <Cell key={i} fill={POSITION_COLORS[entry.position] ?? '#8b949e'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }}
                itemStyle={{ color: '#f0f6fc' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Value by League */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
            Avg Value by League
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.by_league} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => fmtVal(Number(v))} />
              <YAxis type="category" dataKey="league" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }}
                labelStyle={{ color: '#f0f6fc' }}
                formatter={(v) => fmtVal(Number(v))}
              />
              <Bar dataKey="avg_value" name="Avg Value" radius={[0, 4, 4, 0]}>
                {data.by_league.map((_, i) => (
                  <Cell key={i} fill={LEAGUE_COLORS[i % LEAGUE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 20 players */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
          Top 20 Players by Predicted Value
        </h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={data.top_20} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => fmtVal(Number(v))} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#f0f6fc', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip
              contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }}
              labelStyle={{ color: '#f0f6fc' }}
              formatter={(v) => fmtVal(Number(v))}
            />
            <Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]}>
              {data.top_20.map((_, i) => (
                <Cell key={i} fill={i < 3 ? '#00d4aa' : '#388bfd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
