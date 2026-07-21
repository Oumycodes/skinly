"""Orchestrate QC → normalize → zones → CV → Gemini → fusion."""

from __future__ import annotations

from typing import Any

from app.services.scan_pipeline.features import compute_cv_features
from app.services.scan_pipeline.fusion import fuse_metrics, overall_score, smooth_metrics
from app.services.scan_pipeline.gemini_layer import flatten_metric_scores, interpret_with_gemini
from app.services.scan_pipeline.normalize import NormalizedFace, normalize_face
from app.services.scan_pipeline.qc import (
    QCRejection,
    QCResult,
    pick_best_frame,
    raise_if_rejected,
    run_qc,
)
from app.services.scan_pipeline.zone_seg import build_zones


def run_qc_only(image_bytes: bytes) -> QCResult:
    return run_qc(image_bytes)


def run_scan_pipeline(
    image_bytes: bytes,
    *,
    baseline_a_star: float | None = None,
    previous_smoothed: dict[str, float] | None = None,
    qc: QCResult | None = None,
    user_profile: dict[str, Any] | None = None,
    previous_scan: dict[str, Any] | None = None,
    active_trials: list[dict[str, Any]] | None = None,
    context_images: list[tuple[str, bytes]] | None = None,
) -> dict[str, Any]:
    if qc is None:
        qc = run_qc(image_bytes)
        raise_if_rejected(qc)

    normalized: NormalizedFace = normalize_face(image_bytes, qc)
    zones = build_zones(normalized.image_bgr, normalized.landmarks)
    cv = compute_cv_features(normalized.image_bgr, zones, baseline_a_star=baseline_a_star)

    gemini = interpret_with_gemini(
        normalized.jpeg_bytes,
        cv,
        user_profile=user_profile,
        previous_scan=previous_scan,
        active_trials=active_trials,
        context_images=context_images,
    )
    metrics_g = flatten_metric_scores(gemini.get("metrics"))
    findings_raw = gemini.get("findings") or []

    by_id = {c.candidate_id: c for c in cv.lesions}
    findings_out: list[dict[str, Any]] = []
    kept_count = 0
    for f in findings_raw:
        if not isinstance(f, dict):
            continue
        cid = int(f.get("candidate_id", f.get("id", -1)))
        keep = bool(f.get("keep"))
        conf = float(f.get("confidence") or 0)
        ftype = str(f.get("type") or "other")
        cand = by_id.get(cid)
        if keep and conf >= 0.7 and cand is not None and ftype not in {
            "shadow_or_artifact",
            "mole_or_freckle",
        }:
            kept_count += 1
            findings_out.append(
                {
                    "zone": cand.zone,
                    "cx": cand.cx,
                    "cy": cand.cy,
                    "r": cand.r,
                    "type": ftype,
                    "confidence": round(conf, 2),
                }
            )

    fused = fuse_metrics(metrics_g, cv, kept_count)
    smoothed = smooth_metrics(fused, previous_smoothed)
    overall = overall_score(smoothed)

    zone_bboxes = {name: z.bbox for name, z in zones.items()}

    return {
        "ok": True,
        "overall": overall,
        "metrics": smoothed,
        "metrics_raw": fused,
        "summary": str(gemini.get("summary") or ""),
        "see_professional": bool(gemini.get("see_professional")),
        "zones": zone_bboxes,
        "findings": findings_out,
        "zone_summaries": gemini.get("zone_summaries") or {},
        "priorities": gemini.get("priorities") or [],
        "trend_note": gemini.get("trend_note"),
        "normalized_jpeg": normalized.jpeg_bytes,
        "qc": {
            "brightness": qc.brightness,
            "blur_var": qc.blur_var,
            "yaw_deg": qc.yaw_deg,
            "pitch_deg": qc.pitch_deg,
            "score": qc.score,
            "face_height_ratio": qc.face_height_ratio,
        },
        "cv_features": cv.to_prompt_dict(),
        "gemini_raw": gemini,
        "baseline_a_star": cv.baseline_a_star,
    }


def run_scan_pipeline_from_burst(
    frames: list[bytes],
    *,
    baseline_a_star: float | None = None,
    previous_smoothed: dict[str, float] | None = None,
    user_profile: dict[str, Any] | None = None,
    previous_scan: dict[str, Any] | None = None,
    active_trials: list[dict[str, Any]] | None = None,
    **kwargs: Any,
) -> dict[str, Any]:
    """Pick the best frame from a Face ID–style burst, then run the pipeline."""
    best, qc = pick_best_frame(frames)
    return run_scan_pipeline(
        best,
        baseline_a_star=baseline_a_star,
        previous_smoothed=previous_smoothed,
        qc=qc,
        user_profile=user_profile,
        previous_scan=previous_scan,
        active_trials=active_trials,
        **kwargs,
    )


__all__ = [
    "run_scan_pipeline",
    "run_scan_pipeline_from_burst",
    "run_qc_only",
    "QCRejection",
    "QCResult",
]
