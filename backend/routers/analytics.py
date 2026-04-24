from fastapi import APIRouter
from backend.models.regression import get_regression_analytics
from backend.models.clustering import get_dbscan_clusters
from backend.data.loader import load_career_with_values
from backend.data.preprocessor import get_primary_position, format_value
import numpy as np

router = APIRouter()


@router.get("/analytics/regression")
def regression_analytics():
    return get_regression_analytics()


@router.get("/analytics/distribution")
def distribution_analytics():
    df = load_career_with_values()
    value_col = "Value" if "Value" in df.columns else None
    pos_col   = "Pos"   if "Pos"   in df.columns else "Position"
    name_col  = "Player" if "Player" in df.columns else "player_name"
    team_col  = "Team"  if "Team"  in df.columns else "Squad"
    league_col = "League" if "League" in df.columns else None

    # Value histogram buckets
    if value_col:
        values = df[value_col].dropna()
        values = values[values > 0]
        bins = [0, 1e6, 5e6, 10e6, 20e6, 50e6, 100e6, 200e6, float("inf")]
        labels_hist = ["<1M", "1-5M", "5-10M", "10-20M", "20-50M", "50-100M", "100-200M", ">200M"]
        counts, _ = np.histogram(values, bins=bins)
        histogram = [{"range": lbl, "count": int(c)} for lbl, c in zip(labels_hist, counts)]
    else:
        histogram = []

    # Position breakdown
    pos_counts = {}
    for val in df[pos_col].dropna():
        p = get_primary_position(str(val))
        pos_counts[p] = pos_counts.get(p, 0) + 1
    position_breakdown = [{"position": k, "count": v} for k, v in sorted(pos_counts.items())]

    # Top 20 by value
    top20 = []
    if value_col:
        top_df = df.nlargest(20, value_col)[[name_col, team_col, pos_col, value_col]]
        for _, row in top_df.iterrows():
            v = float(row[value_col] or 0)
            top20.append({
                "name":     str(row[name_col]),
                "team":     str(row[team_col]),
                "position": get_primary_position(str(row[pos_col])),
                "value":    v,
                "value_fmt": format_value(v),
            })

    # Value by league
    by_league = []
    if value_col and league_col:
        for league, grp in df.groupby(league_col):
            vals = grp[value_col].dropna()
            vals = vals[vals > 0]
            if len(vals) < 5:
                continue
            by_league.append({
                "league":     str(league),
                "avg_value":  float(vals.mean()),
                "median_value": float(vals.median()),
                "max_value":  float(vals.max()),
                "count":      int(len(vals)),
            })

    return {
        "histogram":          histogram,
        "position_breakdown": position_breakdown,
        "top_20":             top20,
        "by_league":          by_league,
    }


@router.get("/analytics/dbscan")
def dbscan_clusters():
    return get_dbscan_clusters()
