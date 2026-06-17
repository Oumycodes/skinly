from datetime import datetime, timedelta, timezone

from app.models.schemas import DashboardData, DashboardMetric, ScanHistoryItem, ScanResult, SkinCondition
from app.services.supabase_service import get_supabase

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


def _parse_conditions(raw: list) -> list[SkinCondition]:
    return [SkinCondition(**c) for c in raw]


def list_scans(user_id: str, limit: int = 20) -> list[ScanHistoryItem]:
    supabase = get_supabase()
    if not supabase:
        return []

    result = (
        supabase.table("skin_scans")
        .select("id, overall_score, summary, conditions, scanned_at")
        .eq("user_id", user_id)
        .order("scanned_at", desc=True)
        .limit(limit)
        .execute()
    )

    items: list[ScanHistoryItem] = []
    for row in result.data:
        items.append(
            ScanHistoryItem(
                scan_id=row["id"],
                overall_score=row["overall_score"],
                summary=row["summary"],
                conditions=_parse_conditions(row.get("conditions", [])),
                scanned_at=row["scanned_at"],
            )
        )
    return items


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
    supabase = get_supabase()
    if not supabase:
        return 0

    profile = (
        supabase.table("profiles").select("streak").eq("id", user_id).single().execute()
    )
    return profile.data.get("streak", 0) if profile.data else 0


def get_dashboard(user_id: str) -> DashboardData:
    scans = list_scans(user_id, limit=10)
    streak = get_streak(user_id)

    if not scans:
        return DashboardData(
            skin_score=0,
            weekly_change=0,
            streak=streak,
            metrics=[
                DashboardMetric(id="acne", value="—", label="Acne", progress=0),
                DashboardMetric(id="hydration", value="—", label="Hydration", progress=0),
                DashboardMetric(id="tone", value="—", label="Tone", progress=0),
            ],
        )

    latest = scans[0]
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
    )
