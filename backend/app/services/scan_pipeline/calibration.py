"""Linear maps from CV features → 0–10 anchors (tune on ~30 photos)."""

from __future__ import annotations

# Until Stage 4 ships fully, fusion uses Gemini directly (cv clamp disabled).
CV_CLAMP_ENABLED = False

# redness_raw (a* delta vs baseline) → calmness anchor
# lower redness delta → higher calmness
REDNESS_TO_CALMNESS = {
    "intercept": 9.0,
    "slope": -0.8,  # per +1 a* delta
}

# oiliness_raw (specular fraction 0–1) → oil_balance
OIL_TO_BALANCE = {
    "intercept": 9.5,
    "slope": -25.0,  # per specular ratio
}

# texture_raw → smoothness
TEXTURE_TO_SMOOTHNESS = {
    "intercept": 9.2,
    "slope": -8.0,
}

# lesion count (kept inflammatory+comedone) → clarity — used when CV ready
LESION_TO_CLARITY = {
    "buckets": [(0, 9.5), (1, 9.0), (4, 7.5), (9, 5.5), (19, 3.5)],
    "default": 1.5,
}

FUSION_CLAMP = 1.5  # gemini may not deviate more than this from cv_anchor
EMA_ALPHA = 0.5
MAX_DAY_DELTA = 1.2


def map_linear(value: float, intercept: float, slope: float) -> float:
    return max(0.0, min(10.0, intercept + slope * value))


def map_lesion_count(count: int) -> float:
    for threshold, score in LESION_TO_CLARITY["buckets"]:
        if count <= threshold:
            return float(score)
    return float(LESION_TO_CLARITY["default"])
