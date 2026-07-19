"""Stage 3 — zone masks and normalized bboxes from landmarks."""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.services.scan_pipeline.zones import ZONE_LANDMARKS


@dataclass
class ZoneInfo:
    name: str
    mask: np.ndarray  # uint8 0/255
    bbox: dict[str, float]  # x,y,w,h normalized 0-1


def build_zones(image_bgr: np.ndarray, landmarks: np.ndarray) -> dict[str, ZoneInfo]:
    h, w = image_bgr.shape[:2]
    zones: dict[str, ZoneInfo] = {}

    for name, idxs in ZONE_LANDMARKS.items():
        valid = [i for i in idxs if i < len(landmarks)]
        if len(valid) < 3:
            continue
        pts = landmarks[valid].astype(np.int32)
        mask = np.zeros((h, w), dtype=np.uint8)
        hull = cv2.convexHull(pts)
        cv2.fillConvexPoly(mask, hull, 255)

        ys, xs = np.where(mask > 0)
        if len(xs) == 0:
            x0, y0 = pts.min(axis=0)
            x1, y1 = pts.max(axis=0)
        else:
            x0, x1 = xs.min(), xs.max()
            y0, y1 = ys.min(), ys.max()

        zones[name] = ZoneInfo(
            name=name,
            mask=mask,
            bbox={
                "x": float(x0 / w),
                "y": float(y0 / h),
                "w": float((x1 - x0) / w),
                "h": float((y1 - y0) / h),
            },
        )
    return zones
