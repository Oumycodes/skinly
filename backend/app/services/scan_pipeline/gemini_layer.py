"""Stage 5 — Gemini semantic interpretation layer."""

from __future__ import annotations

import json
from typing import Any

from app.services.llm_client import get_gemini_client, get_gemini_model
from app.services.scan_pipeline.features import CVFeatureSet
from google.genai import types

GEMINI_SYSTEM_PROMPT = """You are the interpretation layer of a skin-analysis pipeline. Write exactly
like a board-certified dermatologist dictating chart notes for the patient:
objective, neutral, precise, unsentimental.
Deterministic computer-vision measurements and lesion candidates are provided;
the image is for context and classification. You are NOT the measuring instrument.

TONE (mandatory for summary, evidence, zone_summaries, priorities, trend_note):
- Report observations only. Do not compliment, reassure with fluff, or sell.
- NEVER use: beautifully, lovely, gorgeous, glowing, radiant, stunning,
  perfect, amazing, wonderful, excellent, healthy glow, natural beauty,
  beautifully balanced, very healthy, looking great, soft-focus praise, or
  any similar marketing / complimentary adjective.
- Prefer clinical wording: "even tone", "low oil sheen", "mild erythema along
  the nasal folds", "scattered comedones on the chin", "fine lines under the
  eyes at this resolution".
- No exclamation marks. No "your skin looks… wonderful/healthy/beautiful".
- Bad: "Your skin looks beautifully balanced with excellent natural oil control."
- Good: "Oil sheen is low across the T-zone. Mild erythema is present around
  the nose and under-eyes. Texture is even on the cheeks."

INPUT CONTEXT (provided in the user message as JSON):
- cv_features: per-zone measurements (redness_raw, oiliness_raw, texture_raw)
- lesion_candidates: [{id, zone, cx, cy, r, contrast}]
- user_profile: {skin_type, age_range, stated_concerns}
- previous_scan: last smoothed metrics + days_ago (may be null on first scan)
- active_trials: [{product_name, category, target_metrics, day, length}] (may be empty)

YOUR TASKS:

1. CLASSIFY each lesion candidate:
   "inflammatory" | "comedone" | "hyperpigmentation" | "mole_or_freckle" |
   "shadow_or_artifact" | "other".
   Set keep=false for shadows/artifacts/hair/earbuds/glasses reflections.
   Only keep findings you are confident are on skin.

2. SCORE each metric 0-10 using the anchored rubrics below. Score each metric
   INDEPENDENTLY — identical scores across metrics are almost always wrong.
   Use the CV features as primary evidence; adjust only when the image clearly
   contradicts them. For EACH metric also provide:
   - evidence: one factual sentence citing the specific zone(s) and observation
     that justify the score. Only cite things present in cv_features, kept
     findings, or clearly visible in the image. Never invent observations.
   - zones_affected: list of zone ids driving the score (empty if none)
   - confidence: "high" | "medium" | "low". Use "low" when image quality,
     resolution, or lighting limits your judgment of this metric — it is
     always better to report low confidence than to fake precision.

3. ZONE SUMMARY: for each zone, one short clinical phrase
   (e.g. "even, no active lesions", "mild T-zone shine", "3 comedones").
   Base it only on that zone's features and kept findings.

4. PRIORITIES: rank the 1-3 metrics most worth the user's attention right now,
   each with fields metric, why (one factual sentence), and suggestion (one
   concrete, non-prescription habit-level tip, e.g. "apply moisturizer on
   damp skin"). Consider user_profile.stated_concerns when ranking.
   No product brands.

5. TREND NOTE (only if previous_scan is not null): one factual sentence
   comparing today to the previous scan, naming the biggest mover. If an
   active trial targets that metric, mention it neutrally by product_name
   ("day 12 of Niacinamide"). Never claim causation — say "since starting",
   not "because of".

6. SUMMARY: 2-3 sentences of clinical observations only. Lead with the
   strongest measured findings, then the main opportunity. Plain language —
   no disease names, no medical diagnosis, no complimentary filler.

RUBRICS (10 = ideal):
- hydration: 9-10 no flaking/tightness cues, even light reflection; 7-8 minor
  dullness; 5-6 visible dry patches in 1 zone; 3-4 multiple zones; 0-2
  widespread flaking.
- oil_balance: 9-10 minimal specular shine; 7-8 slight T-zone shine; 5-6 clear
  T-zone shine; 3-4 shine beyond T-zone; 0-2 heavy shine everywhere.
- clarity: 9-10 0-1 kept inflammatory/comedone findings; 7-8 2-4; 5-6 5-9;
  3-4 10-19; 0-2 20+.
- calmness: from redness_raw deltas: 9-10 all zones < +1.5; 7-8 one zone
  +1.5-3; 5-6 multiple zones +1.5-3; 3-4 any zone +3-5; 0-2 any zone > +5.
- smoothness: from texture_raw relative to typical: 9-10 low everywhere; step
  down per affected zone.
- fine_lines: 9-10 none visible at this resolution; 7-8 faint under-eye or
  forehead; 5-6 visible in one zone; 3-4 multiple zones; 0-2 pronounced.

SCORING DISCIPLINE:
- Use the full range the evidence supports, including decimals (7.3, not
  always .0/.5). Do not cluster scores out of caution.
- NEVER return the same score for every metric (e.g. all 8.8). At least
  three metrics must differ by ≥0.8 when zone CV values differ.
- If two metrics genuinely deserve similar scores, their evidence sentences
  must cite DIFFERENT observations.

SAFETY RULES: never name diseases or medical conditions; never recommend
prescription products or specific actives at specific concentrations; if you
observe something that may warrant professional attention, set
see_professional=true and keep the summary neutral. All suggestions must be
habit-level, not treatment-level."""

_METRIC_DETAIL = {
    "type": "object",
    "properties": {
        "score": {"type": "number"},
        "evidence": {"type": "string"},
        "zones_affected": {
            "type": "array",
            "items": {"type": "string"},
        },
        "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"],
        },
    },
    "required": ["score", "evidence", "zones_affected", "confidence"],
}

RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "metrics": {
            "type": "object",
            "properties": {
                "hydration": _METRIC_DETAIL,
                "oil_balance": _METRIC_DETAIL,
                "clarity": _METRIC_DETAIL,
                "calmness": _METRIC_DETAIL,
                "smoothness": _METRIC_DETAIL,
                "fine_lines": _METRIC_DETAIL,
            },
            "required": [
                "hydration",
                "oil_balance",
                "clarity",
                "calmness",
                "smoothness",
                "fine_lines",
            ],
        },
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "candidate_id": {"type": "integer"},
                    "keep": {"type": "boolean"},
                    "type": {
                        "type": "string",
                        "enum": [
                            "inflammatory",
                            "comedone",
                            "hyperpigmentation",
                            "mole_or_freckle",
                            "shadow_or_artifact",
                            "other",
                        ],
                    },
                    "confidence": {"type": "number"},
                },
                "required": ["candidate_id", "keep", "type", "confidence"],
            },
        },
        "zone_summaries": {
            "type": "object",
            "properties": {
                "forehead": {"type": "string"},
                "nose": {"type": "string"},
                "left_cheek": {"type": "string"},
                "right_cheek": {"type": "string"},
                "chin": {"type": "string"},
                "under_eyes": {"type": "string"},
            },
            "required": [
                "forehead",
                "nose",
                "left_cheek",
                "right_cheek",
                "chin",
                "under_eyes",
            ],
        },
        "priorities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "metric": {"type": "string"},
                    "why": {"type": "string"},
                    "suggestion": {"type": "string"},
                },
                "required": ["metric", "why", "suggestion"],
            },
        },
        "trend_note": {"type": "string"},
        "summary": {"type": "string"},
        "see_professional": {"type": "boolean"},
    },
    "required": [
        "metrics",
        "findings",
        "zone_summaries",
        "priorities",
        "summary",
        "see_professional",
    ],
}

METRIC_KEYS = (
    "hydration",
    "oil_balance",
    "clarity",
    "calmness",
    "smoothness",
    "fine_lines",
)


def normalize_gemini_priorities(raw: list[Any] | None) -> list[dict[str, str]]:
    """Normalize priority objects to {metric, why, suggestion}."""
    out: list[dict[str, str]] = []
    for item in raw or []:
        if not isinstance(item, dict):
            continue
        metric = str(item.get("metric") or "").strip()
        if not metric:
            continue
        out.append(
            {
                "metric": metric,
                "why": str(item.get("why") or item.get("why_now") or ""),
                "suggestion": str(item.get("suggestion") or ""),
            }
        )
    return out


def flatten_metric_scores(metrics: dict[str, Any] | None) -> dict[str, float]:
    """Support both legacy {hydration: 7.2} and new {hydration: {score: 7.2, ...}}."""
    out: dict[str, float] = {}
    for key in METRIC_KEYS:
        raw = (metrics or {}).get(key, 7.0)
        if isinstance(raw, dict):
            out[key] = float(raw.get("score", 7.0))
        else:
            out[key] = float(raw)
    return out


def interpret_with_gemini(
    normalized_jpeg: bytes,
    cv_features: CVFeatureSet,
    *,
    user_profile: dict[str, Any] | None = None,
    previous_scan: dict[str, Any] | None = None,
    active_trials: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    client = get_gemini_client()
    prompt_cv = cv_features.to_prompt_dict()
    # Prompt naming: id (alias of candidate_id)
    lesion_candidates = [
        {
            "id": c["candidate_id"],
            "zone": c["zone"],
            "cx": c["cx"],
            "cy": c["cy"],
            "r": c["r"],
            "contrast": c["contrast"],
        }
        for c in prompt_cv.get("lesion_candidates", [])
    ]
    context = {
        "cv_features": prompt_cv.get("zones", {}),
        "lesion_candidates": lesion_candidates,
        "user_profile": user_profile
        or {
            "skin_type": None,
            "age_range": None,
            "stated_concerns": [],
        },
        "previous_scan": previous_scan,
        "active_trials": active_trials or [],
    }
    user_text = (
        "INPUT CONTEXT (JSON):\n"
        + json.dumps(context)
        + "\n\nComplete all tasks in the system prompt. Return structured JSON only."
    )

    config_kwargs: dict[str, Any] = {
        "system_instruction": GEMINI_SYSTEM_PROMPT,
        "temperature": 0,
        "response_mime_type": "application/json",
        "response_schema": RESPONSE_SCHEMA,
        "max_output_tokens": 8192,
    }
    try:
        config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    except Exception:
        pass

    response = client.models.generate_content(
        model=get_gemini_model(),
        contents=[
            user_text,
            types.Part.from_bytes(data=normalized_jpeg, mime_type="image/jpeg"),
        ],
        config=types.GenerateContentConfig(**config_kwargs),
    )
    raw = (response.text or "").strip()
    if not raw:
        raise ValueError("Empty Gemini interpretation")
    data = json.loads(raw)
    if isinstance(data, dict):
        data["priorities"] = normalize_gemini_priorities(data.get("priorities"))
        # Empty trend_note → null for first scans / unused
        if not data.get("trend_note"):
            data["trend_note"] = None
    return data
