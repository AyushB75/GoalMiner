import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();

  const linkCls = (path: string) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname.startsWith(path)
        ? 'bg-[#003d30] text-[#00d4aa]'
        : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[#30363d] bg-[#0d1117]/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-[#f0f6fc]">
          <span className="text-2xl">⚽</span>
          <span>
            Goal<span className="text-[#00d4aa]">Miner</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Link to="/" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname === '/' || pathname.startsWith('/team')
              ? 'bg-[#003d30] text-[#00d4aa]'
              : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
          }`}>
            Teams
          </Link>
          <Link to="/analytics" className={linkCls('/analytics')}>
            Analytics
          </Link>
          <Link to="/players" className={linkCls('/players')}>
            Players
          </Link>
        </nav>
      </div>
    </header>
  );
}
