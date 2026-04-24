"""Load trained regression models and serve predictions / analytics."""
import json
import functools
import numpy as np
import pandas as pd
import joblib

from backend.config import ARTIFACTS_DIR
from backend.utils.plot_utils import (
    make_actual_vs_predicted,
    make_residual_plot,
    generate_shap_plot,
)
from sklearn.metrics import r2_score


@functools.lru_cache(maxsize=1)
def _load_artifacts():
    scaler   = joblib.load(ARTIFACTS_DIR / "regression_scaler.joblib")
    features = joblib.load(ARTIFACTS_DIR / "regression_features.joblib")
    with open(ARTIFACTS_DIR / "model_metrics.json") as f:
        metrics = json.load(f)
    best_name = metrics.get("_best", "XGBoost")
    model_file = {
        "RandomForest":    "rf_model.joblib",
        "GradientBoosting":"gb_model.joblib",
        "XGBoost":         "xgb_model.joblib",
        "SVR":             "svr_model.joblib",
        "Stacking":        "stacking_model.joblib",
    }
    models = {name: joblib.load(ARTIFACTS_DIR / fname) for name, fname in model_file.items()}
    test_data = joblib.load(ARTIFACTS_DIR / "test_data.joblib")
    return scaler, features, metrics, best_name, models, test_data


def predict_value(feature_dict: dict) -> float:
    """Predict single player value from a dict of raw feature values."""
    scaler, features, _, best_name, models, _ = _load_artifacts()
    row = pd.DataFrame([{f: feature_dict.get(f, 0.0) for f in features}]).fillna(0)
    X = scaler.transform(row.values)
    log_pred = models[best_name].predict(X)[0]
    return float(np.expm1(log_pred))


@functools.lru_cache(maxsize=1)
def get_regression_analytics() -> dict:
    """Return model metrics + base64 plots for the analytics endpoint."""
    scaler, features, metrics, best_name, models, test_data = _load_artifacts()

    X_test_df  = test_data["X_test_df"]
    y_test     = test_data["y_test"]
    best_preds = test_data["best_preds"]

    r2 = r2_score(y_test, best_preds)

    # Build model list for frontend bar chart
    model_list = []
    for name, m in metrics.items():
        if name.startswith("_"):
            continue
        model_list.append({
            "name":    name,
            "mae":     m["mae"],
            "rmse":    m["rmse"],
            "r2":      m["r2"],
            "is_best": name == best_name,
        })

    # Generate SHAP first — before any other plot can contaminate matplotlib state
    shap_model = models.get("XGBoost") or models[best_name]
    shap_plot = generate_shap_plot(shap_model, X_test_df.values, X_test_df)

    # Generate remaining plots after SHAP is done and its figure closed
    avp_plot      = make_actual_vs_predicted(y_test, best_preds, r2)
    residual_plot = make_residual_plot(y_test, best_preds)

    return {
        "model_metrics":        model_list,
        "best_model":           best_name,
        "features":             features,
        "actual_vs_predicted":  avp_plot,
        "residual_plot":        residual_plot,
        "shap_plot":            shap_plot,
    }
