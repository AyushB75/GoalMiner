from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.teams   import router as teams_router
from backend.routers.players import router as players_router
from backend.routers.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm all caches so first requests are fast."""
    from backend.data.loader import load_model_ready_df, load_career_df, load_career_with_values
    from backend.models.regression import _load_artifacts, get_regression_analytics
    from backend.models.clustering import _load_cluster_artifacts, get_dbscan_clusters
    from backend.models.similarity import _load_knn_artifacts
    load_model_ready_df()
    load_career_df()
    load_career_with_values()
    _load_artifacts()
    _load_cluster_artifacts()
    _load_knn_artifacts()
    get_dbscan_clusters()
    print("Computing SHAP values and generating plots...")
    get_regression_analytics()   # pre-compute SHAP + plots so first request is instant
    print("All caches warmed. Ready to serve requests.")
    yield


app = FastAPI(title="Football Analytics API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teams_router,     prefix="/api")
app.include_router(players_router,   prefix="/api")
app.include_router(analytics_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Football Analytics API is running"}
