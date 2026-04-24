"""matplotlib/seaborn → base64 PNG helpers. Uses Agg (server-safe)."""
import io
import base64

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import seaborn as sns

DARK_BG = "#0d1117"
CARD_BG = "#161b22"
ACCENT = "#00d4aa"
TEXT_COLOR = "#c9d1d9"
GRID_COLOR = "#21262d"

CLUSTER_COLORS = ["#00d4aa", "#f78166", "#79c0ff", "#ffa657"]


def _apply_dark_style(fig, ax_or_axes):
    fig.patch.set_facecolor(DARK_BG)
    axes = ax_or_axes if isinstance(ax_or_axes, (list, np.ndarray)) else [ax_or_axes]
    for ax in np.ravel(axes):
        ax.set_facecolor(CARD_BG)
        ax.tick_params(colors=TEXT_COLOR)
        ax.xaxis.label.set_color(TEXT_COLOR)
        ax.yaxis.label.set_color(TEXT_COLOR)
        ax.title.set_color(TEXT_COLOR)
        for spine in ax.spines.values():
            spine.set_edgecolor(GRID_COLOR)
        ax.grid(color=GRID_COLOR, linestyle="--", linewidth=0.5, alpha=0.6)


def fig_to_base64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, bbox_inches="tight", facecolor=DARK_BG)
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return f"data:image/png;base64,{encoded}"


def make_pca_scatter(
    pca_coords: np.ndarray,
    labels: np.ndarray,
    player_names: list[str],
    title: str = "Player Clusters (PCA)",
) -> str:
    fig, ax = plt.subplots(figsize=(10, 7))
    unique_labels = sorted(set(labels))
    for lbl in unique_labels:
        mask = labels == lbl
        color = CLUSTER_COLORS[int(lbl) % len(CLUSTER_COLORS)] if lbl >= 0 else "#555"
        label_str = f"Cluster {lbl}" if lbl >= 0 else "Noise"
        ax.scatter(
            pca_coords[mask, 0], pca_coords[mask, 1],
            c=color, label=label_str, alpha=0.8, s=60, edgecolors="none",
        )
    ax.set_title(title, fontsize=14, pad=12)
    ax.set_xlabel("PC1")
    ax.set_ylabel("PC2")
    legend = ax.legend(facecolor=CARD_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR)
    _apply_dark_style(fig, ax)
    return fig_to_base64(fig)


def make_cluster_heatmap(cluster_summary: dict, title: str = "Cluster Stats Heatmap") -> str:
    import pandas as pd
    df = pd.DataFrame(cluster_summary).T
    # Keep only numeric columns with meaningful variance
    df = df.select_dtypes(include="number")
    if df.empty:
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.text(0.5, 0.5, "No data", ha="center", va="center", color=TEXT_COLOR)
        _apply_dark_style(fig, ax)
        return fig_to_base64(fig)

    # Normalise per column for heatmap readability
    df_norm = (df - df.min()) / (df.max() - df.min() + 1e-9)
    fig, ax = plt.subplots(figsize=(max(10, len(df.columns) * 0.6), max(4, len(df) * 1.2)))
    sns.heatmap(
        df_norm, ax=ax, cmap="YlGnBu", annot=df.round(1), fmt="g",
        linewidths=0.4, linecolor=GRID_COLOR,
        annot_kws={"size": 8, "color": "white"},
        cbar_kws={"shrink": 0.8},
    )
    ax.set_title(title, fontsize=13, pad=10, color=TEXT_COLOR)
    ax.set_facecolor(CARD_BG)
    ax.tick_params(colors=TEXT_COLOR, labelsize=8)
    fig.patch.set_facecolor(DARK_BG)
    cbar = ax.collections[0].colorbar
    cbar.ax.yaxis.set_tick_params(color=TEXT_COLOR)
    plt.setp(cbar.ax.yaxis.get_ticklabels(), color=TEXT_COLOR)
    return fig_to_base64(fig)


def make_actual_vs_predicted(y_true: np.ndarray, y_pred: np.ndarray, r2: float) -> str:
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(y_true, y_pred, alpha=0.5, s=25, c=ACCENT, edgecolors="none")
    mn = min(y_true.min(), y_pred.min())
    mx = max(y_true.max(), y_pred.max())
    ax.plot([mn, mx], [mn, mx], color="#f78166", linewidth=1.5, linestyle="--", label="Perfect fit")
    ax.set_xlabel("Actual log(Value)")
    ax.set_ylabel("Predicted log(Value)")
    ax.set_title(f"Actual vs Predicted  (R² = {r2:.3f})", fontsize=13)
    ax.legend(facecolor=CARD_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR)
    _apply_dark_style(fig, ax)
    return fig_to_base64(fig)


def make_residual_plot(y_true: np.ndarray, y_pred: np.ndarray) -> str:
    residuals = y_true - y_pred
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.scatter(y_pred, residuals, alpha=0.5, s=25, c=ACCENT, edgecolors="none")
    ax.axhline(0, color="#f78166", linewidth=1.5, linestyle="--")
    ax.set_xlabel("Predicted log(Value)")
    ax.set_ylabel("Residual")
    ax.set_title("Residual Plot", fontsize=13)
    _apply_dark_style(fig, ax)
    return fig_to_base64(fig)


def generate_shap_plot(model, X_train: np.ndarray, X_test_df) -> str:
    """Generate SHAP summary plot. Returns base64 PNG."""
    try:
        import shap
        plt.close('all')  # clear any residual matplotlib state before SHAP draws
        explainer = shap.Explainer(model, X_train)
        import io as _io, contextlib as _ctx
        with _ctx.redirect_stderr(_io.StringIO()):   # suppress tqdm bar spam
            shap_values = explainer(X_test_df)
        before_figs = set(plt.get_fignums())
        shap.summary_plot(shap_values, X_test_df, show=False, plot_size=(10, 6), color_bar=True)
        # Grab the figure SHAP just created — not ambiguous plt.gcf()
        new_figs = set(plt.get_fignums()) - before_figs
        fig_num = new_figs.pop() if new_figs else plt.get_fignums()[-1]
        fig = plt.figure(fig_num)
        fig.patch.set_facecolor(DARK_BG)
        for ax_ in fig.axes:
            ax_.set_facecolor(CARD_BG)
            ax_.tick_params(colors=TEXT_COLOR)
            ax_.xaxis.label.set_color(TEXT_COLOR)
            ax_.yaxis.label.set_color(TEXT_COLOR)
            ax_.title.set_color(TEXT_COLOR)
            for spine in ax_.spines.values():
                spine.set_edgecolor(GRID_COLOR)
        return fig_to_base64(fig)
    except Exception as e:
        # Fallback: plain feature importance bar chart
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.text(0.5, 0.5, f"SHAP unavailable:\n{e}", ha="center", va="center",
                color=TEXT_COLOR, fontsize=10)
        _apply_dark_style(fig, ax)
        return fig_to_base64(fig)
