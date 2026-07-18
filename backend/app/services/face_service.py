"""Detect and crop faces so skin analysis focuses on the face only."""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


class FaceDetectionError(ValueError):
    """Raised when a usable face cannot be found in a scan photo."""


@dataclass(frozen=True)
class FaceBox:
    x: int
    y: int
    w: int
    h: int

    @property
    def area(self) -> int:
        return self.w * self.h


_FRONTAL = None
_PROFILE = None


def _load_cascades() -> tuple[cv2.CascadeClassifier, cv2.CascadeClassifier]:
    global _FRONTAL, _PROFILE
    if _FRONTAL is None:
        frontal_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        profile_path = cv2.data.haarcascades + "haarcascade_profileface.xml"
        _FRONTAL = cv2.CascadeClassifier(frontal_path)
        _PROFILE = cv2.CascadeClassifier(profile_path)
        if _FRONTAL.empty() or _PROFILE.empty():
            raise RuntimeError("Failed to load OpenCV face cascade models")
    return _FRONTAL, _PROFILE


def _decode_image(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise FaceDetectionError("Could not read image")
    return bgr


def _detect_boxes(gray: np.ndarray) -> list[FaceBox]:
    frontal, profile = _load_cascades()
    min_size = (int(gray.shape[1] * 0.12), int(gray.shape[0] * 0.12))
    boxes: list[FaceBox] = []

    for cascade, flip in ((frontal, False), (profile, False), (profile, True)):
        source = cv2.flip(gray, 1) if flip else gray
        detected = cascade.detectMultiScale(
            source,
            scaleFactor=1.08,
            minNeighbors=5,
            minSize=min_size,
            flags=cv2.CASCADE_SCALE_IMAGE,
        )
        for x, y, w, h in detected:
            if flip:
                x = gray.shape[1] - x - w
            boxes.append(FaceBox(int(x), int(y), int(w), int(h)))

    return boxes


def _pick_face(boxes: list[FaceBox], image_w: int, image_h: int) -> FaceBox:
    if not boxes:
        raise FaceDetectionError("No face detected — align your face in the oval and try again")

    cx, cy = image_w / 2, image_h * 0.4

    def score(box: FaceBox) -> float:
        bx = box.x + box.w / 2
        by = box.y + box.h / 2
        dist = ((bx - cx) / image_w) ** 2 + ((by - cy) / image_h) ** 2
        return box.area * (1.0 - min(dist, 1.0))

    best = max(boxes, key=score)
    if best.area < (image_w * image_h) * 0.02:
        raise FaceDetectionError("Face is too far — move closer so your face fills the oval")
    return best


def _expand_box(box: FaceBox, image_w: int, image_h: int, pad: float = 0.35) -> FaceBox:
    pad_x = int(box.w * pad)
    pad_y_top = int(box.h * (pad + 0.15))
    pad_y_bottom = int(box.h * pad)
    x1 = max(0, box.x - pad_x)
    y1 = max(0, box.y - pad_y_top)
    x2 = min(image_w, box.x + box.w + pad_x)
    y2 = min(image_h, box.y + box.h + pad_y_bottom)
    return FaceBox(x1, y1, x2 - x1, y2 - y1)


def _to_jpeg_bytes(bgr: np.ndarray, quality: int = 90) -> bytes:
    ok, encoded = cv2.imencode(".jpg", bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise RuntimeError("Failed to encode face crop")
    return encoded.tobytes()


def _fallback_center_crop(w: int, h: int, angle: str) -> FaceBox:
    crop_w = int(w * 0.58)
    crop_h = int(h * 0.62)
    offset = int(w * 0.05)
    x = (w - crop_w) // 2 + (offset if angle == "left" else -offset if angle == "right" else 0)
    y = int(h * 0.12)
    x = max(0, min(x, w - crop_w))
    y = max(0, min(y, h - crop_h))
    return FaceBox(x, y, crop_w, crop_h)


def _center_portrait_jpeg(image_bytes: bytes, angle: str) -> tuple[bytes, str]:
    bgr = _decode_image(image_bytes)
    h, w = bgr.shape[:2]
    box = _fallback_center_crop(w, h, angle)
    cropped = bgr[box.y : box.y + box.h, box.x : box.x + box.w]
    target_w = 720
    scale = target_w / cropped.shape[1]
    target_h = max(1, int(round(cropped.shape[0] * scale)))
    resized = cv2.resize(cropped, (target_w, target_h), interpolation=cv2.INTER_AREA)
    return _to_jpeg_bytes(resized), "image/jpeg"


def crop_face_image(
    image_bytes: bytes,
    *,
    angle: str = "front",
    content_type: str = "image/jpeg",
) -> tuple[bytes, str]:
    """Detect the primary face and return a tight JPEG crop."""
    del content_type
    bgr = _decode_image(image_bytes)
    h, w = bgr.shape[:2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    try:
        face = _pick_face(_detect_boxes(gray), w, h)
        crop_box = _expand_box(face, w, h)
    except FaceDetectionError:
        if angle in {"left", "right"}:
            crop_box = _fallback_center_crop(w, h, angle)
        else:
            raise

    cropped = bgr[crop_box.y : crop_box.y + crop_box.h, crop_box.x : crop_box.x + crop_box.w]
    if cropped.size == 0:
        raise FaceDetectionError("Face crop failed — please retake the photo")

    target_w = 720
    scale = target_w / cropped.shape[1]
    target_h = max(1, int(round(cropped.shape[0] * scale)))
    resized = cv2.resize(cropped, (target_w, target_h), interpolation=cv2.INTER_AREA)
    return _to_jpeg_bytes(resized), "image/jpeg"


def prepare_scan_faces(
    images: dict[str, tuple[bytes, str]],
) -> dict[str, tuple[bytes, str]]:
    """Crop each scan angle to the face. Front must contain a detectable face."""
    prepared: dict[str, tuple[bytes, str]] = {}
    for angle in ("front", "left", "right"):
        if angle not in images:
            continue
        raw, content_type = images[angle]
        try:
            prepared[angle] = crop_face_image(raw, angle=angle, content_type=content_type)
        except FaceDetectionError:
            if angle == "front":
                raise
            prepared[angle] = _center_portrait_jpeg(raw, angle)
    return prepared
