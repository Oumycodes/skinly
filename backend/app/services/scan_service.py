from datetime import datetime, timezone
from uuid import uuid4

from app.config import FREE_SCAN_LIMIT
from app.models.schemas import ScanImageUrls, ScanResult
from app.services.supabase_service import get_supabase

ScanAngle = str  # "front" | "left" | "right"


def _month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_scan_quota(user_id: str) -> dict[str, int | str]:
    if FREE_SCAN_LIMIT <= 0:
        return {"plan": "free", "limit": -1, "used": 0, "remaining": -1}

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
    if FREE_SCAN_LIMIT <= 0:
        return

    quota = get_scan_quota(user_id)
    if quota["plan"] == "pro":
        return
    if quota["remaining"] <= 0:
        raise PermissionError(
            f"Monthly scan limit reached ({FREE_SCAN_LIMIT} free scans). Upgrade to Pro for unlimited scans."
        )


def _upload_scan_images(
    supabase,
    user_id: str,
    scan_id: str,
    images: dict[str, tuple[bytes, str]],
) -> dict[str, str]:
    image_paths: dict[str, str] = {}

    for angle, (image_bytes, content_type) in images.items():
        ext = "jpg" if "jpeg" in content_type else "png"
        image_path = f"{user_id}/{scan_id}/{angle}.{ext}"
        try:
            supabase.storage.from_("scan-images").upload(
                image_path,
                image_bytes,
                {"content-type": content_type, "upsert": "true"},
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to upload {angle} photo: {exc}") from exc
        image_paths[angle] = image_path

    return image_paths


def _signed_image_urls(supabase, image_paths: dict[str, str], expires_in: int = 3600) -> ScanImageUrls:
    urls: dict[str, str | None] = {"front": None, "left": None, "right": None}
    for angle, path in image_paths.items():
        try:
            result = supabase.storage.from_("scan-images").create_signed_url(path, expires_in)
            url = None
            if isinstance(result, dict):
                url = result.get("signedURL") or result.get("signedUrl")
                data = result.get("data")
                if not url and isinstance(data, dict):
                    url = data.get("signedURL") or data.get("signedUrl")
            elif hasattr(result, "signed_url"):
                url = result.signed_url
            if url:
                urls[angle] = url
        except Exception:
            continue
    return ScanImageUrls(**urls)


def _insert_skin_scan(
    supabase,
    row: dict,
    image_paths: dict[str, str],
) -> None:
    payload = {**row, "image_paths": image_paths}
    try:
        supabase.table("skin_scans").insert(payload).execute()
    except Exception as exc:
        message = str(exc).lower()
        if "image_paths" in message or "pgrst204" in message:
            supabase.table("skin_scans").insert(row).execute()
            try:
                supabase.table("skin_scans").update({"image_paths": image_paths}).eq(
                    "id", row["id"]
                ).execute()
            except Exception:
                pass
            return
        raise RuntimeError(f"Failed to save scan record: {exc}") from exc


def persist_scan(
    user_id: str,
    result: ScanResult,
    images: dict[str, tuple[bytes, str]],
) -> ScanResult:
    supabase = get_supabase()
    if not supabase:
        return result

    scan_id = result.scan_id or str(uuid4())
    result = result.model_copy(update={"scan_id": scan_id})

    image_paths = _upload_scan_images(supabase, user_id, scan_id, images)
    front_path = image_paths.get("front") or next(iter(image_paths.values()), None)
    conditions_payload = [c.model_dump() for c in result.conditions]
    metrics_payload = [m.model_dump() for m in result.metrics]

    row = {
        "id": scan_id,
        "user_id": user_id,
        "image_path": front_path,
        "overall_score": result.overall_score,
        "summary": result.summary,
        "conditions": conditions_payload,
        "scanned_at": result.scanned_at.isoformat(),
    }

    _insert_skin_scan(supabase, row, image_paths)

    try:
        supabase.table("skin_scans").update({"metrics": metrics_payload}).eq("id", scan_id).execute()
    except Exception:
        pass

    checkin_row = {
        "id": scan_id,
        "user_id": user_id,
        "overall_score": result.overall_score,
        "image_path": front_path,
        "checkin_at": result.scanned_at.isoformat(),
    }
    try:
        supabase.table("progress_checkins").upsert(
            checkin_row,
            on_conflict="id",
        ).execute()
    except Exception as exc:
        message = str(exc).lower()
        if "duplicate" in message or "23505" in message:
            supabase.table("progress_checkins").update(checkin_row).eq("id", scan_id).execute()
        else:
            raise RuntimeError(f"Failed to save progress check-in: {exc}") from exc

    from app.services.progress_service import _compute_streak, _update_profile_streak, list_checkins

    checkins = list_checkins(user_id)
    streak = _compute_streak([c.checkin_at for c in checkins])
    _update_profile_streak(user_id, streak)

    return result.model_copy(update={"image_urls": _signed_image_urls(supabase, image_paths)})
