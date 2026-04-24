from fastapi import APIRouter, HTTPException, Query
from backend.models.similarity import find_similar_players

router = APIRouter()


@router.get("/player/{player_name}/similar")
def similar_players(
    player_name: str,
    k: int = Query(default=10, ge=1, le=30),
):
    result = find_similar_players(player_name, k=k)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
