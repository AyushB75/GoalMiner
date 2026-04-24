import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown } from 'lucide-react';
import type { Player } from '../../types';
import PositionBadge from '../shared/PositionBadge';

type SortKey = 'name' | 'position' | 'age' | 'value' | 'goals' | 'assists';

function SortHeader({ label, sortKey, current, onSort }: {
  label: string; sortKey: SortKey;
  current: { key: SortKey; dir: 'asc' | 'desc' };
  onSort: (k: SortKey) => void;
}) {
  const active = current.key === sortKey;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-[#8b949e] uppercase tracking-wider cursor-pointer hover:text-[#f0f6fc] select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${active ? 'text-[#00d4aa]' : ''}`} />
      </span>
    </th>
  );
}

export default function SquadTable({ players }: { players: Player[] }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'value', dir: 'desc',
  });

  function handleSort(key: SortKey) {
    setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  }

  const sorted = useMemo(() => [...players].sort((a, b) => {
    const av = a[sort.key] as string | number;
    const bv = b[sort.key] as string | number;
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sort.dir === 'asc' ? cmp : -cmp;
  }), [players, sort]);

  return (
    <div className="overflow-x-auto rounded-xl border border-[#30363d]">
      <table className="w-full text-sm">
        <thead className="bg-[#161b22]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#8b949e] uppercase tracking-wider w-8">#</th>
            <SortHeader label="Player" sortKey="name" current={sort} onSort={handleSort} />
            <SortHeader label="Pos" sortKey="position" current={sort} onSort={handleSort} />
            <SortHeader label="Age" sortKey="age" current={sort} onSort={handleSort} />
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Nation</th>
            <SortHeader label="Value" sortKey="value" current={sort} onSort={handleSort} />
            <SortHeader label="Goals" sortKey="goals" current={sort} onSort={handleSort} />
            <SortHeader label="Assists" sortKey="assists" current={sort} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr
              key={p.name + i}
              onClick={() => navigate(`/player/${encodeURIComponent(p.name)}`)}
              className="border-t border-[#21262d] hover:bg-[#21262d] cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-[#8b949e]">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-[#f0f6fc]">{p.name}</td>
              <td className="px-4 py-3"><PositionBadge position={p.position} /></td>
              <td className="px-4 py-3 text-[#8b949e]">{p.age}</td>
              <td className="px-4 py-3 text-[#8b949e]">{p.nation}</td>
              <td className="px-4 py-3">
                <span className="text-[#00d4aa] font-semibold">{p.value_fmt}</span>
              </td>
              <td className="px-4 py-3 text-[#f0f6fc]">{p.goals}</td>
              <td className="px-4 py-3 text-[#f0f6fc]">{p.assists}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
