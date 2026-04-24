const colors: Record<string, string> = {
  GK: 'bg-amber-900/60 text-amber-400 border-amber-700',
  DF: 'bg-blue-900/60 text-blue-400 border-blue-700',
  MF: 'bg-green-900/60 text-green-400 border-green-700',
  FW: 'bg-red-900/60 text-red-400 border-red-700',
};

export default function PositionBadge({ position }: { position: string }) {
  const cls = colors[position] ?? 'bg-[#21262d] text-[#8b949e] border-[#30363d]';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>
      {position}
    </span>
  );
}
