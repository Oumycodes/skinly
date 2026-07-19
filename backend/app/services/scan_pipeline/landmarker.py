"""MediaPipe Face Landmarker loader (Tasks API)."""

from __future__ import annotations

import urllib.request
from pathlib import Path

import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "face_landmarker.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)

_landmarker: vision.FaceLandmarker | None = None


def ensure_model() -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if not MODEL_PATH.exists() or MODEL_PATH.stat().st_size < 1000:
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    return MODEL_PATH


def get_landmarker() -> vision.FaceLandmarker:
    global _landmarker
    if _landmarker is None:
        path = ensure_model()
        options = vision.FaceLandmarkerOptions(
            base_options=python.BaseOptions(
                model_asset_path=str(path),
                delegate=python.BaseOptions.Delegate.CPU,
            ),
            running_mode=vision.RunningMode.IMAGE,
            num_faces=2,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=True,
        )
        _landmarker = vision.FaceLandmarker.create_from_options(options)
    return _landmarker


def detect_faces(bgr: np.ndarray):
    """Return FaceLandmarkerResult for a BGR image."""
    rgb = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=np.ascontiguousarray(bgr[:, :, ::-1]),
    )
    return get_landmarker().detect(rgb)


def landmarks_px(face_landmarks, width: int, height: int) -> np.ndarray:
    """Nx2 array of (x, y) pixel coords."""
    pts = []
    for lm in face_landmarks:
        pts.append((lm.x * width, lm.y * height))
    return np.asarray(pts, dtype=np.float64)
