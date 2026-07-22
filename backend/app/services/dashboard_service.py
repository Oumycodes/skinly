from datetime import date, datetime, timedelta, timezone

from app.models.schemas import (
    DashboardData,
    DashboardMetric,
    MetricInsight,
    MetricPriority,
    ScanDetail,
    ScanHistoryItem,
    ScanImageUrls,
    SkinCondition,
)
from app.services.supabase_service import supabase_call

SEVERITY_PROGRESS = {"mild": 0.75, "moderate": 0.45, "severe": 0.2}
METRIC_COLORS = {
    "acne": "acne",
    "dehydration": "hydration",
    "hydration": "hydration",
    "uneven": "tone",
    "tone": "tone",
    "hyperpigmentation": "tone",
    "redness": "tone",
}

PIPELINE_METRIC_LABELS = {
    "hydration": "Hydration",
    "oil_balance": "Oil balance",
    "clarity": "Clarity",
    "calmness": "Calmness",
    "smoothness": "Texture",
    "fine_lines": "Fine lines",
}

SCAN_SELECT = (
    "id, overall_score, summary, conditions, scanned_at, image_path, "
    "metrics_smoothed, gemini_raw, pipeline_version, overall_10, findings, zones"
)

# Prefer richer selects when migrations are applied; always keep a working fallback
# that still returns metrics_smoothed (Home scores depend on it).
_SCAN_SELECT_CANDIDATES = (
    # Full schema (image_paths + legacy metrics array)
    "id, overall_score, summary, conditions, scanned_at, image_path, image_paths, "
    "metrics_smoothed, gemini_raw, metrics, pipeline_version, overall_10, findings, zones",
    # Current live schema (no image_paths / metrics columns yet)
    SCAN_SELECT,
    # Minimal + scores only
    "id, overall_score, summary, conditions, scanned_at, image_path, metrics_smoothed, gemini_raw",
    "id, overall_score, summary, conditions, scanned_at, image_path, metrics_smoothed",
    "id, overall_score, summary, conditions, scanned_at, image_path",
)


def _parse_conditions(raw: list | None) -> list[SkinCondition]:
    """Best-effort parse — skip malformed condition rows instead of 500/422."""
    if not raw:
        return []
    out: list[SkinCondition] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            out.append(SkinCondition(**item))
        except Exception:
            # Tolerate partial / legacy shapes
            try:
                name = str(item.get("name") or "Skin note")
                severity = item.get("severity")
                if severity not in ("mild", "moderate", "severe"):
                    severity = "mild"
                out.append(
                    SkinCondition(
                        name=name,
                        severity=severity,
                        explanation=str(item.get("explanation") or item.get("summary") or ""),
                        recommendations=[],
                    )
                )
            except Exception:
                continue
    return out


def _signed_scan_url(image_path: str) -> str | None:
    def query(client):
        result = client.storage.from_("scan-images").create_signed_url(image_path, 3600)
        if isinstance(result, dict):
            return result.get("signedURL") or result.get("signedUrl")
        if hasattr(result, "signed_url"):
            return result.signed_url
        return None

    return supabase_call(query, None)


def _bulk_signed_urls(paths: list[str]) -> dict[str, str]:
    """Sign many storage paths in a single request (vs. one round-trip each)."""
    unique = list(dict.fromkeys(p for p in paths if p))
    if not unique:
        return {}

    def query(client):
        result = client.storage.from_("scan-images").create_signed_urls(unique, 3600)
        out: dict[str, str] = {}
        for idx, item in enumerate(result or []):
            if isinstance(item, dict):
                if item.get("error"):
                    continue
                path = item.get("path")
                url = item.get("signedURL") or item.get("signedUrl") or item.get("signed_url")
            else:
                path = getattr(item, "path", None)
                url = getattr(item, "signed_url", None) or getattr(item, "signedURL", None)
            if not url:
                continue
            if not path and idx < len(unique):
                path = unique[idx]
            if path:
                out[str(path)] = str(url)
        return out

    return supabase_call(query, {})


def _resolve_image_paths(row: dict) -> dict[str, str]:
    paths: dict[str, str] = {}
    stored = row.get("image_paths") or {}
    if isinstance(stored, dict):
        paths = {k: v for k, v in stored.items() if v}

    scan_id = str(row.get("id", ""))
    image_path = row.get("image_path") or ""

    # Infer left/right from multi-angle storage layout when image_paths wasn't saved
    if scan_id and image_path and f"/{scan_id}/" in image_path:
        base, filename = image_path.rsplit("/", 1)
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
        for angle in ("front", "left", "right"):
            paths.setdefault(angle, f"{base}/{angle}.{ext}")

    if not paths.get("front") and image_path:
        paths["front"] = image_path

    return paths


def _signed_urls_for_paths(
    paths: dict[str, str],
    url_map: dict[str, str] | None = None,
) -> ScanImageUrls:
    urls: dict[str, str | None] = {}
    for angle in ("front", "left", "right"):
        path = paths.get(angle)
        if not path:
            urls[angle] = None
        elif url_map is not None:
            urls[angle] = url_map.get(path)
        else:
            urls[angle] = _signed_scan_url(path)
    return ScanImageUrls(**urls)


def _extract_smoothed(row: dict) -> dict[str, float]:
    raw = row.get("metrics_smoothed")
    if isinstance(raw, dict) and raw:
        out: dict[str, float] = {}
        for k, v in raw.items():
            try:
                score = float(v)
                # Persist stores 0–10; tolerate accidental 0–100
                out[str(k)] = score / 10.0 if score > 10 else score
            except (TypeError, ValueError):
                continue
        if out:
            return out
    # Legacy metrics array [{id, score}] where score is 0–100
    metrics = row.get("metrics")
    if isinstance(metrics, list):
        out = {}
        for m in metrics:
            if not isinstance(m, dict) or "id" not in m:
                continue
            try:
                score = float(m.get("score", 0))
                out[str(m["id"])] = score / 10.0 if score > 10 else score
            except (TypeError, ValueError):
                continue
        if out:
            return out
    # Nested gemini_raw.metrics.{id}.score as last resort
    gemini = row.get("gemini_raw") if isinstance(row.get("gemini_raw"), dict) else {}
    raw_metrics = gemini.get("metrics") if isinstance(gemini.get("metrics"), dict) else {}
    out = {}
    for mid in PIPELINE_METRIC_LABELS:
        detail = raw_metrics.get(mid)
        try:
            if isinstance(detail, dict) and detail.get("score") is not None:
                score = float(detail["score"])
                out[mid] = score / 10.0 if score > 10 else score
            elif isinstance(detail, (int, float)):
                score = float(detail)
                out[mid] = score / 10.0 if score > 10 else score
        except (TypeError, ValueError):
            continue
    return out


def _build_metric_insights(row: dict) -> tuple[list[MetricInsight], list[MetricPriority], str | None, dict[str, str]]:
    smoothed = _extract_smoothed(row)
    gemini = row.get("gemini_raw") if isinstance(row.get("gemini_raw"), dict) else {}
    raw_metrics = gemini.get("metrics") if isinstance(gemini.get("metrics"), dict) else {}
    priorities_raw = gemini.get("priorities") if isinstance(gemini.get("priorities"), list) else []
    zone_summaries = gemini.get("zone_summaries") if isinstance(gemini.get("zone_summaries"), dict) else {}
    trend_note = gemini.get("trend_note")
    if trend_note is not None:
        trend_note = str(trend_note) or None

    priority_by_metric: dict[str, MetricPriority] = {}
    priorities: list[MetricPriority] = []
    for item in priorities_raw:
        if not isinstance(item, dict):
            continue
        metric = str(item.get("metric") or "").strip()
        if not metric:
            continue
        p = MetricPriority(
            metric=metric,
            why=str(item.get("why") or item.get("why_now") or ""),
            suggestion=str(item.get("suggestion") or ""),
        )
        priorities.append(p)
        priority_by_metric[metric] = p

    insights: list[MetricInsight] = []
    for mid, label in PIPELINE_METRIC_LABELS.items():
        score = smoothed.get(mid)
        detail = raw_metrics.get(mid) if isinstance(raw_metrics.get(mid), dict) else {}
        if score is None and isinstance(raw_metrics.get(mid), (int, float)):
            try:
                score = float(raw_metrics[mid])
                if score > 10:
                    score = score / 10.0
            except (TypeError, ValueError):
                score = None
        if score is None and detail.get("score") is not None:
            try:
                score = float(detail["score"])
                if score > 10:
                    score = score / 10.0
            except (TypeError, ValueError):
                score = None
        if score is None:
            continue
        pri = priority_by_metric.get(mid)
        zones = detail.get("zones_affected") if isinstance(detail.get("zones_affected"), list) else []
        insights.append(
            MetricInsight(
                id=mid,
                label=label,
                score=round(float(score), 1),
                evidence=str(detail["evidence"]) if detail.get("evidence") else None,
                confidence=str(detail["confidence"]) if detail.get("confidence") else None,
                zones_affected=[str(z) for z in zones],
                suggestion=pri.suggestion if pri else None,
                why=pri.why if pri else None,
            )
        )

    # Sort: priority metrics first, then by ascending score (worst first for attention)
    priority_order = {p.metric: i for i, p in enumerate(priorities)}
    insights.sort(
        key=lambda m: (
            priority_order.get(m.id, 100),
            m.score,
        )
    )
    return insights, priorities, trend_note, {str(k): str(v) for k, v in zone_summaries.items()}


def _row_to_scan_detail(row: dict, url_map: dict[str, str] | None = None) -> ScanDetail:
    image_paths = _resolve_image_paths(row)
    insights, priorities, trend_note, zone_summaries = _build_metric_insights(row)
    return ScanDetail(
        scan_id=row["id"],
        overall_score=row["overall_score"],
        summary=row["summary"],
        conditions=_parse_conditions(row.get("conditions", [])),
        scanned_at=row["scanned_at"],
        image_urls=_signed_urls_for_paths(image_paths, url_map),
        metrics_smoothed=_extract_smoothed(row),
        metric_insights=insights,
        priorities=priorities,
        trend_note=trend_note,
        zone_summaries=zone_summaries,
    )


def _fetch_scan_rows(user_id: str, limit: int = 20) -> list[dict]:
    def query(client):
        last_err: Exception | None = None
        for select in _SCAN_SELECT_CANDIDATES:
            try:
                result = (
                    client.table("skin_scans")
                    .select(select)
                    .eq("user_id", user_id)
                    .order("scanned_at", desc=True)
                    .limit(limit)
                    .execute()
                )
                return result.data or []
            except Exception as exc:
                last_err = exc
                continue
        if last_err:
            raise last_err
        return []

    return supabase_call(query, [])


def get_latest_scan_row(user_id: str) -> dict | None:
    rows = _fetch_scan_rows(user_id, limit=1)
    return rows[0] if rows else None


def list_scans(user_id: str, limit: int = 20) -> list[ScanHistoryItem]:
    return [
        ScanHistoryItem(
            scan_id=row["id"],
            overall_score=row["overall_score"],
            summary=row["summary"],
            conditions=_parse_conditions(row.get("conditions", [])),
            scanned_at=row["scanned_at"],
        )
        for row in _fetch_scan_rows(user_id, limit)
    ]


def list_scan_details(user_id: str, limit: int = 30) -> list[ScanDetail]:
    rows = _fetch_scan_rows(user_id, limit)
    # Sign every image path across all rows in ONE storage request
    all_paths: list[str] = []
    for row in rows:
        all_paths.extend(_resolve_image_paths(row).values())
    url_map = _bulk_signed_urls(all_paths)

    details: list[ScanDetail] = []
    for row in rows:
        try:
            details.append(_row_to_scan_detail(row, url_map))
        except Exception:
            continue
    return details


def _scan_date(scanned_at: datetime | str) -> date:
    if isinstance(scanned_at, str):
        scanned_at = datetime.fromisoformat(scanned_at.replace("Z", "+00:00"))
    if scanned_at.tzinfo is None:
        scanned_at = scanned_at.replace(tzinfo=timezone.utc)
    return scanned_at.date()


def get_scan_for_date(user_id: str, target: date) -> ScanDetail | None:
    for row in _fetch_scan_rows(user_id, limit=50):
        if _scan_date(row["scanned_at"]) == target:
            return _row_to_scan_detail(row)
    return None


def get_latest_scan(user_id: str) -> ScanHistoryItem | None:
    scans = list_scans(user_id, limit=1)
    return scans[0] if scans else None


def _conditions_to_metrics(conditions: list[SkinCondition]) -> list[DashboardMetric]:
    metrics: list[DashboardMetric] = []
    seen_labels: set[str] = set()

    for condition in conditions[:3]:
        label_key = condition.name.lower()
        metric_type = "tone"
        for key, mtype in METRIC_COLORS.items():
            if key in label_key:
                metric_type = mtype
                break

        if metric_type in seen_labels:
            continue
        seen_labels.add(metric_type)

        value_map = {"mild": "Mild", "moderate": "Moderate", "severe": "Severe"}
        if metric_type == "hydration":
            value_map = {"mild": "Fair", "moderate": "Good", "severe": "Good"}

        metrics.append(
            DashboardMetric(
                id=metric_type,
                value=value_map.get(condition.severity, condition.severity.title()),
                label=condition.name if metric_type == "tone" else metric_type.title(),
                progress=SEVERITY_PROGRESS.get(condition.severity, 0.5),
                severity=condition.severity,
            )
        )

    if not metrics:
        metrics = [
            DashboardMetric(id="hydration", value="—", label="Hydration", progress=0.5),
            DashboardMetric(id="tone", value="—", label="Tone", progress=0.5),
        ]

    return metrics


def get_streak(user_id: str) -> int:
    def query(client):
        profile = (
            client.table("profiles")
            .select("streak")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        return profile.data.get("streak", 0) if profile.data else 0

    return supabase_call(query, 0)


def _empty_dashboard(streak: int = 0) -> DashboardData:
    return DashboardData(
        skin_score=0,
        weekly_change=0,
        streak=streak,
        metrics=[
            DashboardMetric(id="clarity", value="—", label="Clarity", progress=0),
            DashboardMetric(id="hydration", value="—", label="Hydration", progress=0),
            DashboardMetric(id="calmness", value="—", label="Calmness", progress=0),
        ],
        latest_scan_image_url=None,
        latest_scan_image_urls=ScanImageUrls(),
        latest_scan_summary=None,
        latest_scan_conditions=[],
        latest_metrics_smoothed={},
        latest_metric_insights=[],
        latest_priorities=[],
        latest_trend_note=None,
    )


def get_dashboard(user_id: str) -> DashboardData:
    streak = get_streak(user_id)
    latest_row = get_latest_scan_row(user_id)

    if not latest_row:
        return _empty_dashboard(streak)

    latest = _row_to_scan_detail(latest_row)

    scans = list_scans(user_id, limit=10)
    weekly_change = 0
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    for scan in scans[1:]:
        scanned = scan.scanned_at
        if scanned.tzinfo is None:
            scanned = scanned.replace(tzinfo=timezone.utc)
        if scanned <= week_ago:
            weekly_change = latest.overall_score - scan.overall_score
            break

    # Dashboard chips from pipeline scores when available
    dash_metrics: list[DashboardMetric] = []
    for insight in latest.metric_insights[:3]:
        score10 = insight.score
        severity = None
        if score10 < 5:
            severity = "severe"
        elif score10 < 6.5:
            severity = "moderate"
        elif score10 < 8:
            severity = "mild"
        dash_metrics.append(
            DashboardMetric(
                id=insight.id,
                value=f"{score10:.1f}",
                label=insight.label,
                progress=max(0.0, min(1.0, score10 / 10.0)),
                severity=severity,
            )
        )
    if not dash_metrics:
        dash_metrics = _conditions_to_metrics(latest.conditions)

    return DashboardData(
        skin_score=latest.overall_score,
        weekly_change=weekly_change,
        streak=streak,
        metrics=dash_metrics,
        latest_scan_at=latest.scanned_at,
        latest_scan_summary=latest.summary,
        latest_scan_image_url=latest.image_urls.front,
        latest_scan_image_urls=latest.image_urls,
        latest_scan_conditions=latest.conditions,
        latest_metrics_smoothed=latest.metrics_smoothed,
        latest_metric_insights=latest.metric_insights,
        latest_priorities=latest.priorities,
        latest_trend_note=latest.trend_note,
    )
