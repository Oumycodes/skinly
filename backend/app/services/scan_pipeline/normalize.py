"""Stage 2b — align, crop, resize, white-balance normalized face crop."""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.services.scan_pipeline import zones as Z
from app.services.scan_pipeline.landmarker import detect_faces, landmarks_px
from app.services.scan_pipeline.qc import QCResult


@dataclass
class NormalizedFace:
    image_bgr: np.ndarray  # 768x1024
    jpeg_bytes: bytes
    landmarks: np.ndarray  # in normalized crop coords
    content_type: str = "image/jpeg"


def _eye_centers(pts: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    left = pts[[i for i in Z.LEFT_EYE_CENTER_IDXS if i < len(pts)]].mean(axis=0)
    right = pts[[i for i in Z.RIGHT_EYE_CENTER_IDXS if i < len(pts)]].mean(axis=0)
    return left, right


def _gray_world(bgr: np.ndarray) -> np.ndarray:
    img = bgr.astype(np.float32)
    means = img.reshape(-1, 3).mean(axis=0) + 1e-6
    gray = means.mean()
    gains = gray / means
    balanced = img * gains
    return np.clip(balanced, 0, 255).astype(np.uint8)


def normalize_face(image_bytes: bytes, qc: QCResult) -> NormalizedFace:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None or qc.landmarks is None:
        raise ValueError("Cannot normalize — invalid image or missing landmarks")

    pts = qc.landmarks.copy()
    left, right = _eye_centers(pts)
    dy = right[1] - left[1]
    dx = right[0] - left[0]
    angle = float(np.degrees(np.arctan2(dy, dx)))

    h, w = bgr.shape[:2]
    center = (float(w) / 2, float(h) / 2)
    rot = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(bgr, rot, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    # Rotate landmarks
    ones = np.ones((pts.shape[0], 1))
    pts_h = np.hstack([pts, ones])
    pts_rot = pts_h @ rot.T

    # Re-detect for accuracy on rotated image (preferred)
    det = detect_faces(rotated)
    if det.face_landmarks:
        pts_rot = landmarks_px(det.face_landmarks[0], w, h)

    x0, y0 = pts_rot.min(axis=0)
    x1, y1 = pts_rot.max(axis=0)
    bw, bh = x1 - x0, y1 - y0
    pad = 0.08
    x0 -= bw * pad
    y0 -= bh * pad
    x1 += bw * pad
    y1 += bh * pad

    # Center-crop to 3:4 aspect around face box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    box_w, box_h = x1 - x0, y1 - y0
    target_aspect = 3 / 4  # w/h
    if box_w / max(box_h, 1) > target_aspect:
        # too wide → expand height
        box_h = box_w / target_aspect
    else:
        box_w = box_h * target_aspect

    x0 = int(max(0, cx - box_w / 2))
    y0 = int(max(0, cy - box_h / 2))
    x1 = int(min(w, cx + box_w / 2))
    y1 = int(min(h, cy + box_h / 2))
    crop = rotated[y0:y1, x0:x1]
    if crop.size == 0:
        raise ValueError("Face crop failed")

    # Shift landmarks into crop space
    pts_crop = pts_rot.copy()
    pts_crop[:, 0] -= x0
    pts_crop[:, 1] -= y0

    # Resize to 768×1024
    target_w, target_h = 768, 1024
    scale_x = target_w / crop.shape[1]
    scale_y = target_h / crop.shape[0]
    resized = cv2.resize(crop, (target_w, target_h), interpolation=cv2.INTER_AREA)
    pts_final = pts_crop.copy()
    pts_final[:, 0] *= scale_x
    pts_final[:, 1] *= scale_y

    balanced = _gray_world(resized)
    ok, encoded = cv2.imencode(".jpg", balanced, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    if not ok:
        raise RuntimeError("Failed to encode normalized face")

    return NormalizedFace(
        image_bgr=balanced,
        jpeg_bytes=encoded.tobytes(),
        landmarks=pts_final,
    )
