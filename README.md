# ⚽ GoalMiner — Football Player Market Value Prediction & Squad Optimization

> A full-stack data science application that predicts football player market values using ensemble ML models, clusters players by play style, and suggests budget-aware transfer replacements.

---

## 📌 Project Overview

GoalMiner combines football statistics from FBRef and FIFA datasets to:

- **Predict market value** using an ensemble of Random Forest, XGBoost, SVR, and Gradient Boosting (stacking regressor)
- **Explain predictions** with SHAP (SHapley Additive exPlanations)
- **Cluster players** by play style using K-Means and DBSCAN on PCA-reduced features
- **Find similar players** via KNN cosine similarity
- **Suggest transfer replacements** within a given budget

Built with **FastAPI** (Python backend) and **React + TypeScript + Tailwind** (frontend).

---

## 🏗️ Project Structure

```
GoalMiner/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Paths, features, hyperparameters
│   ├── requirements.txt
│   ├── data/
│   │   ├── loader.py            # Cached data loading
│   │   └── preprocessor.py     # Feature engineering
│   ├── models/
│   │   ├── regression.py        # Stacking ensemble + SHAP
│   │   ├── clustering.py        # K-Means / DBSCAN
│   │   ├── similarity.py        # KNN player similarity
│   │   ├── train_regression.py  # Training script
│   │   └── artifacts/           # Saved models (see Setup)
│   ├── routers/
│   │   ├── players.py
│   │   ├── teams.py
│   │   └── analytics.py
│   └── utils/
│       └── plot_utils.py
├── frontend/
│   ├── src/
│   │   ├── pages/               # HomePage, PlayerPage, SquadPage, etc.
│   │   ├── components/          # Reusable UI components
│   │   ├── api/                 # Axios API client
│   │   └── types/               # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── src/
│   └── data_visualization.ipynb # EDA & model training notebook
├── results/                     # Output plots (PCA, SHAP, clusters, etc.)
└── GoalMiner_Report.pdf
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/GoalMiner.git
cd GoalMiner
```

### 2. Backend setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Dataset & model artifacts

The datasets and trained model artifacts are **not included in the repo** due to file size.

**Option A — Retrain from scratch:**
```bash
# Place datasets in dataset/ folder:
#   dataset/career_player_dataset_cleaned.csv
#   dataset/model_ready_dataset.csv

python -m backend.models.train_regression
```

**Option B — Download pre-trained artifacts:**
> *(Add a Google Drive / HuggingFace link here if you share them)*

Artifacts expected in `backend/models/artifacts/`:
- `rf_model.joblib`, `xgb_model.joblib`, `svr_model.joblib`
- `gb_model.joblib`, `stacking_model.joblib`
- `knn_model.joblib`, `cluster_scaler.joblib`, `cluster_features.joblib`
- `career_df_with_values.parquet`
- `regression_scaler.joblib`, `regression_features.joblib`
- `test_data.joblib`, `model_metrics.json`

### 4. Run the backend

```bash
uvicorn backend.main:app --reload
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 5. Frontend setup

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

---

## 🧠 Models & Methodology

| Component | Method |
|---|---|
| Market Value Prediction | Stacking Ensemble (RF + XGBoost + SVR + GB → Ridge meta) |
| Explainability | SHAP Summary, Bar, Waterfall, Dependence plots |
| Play Style Clustering | K-Means (k=4) + DBSCAN on PCA-reduced features |
| Player Similarity | KNN (k=11) with cosine distance |
| Dimensionality Reduction | PCA (explained variance analysis) |

---

## 📊 Results

Result plots are in the `results/` folder, organized by analysis type:

- `pca/` — Scree plot, cumulative variance, PCA scatter
- `kmeans/` — Elbow, silhouette, cluster visualization
- `dbscan/` — Output clusters, k-distance plot
- `knn/` — Similarity heatmap, radar chart
- `regression/` — Metrics comparison, actual vs predicted, residuals
- `shap/` — Summary, bar, waterfall, dependence plots
- `correlation/` — Feature correlation heatmap

## 👥 Author

| Name | Role |
|---|---|
| Ayush | ML Models, Backend, Frontend, Integration |

## 📄 License

This project is for academic purposes.
