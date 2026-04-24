import { useNavigate } from 'react-router-dom';
import type { ReplacementSuggestion } from '../../types';
import PositionBadge from '../shared/PositionBadge';
import { ArrowRight } from 'lucide-react';
import { getPlayerImageUrl } from '../../utils/playerImage';

export default function ReplacementCard({ suggestion }: { suggestion: ReplacementSuggestion }) {
  const navigate = useNavigate();
  const simColor = suggestion.similarity_pct >= 70 ? '#00d4aa' : suggestion.similarity_pct >= 50 ? '#ffa657' : '#f78166';

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-[#00d4aa] transition-all">
      {/* Replacing label */}
      <div className="flex items-center gap-1.5 text-xs text-[#8b949e] mb-3">
        <span className="truncate max-w-24 text-[#f0f6fc]">{suggestion.original_player}</span>
        <ArrowRight className="w-3 h-3 flex-shrink-0" />
        <span className="text-[#00d4aa] font-medium truncate">replacement</span>
      </div>

      {/* Player info */}
      <div
        className="cursor-pointer"
        onClick={() => navigate(`/player/${encodeURIComponent(suggestion.name)}`)}
      >
        <div className="flex items-start gap-3 mb-2">
          <img
            src={getPlayerImageUrl(suggestion.name)}
            alt={suggestion.name}
            className="w-10 h-10 rounded-full object-cover bg-[#21262d] flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="font-semibold text-[#f0f6fc] hover:text-[#00d4aa] transition-colors truncate">
                  {suggestion.name}
                </p>
                <p className="text-xs text-[#8b949e] capitalize truncate">{suggestion.team}</p>
              </div>
              <PositionBadge position={suggestion.position} />
            </div>
          </div>
        </div>

        <p className="text-[#00d4aa] font-bold mb-3">{suggestion.value_fmt}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-xs text-[#8b949e]">
            <span>⚽ {suggestion.goals}</span>
            <span>🎯 {suggestion.assists}</span>
            <span>🎂 {suggestion.age}</span>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: simColor, backgroundColor: `${simColor}18` }}
          >
            {suggestion.similarity_pct}% match
          </span>
        </div>
      </div>
    </div>
  );
}
