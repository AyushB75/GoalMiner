import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Users2 } from 'lucide-react';
import { getRegressionAnalytics, getDistribution } from '../api/client';
import type { RegressionAnalytics, DistributionAnalytics } from '../types';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBanner from '../components/shared/ErrorBanner';
import ModelComparison from '../components/analytics/ModelComparison';
import ValueDistribution from '../components/analytics/ValueDistribution';

type Tab = 'prediction' | 'models' | 'distribution';

function Base64Plot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 overflow-hidden">
      {caption && (
        <p className="text-xs text-[#8b949e] mb-3 uppercase tracking-wider font-semibold">{caption}</p>
      )}
      <img src={src} alt={alt} className="block w-full h-auto rounded-lg" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('models');
  const [regData, setRegData] = useState<RegressionAnalytics | null>(null);
  const [distData, setDistData] = useState<DistributionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if ((tab === 'models' || tab === 'prediction') && !regData) {
      setLoading(true);
      getRegressionAnalytics()
        .then(setRegData)
        .catch(() => setError('Failed to load regression analytics'))
        .finally(() => setLoading(false));
    }
    if (tab === 'distribution' && !distData) {
      setLoading(true);
      getDistribution()
        .then(setDistData)
        .catch(() => setError('Failed to load distribution data'))
        .finally(() => setLoading(false));
    }
  }, [tab, regData, distData]);

  const tabs = [
    { id: 'models'       as Tab, label: 'Model Comparison',   icon: BarChart2 },
    { id: 'prediction'   as Tab, label: 'Value Prediction',   icon: TrendingUp },
    { id: 'distribution' as Tab, label: 'Player Distribution', icon: Users2 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#f0f6fc] mb-2">Analytics</h1>
      <p className="text-[#8b949e] mb-6">Regression analysis and player value insights</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#30363d]">
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

      {error && <ErrorBanner message={error} />}
      {loading && <LoadingSpinner label="Loading analytics… warming up models, please wait" />}

      {/* Model Comparison */}
      {tab === 'models' && regData && !loading && (
        <div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-xs text-[#8b949e]">Best Model</p>
              <p className="font-bold text-[#00d4aa] text-lg">{regData.best_model}</p>
            </div>
            <div className="ml-6">
              <p className="text-xs text-[#8b949e]">Best MAE (log scale)</p>
              <p className="font-bold text-[#f0f6fc] text-lg">
                {regData.model_metrics.find(m => m.is_best)?.mae.toFixed(4)}
              </p>
            </div>
            <div className="ml-6">
              <p className="text-xs text-[#8b949e]">Best R²</p>
              <p className="font-bold text-[#3fb950] text-lg">
                {regData.model_metrics.find(m => m.is_best)?.r2.toFixed(4)}
              </p>
            </div>
          </div>
          <ModelComparison metrics={regData.model_metrics} />
        </div>
      )}

      {/* Value Prediction plots */}
      {tab === 'prediction' && regData && !loading && (
        <div className="flex flex-col gap-6">
          <p className="text-[#8b949e] text-sm">
            Features used: <span className="text-[#00d4aa]">{regData.features.join(', ')}</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Base64Plot src={regData.actual_vs_predicted} alt="Actual vs Predicted" caption="Actual vs Predicted (log scale)" />
            <Base64Plot src={regData.residual_plot} alt="Residual plot" caption="Residual Plot" />
          </div>
          <Base64Plot src={regData.shap_plot} alt="SHAP feature importance" caption="SHAP Feature Importance" />
        </div>
      )}

      {/* Distribution */}
      {tab === 'distribution' && distData && !loading && (
        <ValueDistribution data={distData} />
      )}
    </div>
  );
}
