"""Stage 4 — deterministic CV features per zone."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np

from app.services.scan_pipeline.zone_seg import ZoneInfo


@dataclass
class LesionCandidate:
    candidate_id: int
    zone: str
    cx: float
    cy: float
    r: float
    contrast: float


@dataclass
class ZoneFeatures:
    redness_raw: float
    oiliness_raw: float
    texture_raw: float


@dataclass
class CVFeatureSet:
    zones: dict[str, ZoneFeatures] = field(default_factory=dict)
    lesions: list[LesionCandidate] = field(default_factory=list)
    baseline_a_star: float | None = None

    def to_prompt_dict(self) -> dict[str, Any]:
        return {
            "baseline_a_star": self.baseline_a_star,
            "zones": {
                name: {
                    "redness_raw": z.redness_raw,
                    "oiliness_raw": z.oiliness_raw,
                    "texture_raw": z.texture_raw,
                }
                for name, z in self.zones.items()
            },
            "lesion_candidates": [
                {
                    "candidate_id": c.candidate_id,
                    "zone": c.zone,
                    "cx": c.cx,
                    "cy": c.cy,
                    "r": c.r,
                    "contrast": c.contrast,
                }
                for c in self.lesions
            ],
        }


def _zone_pixels(bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    return bgr[mask > 0]


def compute_cv_features(
    image_bgr: np.ndarray,
    zones: dict[str, ZoneInfo],
    baseline_a_star: float | None = None,
) -> CVFeatureSet:
    h, w = image_bgr.shape[:2]
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)

    # Personal baseline: if none, use median a* of all face zones this scan
    a_channel = lab[:, :, 1]
    if baseline_a_star is None:
        face_mask = np.zeros((h, w), dtype=np.uint8)
        for z in zones.values():
            face_mask = cv2.bitwise_or(face_mask, z.mask)
        vals = a_channel[face_mask > 0]
        baseline_a_star = float(np.median(vals)) if len(vals) else 128.0

    local_std = cv2.blur(gray * gray, (7, 7)) - cv2.blur(gray, (7, 7)) ** 2
    local_std = np.sqrt(np.maximum(local_std, 0))

    features = CVFeatureSet(baseline_a_star=baseline_a_star)
    lesions: list[LesionCandidate] = []
    candidate_id = 0

    # CLAHE on L and a* for blob detection
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_eq = clahe.apply(lab[:, :, 0].astype(np.uint8))
    a_eq = clahe.apply(np.clip(a_channel, 0, 255).astype(np.uint8))
    blob_src = cv2.addWeighted(l_eq, 0.5, a_eq, 0.5, 0)

    params = cv2.SimpleBlobDetector_Params()
    params.filterByArea = True
    params.filterByCircularity = False
    params.filterByConvexity = False
    params.filterByInertia = False
    params.filterByColor = False
    params.minThreshold = 10
    params.maxThreshold = 220

    for name, zone in zones.items():
        mask = zone.mask
        pix_lab = lab[mask > 0]
        if len(pix_lab) < 50:
            continue
        a_mean = float(pix_lab[:, 1].mean())
        redness_raw = a_mean - float(baseline_a_star)

        v = hsv[:, :, 2] / 255.0
        s = hsv[:, :, 1] / 255.0
        specular = ((v > 0.92) & (s < 0.25) & (mask > 0)).sum()
        oiliness_raw = float(specular) / float((mask > 0).sum())

        zone_gray_mean = float(gray[mask > 0].mean()) + 1e-6
        texture_raw = float(local_std[mask > 0].mean()) / zone_gray_mean

        features.zones[name] = ZoneFeatures(
            redness_raw=round(redness_raw, 4),
            oiliness_raw=round(oiliness_raw, 6),
            texture_raw=round(texture_raw, 6),
        )

        zone_area = float((mask > 0).sum())
        params.minArea = max(8.0, 0.0004 * zone_area)
        params.maxArea = max(params.minArea * 2, 0.02 * zone_area)
        detector = cv2.SimpleBlobDetector_create(params)

        masked = blob_src.copy()
        masked[mask == 0] = 0
        keypoints = detector.detect(masked)
        for kp in keypoints:
            cx = float(kp.pt[0] / w)
            cy = float(kp.pt[1] / h)
            r = float((kp.size / 2) / w)
            # local contrast
            x, y = int(kp.pt[0]), int(kp.pt[1])
            rad = max(2, int(kp.size / 2))
            y0, y1 = max(0, y - rad), min(h, y + rad)
            x0, x1 = max(0, x - rad), min(w, x + rad)
            patch = gray[y0:y1, x0:x1]
            contrast = float(patch.std()) if patch.size else 0.0
            lesions.append(
                LesionCandidate(
                    candidate_id=candidate_id,
                    zone=name,
                    cx=round(cx, 4),
                    cy=round(cy, 4),
                    r=round(max(0.02, min(0.2, r)), 4),
                    contrast=round(contrast, 3),
                )
            )
            candidate_id += 1

    features.lesions = lesions[:40]  # cap for prompt size
    return features
