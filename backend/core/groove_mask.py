import cv2 as cv
import numpy as np


def create_groove_mask(
    shape,
    geometry
):
    h, w = shape[:2]

    cx = int(
        geometry["center_x"]
    )

    cy = int(
        geometry["center_y"]
    )

    inner_r = int(
        geometry[
            "inner_playable_radius_px"
        ]
    )

    outer_r = int(
        geometry[
            "outer_playable_radius_px"
        ]
    )

    mask = np.zeros(
        (h, w),
        dtype=np.uint8
    )

    cv.circle(
        mask,
        (cx, cy),
        outer_r,
        255,
        -1
    )

    cv.circle(
        mask,
        (cx, cy),
        inner_r,
        0,
        -1
    )

    return mask