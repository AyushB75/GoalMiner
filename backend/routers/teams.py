from fastapi import APIRouter, HTTPException, Query
from backend.data.loader import get_teams, get_squad
from backend.data.preprocessor import get_primary_position, format_value
from backend.models.clustering import get_team_clusters
from backend.models.similarity import find_budget_replacements
import numpy as np
import pandas as pd

router = APIRouter()


@router.get("/teams")
def list_teams():
    return {"teams": get_teams()}


@router.get("/team/{team_name}/squad")
def squad(team_name: str):
    df = get_squad(team_name)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"Team '{team_name}' not found")

    name_col  = "Player" if "Player" in df.columns else "player_name"
    pos_col   = "Pos"    if "Pos"    in df.columns else "Position"
    value_col = "Value"  if "Value"  in df.columns else None

    players = []
    for _, row in df.iterrows():
        value = float(row[value_col]) if value_col and not pd.isna(row.get(value_col, float("nan"))) else 0.0
        players.append({
            "name":       str(row.get(name_col, "")),
            "position":   get_primary_position(str(row.get(pos_col, ""))),
            "age":        int(row.get("Age", 0) or 0),
            "nation":     str(row.get("Nation", "")),
            "value":      value,
            "value_fmt":  format_value(value),
            "goals":      float(row.get("Goals", 0) or 0),
            "assists":    float(row.get("Assists", 0) or 0),
            "matches":    float(row.get("MP", row.get("Matches", 0)) or 0),
            "sca":        float(row.get("SCA", 0) or 0),
            "gca":        float(row.get("GCA", 0) or 0),
            "prog_carries": float(row.get("ProgressiveCarries", 0) or 0),
            "tackles_won":  float(row.get("Tackles_Won", 0) or 0),
        })

    avg_value = float(np.mean([p["value"] for p in players if p["value"] > 0])) if players else 0.0
    return {
        "team":      team_name,
        "count":     len(players),
        "avg_value": avg_value,
        "avg_value_fmt": format_value(avg_value),
        "players":   players,
    }


@router.get("/team/{team_name}/clusters")
def clusters(team_name: str):
    result = get_team_clusters(team_name)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/team/{team_name}/replacements")
def replacements(
    team_name: str,
    budget: float = Query(default=50_000_000, ge=0, description="Budget in euros"),
):
    results = find_budget_replacements(team_name, budget)
    return {"team": team_name, "budget": budget, "suggestions": results}
