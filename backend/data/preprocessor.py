"""Feature engineering and formatting helpers."""
import re
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


_POS_MAP = {
    "GK": "GK",
    "DF": "DF", "CB": "DF", "LB": "DF", "RB": "DF", "WB": "DF",
    "MF": "MF", "CM": "MF", "DM": "MF", "AM": "MF", "LM": "MF", "RM": "MF",
    "FW": "FW", "LW": "FW", "RW": "FW", "CF": "FW", "SS": "FW",
}

_POS_INT = {"GK": 0, "DF": 1, "MF": 2, "FW": 3}


def get_primary_position(pos_str: str) -> str:
    """Return canonical 2-letter position from messy multi-value string."""
    if not isinstance(pos_str, str) or not pos_str.strip():
        return "MF"
    # Take first segment (e.g. "DF,MF" → "DF")
    first = re.split(r"[/ ,]", pos_str.strip())[0].upper()
    return _POS_MAP.get(first, "MF")


def position_to_int(pos: str) -> int:
    return _POS_INT.get(get_primary_position(pos), 2)


def format_value(v: float) -> str:
    if pd.isna(v) or v == 0:
        return "N/A"
    if v >= 1_000_000:
        return f"€{v / 1_000_000:.1f}M"
    if v >= 1_000:
        return f"€{v / 1_000:.0f}K"
    return f"€{v:.0f}"


def scale_features(
    df: pd.DataFrame,
    feature_cols: list[str],
    scaler: StandardScaler | None = None,
) -> tuple[np.ndarray, StandardScaler]:
    """Fit (if scaler=None) or transform. Returns (scaled_array, scaler)."""
    X = df[feature_cols].fillna(0).values
    if scaler is None:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
    else:
        X_scaled = scaler.transform(X)
    return X_scaled, scaler


def add_position_encoded(df: pd.DataFrame, pos_col: str = "Position") -> pd.DataFrame:
    df = df.copy()
    df["position_encoded"] = df[pos_col].apply(position_to_int)
    return df
