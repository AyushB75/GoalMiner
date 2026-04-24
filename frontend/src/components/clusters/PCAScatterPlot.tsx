import { useMemo, memo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import type { ClusterPlayer } from '../../types';

const CLUSTER_COLORS = ['#00d4aa', '#f78166', '#79c0ff', '#ffa657', '#d2a8ff'];

interface TooltipProps {
  active?: boolean;
  payload?: { payload: ClusterPlayer }[];
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-[#f0f6fc]">{p.name}</p>
      <p className="text-[#8b949e]">Cluster {p.cluster} · {p.position}</p>
      {p.value > 0 && (
        <p className="text-[#00d4aa]">
          €{p.value >= 1e6 ? `${(p.value / 1e6).toFixed(1)}M` : `${(p.value / 1e3).toFixed(0)}K`}
        </p>
      )}
    </div>
  );
}

export default memo(function PCAScatterPlot({ players }: { players: ClusterPlayer[] }) {
  // Pre-group by cluster once — avoids O(n × k) filtering on every render
  const { clusters, grouped } = useMemo(() => {
    const map = new Map<number, ClusterPlayer[]>();
    for (const p of players) {
      if (!map.has(p.cluster)) map.set(p.cluster, []);
      map.get(p.cluster)!.push(p);
    }
    return { clusters: [...map.keys()].sort(), grouped: map };
  }, [players]);

  return (
    <div className="w-full" style={{ height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <XAxis
            dataKey="pca_x" name="PC1" type="number"
            tick={{ fill: '#8b949e', fontSize: 11 }}
            axisLine={{ stroke: '#30363d' }} tickLine={false}
            label={{ value: 'PC1', position: 'insideBottom', offset: -2, fill: '#8b949e', fontSize: 11 }}
          />
          <YAxis
            dataKey="pca_y" name="PC2" type="number"
            tick={{ fill: '#8b949e', fontSize: 11 }}
            axisLine={{ stroke: '#30363d' }} tickLine={false}
            label={{ value: 'PC2', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend
            wrapperStyle={{ color: '#8b949e', fontSize: 12 }}
            formatter={(value) => `Cluster ${value}`}
          />
          {clusters.map(c => {
            const pts = grouped.get(c) ?? [];
            const color = CLUSTER_COLORS[c % CLUSTER_COLORS.length];
            return (
              <Scatter key={c} name={String(c)} data={pts} fill={color}>
                {pts.map((_, i) => (
                  <Cell key={i} fill={color} fillOpacity={0.85} />
                ))}
              </Scatter>
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
});
