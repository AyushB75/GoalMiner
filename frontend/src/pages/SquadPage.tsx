import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Users, GitBranch, ArrowLeftRight, Search } from 'lucide-react';
import { getSquad, getTeamClusters, getBudgetReplacements } from '../api/client';
import type { SquadResponse, ClusterResponse, ReplacementsResponse } from '../types';
import { getTeamLogoUrl } from '../utils/teamLogos';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBanner from '../components/shared/ErrorBanner';
import SquadTable from '../components/squad/SquadTable';
import PlayerCard from '../components/squad/PlayerCard';
import PCAScatterPlot from '../components/clusters/PCAScatterPlot';
import ClusterSummary from '../components/clusters/ClusterSummary';
import BudgetSlider from '../components/transfers/BudgetSlider';
import ReplacementCard from '../components/transfers/ReplacementCard';

type Tab = 'squad' | 'clusters' | 'transfers';

export default function SquadPage() {
  const { teamName } = useParams<{ teamName: string }>();
  const team = teamName ? decodeURIComponent(teamName) : '';

  const [tab, setTab] = useState<Tab>('squad');
  const [squad, setSquad] = useState<SquadResponse | null>(null);
  const [clusters, setClusters] = useState<ClusterResponse | null>(null);
  const [replacements, setReplacements] = useState<ReplacementsResponse | null>(null);
  const [budget, setBudget] = useState(30_000_000);
  const [playerSearch, setPlayerSearch] = useState('');

  const [loadingSquad, setLoadingSquad] = useState(true);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [loadingRepl, setLoadingRepl] = useState(false);
  const [error, setError] = useState('');
  const [teamLogoError, setTeamLogoError] = useState(false);
  const [replSearch, setReplSearch] = useState('');

  const filteredSuggestions = useMemo(() => {
    if (!replacements) return [];
    const q = replSearch.toLowerCase();
    if (!q) return replacements.suggestions;
    return replacements.suggestions.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.original_player.toLowerCase().includes(q)
    );
  }, [replacements, replSearch]);

  const filteredPlayers = useMemo(() => {
    if (!squad) return [];
    const q = playerSearch.toLowerCase();
    if (!q) return squad.players;
    return squad.players.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q) ||
      p.nation.toLowerCase().includes(q)
    );
  }, [squad, playerSearch]);

  useEffect(() => {
    if (!team) return;
    setLoadingSquad(true);
    getSquad(team)
      .then(setSquad)
      .catch(() => setError(`Could not load squad for "${team}"`))
      .finally(() => setLoadingSquad(false));
  }, [team]);

  useEffect(() => {
    if (tab === 'clusters' && !clusters && team) {
      setLoadingClusters(true);
      getTeamClusters(team)
        .then(setClusters)
        .catch(() => setError('Failed to load cluster data'))
        .finally(() => setLoadingClusters(false));
    }
  }, [tab, clusters, team]);

  const fetchReplacements = useCallback((b: number) => {
    if (!team) return;
    setLoadingRepl(true);
    getBudgetReplacements(team, b)
      .then(setReplacements)
      .catch(() => setError('Failed to load replacement suggestions'))
      .finally(() => setLoadingRepl(false));
  }, [team]);

  useEffect(() => {
    if (tab === 'transfers') fetchReplacements(budget);
  }, [tab, fetchReplacements, budget]);

  const tabs = [
    { id: 'squad' as Tab, label: 'Squad', icon: Users },
    { id: 'clusters' as Tab, label: 'Clusters', icon: GitBranch },
    { id: 'transfers' as Tab, label: 'Find Replacements', icon: ArrowLeftRight },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1 text-[#8b949e] hover:text-[#00d4aa] text-sm mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> All Teams
      </Link>

      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          {getTeamLogoUrl(team) && !teamLogoError ? (
            <img
              src={getTeamLogoUrl(team)!}
              alt={team}
              className="w-16 h-16 rounded-full object-contain bg-white p-1 flex-shrink-0"
              onError={() => setTeamLogoError(true)}
            />
          ) : (
            <div className="w-16 h-16 bg-[#003d30] rounded-full flex items-center justify-center text-[#00d4aa] font-bold text-2xl flex-shrink-0">
              {team.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#f0f6fc] capitalize">{team}</h1>
            {squad && (
              <div className="flex gap-4 mt-1 text-sm text-[#8b949e]">
                <span>{squad.count} players</span>
                <span>Avg value: <span className="text-[#00d4aa]">{squad.avg_value_fmt}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#30363d] pb-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-[#00d4aa] text-[#00d4aa]'
                : 'border-transparent text-[#8b949e] hover:text-[#f0f6fc]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Squad Tab */}
      {tab === 'squad' && (
        <>
          {loadingSquad && <LoadingSpinner label="Loading squad…" />}
          {squad && (
            <>
              {/* Squad search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search players by name, position, nation…"
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#00d4aa] transition-colors"
                />
                {playerSearch && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b949e]">
                    {filteredPlayers.length} result{filteredPlayers.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <SquadTable players={filteredPlayers} />

              <h2 className="text-lg font-semibold text-[#f0f6fc] mt-8 mb-4">Player Cards</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPlayers.map((p, i) => (
                  <PlayerCard key={p.name + i} player={p} />
                ))}
              </div>
              {filteredPlayers.length === 0 && playerSearch && (
                <p className="text-center text-[#8b949e] py-10">No players match "{playerSearch}"</p>
              )}
            </>
          )}
        </>
      )}

      {/* Clusters Tab */}
      {tab === 'clusters' && (
        <>
          {loadingClusters && <LoadingSpinner label="Computing clusters…" />}
          {clusters && (
            <div className="space-y-6">
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
                  PCA Scatter — {clusters.n_clusters} Clusters
                </h2>
                <PCAScatterPlot players={clusters.players} />
              </div>

              {clusters.heatmap_plot && (
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
                    Cluster Stats Heatmap
                  </h2>
                  <img src={clusters.heatmap_plot} alt="Cluster heatmap" className="w-full rounded-lg" />
                </div>
              )}

              <ClusterSummary players={clusters.players} clusterStats={clusters.cluster_stats} />
            </div>
          )}
        </>
      )}

      {/* Transfers Tab */}
      {tab === 'transfers' && (
        <div>
          <BudgetSlider
            budget={budget}
            onChange={b => setBudget(b)}
          />
          {loadingRepl && <LoadingSpinner label="Finding replacements…" />}
          {replacements && !loadingRepl && (
            <div>
              {/* Search bar */}
              <div className="relative mt-4 mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by original player or replacement name…"
                  value={replSearch}
                  onChange={e => setReplSearch(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#00d4aa] transition-colors"
                />
                {replSearch && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b949e]">
                    {filteredSuggestions.length} result{filteredSuggestions.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <p className="text-[#8b949e] text-sm mb-4">
                {filteredSuggestions.length} suggestion{filteredSuggestions.length !== 1 ? 's' : ''} within{' '}
                <span className="text-[#00d4aa]">
                  €{(budget / 1_000_000).toFixed(1)}M
                </span>{' '}
                budget
              </p>
              {filteredSuggestions.length === 0 && (
                <p className="text-center text-[#8b949e] py-12">
                  {replSearch ? `No results for "${replSearch}".` : 'No players found within this budget.'}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuggestions.map((s, i) => (
                  <ReplacementCard key={s.name + i} suggestion={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
