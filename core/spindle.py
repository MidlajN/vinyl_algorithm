import cv2 as cv
import numpy as np


def detect_spindle_hole(
    gray,
    estimated_x,
    estimated_y,
    estimated_radius
):
    search_radius = int(
        estimated_radius * 0.15
    )

    x1 = max(
        estimated_x - search_radius,
        0
    )

    y1 = max(
        estimated_y - search_radius,
        0
    )

    x2 = min(
        estimated_x + search_radius,
        gray.shape[1]
    )

    y2 = min(
        estimated_y + search_radius,
        gray.shape[0]
    )

    crop = gray[
        y1:y2,
        x1:x2
    ]

    blur = cv.GaussianBlur(
        crop,
        (11, 11),
        2
    )

    circles = cv.HoughCircles(
        blur,
        cv.HOUGH_GRADIENT,
        dp=1.2,
        minDist=20,
        param1=50,
        param2=15,
        minRadius=4,
        maxRadius=30
    )

    if circles is None:
        raise Exception(
            "Could not detect spindle hole"
        )

    circles = np.round(
        circles[0]
    ).astype(int)

    best = None
    best_score = -1

    for c in circles:
        x, y, r = c

        mask = np.zeros_like(crop)

        cv.circle(
            mask,
            (x, y),
            r,
            255,
            -1
        )

        brightness = cv.mean(
            crop,
            mask=mask
        )[0]

        if brightness > best_score:
            best_score = brightness
            best = c

    sx, sy, sr = best

    return {
        "x": int(sx + x1),
        "y": int(sy + y1)
    }