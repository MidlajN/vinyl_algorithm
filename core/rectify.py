import cv2 as cv
import numpy as np


def rectify_disc(
    image,
    outer
):
    cx, cy = outer[
        "center"
    ]

    angle = outer[
        "angle"
    ]

    major = outer[
        "major_radius_px"
    ]

    minor = outer[
        "minor_radius_px"
    ]

    h, w = image.shape[:2]

    scale_y = (
        major / minor
    )

    print(
        "\n\nmajor:",
        major,
        "minor:",
        minor,
        "angle:",
        angle
    )

    # -------------------
    # rotate around center
    # -------------------

    rotation = cv.getRotationMatrix2D(
        (cx, cy),
        angle,
        1.0
    )

    rotated = cv.warpAffine(
        image,
        rotation,
        (w, h),
        flags=cv.INTER_CUBIC
    )

    # -------------------
    # affine scaling
    # around center
    # -------------------

    affine = np.array([
        [1, 0, 0],
        [0, scale_y,
         cy * (
             1
             - scale_y
         )]
    ], dtype=np.float32)

    corrected = cv.warpAffine(
        rotated,
        affine,
        (w, h),
        flags=cv.INTER_CUBIC
    )

    return corrected