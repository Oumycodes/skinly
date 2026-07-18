import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.models.schemas import ScanResult
from app.services.llm_client import generate_json, has_gemini_api_key
from app.services.mock_data import MOCK_SCAN_RESULT, use_mock_ai

logger = logging.getLogger(__name__)

SCAN_ANGLES = ("front", "left", "right")


def _fresh_scan_result(base: ScanResult) -> ScanResult:
    return base.model_copy(
        update={
            "scan_id": str(uuid4()),
            "scanned_at": datetime.now(timezone.utc),
        },
    )


SCAN_SYSTEM_PROMPT = """You are a dermatology assistant for the skins skincare app.
You will receive FACE-CROPPED photos (background already removed by framing).
Front-facing is required; left/right profile when provided.
Synthesize observations from all angles into one assessment.

IMPORTANT: Analyze ONLY the facial skin visible in these crops. Ignore hairline, clothes,
hands, or background if any remain. Localize every issue on the face crop itself.

SCORING (critical):
- overall_score and every metric score MUST be on a 0–10 scale (one decimal allowed, e.g. 7.4).
- Higher = healthier / less of that concern.
- Scores must come from what you SEE in these photos — not generic averages.
- Be discriminating: healthy skin is usually 7.5–9.5; mild concerns 5.5–7.4; clear issues 3.0–5.4; severe under 3.0.
- Do not give all metrics nearly the same score. Differ them based on visible evidence.

Metric meaning (higher is better):
- dryness: hydration look — flaking, tight/dull patches lower the score
- oiliness: balance — heavy T-zone shine / greasy look lowers the score
- acne: clear skin scores high; active blemishes / congestion lower it
- redness: calm even tone scores high; flushed / irritated patches lower it
- fine_lines: smooth firm look scores high; visible lines lower it
- texture: smooth even surface scores high; roughness / enlarged pores lower it

Return ONLY valid JSON matching this schema:
{
  "overall_score": <number 0-10, higher is healthier>,
  "summary": "<1-2 sentence plain-language overview>",
  "conditions": [
    {
      "name": "<condition name e.g. Dehydration, Hyperpigmentation>",
      "severity": "<mild|moderate|severe>",
      "explanation": "<plain-language explanation, 2-3 sentences>",
      "recommendations": [
        {
          "name": "<product name>",
          "brand": "<brand>",
          "reason": "<why this helps — start with 'It may help with...'>",
          "affiliate_url": "<placeholder URL like https://skins.app/shop/product-slug>"
        }
      ]
    }
  ],
  "metrics": [
    {
      "id": "<dryness|oiliness|acne|redness|fine_lines|texture>",
      "label": "<Dryness|Oiliness|Acne|Redness|Fine lines|Texture>",
      "score": <number 0-10, higher is healthier>,
      "regions": [
        { "x": <0-1 center x on FRONT face crop>, "y": <0-1 center y>, "r": <0.02-0.2 radius> }
      ]
    }
  ]
}

METRICS RULES — always return all 6 metrics in this order: dryness, oiliness, acne, redness, fine_lines, texture.
- Coordinates are normalized 0-1 relative to the FRONT FACE CROP width/height (top-left origin).
- The face fills most of the crop: forehead near y≈0.15–0.28, eyes ≈0.32–0.42, cheeks ≈0.50–0.62, chin ≈0.78–0.88.
- r is the region radius as a fraction of crop width.
- Localize regions when visible: acne, redness, texture, fine_lines should have 1-3 regions when present.
- dryness: forehead/cheek zones. oiliness: T-zone (forehead/nose).
- If a metric looks healthy with nothing to localize, return "regions": [] and a high score (8.0–9.5).
- Pick the largest r as the primary zone when multiple regions exist.

Identify 1-3 visible skin concerns in conditions[]. Be helpful but not alarmist.
Do not diagnose medical conditions — frame as skincare observations.
Return 3 product recommendations per condition. Each reason must begin with "It may help with"."""


def _score_to_hundred(value: Any) -> int:
    """Accept AI 0–10 scores (preferred) or legacy 0–100; store as 0–100 for the app."""
    try:
        score = float(value)
    except (TypeError, ValueError):
        return 70
    if score <= 10:
        score *= 10
    return int(max(0, min(100, round(score))))


def _normalize_scan_payload(data: dict[str, Any]) -> dict[str, Any]:
    data["overall_score"] = _score_to_hundred(data.get("overall_score", 70))
    metrics = data.get("metrics") or []
    if isinstance(metrics, list):
        for metric in metrics:
            if isinstance(metric, dict) and "score" in metric:
                metric["score"] = _score_to_hundred(metric["score"])
    return data


def analyze_skin_images(images: dict[str, tuple[bytes, str]]) -> ScanResult:
    if use_mock_ai():
        logger.warning("USE_MOCK_AI is enabled — returning mock scan result")
        return _fresh_scan_result(MOCK_SCAN_RESULT)

    if not has_gemini_api_key():
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to your backend .env, or set USE_MOCK_AI=1 for demo mode."
        )

    angle_labels = {
        "front": "Front face crop (use this for metric region coordinates)",
        "left": "Left profile face crop",
        "right": "Right profile face crop",
    }

    parts: list[Any] = [
        "These images are cropped to the user's face. Analyze facial skin only. "
        "Score overall_score and every metric on a 0–10 scale from what you see "
        "(higher = healthier). Return all 6 metrics with region coordinates "
        "relative to the FRONT face crop.",
    ]
    for angle in SCAN_ANGLES:
        if angle not in images:
            continue
        image_bytes, content_type = images[angle]
        parts.append(angle_labels[angle])
        parts.append((image_bytes, content_type or "image/jpeg"))

    data: dict[str, Any] = generate_json(
        system=SCAN_SYSTEM_PROMPT,
        parts=parts,
        max_output_tokens=4096,
    )
    data.pop("scan_id", None)
    data.pop("image_urls", None)
    data = _normalize_scan_payload(data)
    return ScanResult(**data)


def analyze_skin_image(image_bytes: bytes, content_type: str) -> ScanResult:
    return analyze_skin_images({"front": (image_bytes, content_type)})
