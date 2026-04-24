"""CSV / Parquet loaders — cached after first call."""
import functools
import pandas as pd
from backend.config import MODEL_READY_CSV, CAREER_CSV, CAREER_PARQUET


@functools.lru_cache(maxsize=1)
def load_model_ready_df() -> pd.DataFrame:
    df = pd.read_csv(MODEL_READY_CSV)
    df = df[df["Position"] != "Goalkeeper"].copy()
    df = df[df["value_num"] > 0].copy()
    df["Age2"] = df["Age"] ** 2
    return df.reset_index(drop=True)


@functools.lru_cache(maxsize=1)
def load_career_df() -> pd.DataFrame:
    df = pd.read_csv(CAREER_CSV)
    if "Season" in df.columns:
        df = df.drop(columns=["Season"])
    numeric_cols = df.select_dtypes(include="number").columns
    df[numeric_cols] = df[numeric_cols].fillna(0)
    return df.reset_index(drop=True)


@functools.lru_cache(maxsize=1)
def load_career_with_values() -> pd.DataFrame:
    """Load the parquet produced by train_regression.py (has predicted Value col)."""
    if CAREER_PARQUET.exists():
        return pd.read_parquet(CAREER_PARQUET)
    # Fallback: career df without values
    return load_career_df()


def get_teams() -> list[str]:
    df = load_career_with_values()
    col = "Team" if "Team" in df.columns else "Squad"
    return sorted(df[col].dropna().unique().tolist())


@functools.lru_cache(maxsize=128)
def get_squad(team_name: str) -> pd.DataFrame:
    df = load_career_with_values()
    col = "Team" if "Team" in df.columns else "Squad"
    mask = df[col].str.lower() == team_name.lower()
    return df[mask].copy()
