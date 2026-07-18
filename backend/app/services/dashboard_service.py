from datetime import date, datetime, timedelta, timezone

from app.models.schemas import (
    DashboardData,
    DashboardMetric,
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

SCAN_SELECT = "id, overall_score, summary, conditions, scanned_at, image_path, image_paths"


def _parse_conditions(raw: list) -> list[SkinCondition]:
    return [SkinCondition(**c) for c in raw]


def _signed_scan_url(image_path: str) -> str | None:
    def query(client):
        result = client.storage.from_("scan-images").create_signed_url(image_path, 3600)
        if isinstance(result, dict):
            return result.get("signedURL") or result.get("signedUrl")
        if hasattr(result, "signed_url"):
            return result.signed_url
        return None

    return supabase_call(query, None)


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


def _signed_urls_for_paths(paths: dict[str, str]) -> ScanImageUrls:
    urls: dict[str, str | None] = {}
    for angle in ("front", "left", "right"):
        path = paths.get(angle)
        urls[angle] = _signed_scan_url(path) if path else None
    return ScanImageUrls(**urls)


def _row_to_scan_detail(row: dict) -> ScanDetail:
    image_paths = _resolve_image_paths(row)
    return ScanDetail(
        scan_id=row["id"],
        overall_score=row["overall_score"],
        summary=row["summary"],
        conditions=_parse_conditions(row.get("conditions", [])),
        scanned_at=row["scanned_at"],
        image_urls=_signed_urls_for_paths(image_paths),
    )


def _fetch_scan_rows(user_id: str, limit: int = 20) -> list[dict]:
    def query(client):
        try:
            result = (
                client.table("skin_scans")
                .select(SCAN_SELECT)
                .eq("user_id", user_id)
                .order("scanned_at", desc=True)
                .limit(limit)
                .execute()
            )
        except Exception:
            result = (
                client.table("skin_scans")
                .select("id, overall_score, summary, conditions, scanned_at, image_path")
                .eq("user_id", user_id)
                .order("scanned_at", desc=True)
                .limit(limit)
                .execute()
            )
        return result.data

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
    return [_row_to_scan_detail(row) for row in _fetch_scan_rows(user_id, limit)]


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
            DashboardMetric(id="acne", value="—", label="Acne", progress=0),
            DashboardMetric(id="hydration", value="—", label="Hydration", progress=0),
            DashboardMetric(id="tone", value="—", label="Tone", progress=0),
        ],
        latest_scan_image_url=None,
        latest_scan_image_urls=ScanImageUrls(),
        latest_scan_summary=None,
        latest_scan_conditions=[],
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

    return DashboardData(
        skin_score=latest.overall_score,
        weekly_change=weekly_change,
        streak=streak,
        metrics=_conditions_to_metrics(latest.conditions),
        latest_scan_at=latest.scanned_at,
        latest_scan_summary=latest.summary,
        latest_scan_image_url=latest.image_urls.front,
        latest_scan_image_urls=latest.image_urls,
        latest_scan_conditions=latest.conditions,
    )
