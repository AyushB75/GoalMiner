import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { Search, Users2, AlertCircle, Star } from 'lucide-react';
import { getDbscanClusters } from '../api/client';
import type { DbscanPlayer, DbscanResponse } from '../types';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBanner from '../components/shared/ErrorBanner';
import PositionBadge from '../components/shared/PositionBadge';

// ─── colours ─────────────────────────────────────────────────────────────────

const CLUSTER_PALETTE = [
  '#00d4aa', '#f78166', '#79c0ff', '#ffa657', '#d2a8ff',
  '#56d364', '#e3b341', '#f47067', '#63b3ed', '#b5cea8',
];
const NOISE_COLOR = '#484f58';

function clusterColor(c: number) {
  return c === -1 ? NOISE_COLOR : CLUSTER_PALETTE[c % CLUSTER_PALETTE.length];
}

// ─── canvas scatter (replaces Recharts SVG — much faster for large datasets) ─

const CANVAS_H = 460;
const PAD = { t: 20, r: 24, b: 40, l: 50 };

const CanvasScatter = memo(function CanvasScatter({
  players, selected, onSelect,
}: {
  players: DbscanPlayer[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hovered, setHovered] = useState<DbscanPlayer | null>(null);
  const [tipPos,  setTipPos]  = useState({ x: 0, y: 0 });

  // Track container width
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute data bounds once
  const bounds = useMemo(() => {
    if (!players.length) return { x0: -1, x1: 1, y0: -1, y1: 1 };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const { pca_x, pca_y } of players) {
      if (pca_x < x0) x0 = pca_x; if (pca_x > x1) x1 = pca_x;
      if (pca_y < y0) y0 = pca_y; if (pca_y > y1) y1 = pca_y;
    }
    const dw = (x1 - x0) * 0.05, dh = (y1 - y0) * 0.05;
    return { x0: x0 - dw, x1: x1 + dw, y0: y0 - dh, y1: y1 + dh };
  }, [players]);

  // PCA space → canvas pixels
  const toC = useCallback((px: number, py: number) => ({
    cx: PAD.l + ((px - bounds.x0) / (bounds.x1 - bounds.x0)) * (w - PAD.l - PAD.r),
    cy: PAD.t + ((bounds.y1 - py) / (bounds.y1 - bounds.y0)) * (CANVAS_H - PAD.t - PAD.b),
  }), [bounds, w]);

  // Full canvas redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !players.length) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = w * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${CANVAS_H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, w, CANVAS_H);

    // Grid
    ctx.strokeStyle = '#21262d'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const gx = PAD.l + (i / 4) * (w - PAD.l - PAD.r);
      const gy = PAD.t + (i / 4) * (CANVAS_H - PAD.t - PAD.b);
      ctx.beginPath(); ctx.moveTo(gx, PAD.t);    ctx.lineTo(gx, CANVAS_H - PAD.b); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD.l, gy);     ctx.lineTo(w - PAD.r, gy);        ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = '#8b949e'; ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PC1', w / 2, CANVAS_H - 8);
    ctx.save(); ctx.translate(14, CANVAS_H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('PC2', 0, 0); ctx.restore();

    const hovN = hovered?.name, selN = selected;

    // All base points
    for (const p of players) {
      if (p.name === selN || p.name === hovN) continue;
      const { cx, cy } = toC(p.pca_x, p.pca_y);
      ctx.beginPath(); ctx.arc(cx, cy, p.cluster === -1 ? 2.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = p.cluster === -1 ? '#484f5880' : clusterColor(p.cluster) + 'cc';
      ctx.fill();
    }

    // Hovered point
    if (hovered && hovered.name !== selN) {
      const { cx, cy } = toC(hovered.pca_x, hovered.pca_y);
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = clusterColor(hovered.cluster); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff80'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Selected point — prominent ring
    if (selN) {
      const sel = players.find(p => p.name === selN);
      if (sel) {
        const { cx, cy } = toC(sel.pca_x, sel.pca_y);
        const col = clusterColor(sel.cluster);
        ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2);
        ctx.strokeStyle = col + '50'; ctx.lineWidth = 5; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';     ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 6,  0, Math.PI * 2);
        ctx.fillStyle   = '#fff'; ctx.fill();
      }
    }
  }, [players, selected, hovered, w, toC]);

  // Hover — nearest point within threshold
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let nearest: DbscanPlayer | null = null, minD = 14;
    for (const p of players) {
      const { cx, cy } = toC(p.pca_x, p.pca_y);
      const d = Math.hypot(cx - mx, cy - my);
      if (d < minD) { minD = d; nearest = p; }
    }
    setHovered(nearest);
    setTipPos({ x: mx, y: my });
  }, [players, toC]);

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: CANVAS_H }}>
      <canvas
        ref={canvasRef}
        className={hovered ? 'cursor-pointer' : 'cursor-crosshair'}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={() => { if (hovered) onSelect(hovered.name); }}
      />
      {hovered && (
        <div style={{
          position: 'absolute',
          left: Math.min(tipPos.x + 14, w - 170),
          top: Math.max(tipPos.y - 52, 0),
          pointerEvents: 'none', zIndex: 10,
        }} className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs shadow-xl">
          <p className="font-semibold text-[#f0f6fc]">{hovered.name}</p>
          <p className="text-[#8b949e]">{hovered.team}</p>
          <p style={{ color: clusterColor(hovered.cluster) }} className="mt-0.5">
            {hovered.cluster === -1 ? 'Noise' : `Cluster ${hovered.cluster}`}
          </p>
        </div>
      )}
    </div>
  );
});

// ─── virtual player list ──────────────────────────────────────────────────────

const ITEM_H  = 54; // px per list row (fixed so virtual math is exact)
const LIST_H  = 520;
const BUFFER  = 4;  // rows to render above/below visible window

function VirtualPlayerList({
  players, selected, onSelect,
}: {
  players: DbscanPlayer[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const listRef   = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  // Sync list position → selected player (called when canvas selects a player)
  useEffect(() => {
    if (!selected || !listRef.current) return;
    const idx = players.findIndex(p => p.name === selected);
    if (idx === -1) return;
    const target = idx * ITEM_H - LIST_H / 2 + ITEM_H / 2;
    listRef.current.scrollTop = Math.max(0, target);
  }, [selected, players]);

  const visStart  = Math.max(0, Math.floor(scrollY / ITEM_H) - BUFFER);
  const visEnd    = Math.min(players.length, Math.ceil((scrollY + LIST_H) / ITEM_H) + BUFFER);
  const visSlice  = players.slice(visStart, visEnd);

  return (
    <div
      ref={listRef}
      className="overflow-y-auto flex-1"
      style={{ maxHeight: LIST_H }}
      onScroll={e => setScrollY(e.currentTarget.scrollTop)}
    >
      {players.length === 0 && (
        <p className="text-[#8b949e] text-xs text-center py-6">No matches</p>
      )}
      {/* top spacer */}
      {visStart > 0 && <div style={{ height: visStart * ITEM_H }} />}

      {visSlice.map(p => {
        const isSel = p.name === selected;
        return (
          <button
            key={p.name}
            onClick={() => onSelect(p.name === selected ? '' : p.name)}
            style={{ height: ITEM_H, minHeight: ITEM_H }}
            className={`w-full text-left px-3 flex items-center gap-2 hover:bg-[#21262d] transition-colors border-b border-[#21262d] ${
              isSel ? 'bg-[#1c2a23]' : ''
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: clusterColor(p.cluster) }}
            />
            <span className="flex-1 min-w-0">
              <span className={`text-xs font-medium truncate block ${
                isSel ? 'text-[#00d4aa]' : 'text-[#f0f6fc]'
              }`}>{p.name}</span>
              <span className="text-[10px] text-[#8b949e] truncate block">{p.team}</span>
            </span>
            <PositionBadge position={p.position} />
          </button>
        );
      })}

      {/* bottom spacer */}
      {visEnd < players.length && <div style={{ height: (players.length - visEnd) * ITEM_H }} />}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function PlayersClusterPage() {
  const [data,    setData]    = useState<DbscanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [query,   setQuery]   = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDbscanClusters()
      .then(setData)
      .catch(() => setError('Failed to load player clusters. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const allPlayers = data?.players ?? [];

  const filtered = useMemo(() => {
    const q = debouncedQ.toLowerCase().trim();
    return q ? allPlayers.filter(p => p.name.toLowerCase().includes(q)) : allPlayers;
  }, [allPlayers, debouncedQ]);

  // Auto-highlight when search narrows to 1 result
  useEffect(() => {
    if (filtered.length === 1) setSelected(filtered[0].name);
  }, [filtered]);

  const handleSelect = useCallback((name: string) => {
    setSelected(prev => (prev === name || name === '') ? null : name);
  }, []);

  const selectedPlayer = allPlayers.find(p => p.name === selected) ?? null;
  const clusterCount   = data?.n_clusters  ?? 0;
  const noiseCount     = data?.noise_count ?? 0;

  // Players shown in scatter: if search is active show only matches; else all
  const scatterPlayers = debouncedQ ? filtered : allPlayers;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f0f6fc] mb-1 flex items-center gap-2">
          <Users2 className="w-6 h-6 text-[#00d4aa]" />
          Players
        </h1>
        <p className="text-[#8b949e] text-sm">
          Global DBSCAN cluster view · search and highlight any player
        </p>
      </div>

      {/* stat chips */}
      {data && (
        <div className="flex flex-wrap gap-3 mb-6">
          <StatChip color="#00d4aa" label="Clusters"      value={String(clusterCount)} />
          <StatChip color="#ffa657" label="Noise Points"  value={String(noiseCount)} />
          <StatChip color="#79c0ff" label="Total Players" value={String(allPlayers.length)} />
        </div>
      )}

      {/* search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e] w-4 h-4" />
        <input
          type="text"
          placeholder="Search player…"
          value={query}
          onChange={e => {
            const val = e.target.value;
            setQuery(val);
            setSelected(null);
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => setDebouncedQ(val), 150);
          }}
          className="w-full bg-[#161b22] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#00d4aa] transition-colors text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setDebouncedQ(''); setSelected(null); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#f0f6fc] text-xs"
          >✕</button>
        )}
      </div>

      {error   && <ErrorBanner message={error} />}
      {loading && <LoadingSpinner label="Loading player clusters…" />}

      {!loading && data && (
        <div className="flex gap-5">
          {/* left: virtual player list */}
          <aside className="hidden md:flex flex-col w-60 shrink-0">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-[#30363d] flex items-center justify-between">
                <span className="text-xs text-[#8b949e] uppercase tracking-wider font-semibold">Players</span>
                <span className="text-xs text-[#8b949e]">{filtered.length}</span>
              </div>
              <VirtualPlayerList
                players={filtered}
                selected={selected}
                onSelect={handleSelect}
              />
            </div>
          </aside>

          {/* right: scatter + details */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* selected player card */}
            {selectedPlayer && (
              <div className="bg-[#161b22] border border-[#00d4aa]/40 rounded-xl p-4 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: clusterColor(selectedPlayer.cluster) }}
                >
                  {selectedPlayer.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#f0f6fc] text-sm flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#00d4aa]" />
                    {selectedPlayer.name}
                  </p>
                  <p className="text-[#8b949e] text-xs">{selectedPlayer.team}</p>
                </div>
                <PositionBadge position={selectedPlayer.position} />
                <div className="text-right">
                  {selectedPlayer.cluster === -1
                    ? <span className="text-xs text-[#484f58] font-medium">Noise</span>
                    : <span className="text-xs font-semibold" style={{ color: clusterColor(selectedPlayer.cluster) }}>
                        Cluster {selectedPlayer.cluster}
                      </span>}
                  <p className="text-[10px] text-[#8b949e]">
                    ({selectedPlayer.pca_x.toFixed(2)}, {selectedPlayer.pca_y.toFixed(2)})
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[#8b949e] hover:text-[#f0f6fc] text-xs ml-2"
                >✕</button>
              </div>
            )}

            {/* canvas scatter */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
                  DBSCAN Cluster Map (PCA 2D)
                </p>
                {selectedPlayer && (
                  <p className="text-xs text-[#00d4aa]">● {selectedPlayer.name}</p>
                )}
              </div>
              <CanvasScatter
                players={scatterPlayers}
                selected={selected}
                onSelect={handleSelect}
              />
              <p className="text-[10px] text-[#8b949e] mt-2 text-center">
                Grey = noise (cluster −1) · Click any dot to highlight · Select from list to locate
              </p>
            </div>

            {/* cluster breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <ClusterChip cluster={-1} players={allPlayers} label="Noise" />
              {Array.from({ length: clusterCount }, (_, i) => (
                <ClusterChip key={i} cluster={i} players={allPlayers} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── helper sub-components ────────────────────────────────────────────────────

function StatChip({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2 flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[#8b949e] text-xs">{label}</span>
      <span className="font-bold text-[#f0f6fc] text-sm">{value}</span>
    </div>
  );
}

const ClusterChip = memo(function ClusterChip({
  cluster, players, label,
}: { cluster: number; players: DbscanPlayer[]; label?: string }) {
  const { count, topPos } = useMemo(() => {
    const mine = players.filter(p => p.cluster === cluster);
    const pos: Record<string, number> = {};
    mine.forEach(p => { pos[p.position] = (pos[p.position] ?? 0) + 1; });
    return {
      count:  mine.length,
      topPos: Object.entries(pos).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
    };
  }, [players, cluster]);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: clusterColor(cluster) }} />
        <span className="text-xs font-semibold" style={{ color: clusterColor(cluster) }}>
          {label ?? `Cluster ${cluster}`}
        </span>
        {cluster === -1 && <AlertCircle className="w-3 h-3 text-[#484f58]" />}
      </div>
      <p className="text-[#f0f6fc] text-base font-bold">
        {count} <span className="text-[10px] text-[#8b949e] font-normal">players</span>
      </p>
      {topPos && <p className="text-[10px] text-[#8b949e]">Top pos: {topPos}</p>}
    </div>
  );
});
