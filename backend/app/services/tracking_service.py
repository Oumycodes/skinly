"""AI-assisted shelf product tracking insights."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from app.models.schemas import ShelfProduct, TrackingInsight, TrackingInsightsResult
from app.services.dashboard_service import list_scan_details
from app.services.llm_client import generate_json, has_gemini_api_key
from app.services.mock_data import use_mock_ai
from app.services.product_service import list_shelf_products


def _days_between(from_dt: datetime, to_dt: datetime) -> int:
    return max(0, int((to_dt - from_dt).total_seconds() // 86400))


def _heuristic_insight(product: ShelfProduct, scans: list) -> TrackingInsight:
    started = product.created_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    day = _days_between(started, now) + 1
    trial = product.trial_days or 28

    since = [
        s
        for s in scans
        if (s.scanned_at if s.scanned_at.tzinfo else s.scanned_at.replace(tzinfo=timezone.utc))
        >= started
    ]
    since.sort(key=lambda s: s.scanned_at)
    scores = [s.overall_score for s in since]
    start = scores[0] if scores else None
    latest = scores[-1] if scores else None
    delta = (latest - start) if start is not None and latest is not None else None

    status = "on_track"
    label = "ON TRACK"
    if delta is not None and delta <= -4 and len(scores) >= 2:
        status, label = "check_this", "CHECK THIS"
    elif delta is not None and delta >= 4 and len(scores) >= 2:
        status, label = ("working", "WORKING") if day >= int(trial * 0.7) else ("on_track", "ON TRACK")
    elif day >= trial:
        status, label = "check_this", "CHECK THIS"

    if start is not None and latest is not None:
        summary = (
            f"Day {min(day, trial)} of {trial}. Skin score moved "
            f"{start / 10:.1f} → {latest / 10:.1f} across {len(scores)} scan(s)."
        )
    else:
        summary = f"Day {min(day, trial)} of {trial}. Take a few scans so we can judge this trial."

    advice = None
    if status == "check_this":
        advice = "Review whether to keep, pause, or swap this product."
    elif status == "working":
        advice = "Results look positive — stay consistent through the trial."

    return TrackingInsight(
        product_id=product.id,
        status=status,
        status_label=label,
        summary=summary,
        advice=advice,
    )


def analyze_shelf_tracking(user_id: str) -> TrackingInsightsResult:
    products = [p for p in list_shelf_products(user_id) if p.tracking_enabled]
    if not products:
        return TrackingInsightsResult(insights=[])

    scans = list_scan_details(user_id, limit=60)
    heuristics = {p.id: _heuristic_insight(p, scans) for p in products}

    if use_mock_ai() or not has_gemini_api_key():
        return TrackingInsightsResult(insights=list(heuristics.values()))

    payload_products = []
    for p in products:
        h = heuristics[p.id]
        payload_products.append(
            {
                "id": p.id,
                "name": p.name,
                "brand": p.brand,
                "ingredients": p.ingredients[:20],
                "usage_time": p.usage_time or "both",
                "times_per_week": p.times_per_week,
                "trial_days": p.trial_days or 28,
                "started_at": p.created_at.isoformat(),
                "heuristic_status": h.status,
                "heuristic_summary": h.summary,
            }
        )

    scan_payload = [
        {
            "overall_score_10": round(s.overall_score / 10, 1),
            "summary": s.summary,
            "conditions": [c.name for c in s.conditions[:3]],
            "scanned_at": s.scanned_at.isoformat(),
        }
        for s in scans[:12]
    ]

    try:
        data = generate_json(
            system=(
                "You are a skincare trial coach. For each tracked product, judge whether "
                "it seems to be helping based on scan trends since the product started. "
                "status must be one of: working | on_track | check_this. "
                "status_label: WORKING | ON TRACK | CHECK THIS. "
                "Return JSON: "
                '{"insights":[{"product_id":"...","status":"...","status_label":"...",'
                '"summary":"1-2 sentences","advice":"short tip or null"}]}'
            ),
            user_text=(
                "Tracked products:\n"
                + json.dumps(payload_products)
                + "\n\nRecent scans (newest last):\n"
                + json.dumps(list(reversed(scan_payload)))
            ),
            max_output_tokens=2000,
        )
    except Exception:
        return TrackingInsightsResult(insights=list(heuristics.values()))

    merged: list[TrackingInsight] = []
    by_id = {i.get("product_id"): i for i in (data.get("insights") or []) if isinstance(i, dict)}
    for product in products:
        base = heuristics[product.id]
        ai = by_id.get(product.id)
        if not ai:
            merged.append(base)
            continue
        status = ai.get("status") or base.status
        if status not in {"working", "on_track", "check_this"}:
            status = base.status
        label = ai.get("status_label") or base.status_label
        merged.append(
            TrackingInsight(
                product_id=product.id,
                status=status,
                status_label=str(label).upper(),
                summary=str(ai.get("summary") or base.summary),
                advice=(str(ai["advice"]) if ai.get("advice") else base.advice),
            )
        )

    return TrackingInsightsResult(insights=merged)
