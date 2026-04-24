import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Player } from '../../types';
import PositionBadge from '../shared/PositionBadge';
import { getPlayerImageUrl } from '../../utils/playerImage';

export default memo(function PlayerCard({ player }: { player: Player }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/player/${encodeURIComponent(player.name)}`)}
      className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-[#00d4aa] cursor-pointer transition-all hover:bg-[#21262d] group"
    >
      <img
        src={getPlayerImageUrl(player.name)}
        alt={player.name}
        className="w-12 h-12 rounded-full object-cover mb-3 bg-[#21262d] group-hover:scale-105 transition-transform"
      />

      <p className="font-semibold text-[#f0f6fc] truncate text-sm mb-1">{player.name}</p>

      <div className="flex items-center justify-between mb-2">
        <PositionBadge position={player.position} />
        <span className="text-xs text-[#8b949e]">Age {player.age}</span>
      </div>

      <p className="text-[#00d4aa] font-bold text-sm">{player.value_fmt}</p>

      <div className="mt-2 flex gap-3 text-xs text-[#8b949e]">
        <span>⚽ {player.goals}</span>
        <span>🎯 {player.assists}</span>
      </div>
    </div>
  );
});
