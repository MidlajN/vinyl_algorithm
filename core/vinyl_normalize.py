import cv2 as cv
import numpy as np


def normalize_vinyl(
    image,
    outer=None
):
    gray = cv.cvtColor(
        image,
        cv.COLOR_BGR2GRAY
    )

    # -------------------------
    # suppress groove texture
    # -------------------------

    smooth = cv.GaussianBlur(
        gray,
        (0,0),
        sigmaX=25
    )

    detail_removed = cv.subtract(
        smooth,
        gray
    )

    normalized = cv.normalize(
        detail_removed,
        None,
        0,
        255,
        cv.NORM_MINMAX
    )

    # -------------------------
    # disc mask
    # -------------------------

    if outer is not None:

        mask = np.zeros_like(
            normalized,
            dtype=np.uint8
        )

        cx, cy = outer[
            "center"
        ]

        r = int(
            outer[
                "radius_px"
            ]
            * 1.01
        )

        cv.circle(
            mask,
            (
                int(cx),
                int(cy)
            ),
            r,
            255,
            -1
        )

        normalized = cv.bitwise_and(
            normalized,
            normalized,
            mask=mask
        )

    return normalized