"""MediaPipe Face Mesh landmark index groupings for facial zones."""

from __future__ import annotations

# Canonical MediaPipe Face Landmarker (478) indices — standard facial regions.
# Sourced from common Face Mesh zone mappings used in production skin apps.

FOREHEAD = [
    10, 67, 69, 104, 108, 109, 151, 299, 337, 338, 297, 332, 333, 298, 301,
]

NOSE = [
    1, 2, 4, 5, 6, 19, 94, 97, 98, 129, 168, 197, 195, 326, 327, 358, 417, 419,
]

LEFT_CHEEK = [
    50, 101, 118, 119, 120, 100, 142, 203, 205, 206, 207, 187, 123, 116, 117,
    111, 143, 227, 234,
]

RIGHT_CHEEK = [
    280, 330, 347, 348, 349, 329, 371, 423, 425, 426, 427, 411, 352, 345, 346,
    340, 372, 447, 454,
]

CHIN = [
    152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103,
    67, 109, 10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397,
    365, 379, 378, 400, 377,
]

UNDER_EYES = [
    # Left under-eye
    110, 24, 23, 22, 26, 112, 243, 190, 56, 28, 27, 29, 30, 247,
    # Right under-eye
    339, 254, 253, 252, 256, 341, 463, 414, 286, 258, 257, 259, 260, 467,
]

# Eye corners for alignment / pose
LEFT_EYE_OUTER = 33
LEFT_EYE_INNER = 133
RIGHT_EYE_OUTER = 263
RIGHT_EYE_INNER = 362
NOSE_TIP = 1
CHIN_TIP = 152
FOREHEAD_TOP = 10

LEFT_EYE_CENTER_IDXS = [33, 133, 159, 145]
RIGHT_EYE_CENTER_IDXS = [263, 362, 386, 374]

ZONE_LANDMARKS: dict[str, list[int]] = {
    "forehead": FOREHEAD,
    "nose": NOSE,
    "left_cheek": LEFT_CHEEK,
    "right_cheek": RIGHT_CHEEK,
    "chin": CHIN,
    "under_eyes": UNDER_EYES,
}
