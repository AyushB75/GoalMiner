"""
Fix career dataset value predictions by properly imputing overall_rating/potential.
Run once after initial training:
    cd DM-PROJECT
    python -m backend.models.fix_career_values
"""
import numpy as np
import pandas as pd
import joblib

from backend.config import ARTIFACTS_DIR, CAREER_PARQUET
from backend.data.loader import load_model_ready_df, load_career_df
from backend.data.preprocessor import get_primary_position


def normalize_name(n: str) -> str:
    return str(n).lower().replace(" ", "").replace("-", "").replace(".", "").replace("'", "")


def build_mr_lookup() -> dict:
    """Build name → {overall_rating, potential, wage_num} from model_ready_dataset."""
    mr_df = load_model_ready_df()
    lookup = {}
    for _, row in mr_df.iterrows():
        key = normalize_name(str(row.get("Player", "")))
        if key:
            lookup[key] = {
                "overall_rating": float(row.get("overall_rating", 0) or 0),
                "potential":      float(row.get("potential", 0) or 0),
                "wage_num":       float(row.get("wage_num", 0) or 0),
            }
    return lookup


def build_position_medians(lookup: dict) -> dict:
    """Compute median overall_rating / potential by position as fallback."""
    mr_df = load_model_ready_df()
    medians = {}
    for pos in ["GK", "DF", "MF", "FW"]:
        subset = mr_df[mr_df["Position"].apply(
            lambda p: get_primary_position(str(p)) == pos
        )]
        medians[pos] = {
            "overall_rating": float(subset["overall_rating"].median()) if not subset.empty else 70.0,
            "potential":      float(subset["potential"].median())      if not subset.empty else 73.0,
            "wage_num":       float(subset["wage_num"].median())       if not subset.empty else 20000.0,
        }
    return medians


def main():
    print("Loading artifacts …")
    scaler          = joblib.load(ARTIFACTS_DIR / "regression_scaler.joblib")
    features        = joblib.load(ARTIFACTS_DIR / "regression_features.joblib")
    metrics_path    = ARTIFACTS_DIR / "model_metrics.json"
    import json
    with open(metrics_path) as f:
        metrics = json.load(f)
    best_name = metrics.get("_best", "XGBoost")
    model_files = {
        "RandomForest":    "rf_model.joblib",
        "GradientBoosting":"gb_model.joblib",
        "XGBoost":         "xgb_model.joblib",
        "SVR":             "svr_model.joblib",
        "Stacking":        "stacking_model.joblib",
    }
    best_model = joblib.load(ARTIFACTS_DIR / model_files[best_name])
    print(f"  Using model: {best_name}")

    # Name lookup and position medians
    mr_lookup = build_mr_lookup()
    pos_medians = build_position_medians(mr_lookup)
    print(f"  Name lookup: {len(mr_lookup)} entries")
    print(f"  Position medians: {pos_medians}")

    career_df = load_career_df()
    pred_df = career_df.copy()
    pred_df["Age2"] = pred_df["Age"] ** 2
    pred_df["position_encoded"] = pred_df["Pos"].apply(
        lambda x: {"GK": 0, "DF": 1, "MF": 2, "FW": 3}.get(
            get_primary_position(str(x)), 2
        )
    )

    # Build feat_matrix row by row (imputing FIFA stats properly)
    CAREER_FEATURE_MAP = {
        "GCA GCA":            "GCA",
        "GCA Types PassLive": "PassLive",
        "SCA SCA":            "SCA",
        "SCA Types TO":       "TO",
        "SCA Types Sh":       "Sh",
        "90s":                "90s",
        "SCA90":              "SCA90",
        "GCA90":              "GCA90",
        "SCA Types PassLive": "PassLive",
        "SCA Types Fld":      "Fld",
        "GCA Types TO":       "TO",
    }

    # Resolve each row's FIFA stats
    fifa_cols = ["overall_rating", "potential", "wage_num"]
    fifa_matrix = np.zeros((len(pred_df), 3), dtype=np.float32)
    matched = 0
    for i, (_, row) in enumerate(pred_df.iterrows()):
        # Try player_name key (already normalized in career df)
        pname = str(row.get("player_name", row.get("Player", ""))).strip()
        key = normalize_name(pname)
        if key in mr_lookup:
            for j, col in enumerate(fifa_cols):
                fifa_matrix[i, j] = mr_lookup[key][col]
            matched += 1
        else:
            # Fallback to position median
            pos = get_primary_position(str(row.get("Pos", "")))
            med = pos_medians.get(pos, pos_medians["MF"])
            for j, col in enumerate(fifa_cols):
                fifa_matrix[i, j] = med[col]

    print(f"  Name-matched: {matched}/{len(pred_df)} players")

    # Build feature matrix
    feat_matrix = pd.DataFrame(index=pred_df.index)
    for feat in features:
        if feat == "Age2":
            feat_matrix[feat] = pred_df["Age2"].values
        elif feat == "position_encoded":
            feat_matrix[feat] = pred_df["position_encoded"].values
        elif feat in fifa_cols:
            j = fifa_cols.index(feat)
            feat_matrix[feat] = fifa_matrix[:, j]
        else:
            career_col = CAREER_FEATURE_MAP.get(feat, feat)
            if career_col and career_col in pred_df.columns:
                feat_matrix[feat] = pred_df[career_col].fillna(0).values
            elif feat in pred_df.columns:
                feat_matrix[feat] = pred_df[feat].fillna(0).values
            else:
                feat_matrix[feat] = 0.0

    X_career = scaler.transform(feat_matrix.fillna(0).values)
    career_log_preds = best_model.predict(X_career)
    pred_df["Value"] = np.clip(np.expm1(career_log_preds), 0, None)

    # Stats
    values = pred_df["Value"]
    print(f"\n  Value stats:")
    print(f"    Min:    €{values.min():,.0f}")
    print(f"    Median: €{values.median():,.0f}")
    print(f"    Mean:   €{values.mean():,.0f}")
    print(f"    Max:    €{values.max():,.0f}")
    pct_over_1m = (values >= 1_000_000).mean() * 100
    print(f"    >=1M:   {pct_over_1m:.1f}%")

    pred_df.to_parquet(CAREER_PARQUET, index=False)
    print(f"\nSaved {CAREER_PARQUET}")

    # Also refit KNN on updated data
    from sklearn.neighbors import NearestNeighbors
    from sklearn.preprocessing import StandardScaler
    from backend.config import NUMERIC_FEATURES, KNN_K

    print("\nRefitting cluster scaler and KNN …")
    available_numeric = [c for c in NUMERIC_FEATURES if c in pred_df.columns]
    X_cluster = pred_df[available_numeric].fillna(0).values
    cluster_scaler = StandardScaler()
    X_cluster_scaled = cluster_scaler.fit_transform(X_cluster)
    joblib.dump(cluster_scaler, ARTIFACTS_DIR / "cluster_scaler.joblib")
    joblib.dump(available_numeric, ARTIFACTS_DIR / "cluster_features.joblib")

    knn = NearestNeighbors(n_neighbors=KNN_K, metric="euclidean")
    knn.fit(X_cluster_scaled)
    joblib.dump(knn, ARTIFACTS_DIR / "knn_model.joblib")
    print("Done.")


if __name__ == "__main__":
    main()
