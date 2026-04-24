import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getSimilarPlayers } from '../api/client';
import type { SimilarResponse } from '../types';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBanner from '../components/shared/ErrorBanner';
import PositionBadge from '../components/shared/PositionBadge';
import { getPlayerImageUrl, fetchRealPlayerPhoto } from '../utils/playerImage';

// Fetches a real Wikipedia photo; instantly shows DiceBear until it arrives.
function PlayerAvatar({ name, size = 'lg' }: { name: string; size?: 'lg' | 'sm' }) {
  const fallback = getPlayerImageUrl(name);
  const [src, setSrc] = useState<string>(fallback);

  useEffect(() => {
    setSrc(fallback);                           // reset when name changes
    fetchRealPlayerPhoto(name).then(url => {
      if (url) setSrc(url);
    });
  }, [name]);                                   // eslint-disable-line react-hooks/exhaustive-deps

  const dim = size === 'lg'
    ? 'w-28 h-28 sm:w-36 sm:h-36'   // 112–144 px — prominent on player page
    : 'w-10 h-10';                   // 40 px — similar-player cards

  return (
    <img
      src={src}
      alt={name}
      className={`${dim} rounded-xl object-cover flex-shrink-0 bg-[#21262d]`}
      onError={() => setSrc(fallback)}
    />
  );
}

function StatBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[#0d1117] rounded-lg p-3 text-center">
      <p className="text-[#8b949e] text-xs mb-1">{label}</p>
      <p className="text-[#f0f6fc] font-bold text-lg">{value}</p>
    </div>
  );
}

export default function PlayerPage() {
  const { playerName } = useParams<{ playerName: string }>();
  const name = playerName ? decodeURIComponent(playerName) : '';
  const [data, setData] = useState<SimilarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    getSimilarPlayers(name, 12)
      .then(setData)
      .catch(() => setError(`Player "${name}" not found`))
      .finally(() => setLoading(false));
  }, [name]);

  const p = data?.player;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-[#8b949e] hover:text-[#00d4aa] text-sm mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>

      {loading && <LoadingSpinner label="Loading player…" />}
      {error && <ErrorBanner message={error} />}

      {p && (
        <>
          {/* Player header */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden mb-6">
            {/* Top banner */}
            <div className="flex items-start gap-5 p-5 sm:p-6">
              <PlayerAvatar name={p.name} size="lg" />
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#f0f6fc] capitalize">{p.name}</h1>
                  <PositionBadge position={p.position} />
                </div>
                <p className="text-[#8b949e] text-sm capitalize mb-2">
                  {p.team}&nbsp;·&nbsp;{p.nation}&nbsp;·&nbsp;Age {p.age}
                </p>
                <p className="text-[#00d4aa] font-bold text-2xl">{p.value_fmt}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#30363d] border-t border-[#30363d]">
              {[
                { label: 'Goals',   value: p.goals },
                { label: 'Assists', value: p.assists },
                { label: 'SCA',     value: p.sca ?? 0 },
                { label: 'GCA',     value: p.gca ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="py-4 text-center">
                  <p className="text-[#8b949e] text-xs mb-1">{label}</p>
                  <p className="text-[#f0f6fc] font-bold text-xl">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Similar players */}
          <h2 className="text-lg font-semibold text-[#f0f6fc] mb-4">
            Similar Players <span className="text-[#8b949e] font-normal text-sm">({data.similar.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.similar.map((s, i) => {
              const simColor = s.similarity_pct >= 70 ? '#00d4aa' : s.similarity_pct >= 50 ? '#ffa657' : '#f78166';
              return (
                <Link
                  key={s.name + i}
                  to={`/player/${encodeURIComponent(s.name)}`}
                  className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-[#00d4aa] transition-all block"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <PlayerAvatar name={s.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#f0f6fc] text-sm truncate">{s.name}</p>
                          <p className="text-xs text-[#8b949e] capitalize truncate">{s.team}</p>
                        </div>
                        <PositionBadge position={s.position} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[#00d4aa] font-bold mb-2">{s.value_fmt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8b949e]">⚽ {s.goals}  🎯 {s.assists}</span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: simColor, backgroundColor: `${simColor}18` }}
                    >
                      {s.similarity_pct}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
