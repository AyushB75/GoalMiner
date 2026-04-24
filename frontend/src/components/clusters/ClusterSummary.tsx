import type { ClusterPlayer } from '../../types';
import PositionBadge from '../shared/PositionBadge';

const CLUSTER_COLORS = ['#00d4aa', '#f78166', '#79c0ff', '#ffa657'];

function fmtVal(v: number) {
  return v >= 1e6 ? `€${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `€${(v / 1e3).toFixed(0)}K` : 'N/A';
}

export default function ClusterSummary({
  players, clusterStats,
}: {
  players: ClusterPlayer[];
  clusterStats: Record<string, Record<string, number>>;
}) {
  const clusters = [...new Set(players.map(p => p.cluster))].sort();

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider">Cluster Breakdown</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clusters.map(c => {
          const members = players.filter(p => p.cluster === c);
          const color = CLUSTER_COLORS[c % CLUSTER_COLORS.length];
          const stats = clusterStats[String(c)] ?? {};
          const topPlayers = [...members]
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

          return (
            <div key={c} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-semibold text-[#f0f6fc]">Cluster {c}</span>
                <span className="text-[#8b949e] text-sm">({members.length} players)</span>
              </div>

              {/* Stats */}
              {Object.keys(stats).length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {Object.entries(stats).slice(0, 6).map(([k, v]) => (
                    <div key={k} className="bg-[#0d1117] rounded p-2">
                      <p className="text-[10px] text-[#8b949e] truncate">{k}</p>
                      <p className="text-xs font-semibold text-[#f0f6fc]">{v.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Top players */}
              <div className="space-y-1.5">
                {topPlayers.map(p => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <PositionBadge position={p.position} />
                      <span className="text-[#f0f6fc] truncate max-w-28">{p.name}</span>
                    </span>
                    <span className="text-[#00d4aa]">{fmtVal(p.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
