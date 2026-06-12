"""
Phase 0 profiling script.
Times each stage of the pipeline independently.
"""

import time
import sys
import cv2 as cv
import numpy as np

sys.path.insert(0, ".")

from core.preprocess import preprocess
from core.ellipse import detect_outer_ellipse
from core.rectify import rectify_disc
from core.vinyl_normalize import normalize_vinyl
from core.label import detect_label_ring
from core.geometry_refine import refine_geometry
from core.refine_rectify import refine_rectification
from core.spindle import detect_spindle
from core.playable import detect_playable_boundaries
from core.radial_texture import build_radial_texture_profile
from core.separator_detection import detect_track_separators
from core.tracks import build_tracks
from core.tonearm import calculate_servo_angle
from config import PIVOT_TO_SPINDLE_MM, ARM_LENGTH_MM, SERVO_ZERO_OFFSET_DEG

IMAGE_PATH = "uploads/0328ad89-4132-4641-ac59-46bf7f1724a1.jpeg"

timings = {}

def t(label, fn):
    t0 = time.perf_counter()
    result = fn()
    elapsed = (time.perf_counter() - t0) * 1000
    timings[label] = elapsed
    print(f"  {label:45s} {elapsed:8.1f} ms")
    return result


print(f"\n{'='*60}")
print("VINYL PIPELINE PROFILER")
print(f"{'='*60}\n")

image = cv.imread(IMAGE_PATH)
print(f"Input image: {image.shape[1]}x{image.shape[0]} px\n")

print("STAGE TIMINGS:")
print("-" * 60)

# Stage 1: preprocess
gray, blur = t("1. preprocess", lambda: preprocess(image))

# Stage 2: detect outer ellipse (pass 1)
outer = t("2. detect_outer_ellipse (pass 1)", lambda: detect_outer_ellipse(gray))

# Stage 3: crop to disc
def crop_to_disc(image, outer, margin=20):
    cx, cy = outer["center"]
    r = int(outer["radius_px"])
    x0 = max(0, int(cx - r - margin))
    y0 = max(0, int(cy - r - margin))
    x1 = min(image.shape[1], int(cx + r + margin))
    y1 = min(image.shape[0], int(cy + r + margin))
    cropped = image[y0:y1, x0:x1].copy()
    local_cx = cx - x0
    local_cy = cy - y0
    mask = np.zeros(cropped.shape[:2], dtype=np.uint8)
    cv.circle(mask, (int(local_cx), int(local_cy)), int(r + margin), 255, -1)
    cropped = cv.bitwise_and(cropped, cropped, mask=mask)
    cropped_outer = outer.copy()
    cropped_outer["center"] = (float(local_cx), float(local_cy))
    return cropped, cropped_outer

cropped, outer = t("3. crop_to_disc", lambda: crop_to_disc(image, outer))

# Stage 4: rectify disc
rectified = t("4. rectify_disc", lambda: rectify_disc(cropped, outer))

# Stage 5: preprocess rectified
gray_rect, _ = t("5. preprocess (rectified)", lambda: preprocess(rectified))

# Stage 6: detect outer ellipse pass 2
outer = t("6. detect_outer_ellipse (pass 2)", lambda: detect_outer_ellipse(gray_rect))

# Stage 7: normalize vinyl pass 1
normalized = t("7. normalize_vinyl (pass 1)", lambda: normalize_vinyl(rectified, outer))

# Stage 8: detect label ring pass 1
label = t("8. detect_label_ring (pass 1)", lambda: detect_label_ring(normalized, outer))

# Stage 9: refine geometry pass 1
refined = t("9. refine_geometry (pass 1)", lambda: refine_geometry(outer, label))

# Stage 10: refine rectification
micro_rectified = t("10. refine_rectification", lambda: refine_rectification(rectified, outer, refined))

# Stage 11: preprocess micro rectified
gray_micro, _ = t("11. preprocess (micro)", lambda: preprocess(micro_rectified))

# Stage 12: detect outer ellipse pass 3
micro_outer = t("12. detect_outer_ellipse (pass 3)", lambda: detect_outer_ellipse(gray_micro))

outer["radius_px"] = micro_outer["radius_px"]
outer["center"] = micro_outer["center"]
outer["major_radius_px"] = micro_outer["major_radius_px"]
outer["minor_radius_px"] = micro_outer["minor_radius_px"]

# Stage 13: detect spindle
refined_center = (refined["center_x"], refined["center_y"])
spindle = t("13. detect_spindle", lambda: detect_spindle(micro_rectified, refined_center, outer))

true_disc_center = (outer["center"][0], outer["center"][1])
outer["center"] = true_disc_center

# Stage 14: normalize vinyl pass 2
normalized = t("14. normalize_vinyl (pass 2)", lambda: normalize_vinyl(micro_rectified, outer))

# Stage 15: detect label ring pass 2
label = t("15. detect_label_ring (pass 2)", lambda: detect_label_ring(normalized, outer))

# Stage 16: refine geometry pass 2
refined = t("16. refine_geometry (pass 2)", lambda: refine_geometry(outer, label))

disc_center = true_disc_center

# Stage 17: detect playable boundaries
playable = t("17. detect_playable_boundaries",
    lambda: detect_playable_boundaries(normalized, spindle, label, outer, disc_center))

ppm = outer["radius_px"] / 152.4

# Stage 18: build radial texture profile
profile = t("18. build_radial_texture_profile",
    lambda: build_radial_texture_profile(
        normalized, spindle,
        playable["inner_playable_radius_px"],
        playable["outer_playable_radius_px"]
    ))

# Stage 19: detect track separators
separator_result = t("19. detect_track_separators",
    lambda: detect_track_separators(
        profile=profile, playable=playable, ppm=ppm,
        smoothing_sigma=2.0, min_prominence=2.0,
        min_distance_mm=8.0, min_width_mm=0.5,
        max_width_mm=6.0, ignore_edge_mm=6.0
    ))

separators = separator_result["separators"]

# Stage 20: build tracks
tracks = t("20. build_tracks",
    lambda: build_tracks(playable=playable, separators=separators, ppm=ppm))

print(f"\n{'='*60}")
print("SUMMARY")
print(f"{'='*60}")

total = sum(timings.values())
print(f"\n{'Total pipeline time':45s} {total:8.1f} ms")
print(f"\nTop bottlenecks (>5% of total):")
sorted_t = sorted(timings.items(), key=lambda x: x[1], reverse=True)
for name, ms in sorted_t:
    pct = ms / total * 100
    if pct > 2:
        bar = "█" * int(pct / 2)
        print(f"  {name:45s} {ms:7.1f}ms  {pct:5.1f}%  {bar}")

print(f"\nImage dimensions: {image.shape[1]}x{image.shape[0]}")
print(f"Radial texture range: {playable['inner_playable_radius_px']:.0f}px → {playable['outer_playable_radius_px']:.0f}px")
print(f"  ({int(playable['outer_playable_radius_px'] - playable['inner_playable_radius_px'])} radius steps)")
print(f"Tracks detected: {len(tracks)}")
print(f"Separators detected: {len(separators)}")
print(f"ppm: {ppm:.3f} px/mm")
print()
