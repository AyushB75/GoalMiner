import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import LoadingSpinner from './components/shared/LoadingSpinner';
import ErrorBoundary from './components/shared/ErrorBoundary';

const SquadPage = lazy(() => import('./pages/SquadPage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const PlayersClusterPage = lazy(() => import('./pages/PlayersClusterPage'));

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0d1117]">
        <Navbar />
        <main>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner label="Loading…" />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/team/:teamName" element={<SquadPage />} />
                <Route path="/player/:playerName" element={<PlayerPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/players" element={<PlayersClusterPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
