"""Persist pipeline scans + personal redness baseline."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.models.schemas import (
    PipelineFinding,
    PipelineMetrics,
    PipelineScanResponse,
    ProductRecommendation,
    ScanImageUrls,
    SkinCondition,
    TrialLink,
    ZoneBBox,
)
from app.services.product_service import list_shelf_products
from app.services.supabase_service import get_supabase


METRIC_LABELS = {
    "hydration": "Hydration",
    "oil_balance": "Oil balance",
    "clarity": "Clarity",
    "calmness": "Calmness",
    "smoothness": "Smoothness",
    "fine_lines": "Fine lines",
}


def get_skin_baseline(user_id: str) -> float | None:
    supabase = get_supabase()
    if not supabase:
        return None
    try:
        profile = (
            supabase.table("profiles")
            .select("skin_baseline_a_star")
            .eq("id", user_id)
            .single()
            .execute()
        )
        val = profile.data.get("skin_baseline_a_star") if profile.data else None
        return float(val) if val is not None else None
    except Exception:
        return None


def get_previous_smoothed(user_id: str) -> dict[str, float] | None:
    ctx = get_previous_scan_context(user_id)
    if not ctx:
        return None
    metrics = ctx.get("metrics")
    return metrics if isinstance(metrics, dict) else None


def get_previous_scan_context(user_id: str) -> dict[str, Any] | None:
    """Last smoothed metrics + days_ago for Gemini trend notes."""
    supabase = get_supabase()
    if not supabase:
        return None
    try:
        rows = (
            supabase.table("skin_scans")
            .select("metrics_smoothed, scanned_at")
            .eq("user_id", user_id)
            .order("scanned_at", desc=True)
            .limit(1)
            .execute()
        )
        if not rows.data:
            return None
        row = rows.data[0]
        metrics = row.get("metrics_smoothed")
        if not isinstance(metrics, dict):
            return None
        scanned_at = row.get("scanned_at")
        days_ago = None
        if scanned_at:
            if isinstance(scanned_at, str):
                prev = datetime.fromisoformat(scanned_at.replace("Z", "+00:00"))
            else:
                prev = scanned_at
            if prev.tzinfo is None:
                prev = prev.replace(tzinfo=timezone.utc)
            days_ago = max(0, int((datetime.now(timezone.utc) - prev).total_seconds() // 86400))
        return {"metrics": metrics, "days_ago": days_ago}
    except Exception:
        return None


def get_user_profile_for_scan(user_id: str) -> dict[str, Any]:
    """Best-effort profile fields for Gemini (missing columns → nulls)."""
    empty = {"skin_type": None, "age_range": None, "stated_concerns": []}
    supabase = get_supabase()
    if not supabase:
        return empty
    try:
        profile = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        data = profile.data if profile and profile.data else {}
        concerns = data.get("stated_concerns") or data.get("concerns") or []
        if isinstance(concerns, str):
            concerns = [concerns]
        if not isinstance(concerns, list):
            concerns = []
        return {
            "skin_type": data.get("skin_type"),
            "age_range": data.get("age_range") or data.get("age"),
            "stated_concerns": concerns,
        }
    except Exception:
        return empty


def get_active_trials_for_gemini(user_id: str) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    out: list[dict[str, Any]] = []
    try:
        for p in list_shelf_products(user_id):
            if not p.tracking_enabled:
                continue
            started = p.created_at
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            day = max(1, int((now - started).total_seconds() // 86400) + 1)
            length = p.trial_days or 28
            out.append(
                {
                    "product_name": p.name,
                    "category": getattr(p, "category", None),
                    "target_metrics": [],
                    "day": min(day, length),
                    "length": length,
                }
            )
    except Exception:
        pass
    return out


def _active_trials(user_id: str) -> list[TrialLink]:
    now = datetime.now(timezone.utc)
    trials: list[TrialLink] = []
    try:
        for p in list_shelf_products(user_id):
            if not p.tracking_enabled:
                continue
            started = p.created_at
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            day = max(1, int((now - started).total_seconds() // 86400) + 1)
            length = p.trial_days or 28
            trials.append(TrialLink(product_id=p.id, day=min(day, length), len=length))
    except Exception:
        pass
    return trials


def _legacy_conditions(summary: str, findings: list[dict]) -> list[SkinCondition]:
    if not findings:
        return []
    by_type: dict[str, int] = {}
    for f in findings:
        by_type[f.get("type", "other")] = by_type.get(f.get("type", "other"), 0) + 1
    out: list[SkinCondition] = []
    for ftype, count in list(by_type.items())[:3]:
        severity = "mild" if count <= 2 else "moderate" if count <= 6 else "severe"
        out.append(
            SkinCondition(
                name=ftype.replace("_", " ").title(),
                severity=severity,  # type: ignore[arg-type]
                explanation=summary or f"Noted {count} {ftype.replace('_', ' ')} finding(s).",
                recommendations=[
                    ProductRecommendation(
                        name="Gentle moisturizer",
                        brand="skins picks",
                        reason="It may help with supporting your barrier while you track progress.",
                        affiliate_url="https://skins.app/shop/gentle-moisturizer",
                    )
                ],
            )
        )
    return out


def _maybe_update_baseline(supabase, user_id: str, a_star: float | None) -> None:
    if a_star is None:
        return
    try:
        rows = (
            supabase.table("skin_scans")
            .select("id, cv_features")
            .eq("user_id", user_id)
            .order("scanned_at", desc=False)
            .limit(3)
            .execute()
        )
        values = []
        for row in rows.data or []:
            cv = row.get("cv_features") or {}
            if isinstance(cv, dict) and cv.get("baseline_a_star") is not None:
                values.append(float(cv["baseline_a_star"]))
        values.append(float(a_star))
        values = values[:3]
        if len(values) >= 1:
            median = sorted(values)[len(values) // 2]
            supabase.table("profiles").update({"skin_baseline_a_star": median}).eq(
                "id", user_id
            ).execute()
    except Exception:
        pass


def persist_pipeline_scan(
    user_id: str,
    pipeline: dict[str, Any],
    display_images: dict[str, bytes] | None = None,
) -> PipelineScanResponse:
    supabase = get_supabase()
    scan_id = str(uuid4())
    scanned_at = datetime.now(timezone.utc)
    metrics = pipeline["metrics"]
    overall = float(pipeline["overall"])
    findings = pipeline.get("findings") or []
    zones = pipeline.get("zones") or {}
    summary = pipeline.get("summary") or ""

    image_urls = ScanImageUrls()
    if supabase:
        jpeg = pipeline["normalized_jpeg"]
        normalized_path = f"{user_id}/{scan_id}/normalized.jpg"
        image_paths: dict[str, str] = {"normalized": normalized_path}

        try:
            supabase.storage.from_("scan-images").upload(
                normalized_path,
                jpeg,
                {"content-type": "image/jpeg", "upsert": "true"},
            )

            # Posed front/left/right for home + progress UI
            for angle, raw in (display_images or {}).items():
                if angle not in ("front", "left", "right") or not raw:
                    continue
                path = f"{user_id}/{scan_id}/{angle}.jpg"
                supabase.storage.from_("scan-images").upload(
                    path,
                    raw,
                    {"content-type": "image/jpeg", "upsert": "true"},
                )
                image_paths[angle] = path

            # If no posed front, fall back to normalized for display
            if "front" not in image_paths:
                image_paths["front"] = normalized_path

            urls: dict[str, str | None] = {"front": None, "left": None, "right": None}
            for angle in ("front", "left", "right"):
                path = image_paths.get(angle)
                if not path:
                    continue
                signed = supabase.storage.from_("scan-images").create_signed_url(path, 3600)
                url = None
                if isinstance(signed, dict):
                    url = signed.get("signedURL") or signed.get("signedUrl")
                urls[angle] = url
            image_urls = ScanImageUrls(**urls)
        except Exception as exc:
            raise RuntimeError(f"Failed to upload scan images: {exc}") from exc

        front_path = image_paths.get("front") or normalized_path
        row = {
            "id": scan_id,
            "user_id": user_id,
            "image_path": front_path,
            "image_paths": image_paths,
            "normalized_image_path": normalized_path,
            "overall_score": int(round(overall * 10)),
            "overall_10": overall,
            "summary": summary,
            "conditions": [c.model_dump() for c in _legacy_conditions(summary, findings)],
            "metrics": [
                {
                    "id": k,
                    "label": METRIC_LABELS.get(k, k),
                    "score": int(round(float(v) * 10)),
                    "regions": [],
                }
                for k, v in metrics.items()
            ],
            "scanned_at": scanned_at.isoformat(),
            "pipeline_version": "v1",
            "qc": pipeline.get("qc"),
            "cv_features": pipeline.get("cv_features"),
            "gemini_raw": pipeline.get("gemini_raw"),
            "metrics_raw": pipeline.get("metrics_raw"),
            "metrics_smoothed": metrics,
            "findings": findings,
            "zones": zones,
            "see_professional": pipeline.get("see_professional", False),
        }

        # Live DBs may be missing optional migrations (image_paths, metrics, …).
        # Strip unknown columns until insert succeeds, then patch scores.
        optional_keys = (
            "image_paths",
            "metrics",
            "gemini_raw",
            "metrics_raw",
            "qc",
            "cv_features",
            "findings",
            "zones",
            "see_professional",
            "overall_10",
            "normalized_image_path",
            "pipeline_version",
            "metrics_smoothed",
        )
        inserted = False
        payload = dict(row)
        last_insert_err: Exception | None = None
        for _ in range(len(optional_keys) + 1):
            try:
                supabase.table("skin_scans").insert(payload).execute()
                inserted = True
                break
            except Exception as exc:
                last_insert_err = exc
                msg = str(exc).lower()
                stripped = False
                for key in optional_keys:
                    if key in payload and key.replace("_", " ") in msg.replace("_", " "):
                        payload.pop(key, None)
                        stripped = True
                        break
                    # PostgREST: 'column skin_scans.X does not exist'
                    if key in payload and f".{key}" in msg:
                        payload.pop(key, None)
                        stripped = True
                        break
                if not stripped:
                    # Unknown error — fall back to slim row
                    break

        if not inserted:
            slim = {
                k: row[k]
                for k in (
                    "id",
                    "user_id",
                    "image_path",
                    "overall_score",
                    "summary",
                    "conditions",
                    "scanned_at",
                )
                if k in row
            }
            try:
                supabase.table("skin_scans").insert(slim).execute()
                inserted = True
            except Exception as exc:
                raise RuntimeError(f"Failed to save scan: {exc}") from (last_insert_err or exc)

        # Always upsert scores — Home reads metrics_smoothed on the next dashboard load
        for patch in (
            {
                "metrics_smoothed": metrics,
                "gemini_raw": row.get("gemini_raw"),
                "pipeline_version": "v1",
                "overall_10": overall,
                "findings": findings,
                "zones": zones,
            },
            {
                "metrics_smoothed": metrics,
                "gemini_raw": row.get("gemini_raw"),
                "pipeline_version": "v1",
            },
            {"metrics_smoothed": metrics, "pipeline_version": "v1"},
            {"metrics_smoothed": metrics},
        ):
            try:
                supabase.table("skin_scans").update(
                    {k: v for k, v in patch.items() if v is not None}
                ).eq("id", scan_id).execute()
                break
            except Exception:
                continue

        _maybe_update_baseline(supabase, user_id, pipeline.get("baseline_a_star"))

        try:
            supabase.table("progress_checkins").upsert(
                {
                    "id": scan_id,
                    "user_id": user_id,
                    "overall_score": int(round(overall * 10)),
                    "image_path": front_path,
                    "checkin_at": scanned_at.isoformat(),
                },
                on_conflict="id",
            ).execute()
        except Exception:
            pass

    return PipelineScanResponse(
        ok=True,
        scan_id=scan_id,
        overall=overall,
        metrics=PipelineMetrics(**{k: float(metrics[k]) for k in METRIC_LABELS}),
        summary=summary,
        zones={k: ZoneBBox(**v) for k, v in zones.items() if isinstance(v, dict)},
        findings=[PipelineFinding(**f) for f in findings],
        see_professional=bool(pipeline.get("see_professional")),
        trials=_active_trials(user_id),
        zone_summaries=pipeline.get("zone_summaries") or {},
        priorities=pipeline.get("priorities") or [],
        trend_note=pipeline.get("trend_note"),
        overall_score=int(round(overall * 10)),
        conditions=_legacy_conditions(summary, findings),
        image_urls=image_urls,
        scanned_at=scanned_at,
    )
