"""Stage 2a — authoritative QC with machine-readable reason codes."""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.services.scan_pipeline import zones as Z
from app.services.scan_pipeline.landmarker import detect_faces, landmarks_px

REASON_MESSAGES = {
    "no_face": "No face detected — align your face in the oval and try again.",
    "multiple_faces": "Only one face should be in frame. Step aside from others and rescan.",
    "too_far": "Move closer so your face fills the oval.",
    "not_frontal": "Face the camera straight on — keep your head level.",
    "too_dark": "Find brighter light and rescan.",
    "too_bright": "Too bright — turn away from direct light.",
    "blurry": "Hold still and try again.",
    "occluded": "Remove anything covering your face and rescan.",
}

# Oval-guided selfies often land ~30–45% of frame height after client crop.
MIN_FACE_HEIGHT_RATIO = 0.28
MAX_YAW_DEG = 22.0
MAX_PITCH_DEG = 22.0
MIN_BLUR_VAR = 50.0
# Soft picker allows analyzing the best burst frame even if slightly off.
SOFT_MIN_FACE_HEIGHT_RATIO = 0.22
SOFT_MAX_YAW_DEG = 32.0
SOFT_MAX_PITCH_DEG = 32.0
SOFT_MIN_BLUR_VAR = 25.0
NEUTRAL_NOSE_RATIO = 0.28


@dataclass
class QCRejection(Exception):
    reason: str
    message: str

    def __str__(self) -> str:
        return self.message


@dataclass
class QCResult:
    ok: bool
    reason: str | None
    message: str | None
    landmarks: np.ndarray | None  # Nx2 px
    face_bbox: tuple[int, int, int, int] | None  # x,y,w,h
    yaw_deg: float | None
    pitch_deg: float | None
    brightness: float | None
    blur_var: float | None
    score: float = 0.0
    face_height_ratio: float | None = None


def _mean_point(pts: np.ndarray, idxs: list[int]) -> np.ndarray:
    valid = [i for i in idxs if i < len(pts)]
    return pts[valid].mean(axis=0)


def _estimate_pose_landmarks(pts: np.ndarray) -> tuple[float, float]:
    """Yaw/pitch from landmark geometry (degrees), frontal ≈ 0."""
    left = _mean_point(pts, Z.LEFT_EYE_CENTER_IDXS)
    right = _mean_point(pts, Z.RIGHT_EYE_CENTER_IDXS)
    nose = pts[Z.NOSE_TIP] if Z.NOSE_TIP < len(pts) else (left + right) / 2
    chin = pts[Z.CHIN_TIP] if Z.CHIN_TIP < len(pts) else pts.mean(axis=0)
    forehead = pts[Z.FOREHEAD_TOP] if Z.FOREHEAD_TOP < len(pts) else pts.mean(axis=0)

    mid_eyes = (left + right) / 2
    eye_dist = float(np.linalg.norm(right - left) + 1e-6)
    yaw = float(np.degrees(np.arctan2(float(nose[0] - mid_eyes[0]), eye_dist)))

    face_h = float(np.linalg.norm(chin - forehead) + 1e-6)
    nose_ratio = float((nose[1] - mid_eyes[1]) / face_h)
    pitch = float((nose_ratio - NEUTRAL_NOSE_RATIO) / 0.10 * 15.0)
    return yaw, pitch


def _estimate_pose(pts: np.ndarray, detection_result=None) -> tuple[float, float]:
    del detection_result
    if len(pts) >= max(Z.NOSE_TIP, Z.CHIN_TIP, Z.FOREHEAD_TOP) + 1:
        return _estimate_pose_landmarks(pts)
    return 0.0, 0.0


def _face_bbox(pts: np.ndarray) -> tuple[int, int, int, int]:
    x0, y0 = pts.min(axis=0)
    x1, y1 = pts.max(axis=0)
    return int(x0), int(y0), int(x1 - x0), int(y1 - y0)


def _reject(reason: str) -> QCResult:
    return QCResult(
        ok=False,
        reason=reason,
        message=REASON_MESSAGES.get(reason, "Please retake the photo."),
        landmarks=None,
        face_bbox=None,
        yaw_deg=None,
        pitch_deg=None,
        brightness=None,
        blur_var=None,
        score=0.0,
    )


def _quality_score(
    *,
    face_ratio: float,
    yaw: float,
    pitch: float,
    brightness: float,
    blur_var: float,
) -> float:
    """Higher = better candidate for analysis."""
    size_s = min(1.0, face_ratio / 0.55)
    pose_s = max(0.0, 1.0 - (abs(yaw) + abs(pitch)) / 50.0)
    sharp_s = min(1.0, blur_var / 120.0)
    bright_s = 1.0 if 70 <= brightness <= 190 else 0.55
    return 0.35 * size_s + 0.35 * pose_s + 0.20 * sharp_s + 0.10 * bright_s


def evaluate_frame(image_bytes: bytes) -> QCResult:
    """Score a frame for burst selection. Always returns landmarks when a face is found."""
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        return _reject("no_face")

    h, w = bgr.shape[:2]
    result = detect_faces(bgr)
    faces = result.face_landmarks or []

    if len(faces) == 0:
        return _reject("no_face")
    if len(faces) > 1:
        return _reject("multiple_faces")

    pts = landmarks_px(faces[0], w, h)
    in_bounds = (
        (pts[:, 0] >= 0)
        & (pts[:, 0] < w)
        & (pts[:, 1] >= 0)
        & (pts[:, 1] < h)
    )
    if float(in_bounds.mean()) < 0.85:
        return _reject("occluded")

    bbox = _face_bbox(pts)
    x, y, bw, bh = bbox
    face_ratio = bh / max(h, 1)
    yaw, pitch = _estimate_pose(pts, result)

    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(w, x + bw), min(h, y + bh)
    face = bgr[y1:y2, x1:x2]
    if face.size == 0:
        return _reject("no_face")

    gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
    brightness = float(gray.mean())
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    score = _quality_score(
        face_ratio=face_ratio,
        yaw=yaw,
        pitch=pitch,
        brightness=brightness,
        blur_var=blur_var,
    )

    reason = None
    if face_ratio < MIN_FACE_HEIGHT_RATIO:
        reason = "too_far"
    elif abs(yaw) > MAX_YAW_DEG or abs(pitch) > MAX_PITCH_DEG:
        reason = "not_frontal"
    elif brightness < 55:
        reason = "too_dark"
    elif brightness > 220:
        reason = "too_bright"
    elif blur_var < MIN_BLUR_VAR:
        reason = "blurry"

    soft_ok = (
        face_ratio >= SOFT_MIN_FACE_HEIGHT_RATIO
        and abs(yaw) <= SOFT_MAX_YAW_DEG
        and abs(pitch) <= SOFT_MAX_PITCH_DEG
        and 45 <= brightness <= 230
        and blur_var >= SOFT_MIN_BLUR_VAR
    )

    return QCResult(
        ok=reason is None,
        reason=reason,
        message=REASON_MESSAGES.get(reason) if reason else None,
        landmarks=pts,
        face_bbox=bbox,
        yaw_deg=yaw,
        pitch_deg=pitch,
        brightness=brightness,
        blur_var=blur_var,
        score=score if soft_ok else score * 0.25,
        face_height_ratio=face_ratio,
    )


def run_qc(image_bytes: bytes) -> QCResult:
    """Strict single-image QC (used by /scan/qc)."""
    ev = evaluate_frame(image_bytes)
    if not ev.ok:
        return _reject(ev.reason or "no_face")
    return ev


def pick_best_frame(frames: list[bytes]) -> tuple[bytes, QCResult]:
    """
    Choose the best burst frame for analysis.
    Prefers hard-pass frames; otherwise the highest soft-scored face frame.
    """
    if not frames:
        raise QCRejection(reason="no_face", message=REASON_MESSAGES["no_face"])

    scored: list[tuple[bytes, QCResult]] = []
    for raw in frames:
        ev = evaluate_frame(raw)
        if ev.landmarks is not None:
            scored.append((raw, ev))

    if not scored:
        raise QCRejection(reason="no_face", message=REASON_MESSAGES["no_face"])

    hard = [(b, e) for b, e in scored if e.ok]
    pool = hard if hard else [(b, e) for b, e in scored if e.score > 0]
    if not pool:
        # Fall back to any face detection
        pool = scored

    best_bytes, best_ev = max(pool, key=lambda item: item[1].score)

    # For pipeline: treat selected frame as QC-pass even if soft
    if not best_ev.ok and best_ev.landmarks is not None:
        best_ev = QCResult(
            ok=True,
            reason=None,
            message=None,
            landmarks=best_ev.landmarks,
            face_bbox=best_ev.face_bbox,
            yaw_deg=best_ev.yaw_deg,
            pitch_deg=best_ev.pitch_deg,
            brightness=best_ev.brightness,
            blur_var=best_ev.blur_var,
            score=best_ev.score,
            face_height_ratio=best_ev.face_height_ratio,
        )
    return best_bytes, best_ev


def raise_if_rejected(qc: QCResult) -> None:
    if not qc.ok:
        raise QCRejection(reason=qc.reason or "no_face", message=qc.message or "Retake photo.")
