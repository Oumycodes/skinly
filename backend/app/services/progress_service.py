from datetime import datetime, timedelta, timezone

from app.models.schemas import ProgressCheckin, ProgressSummary, ProgressWeekPoint, ScanResult
from app.services.openai_service import analyze_skin_image
from app.services.supabase_service import get_supabase


def _week_label(dt: datetime, index: int, is_latest: bool) -> str:
    if is_latest:
        return "NOW"
    return f"W{index + 1}"


def _compute_streak(checkin_dates: list[datetime]) -> int:
    if not checkin_dates:
        return 0

    weeks_with_checkin: set[str] = set()
    for dt in checkin_dates:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        year, week, _ = dt.isocalendar()
        weeks_with_checkin.add(f"{year}-W{week}")

    streak = 0
    now = datetime.now(timezone.utc)
    for i in range(52):
        check = now - timedelta(weeks=i)
        year, week, _ = check.isocalendar()
        key = f"{year}-W{week}"
        if key in weeks_with_checkin:
            streak += 1
        else:
            break

    return streak


def _update_profile_streak(user_id: str, streak: int) -> None:
    supabase = get_supabase()
    if not supabase:
        return
    supabase.table("profiles").update({"streak": streak}).eq("id", user_id).execute()


def list_checkins(user_id: str, limit: int = 52) -> list[ProgressCheckin]:
    supabase = get_supabase()
    if not supabase:
        return []

    result = (
        supabase.table("progress_checkins")
        .select("id, overall_score, checkin_at")
        .eq("user_id", user_id)
        .order("checkin_at", desc=False)
        .limit(limit)
        .execute()
    )

    return [
        ProgressCheckin(
            id=row["id"],
            overall_score=row["overall_score"],
            checkin_at=row["checkin_at"],
        )
        for row in result.data
    ]


def get_progress_summary(user_id: str) -> ProgressSummary:
    checkins = list_checkins(user_id)

    if not checkins:
        return ProgressSummary(
            current_score=0,
            starting_score=0,
            total_change=0,
            weeks_active=0,
            streak=0,
            chart_points=[],
            checkins=[],
        )

    scores = [c.overall_score for c in checkins]
    current = scores[-1]
    starting = scores[0]
    dates = [c.checkin_at for c in checkins]
    streak = _compute_streak(dates)
    _update_profile_streak(user_id, streak)

    chart_points: list[ProgressWeekPoint] = []
    for i, checkin in enumerate(checkins[-7:]):
        chart_points.append(
            ProgressWeekPoint(
                label=_week_label(checkin.checkin_at, i, i == len(checkins[-7:]) - 1),
                score=checkin.overall_score,
            )
        )

    return ProgressSummary(
        current_score=current,
        starting_score=starting,
        total_change=current - starting,
        weeks_active=len(checkins),
        streak=streak,
        chart_points=chart_points,
        checkins=checkins[-10:],
    )


def record_checkin(
    user_id: str,
    result: ScanResult,
    image_bytes: bytes,
    content_type: str,
) -> ProgressCheckin:
    supabase = get_supabase()
    if not supabase:
        raise RuntimeError("Supabase is not configured")

    checkin_id = result.scan_id
    ext = "jpg" if "jpeg" in content_type else "png"
    image_path = f"{user_id}/checkins/{checkin_id}.{ext}"

    supabase.storage.from_("scan-images").upload(
        image_path,
        image_bytes,
        {"content-type": content_type, "upsert": "false"},
    )

    row = {
        "id": checkin_id,
        "user_id": user_id,
        "overall_score": result.overall_score,
        "image_path": image_path,
        "checkin_at": result.scanned_at.isoformat(),
    }
    inserted = supabase.table("progress_checkins").insert(row).execute()
    data = inserted.data[0]

    checkins = list_checkins(user_id)
    streak = _compute_streak([c.checkin_at for c in checkins])
    _update_profile_streak(user_id, streak)

    return ProgressCheckin(
        id=data["id"],
        overall_score=data["overall_score"],
        checkin_at=data["checkin_at"],
    )


def analyze_checkin_image(image_bytes: bytes, content_type: str) -> ScanResult:
    return analyze_skin_image(image_bytes, content_type)
