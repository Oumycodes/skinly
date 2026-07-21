"""Stage 6 — fusion + temporal smoothing."""

from __future__ import annotations

from typing import Any

from app.services.scan_pipeline.calibration import (
    CV_CLAMP_ENABLED,
    EMA_ALPHA,
    FUSION_CLAMP,
    MAX_DAY_DELTA,
    OIL_TO_BALANCE,
    REDNESS_TO_CALMNESS,
    TEXTURE_TO_SMOOTHNESS,
    map_lesion_count,
    map_linear,
)
from app.services.scan_pipeline.features import CVFeatureSet

METRIC_KEYS = (
    "hydration",
    "oil_balance",
    "clarity",
    "calmness",
    "smoothness",
    "fine_lines",
)


def _cv_anchors(cv: CVFeatureSet, gemini_metrics: dict[str, float]) -> dict[str, float]:
    zones = list(cv.zones.values())
    if not zones:
        return dict(gemini_metrics)

    avg_red = sum(z.redness_raw for z in zones) / len(zones)
    avg_oil = sum(z.oiliness_raw for z in zones) / len(zones)
    avg_tex = sum(z.texture_raw for z in zones) / len(zones)
    kept_acne = sum(
        1
        for _ in cv.lesions  # placeholder count; Gemini keep applied later in pipeline
    )

    return {
        "calmness": map_linear(avg_red, **REDNESS_TO_CALMNESS),
        "oil_balance": map_linear(avg_oil, **OIL_TO_BALANCE),
        "smoothness": map_linear(avg_tex, **TEXTURE_TO_SMOOTHNESS),
        "clarity": map_lesion_count(min(kept_acne, 25)),
        "hydration": gemini_metrics.get("hydration", 7.0),
        "fine_lines": gemini_metrics.get("fine_lines", 7.0),
    }


def _score_spread(scores: dict[str, float]) -> float:
    vals = [scores[k] for k in METRIC_KEYS if k in scores]
    if len(vals) < 2:
        return 0.0
    return max(vals) - min(vals)


def diversify_clustered_scores(
    gemini_metrics: dict[str, float],
    cv: CVFeatureSet,
    kept_lesion_count: int,
    *,
    min_spread: float = 1.2,
) -> dict[str, float]:
    """When Gemini collapses every metric to ~the same value, pull toward CV anchors.

    Keeps Gemini as the center of mass but restores per-metric differentiation
    so Home never shows six identical 8.8s from a cautious model.
    """
    g = {k: float(gemini_metrics.get(k, 7.0)) for k in METRIC_KEYS}
    if _score_spread(g) >= min_spread:
        return g

    anchors = _cv_anchors(cv, g)
    anchors["clarity"] = map_lesion_count(kept_lesion_count)
    # Blend 55% Gemini / 45% CV when clustered — enough to separate without
    # ignoring the model entirely while CV_CLAMP_ENABLED is still off.
    out: dict[str, float] = {}
    for k in METRIC_KEYS:
        blended = 0.55 * g[k] + 0.45 * anchors[k]
        out[k] = round(max(0.0, min(10.0, blended)), 1)
    return out


def fuse_metrics(
    gemini_metrics: dict[str, Any],
    cv: CVFeatureSet,
    kept_lesion_count: int,
) -> dict[str, float]:
    g = {k: float(gemini_metrics.get(k, 7.0)) for k in METRIC_KEYS}
    g = diversify_clustered_scores(g, cv, kept_lesion_count)
    if not CV_CLAMP_ENABLED:
        return {k: round(max(0.0, min(10.0, g[k])), 1) for k in METRIC_KEYS}

    anchors = _cv_anchors(cv, g)
    anchors["clarity"] = map_lesion_count(kept_lesion_count)
    fused: dict[str, float] = {}
    for k in METRIC_KEYS:
        lo = anchors[k] - FUSION_CLAMP
        hi = anchors[k] + FUSION_CLAMP
        fused[k] = round(max(0.0, min(10.0, max(lo, min(hi, g[k])))), 1)
    return fused


def smooth_metrics(
    fused: dict[str, float],
    previous_smoothed: dict[str, float] | None,
) -> dict[str, float]:
    if not previous_smoothed:
        return dict(fused)

    out: dict[str, float] = {}
    for k in METRIC_KEYS:
        prev = float(previous_smoothed.get(k, fused[k]))
        ema = EMA_ALPHA * fused[k] + (1 - EMA_ALPHA) * prev
        delta = ema - prev
        if delta > MAX_DAY_DELTA:
            ema = prev + MAX_DAY_DELTA
        elif delta < -MAX_DAY_DELTA:
            ema = prev - MAX_DAY_DELTA
        out[k] = round(max(0.0, min(10.0, ema)), 1)
    return out


# Acne/redness reflect how troubled the skin is → weigh them more heavily.
_OVERALL_WEIGHTS = {
    "hydration": 1.0,
    "oil_balance": 1.0,
    "clarity": 1.7,
    "calmness": 1.3,
    "smoothness": 1.1,
    "fine_lines": 0.8,
}


def overall_score(metrics: dict[str, float]) -> float:
    vals = [metrics[k] for k in METRIC_KEYS if k in metrics]
    if not vals:
        return 0.0

    # Weighted mean (problem metrics count more)...
    num = sum(metrics[k] * _OVERALL_WEIGHTS[k] for k in METRIC_KEYS if k in metrics)
    den = sum(_OVERALL_WEIGHTS[k] for k in METRIC_KEYS if k in metrics)
    weighted = num / den if den else sum(vals) / len(vals)

    # ...then pull toward the worst metric so one severe issue can't be hidden
    # by strong scores elsewhere (a bad-acne face should read as low, not ~7).
    worst = min(vals)
    overall = 0.65 * weighted + 0.35 * worst
    return round(max(0.0, min(10.0, overall)), 1)
