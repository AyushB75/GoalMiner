export interface Player {
  name: string;
  position: string;
  age: number;
  nation: string;
  value: number;
  value_fmt: string;
  goals: number;
  assists: number;
  matches?: number;
  sca?: number;
  gca?: number;
  prog_carries?: number;
  tackles_won?: number;
  team?: string;
}

export interface SquadResponse {
  team: string;
  count: number;
  avg_value: number;
  avg_value_fmt: string;
  players: Player[];
}

export interface ClusterPlayer {
  name: string;
  position: string;
  cluster: number;
  pca_x: number;
  pca_y: number;
  value: number;
}

export interface ClusterResponse {
  team: string;
  n_clusters: number;
  players: ClusterPlayer[];
  cluster_stats: Record<string, Record<string, number>>;
  pca_plot: string;
  heatmap_plot: string;
  pca_variance: number[];
}

export interface ModelMetrics {
  name: string;
  mae: number;
  rmse: number;
  r2: number;
  is_best: boolean;
}

export interface RegressionAnalytics {
  model_metrics: ModelMetrics[];
  best_model: string;
  features: string[];
  actual_vs_predicted: string;
  residual_plot: string;
  shap_plot: string;
}

export interface SimilarPlayer extends Player {
  similarity_pct: number;
  distance: number;
}

export interface SimilarResponse {
  player: Player;
  similar: SimilarPlayer[];
}

export interface ReplacementSuggestion extends Player {
  original_player: string;
  similarity_pct: number;
  distance: number;
}

export interface ReplacementsResponse {
  team: string;
  budget: number;
  suggestions: ReplacementSuggestion[];
}

export interface DistributionAnalytics {
  histogram: { range: string; count: number }[];
  position_breakdown: { position: string; count: number }[];
  top_20: Player[];
  by_league: { league: string; avg_value: number; median_value: number; max_value: number; count: number }[];
}

export interface DbscanPlayer {
  name: string;
  team: string;
  position: string;
  cluster: number; // -1 = noise
  pca_x: number;
  pca_y: number;
}

export interface DbscanResponse {
  n_clusters: number;
  noise_count: number;
  players: DbscanPlayer[];
}
