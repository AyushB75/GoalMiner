import { useState, useCallback, useRef } from 'react';

function fmtBudget(v: number) {
  return v >= 1e6 ? `€${(v / 1e6).toFixed(1)}M` : `€${(v / 1e3).toFixed(0)}K`;
}

export default function BudgetSlider({
  budget,
  onChange,
}: {
  budget: number;
  onChange: (v: number) => void;
}) {
  const [local, setLocal] = useState(budget);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((val: number) => {
    setLocal(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(val), 600);
  }, [onChange]);

  const MAX = 150_000_000;

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#f0f6fc]">Transfer Budget</h2>
        <span className="text-[#00d4aa] font-bold text-lg">{fmtBudget(local)}</span>
      </div>

      <input
        type="range"
        min={0}
        max={MAX}
        step={500_000}
        value={local}
        onChange={e => handleChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #00d4aa ${(local / MAX) * 100}%, #21262d ${(local / MAX) * 100}%)`,
        }}
      />

      <div className="flex justify-between text-xs text-[#8b949e] mt-1">
        <span>€0</span>
        <span>€50M</span>
        <span>€100M</span>
        <span>€150M</span>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {[5e6, 10e6, 20e6, 50e6, 100e6].map(v => (
          <button
            key={v}
            onClick={() => handleChange(v)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              local === v
                ? 'bg-[#003d30] border-[#00d4aa] text-[#00d4aa]'
                : 'border-[#30363d] text-[#8b949e] hover:border-[#00d4aa] hover:text-[#f0f6fc]'
            }`}
          >
            {fmtBudget(v)}
          </button>
        ))}
      </div>
    </div>
  );
}
