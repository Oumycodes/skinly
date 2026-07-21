from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.auth import get_current_user_id
from app.models.schemas import QCFailResponse, ScanQuota
from app.services.scan_pipeline import QCRejection, run_qc_only
from app.services.scan_pipeline.pipeline import (
    run_scan_pipeline,
    run_scan_pipeline_from_burst,
)
from app.services.scan_pipeline.persist import (
    get_active_trials_for_gemini,
    get_previous_scan_context,
    get_previous_smoothed,
    get_skin_baseline,
    get_user_profile_for_scan,
    persist_pipeline_scan,
)
from app.services.scan_service import assert_scan_allowed, get_scan_quota

router = APIRouter()


async def _read_image(upload: UploadFile, label: str = "Image") -> bytes:
    if not upload.content_type or not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"{label} file must be an image")
    image_bytes = await upload.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail=f"{label} image is empty")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"{label} image must be under 10 MB")
    return image_bytes


@router.get("/quota", response_model=ScanQuota)
def scan_quota(user_id: str = Depends(get_current_user_id)) -> ScanQuota:
    return ScanQuota(**get_scan_quota(user_id))


@router.post("/qc", response_model=None)
async def scan_qc(
    image: UploadFile | None = File(None),
    front: UploadFile | None = File(None),
    user_id: str = Depends(get_current_user_id),
):
    del user_id
    upload = image or front
    if upload is None:
        raise HTTPException(status_code=400, detail="image is required")
    try:
        raw = await _read_image(upload)
        qc = run_qc_only(raw)
        if not qc.ok:
            body = QCFailResponse(
                ok=False,
                reason=qc.reason or "no_face",
                message=qc.message or "Please retake the photo.",
            )
            return JSONResponse(status_code=422, content=body.model_dump())
        return {
            "ok": True,
            "brightness": qc.brightness,
            "blur_var": qc.blur_var,
            "yaw_deg": qc.yaw_deg,
            "pitch_deg": qc.pitch_deg,
            "score": qc.score,
            "face_height_ratio": qc.face_height_ratio,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"QC failed: {type(exc).__name__}: {exc}",
        ) from exc


@router.post("", response_model=None)
async def scan_skin(
    image: UploadFile | None = File(None),
    front: UploadFile | None = File(None),
    left: UploadFile | None = File(None),
    right: UploadFile | None = File(None),
    closeup: UploadFile | None = File(None),
    closeup_front: UploadFile | None = File(None),
    closeup_left: UploadFile | None = File(None),
    closeup_right: UploadFile | None = File(None),
    images: list[UploadFile] | None = File(None),
    user_id: str = Depends(get_current_user_id),
):
    """
    Hybrid scan:
    - `images` = Face ID burst (optional, for analysis)
    - `front` / `left` / `right` = posed display photos (home/progress carousel)
    Analysis uses every frame provided; display URLs prefer the three posed angles.
    """
    try:
        assert_scan_allowed(user_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    try:
        # Frontal frames (burst + front) drive best-frame pick + CV measurement.
        analysis_frames: list[bytes] = []
        # Profiles + close-up are extra vision context for the Gemini layer.
        context_images: list[tuple[str, bytes]] = []
        display: dict[str, bytes] = {}

        if images:
            for idx, upload in enumerate(images):
                analysis_frames.append(await _read_image(upload, label=f"images[{idx}]"))

        if front is not None:
            raw = await _read_image(front, label="front")
            display["front"] = raw
            analysis_frames.append(raw)

        for angle, upload in (("left", left), ("right", right)):
            if upload is None:
                continue
            raw = await _read_image(upload, label=angle)
            display[angle] = raw
            context_images.append((angle, raw))

        # Close-up detail shots — high-magnification context for Gemini only.
        for label, upload in (
            ("closeup_front", closeup_front),
            ("closeup_left", closeup_left),
            ("closeup_right", closeup_right),
            ("closeup", closeup),  # legacy single close-up
        ):
            if upload is not None:
                context_images.append((label, await _read_image(upload, label=label)))

        # Legacy single-image field
        if image is not None and "front" not in display:
            raw = await _read_image(image)
            display["front"] = raw
            analysis_frames.append(raw)

        if not analysis_frames:
            raise HTTPException(
                status_code=400,
                detail="Provide images burst and/or front/left/right photos",
            )

        baseline = get_skin_baseline(user_id)
        prev = get_previous_smoothed(user_id)
        previous_scan = get_previous_scan_context(user_id)
        user_profile = get_user_profile_for_scan(user_id)
        active_trials = get_active_trials_for_gemini(user_id)

        ctx = dict(
            baseline_a_star=baseline,
            previous_smoothed=prev,
            user_profile=user_profile,
            previous_scan=previous_scan,
            active_trials=active_trials,
        )

        if len(analysis_frames) == 1:
            pipeline = run_scan_pipeline(
                analysis_frames[0], context_images=context_images, **ctx
            )
        else:
            pipeline = run_scan_pipeline_from_burst(
                analysis_frames, context_images=context_images, **ctx
            )

        return persist_pipeline_scan(
            user_id,
            pipeline,
            display_images=display or None,
        )
    except QCRejection as exc:
        body = QCFailResponse(ok=False, reason=exc.reason, message=exc.message)
        return JSONResponse(status_code=422, content=body.model_dump())
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Scan analysis failed: {type(exc).__name__}: {exc}",
        ) from exc
