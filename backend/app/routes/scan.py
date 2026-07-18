from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth import get_current_user_id
from app.models.schemas import ScanQuota, ScanResult
from app.services.face_service import FaceDetectionError, prepare_scan_faces
from app.services.openai_service import analyze_skin_images
from app.services.scan_service import assert_scan_allowed, get_scan_quota, persist_scan

router = APIRouter()

REQUIRED_ANGLES = ("front", "left", "right")


async def _read_image(upload: UploadFile, label: str) -> tuple[bytes, str]:
    if not upload.content_type or not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"{label} file must be an image")

    image_bytes = await upload.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail=f"{label} image is empty")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"{label} image must be under 10 MB")

    return image_bytes, upload.content_type


@router.get("/quota", response_model=ScanQuota)
def scan_quota(user_id: str = Depends(get_current_user_id)) -> ScanQuota:
    quota = get_scan_quota(user_id)
    return ScanQuota(**quota)


@router.post("", response_model=ScanResult)
async def scan_skin(
    front: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> ScanResult:
    try:
        assert_scan_allowed(user_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    try:
        raw_images = {
            "front": await _read_image(front, "Front"),
            "left": await _read_image(left, "Left"),
            "right": await _read_image(right, "Right"),
        }
        # Isolate the face before AI analysis so results map onto the face oval.
        face_images = prepare_scan_faces(raw_images)
        result = analyze_skin_images(face_images)
        return persist_scan(user_id, result, face_images)
    except FaceDetectionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Scan analysis failed: {type(exc).__name__}: {exc}",
        ) from exc
