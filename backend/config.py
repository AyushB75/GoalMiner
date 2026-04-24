from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR.parent / "dataset"
ARTIFACTS_DIR = BASE_DIR / "models" / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_READY_CSV = DATASET_DIR / "model_ready_dataset.csv"
CAREER_CSV = DATASET_DIR / "career_player_dataset_cleaned.csv"
CAREER_PARQUET = ARTIFACTS_DIR / "career_df_with_values.parquet"
METRICS_JSON = ARTIFACTS_DIR / "model_metrics.json"

# ── Regression features ────────────────────────────────────────────────────
# Original 7 from notebook
BASE_FEATURES = [
    "GCA GCA",
    "GCA Types PassLive",
    "SCA SCA",
    "SCA Types TO",
    "SCA Types Sh",
    "90s",
    "Age2",
]

# Extended feature set (adds overall_rating, potential, per-90 rates, wage, position)
IMPROVED_FEATURES = BASE_FEATURES + [
    "overall_rating",
    "potential",
    "SCA90",
    "GCA90",
    "wage_num",
    "SCA Types PassLive",
    "SCA Types Fld",
    "GCA Types TO",
    "position_encoded",
]

# ── Clustering features (45 from notebook cell 48) ─────────────────────────
NUMERIC_FEATURES = [
    "Goals", "Assists", "GoalsandAssists", "NonPenaltyGoals", "PenaltyGoals",
    "PenaltiesAttemped", "GoalsPer90", "AssistPer90", "GoalsandAssistPer90",
    "NonPenaltyGoalsPer90", "ShotsOnTarget", "Sh/90", "GoalsPerShot",
    "GoalsPerShotOnTarget", "AvgShotDistance", "PrgC", "ProgressiveCarries",
    "ProgressivePasses", "PrgDist", "Att", "Cmp", "Cmp%", "LP_Att", "LP_Cmp",
    "LP_Cmp%", "MP_Att", "MP_Cmp", "MP_Cmp%", "SP_Att", "SP_Cmp", "SP_Cmp%",
    "Passes_Att", "PassDead", "PassLive", "Clearance", "Tackles_Won",
    "Tackles_Att_3rd", "Tackles_Def_3rd", "Tackles_mid_3rd", "Interceptions",
    "Drib_Tackled", "Passes_Blocked", "Shots_Blocked", "Total_Tackles",
    "Total_Blocks", "Drib_Tackle_Lost", "Def", "Carries", "CarriesPenArea",
    "ProgressiveFinalThird", "ProgressiveReceive", "ProgressivegDist",
    "Touches", "TouchesAtt 3rd", "TouchesAtt Pen", "TouchesDef 3rd",
    "TouchesDef Pen", "TouchesLive", "TouchesMid 3rd", "DribblesAtt",
    "DribbleSucc", "DribbleSucc%", "DribbleTkld", "Miscontrolled",
    "SCA", "GCA", "SCA90", "GCA90",
]

# ── Model hyper-params ─────────────────────────────────────────────────────
CLUSTER_N = 4
DBSCAN_EPS = 2.5
DBSCAN_MIN_SAMPLES = 3
KNN_K = 11

RANDOM_STATE = 42
TEST_SIZE = 0.20
