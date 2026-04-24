"""
Offline training script — run once:
    cd DM-PROJECT
    python -m backend.models.train_regression

Produces artifacts/ directory with:
    - regression_scaler.joblib
    - rf_model.joblib, gb_model.joblib, xgb_model.joblib, svr_model.joblib, stacking_model.joblib
    - model_metrics.json
    - career_df_with_values.parquet
    - cluster_scaler.joblib
    - knn_model.joblib
    - test_data.joblib  (X_test_df + y_test for analytics endpoint)
"""
import json
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import RandomizedSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
    StackingRegressor,
)
from sklearn.linear_model import Ridge
from sklearn.svm import SVR
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.neighbors import NearestNeighbors
from xgboost import XGBRegressor

from backend.config import (
    IMPROVED_FEATURES,
    NUMERIC_FEATURES,
    ARTIFACTS_DIR,
    RANDOM_STATE,
    TEST_SIZE,
    KNN_K,
)
from backend.data.loader import load_model_ready_df, load_career_df
from backend.data.preprocessor import add_position_encoded, get_primary_position


# ── 1. Load & prepare model_ready dataset ─────────────────────────────────
print("Loading model_ready_dataset …")
df = load_model_ready_df()
df = add_position_encoded(df, pos_col="Position")

# ── 2. Player-based 80/20 split (same logic as notebook) ──────────────────
players = df["Player"].unique()
rng = np.random.default_rng(RANDOM_STATE)
rng.shuffle(players)
split = int(len(players) * (1 - TEST_SIZE))
train_players = set(players[:split])
test_players  = set(players[split:])

train_df = df[df["Player"].isin(train_players)].copy()
test_df  = df[df["Player"].isin(test_players)].copy()
print(f"  Train: {len(train_df)} rows  |  Test: {len(test_df)} rows")

# ── 3. Target (log1p transform) ───────────────────────────────────────────
y_train = np.log1p(train_df["value_num"].values)
y_test  = np.log1p(test_df["value_num"].values)

# ── 4. Feature matrix & scaler ────────────────────────────────────────────
# Some IMPROVED_FEATURES may not exist; keep only available ones
available_features = [f for f in IMPROVED_FEATURES if f in df.columns]
print(f"  Using {len(available_features)} features: {available_features}")

X_train_raw = train_df[available_features].fillna(0).values
X_test_raw  = test_df[available_features].fillna(0).values

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train_raw)
X_test  = scaler.transform(X_test_raw)

joblib.dump(scaler, ARTIFACTS_DIR / "regression_scaler.joblib")
joblib.dump(available_features, ARTIFACTS_DIR / "regression_features.joblib")

# Keep DataFrame version for SHAP
X_test_df = pd.DataFrame(X_test, columns=available_features)

# ── 5. Train models ───────────────────────────────────────────────────────
metrics = {}

def evaluate(name: str, model, X_tr, y_tr, X_te, y_te):
    model.fit(X_tr, y_tr)
    preds = model.predict(X_te)
    mae  = mean_absolute_error(y_te, preds)
    rmse = np.sqrt(mean_squared_error(y_te, preds))
    r2   = r2_score(y_te, preds)
    print(f"  [{name}]  MAE={mae:.4f}  RMSE={rmse:.4f}  R²={r2:.4f}")
    metrics[name] = {"mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4)}
    return model, preds


# --- Random Forest ---
rf = RandomForestRegressor(
    n_estimators=500, max_depth=8, min_samples_leaf=5,
    random_state=RANDOM_STATE, n_jobs=-1,
)
rf, rf_preds = evaluate("RandomForest", rf, X_train, y_train, X_test, y_test)
joblib.dump(rf, ARTIFACTS_DIR / "rf_model.joblib")

# --- Gradient Boosting ---
gb = GradientBoostingRegressor(
    n_estimators=500, learning_rate=0.05, max_depth=4,
    subsample=0.8, min_samples_leaf=10, random_state=RANDOM_STATE,
)
gb, gb_preds = evaluate("GradientBoosting", gb, X_train, y_train, X_test, y_test)
joblib.dump(gb, ARTIFACTS_DIR / "gb_model.joblib")

# --- XGBoost (with light RandomizedSearchCV) ---
xgb_base = XGBRegressor(
    n_estimators=500, learning_rate=0.05, max_depth=4,
    subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1, reg_lambda=1.0,
    random_state=RANDOM_STATE, n_jobs=-1, verbosity=0,
)
xgb_param_grid = {
    "learning_rate": [0.01, 0.03, 0.05, 0.08],
    "max_depth": [3, 4, 5, 6],
    "subsample": [0.7, 0.8, 0.9],
    "colsample_bytree": [0.7, 0.8, 0.9],
    "reg_alpha": [0.0, 0.05, 0.1, 0.2],
}
xgb_search = RandomizedSearchCV(
    xgb_base, xgb_param_grid, n_iter=20, cv=5,
    scoring="neg_mean_absolute_error", random_state=RANDOM_STATE, n_jobs=-1,
)
print("  Tuning XGBoost …")
xgb_search.fit(X_train, y_train)
xgb = xgb_search.best_estimator_
xgb_preds = xgb.predict(X_test)
xgb_mae  = mean_absolute_error(y_test, xgb_preds)
xgb_rmse = np.sqrt(mean_squared_error(y_test, xgb_preds))
xgb_r2   = r2_score(y_test, xgb_preds)
print(f"  [XGBoost]  MAE={xgb_mae:.4f}  RMSE={xgb_rmse:.4f}  R²={xgb_r2:.4f}")
metrics["XGBoost"] = {"mae": round(xgb_mae, 4), "rmse": round(xgb_rmse, 4), "r2": round(xgb_r2, 4)}
joblib.dump(xgb, ARTIFACTS_DIR / "xgb_model.joblib")

# --- SVR (with RandomizedSearchCV) ---
svr_param_grid = {
    "C": [1, 5, 10, 20, 50, 100],
    "epsilon": [0.05, 0.1, 0.2, 0.3],
    "gamma": ["scale", "auto", 0.01, 0.05],
}
svr_search = RandomizedSearchCV(
    SVR(kernel="rbf"), svr_param_grid, n_iter=20, cv=5,
    scoring="neg_mean_absolute_error", random_state=RANDOM_STATE, n_jobs=-1,
)
print("  Tuning SVR …")
svr_search.fit(X_train, y_train)
svr = svr_search.best_estimator_
svr_preds = svr.predict(X_test)
svr_mae  = mean_absolute_error(y_test, svr_preds)
svr_rmse = np.sqrt(mean_squared_error(y_test, svr_preds))
svr_r2   = r2_score(y_test, svr_preds)
print(f"  [SVR]  MAE={svr_mae:.4f}  RMSE={svr_rmse:.4f}  R²={svr_r2:.4f}")
metrics["SVR"] = {"mae": round(svr_mae, 4), "rmse": round(svr_rmse, 4), "r2": round(svr_r2, 4)}
joblib.dump(svr, ARTIFACTS_DIR / "svr_model.joblib")

# --- Stacking ensemble ---
print("  Training Stacking ensemble …")
stacking = StackingRegressor(
    estimators=[
        ("rf",  RandomForestRegressor(n_estimators=300, max_depth=8, min_samples_leaf=5,
                                       random_state=RANDOM_STATE, n_jobs=-1)),
        ("xgb", XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=4,
                              subsample=0.8, colsample_bytree=0.8, random_state=RANDOM_STATE,
                              n_jobs=-1, verbosity=0)),
        ("gb",  GradientBoostingRegressor(n_estimators=300, learning_rate=0.05, max_depth=4,
                                           subsample=0.8, random_state=RANDOM_STATE)),
    ],
    final_estimator=Ridge(alpha=1.0),
    cv=5,
    n_jobs=-1,
)
stacking, stacking_preds = evaluate("Stacking", stacking, X_train, y_train, X_test, y_test)
joblib.dump(stacking, ARTIFACTS_DIR / "stacking_model.joblib")

# ── 6. Pick best model & save test data for analytics ─────────────────────
best_name = min(metrics, key=lambda k: metrics[k]["mae"])
best_preds_map = {
    "RandomForest": rf_preds,
    "GradientBoosting": gb_preds,
    "XGBoost": xgb_preds,
    "SVR": svr_preds,
    "Stacking": stacking_preds,
}
best_preds = best_preds_map[best_name]

metrics["_best"] = best_name
with open(ARTIFACTS_DIR / "model_metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)
print(f"\n  Best model: {best_name}  (MAE={metrics[best_name]['mae']:.4f})")

# Save test data for analytics plots
joblib.dump(
    {"X_test_df": X_test_df, "y_test": y_test, "best_preds": best_preds},
    ARTIFACTS_DIR / "test_data.joblib",
)

# ── 7. Predict values for career dataset ──────────────────────────────────
print("\nPredicting values for career dataset …")
career_df = load_career_df()

# Map career column names → model feature names
CAREER_FEATURE_MAP = {
    "GCA GCA":            "GCA",
    "GCA Types PassLive": "PassLive",
    "SCA SCA":            "SCA",
    "SCA Types TO":       "TO",
    "SCA Types Sh":       "Sh",
    "90s":                "90s",
    "Age2":               None,          # computed below
    "overall_rating":     None,          # not in career df
    "potential":          None,          # not in career df
    "SCA90":              "SCA90",
    "GCA90":              "GCA90",
    "wage_num":           None,          # not in career df
    "SCA Types PassLive": "PassLive",
    "SCA Types Fld":      "Fld",
    "GCA Types TO":       "TO",
    "position_encoded":   None,          # computed below
}

pred_df = career_df.copy()
pred_df["Age2"] = pred_df["Age"] ** 2
pred_df["position_encoded"] = pred_df["Pos"].apply(
    lambda x: {"GK": 0, "DF": 1, "MF": 2, "FW": 3}.get(
        get_primary_position(str(x)), 2
    )
)

feat_matrix = pd.DataFrame(index=pred_df.index)
for feat in available_features:
    if feat == "Age2":
        feat_matrix[feat] = pred_df["Age2"]
    elif feat == "position_encoded":
        feat_matrix[feat] = pred_df["position_encoded"]
    elif feat in ["overall_rating", "potential", "wage_num"]:
        feat_matrix[feat] = 0.0  # not available in career df
    else:
        # Try direct match, then CAREER_FEATURE_MAP
        career_col = CAREER_FEATURE_MAP.get(feat, feat)
        if career_col and career_col in pred_df.columns:
            feat_matrix[feat] = pred_df[career_col].fillna(0)
        elif feat in pred_df.columns:
            feat_matrix[feat] = pred_df[feat].fillna(0)
        else:
            feat_matrix[feat] = 0.0

X_career = scaler.transform(feat_matrix.fillna(0).values)

# Use best model for career predictions
best_model_map = {
    "RandomForest": rf, "GradientBoosting": gb,
    "XGBoost": xgb, "SVR": svr, "Stacking": stacking,
}
best_model = best_model_map[best_name]
career_log_preds = best_model.predict(X_career)
pred_df["Value"] = np.expm1(career_log_preds)
pred_df["Value"] = pred_df["Value"].clip(lower=0)

pred_df.to_parquet(ARTIFACTS_DIR / "career_df_with_values.parquet", index=False)
print(f"  Saved career_df_with_values.parquet  ({len(pred_df)} rows)")

# ── 8. Cluster scaler + KNN ───────────────────────────────────────────────
print("\nFitting cluster scaler and KNN …")
available_numeric = [c for c in NUMERIC_FEATURES if c in pred_df.columns]
X_cluster = pred_df[available_numeric].fillna(0).values

cluster_scaler = StandardScaler()
X_cluster_scaled = cluster_scaler.fit_transform(X_cluster)
joblib.dump(cluster_scaler, ARTIFACTS_DIR / "cluster_scaler.joblib")
joblib.dump(available_numeric, ARTIFACTS_DIR / "cluster_features.joblib")

knn = NearestNeighbors(n_neighbors=KNN_K, metric="euclidean")
knn.fit(X_cluster_scaled)
joblib.dump(knn, ARTIFACTS_DIR / "knn_model.joblib")
print("  Cluster scaler + KNN saved.")

print("\nAll artifacts saved to", ARTIFACTS_DIR)
print("\nModel summary:")
print(f"{'Model':<20} {'MAE':>8} {'RMSE':>8} {'R²':>8}")
print("-" * 48)
for name, m in metrics.items():
    if name.startswith("_"):
        continue
    marker = " ◀ best" if name == best_name else ""
    print(f"{name:<20} {m['mae']:>8.4f} {m['rmse']:>8.4f} {m['r2']:>8.4f}{marker}")
