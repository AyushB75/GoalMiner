"""KNN similarity search and budget-constrained replacement suggestions."""
import functools
import logging
import numpy as np
import pandas as pd
import joblib

from backend.config import ARTIFACTS_DIR, KNN_K
from backend.data.loader import load_career_with_values, get_squad
from backend.data.preprocessor import get_primary_position, format_value


@functools.lru_cache(maxsize=1)
def _load_knn_artifacts():
    knn      = joblib.load(ARTIFACTS_DIR / "knn_model.joblib")
    scaler   = joblib.load(ARTIFACTS_DIR / "cluster_scaler.joblib")
    features = joblib.load(ARTIFACTS_DIR / "cluster_features.joblib")
    return knn, scaler, features


def _player_row_scaled(df: pd.DataFrame, idx: int) -> np.ndarray:
    _, scaler, features = _load_knn_artifacts()
    available = [f for f in features if f in df.columns]
    if len(available) < len(features):
        missing = set(features) - set(df.columns)
        logging.warning("KNN: %d features missing from data: %s", len(missing), missing)
    row = df.iloc[[idx]][available].fillna(0).values
    return scaler.transform(row)


def _find_player_index(df: pd.DataFrame, player_name: str) -> int | None:
    name_col = "Player" if "Player" in df.columns else "player_name"
    lower = player_name.lower().replace(" ", "")
    for i, val in enumerate(df[name_col]):
        if str(val).lower().replace(" ", "") == lower:
            return i
    # Fuzzy fallback: contains
    for i, val in enumerate(df[name_col]):
        if lower in str(val).lower().replace(" ", ""):
            return i
    return None


def _row_to_dict(row: pd.Series) -> dict:
    name_col  = "Player" if "Player" in row.index else "player_name"
    team_col  = "Team"   if "Team"   in row.index else "Squad"
    pos_col   = "Pos"    if "Pos"    in row.index else "Position"
    value     = float(row.get("Value", 0) or 0)
    return {
        "name":     str(row.get(name_col, "")),
        "team":     str(row.get(team_col, "")),
        "position": get_primary_position(str(row.get(pos_col, ""))),
        "value":    value,
        "value_fmt": format_value(value),
        "age":      int(row.get("Age", 0) or 0),
        "nation":   str(row.get("Nation", "")),
        "goals":    float(row.get("Goals", 0) or 0),
        "assists":  float(row.get("Assists", 0) or 0),
        "sca":      float(row.get("SCA", 0) or 0),
        "gca":      float(row.get("GCA", 0) or 0),
    }


def find_similar_players(player_name: str, k: int = 10) -> dict:
    df = load_career_with_values()
    knn, scaler, features = _load_knn_artifacts()

    idx = _find_player_index(df, player_name)
    if idx is None:
        return {"error": f"Player '{player_name}' not found", "similar": []}

    X_query = _player_row_scaled(df, idx)
    n_neighbors = min(k + 1, len(df))
    distances, indices = knn.kneighbors(X_query, n_neighbors=n_neighbors)

    similar = []
    for dist, i in zip(distances[0], indices[0]):
        if i == idx:
            continue
        row = df.iloc[i]
        entry = _row_to_dict(row)
        entry["similarity_pct"] = round(float(1 / (1 + dist) * 100), 1)
        entry["distance"] = round(float(dist), 4)
        similar.append(entry)
        if len(similar) >= k:
            break

    player_info = _row_to_dict(df.iloc[idx])
    return {"player": player_info, "similar": similar}


def find_budget_replacements(team_name: str, budget: float) -> list[dict]:
    df  = load_career_with_values()
    squad_df = get_squad(team_name)
    if squad_df.empty:
        return []

    name_col = "Player" if "Player" in df.columns else "player_name"
    knn, scaler, features = _load_knn_artifacts()
    available = [f for f in features if f in df.columns]

    results = []
    seen_replacements = set()

    for _, squad_row in squad_df.iterrows():
        original_name = str(squad_row.get("Player" if "Player" in squad_row.index else "player_name", ""))

        idx = _find_player_index(df, original_name)
        if idx is None:
            continue

        X_query = _player_row_scaled(df, idx)
        distances, indices = knn.kneighbors(X_query, n_neighbors=min(KNN_K + 30, len(df)))

        for dist, i in zip(distances[0], indices[0]):
            if i == idx:
                continue
            row = df.iloc[i]
            value = float(row.get("Value", 0) or 0)
            if value > budget or value == 0:
                continue
            rep_name = str(row.get(name_col, ""))
            if rep_name in seen_replacements:
                continue
            # Don't suggest players from same team
            team_col = "Team" if "Team" in row.index else "Squad"
            if str(row.get(team_col, "")).lower() == team_name.lower():
                continue
            seen_replacements.add(rep_name)
            entry = _row_to_dict(row)
            entry["original_player"]  = original_name
            entry["similarity_pct"]   = round(float(1 / (1 + dist) * 100), 1)
            entry["distance"]         = round(float(dist), 4)
            results.append(entry)

    # Sort by similarity
    results.sort(key=lambda x: x["distance"])
    return results
