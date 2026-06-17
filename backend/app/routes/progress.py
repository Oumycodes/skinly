from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth import get_current_user_id
from app.models.schemas import ProgressCheckin, ProgressSummary
from app.services.progress_service import (
    analyze_checkin_image,
    get_progress_summary,
    record_checkin,
)

router = APIRouter()


@router.get("", response_model=ProgressSummary)
def progress_summary(user_id: str = Depends(get_current_user_id)) -> ProgressSummary:
    return get_progress_summary(user_id)


@router.post("/checkin", response_model=ProgressCheckin)
async def progress_checkin(
    image: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> ProgressCheckin:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")

    try:
        result = analyze_checkin_image(image_bytes, image.content_type)
        return record_checkin(user_id, result, image_bytes, image.content_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Check-in failed: {exc}") from exc
