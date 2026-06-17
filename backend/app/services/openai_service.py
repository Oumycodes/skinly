import base64
import json
import os
from typing import Any

from openai import OpenAI

from app.models.schemas import ScanResult


def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=api_key)

SCAN_SYSTEM_PROMPT = """You are a dermatology assistant for the Skinly skincare app.
Analyze the provided facial selfie and return ONLY valid JSON matching this schema:
{
  "overall_score": <integer 0-100, higher is healthier>,
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
          "reason": "<why this helps>",
          "affiliate_url": "<placeholder URL like https://skinly.app/shop/product-slug>"
        }
      ]
    }
  ]
}
Identify 1-3 visible skin concerns. Be helpful but not alarmist.
Do not diagnose medical conditions — frame as skincare observations.
Return 1-2 product recommendations per condition."""

MOCK_RESULT = ScanResult(
    overall_score=72,
    summary="Your skin shows good overall health with mild dehydration and early signs of uneven tone.",
    conditions=[
        {
            "name": "Dehydration",
            "severity": "mild",
            "explanation": "Fine lines around the eye area and slight dullness suggest your skin barrier could use more hydration. This is common and very treatable with the right moisturizer.",
            "recommendations": [
                {
                    "name": "Hydrating Facial Moisturizer",
                    "brand": "CeraVe",
                    "reason": "Contains ceramides and hyaluronic acid to restore moisture barrier.",
                    "affiliate_url": "https://skinly.app/shop/cerave-moisturizer",
                }
            ],
        },
        {
            "name": "Uneven skin tone",
            "severity": "mild",
            "explanation": "Subtle dark spots and redness suggest mild hyperpigmentation. Consistent SPF and a brightening serum can help even things out over 4-8 weeks.",
            "recommendations": [
                {
                    "name": "Vitamin C Serum",
                    "brand": "La Roche-Posay",
                    "reason": "Antioxidant protection and brightening for uneven tone.",
                    "affiliate_url": "https://skinly.app/shop/lrp-vitamin-c",
                }
            ],
        },
    ],
)


def analyze_skin_image(image_bytes: bytes, content_type: str) -> ScanResult:
    if not os.getenv("OPENAI_API_KEY"):
        return MOCK_RESULT.model_copy(deep=True)

    client = _get_client()
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{content_type};base64,{encoded}"

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SCAN_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Analyze this skin selfie and return the JSON diagnosis.",
                    },
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        response_format={"type": "json_object"},
        max_tokens=1500,
    )

    raw = response.choices[0].message.content
    if not raw:
        raise ValueError("Empty response from OpenAI")

    data: dict[str, Any] = json.loads(raw)
    return ScanResult(**data)
