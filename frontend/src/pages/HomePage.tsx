import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getTeams } from '../api/client';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBanner from '../components/shared/ErrorBanner';
import { getTeamLogoUrl } from '../utils/teamLogos';

const LEAGUE_COLORS: Record<string, string> = {
  epl: '#38003c',
  premier: '#38003c',
  laliga: '#ff4b44',
  liga: '#ff4b44',
  seriaa: '#024494',
  seria: '#024494',
  ligue1: '#002d62',
  bundesliga: '#d00027',
};

function leagueColor(team: string) {
  const t = team.toLowerCase();
  for (const [key, color] of Object.entries(LEAGUE_COLORS)) {
    if (t.includes(key)) return color;
  }
  return '#003d30';
}

function TeamCard({ name, onClick }: { name: string; onClick: () => void }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
  const bg = leagueColor(name);
  const logoUrl = getTeamLogoUrl(name);
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 text-left hover:border-[#00d4aa] hover:bg-[#21262d] transition-all group"
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={name}
          className="w-12 h-12 rounded-full object-contain bg-white p-1 mb-3 group-hover:scale-105 transition-transform"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-3 group-hover:scale-105 transition-transform"
          style={{ backgroundColor: bg }}
        >
          {initials}
        </div>
      )}
      <p className="font-semibold text-[#f0f6fc] capitalize truncate">{name}</p>
    </button>
  );
}

export default function HomePage() {
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getTeams()
      .then(d => setTeams(d.teams))
      .catch(() => setError('Failed to load teams. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => teams.filter(t => t.toLowerCase().includes(query.toLowerCase())),
    [teams, query]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-[#f0f6fc] mb-2">
          Football <span className="text-[#00d4aa]">Analytics</span>
        </h1>
        <p className="text-[#8b949e]">
          Explore squads, player valuations, clusters, and transfer recommendations
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e] w-4 h-4" />
        <input
          type="text"
          placeholder="Search teams…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-[#161b22] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#00d4aa] transition-colors"
        />
      </div>

      {loading && <LoadingSpinner label="Loading teams…" />}
      {error && <ErrorBanner message={error} />}

      {!loading && !error && (
        <>
          <p className="text-[#8b949e] text-sm mb-4">{filtered.length} teams</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map(team => (
              <TeamCard
                key={team}
                name={team}
                onClick={() => navigate(`/team/${encodeURIComponent(team)}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
