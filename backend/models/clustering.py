"""KMeans (per-team) and DBSCAN (global) clustering."""
import functools
import logging
import numpy as np
import pandas as pd
import joblib
from sklearn.cluster import KMeans, DBSCAN
from sklearn.decomposition import PCA

from backend.config import ARTIFACTS_DIR, CLUSTER_N, DBSCAN_EPS, DBSCAN_MIN_SAMPLES, RANDOM_STATE
from backend.data.loader import get_squad, load_career_with_values
from backend.data.preprocessor import get_primary_position
from backend.utils.plot_utils import make_pca_scatter, make_cluster_heatmap


@functools.lru_cache(maxsize=1)
def _load_cluster_artifacts():
    scaler   = joblib.load(ARTIFACTS_DIR / "cluster_scaler.joblib")
    features = joblib.load(ARTIFACTS_DIR / "cluster_features.joblib")
    return scaler, features


def _get_scaled_squad(team_df: pd.DataFrame):
    scaler, features = _load_cluster_artifacts()
    available = [f for f in features if f in team_df.columns]
    if len(available) < len(features):
        missing = set(features) - set(team_df.columns)
        logging.warning("Clustering: %d features missing from squad data: %s", len(missing), missing)
    X = team_df[available].fillna(0).values
    X_scaled = scaler.transform(X)
    return X_scaled, available


def get_team_clusters(team_name: str) -> dict:
    team_df = get_squad(team_name)
    if team_df.empty:
        return {"error": f"No players found for team '{team_name}'"}

    X_scaled, features = _get_scaled_squad(team_df)
    n_clusters = min(CLUSTER_N, len(team_df))

    # KMeans
    km = KMeans(n_clusters=n_clusters, random_state=RANDOM_STATE, n_init=10)
    labels = km.fit_predict(X_scaled)

    # PCA 2D
    pca = PCA(n_components=2, random_state=RANDOM_STATE)
    coords = pca.fit_transform(X_scaled)

    # Build player list
    name_col  = "Player" if "Player" in team_df.columns else "player_name"
    pos_col   = "Pos" if "Pos" in team_df.columns else "Position"
    value_col = "Value" if "Value" in team_df.columns else None

    players = []
    for i, (_, row) in enumerate(team_df.iterrows()):
        players.append({
            "name":     str(row.get(name_col, f"Player {i}")),
            "position": get_primary_position(str(row.get(pos_col, ""))),
            "cluster":  int(labels[i]),
            "pca_x":    float(round(coords[i, 0], 4)),
            "pca_y":    float(round(coords[i, 1], 4)),
            "value":    float(row[value_col]) if value_col and not pd.isna(row.get(value_col, np.nan)) else 0.0,
        })

    # Cluster stats (mean of key stats per cluster)
    stat_cols = ["Goals", "Assists", "ShotsOnTarget", "Tackles_Won", "Passes_Att",
                 "DribblesAtt", "Interceptions", "ProgressivePasses"]
    stat_cols = [c for c in stat_cols if c in team_df.columns]
    cluster_stats = {}
    for c in range(n_clusters):
        mask = labels == c
        subset = team_df[mask][stat_cols] if stat_cols else pd.DataFrame()
        cluster_stats[str(c)] = subset.mean().round(2).to_dict() if not subset.empty else {}

    # Plots
    player_names = [p["name"] for p in players]
    pca_plot      = make_pca_scatter(coords, labels, player_names, title=f"{team_name.title()} Player Clusters")
    heatmap_plot  = make_cluster_heatmap(cluster_stats, title=f"{team_name.title()} — Cluster Stats")

    return {
        "team":          team_name,
        "n_clusters":    n_clusters,
        "players":       players,
        "cluster_stats": cluster_stats,
        "pca_plot":      pca_plot,
        "heatmap_plot":  heatmap_plot,
        "pca_variance":  [round(float(v), 4) for v in pca.explained_variance_ratio_],
    }


@functools.lru_cache(maxsize=1)
def get_dbscan_clusters() -> dict:
    """Global DBSCAN clustering — computed once and cached."""
    df = load_career_with_values()
    scaler, features = _load_cluster_artifacts()
    available = [f for f in features if f in df.columns]
    if len(available) < len(features):
        missing = set(features) - set(df.columns)
        logging.warning("DBSCAN: %d features missing from career data: %s", len(missing), missing)
    X = df[available].fillna(0).values
    X_scaled = scaler.transform(X)

    db = DBSCAN(eps=DBSCAN_EPS, min_samples=DBSCAN_MIN_SAMPLES)
    labels = db.fit_predict(X_scaled)

    pca = PCA(n_components=2, random_state=RANDOM_STATE)
    coords = pca.fit_transform(X_scaled)

    name_col = "Player" if "Player" in df.columns else "player_name"
    pos_col  = "Pos" if "Pos" in df.columns else "Position"
    team_col = "Team" if "Team" in df.columns else "Squad"

    # zip is ~50x faster than iterrows for large DataFrames
    positions = [get_primary_position(str(v)) for v in df[pos_col]]
    pca_x = coords[:, 0].round(4).tolist()
    pca_y = coords[:, 1].round(4).tolist()
    players = [
        {"name": str(n), "team": str(t), "position": p,
         "cluster": int(c), "pca_x": float(x), "pca_y": float(y)}
        for n, t, p, c, x, y in zip(
            df[name_col], df[team_col], positions,
            labels.tolist(), pca_x, pca_y,
        )
    ]

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    noise_count = int((labels == -1).sum())

    # pca_plot intentionally omitted — frontend renders its own interactive scatter
    return {
        "n_clusters":  n_clusters,
        "noise_count": noise_count,
        "players":     players,
    }
