from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth import get_current_user_id
from app.models.schemas import ScanQuota, ScanResult
from app.services.openai_service import analyze_skin_image
from app.services.scan_service import assert_scan_allowed, get_scan_quota, persist_scan

router = APIRouter()


@router.get("/quota", response_model=ScanQuota)
def scan_quota(user_id: str = Depends(get_current_user_id)) -> ScanQuota:
    quota = get_scan_quota(user_id)
    return ScanQuota(**quota)


@router.post("", response_model=ScanResult)
async def scan_skin(
    image: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> ScanResult:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await image.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 10 MB")

    try:
        assert_scan_allowed(user_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    try:
        result = analyze_skin_image(image_bytes, image.content_type)
        return persist_scan(user_id, result, image_bytes, image.content_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scan analysis failed: {exc}") from exc
