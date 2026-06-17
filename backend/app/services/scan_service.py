from datetime import datetime, timezone

from app.config import FREE_SCAN_LIMIT
from app.models.schemas import ScanResult
from app.services.supabase_service import get_supabase


def _month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_scan_quota(user_id: str) -> dict[str, int | str]:
    supabase = get_supabase()
    if not supabase:
        return {
            "plan": "free",
            "limit": FREE_SCAN_LIMIT,
            "used": 0,
            "remaining": FREE_SCAN_LIMIT,
        }

    profile = (
        supabase.table("profiles")
        .select("plan")
        .eq("id", user_id)
        .single()
        .execute()
    )
    plan = profile.data.get("plan", "free") if profile.data else "free"

    if plan == "pro":
        return {"plan": "pro", "limit": -1, "used": 0, "remaining": -1}

    month_start = _month_start().isoformat()
    scans = (
        supabase.table("skin_scans")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("scanned_at", month_start)
        .execute()
    )
    used = scans.count or 0
    remaining = max(0, FREE_SCAN_LIMIT - used)

    return {
        "plan": plan,
        "limit": FREE_SCAN_LIMIT,
        "used": used,
        "remaining": remaining,
    }


def assert_scan_allowed(user_id: str) -> None:
    quota = get_scan_quota(user_id)
    if quota["plan"] == "pro":
        return
    if quota["remaining"] <= 0:
        raise PermissionError(
            f"Monthly scan limit reached ({FREE_SCAN_LIMIT} free scans). Upgrade to Pro for unlimited scans."
        )


def persist_scan(
    user_id: str,
    result: ScanResult,
    image_bytes: bytes,
    content_type: str,
) -> ScanResult:
    supabase = get_supabase()
    if not supabase:
        return result

    scan_id = result.scan_id
    ext = "jpg" if "jpeg" in content_type else "png"
    image_path = f"{user_id}/{scan_id}.{ext}"

    supabase.storage.from_("scan-images").upload(
        image_path,
        image_bytes,
        {"content-type": content_type, "upsert": "false"},
    )

    conditions_payload = [c.model_dump() for c in result.conditions]

    supabase.table("skin_scans").insert(
        {
            "id": scan_id,
            "user_id": user_id,
            "image_path": image_path,
            "overall_score": result.overall_score,
            "summary": result.summary,
            "conditions": conditions_payload,
            "scanned_at": result.scanned_at.isoformat(),
        }
    ).execute()

    supabase.table("progress_checkins").insert(
        {
            "id": scan_id,
            "user_id": user_id,
            "overall_score": result.overall_score,
            "image_path": image_path,
            "checkin_at": result.scanned_at.isoformat(),
        }
    ).execute()

    from app.services.progress_service import _compute_streak, _update_profile_streak, list_checkins

    checkins = list_checkins(user_id)
    streak = _compute_streak([c.checkin_at for c in checkins])
    _update_profile_streak(user_id, streak)

    return result
