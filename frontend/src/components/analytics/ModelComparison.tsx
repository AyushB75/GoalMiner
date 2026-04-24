import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import type { ModelMetrics } from '../../types';

export default function ModelComparison({ metrics }: { metrics: ModelMetrics[] }) {
  return (
    <div className="space-y-6">
      {/* MAE comparison */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
          Mean Absolute Error (lower is better)
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={metrics} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }}
              labelStyle={{ color: '#f0f6fc' }} itemStyle={{ color: '#8b949e' }}
            />
            <Bar dataKey="mae" name="MAE" radius={[4, 4, 0, 0]}>
              {metrics.map((m, i) => (
                <Cell key={i} fill={m.is_best ? '#00d4aa' : '#388bfd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* RMSE & R² */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
          RMSE & R² Score
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={metrics} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }}
              labelStyle={{ color: '#f0f6fc' }} itemStyle={{ color: '#8b949e' }}
            />
            <Legend wrapperStyle={{ color: '#8b949e', fontSize: 12 }} />
            <Bar dataKey="rmse" name="RMSE" fill="#f78166" radius={[4, 4, 0, 0]} />
            <Bar dataKey="r2" name="R²" fill="#3fb950" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0d1117]">
            <tr>
              {['Model', 'MAE', 'RMSE', 'R²'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#8b949e] uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={i} className={`border-t border-[#21262d] ${m.is_best ? 'bg-[#003d30]/30' : ''}`}>
                <td className="px-4 py-3 font-medium text-[#f0f6fc] flex items-center gap-2">
                  {m.name}
                  {m.is_best && <span className="text-xs bg-[#003d30] text-[#00d4aa] px-1.5 py-0.5 rounded">BEST</span>}
                </td>
                <td className={`px-4 py-3 font-mono ${m.is_best ? 'text-[#00d4aa] font-semibold' : 'text-[#f0f6fc]'}`}>{m.mae.toFixed(4)}</td>
                <td className="px-4 py-3 font-mono text-[#f0f6fc]">{m.rmse.toFixed(4)}</td>
                <td className="px-4 py-3 font-mono text-[#3fb950]">{m.r2.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
