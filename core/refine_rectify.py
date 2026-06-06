import cv2 as cv
import numpy as np


def refine_rectification(
    image,
    outer,
    refined
):
    """
    Second-pass geometry refinement.

    Uses:
    - refined spindle center
    - label scale agreement

    Applies:
    - micro translation
    - micro isotropic scaling
    """

    h, w = image.shape[:2]

    outer_x, outer_y = (
        outer["center"]
    )

    refined_x = (
        refined[
            "center_x"
        ]
    )

    refined_y = (
        refined[
            "center_y"
        ]
    )

    # -------------------------
    # translation correction
    # -------------------------

    dx = (
        outer_x
        - refined_x
    )

    dy = (
        outer_y
        - refined_y
    )

    # -------------------------
    # scale correction
    # -------------------------

    scale = (
        refined[
            "scale_factor"
        ]
    )

    # limit correction
    # avoid instability

    scale = np.clip(
        scale,
        0.97,
        1.03
    )

    # -------------------------
    # affine transform
    # -------------------------

    matrix = np.array([
        [
            scale,
            0,
            (
                1 - scale
            ) * outer_x
            + dx
        ],
        [
            0,
            scale,
            (
                1 - scale
            ) * outer_y
            + dy
        ]
    ],
    dtype=np.float32)

    corrected = (
        cv.warpAffine(
            image,
            matrix,
            (w, h),
            flags=
            cv.INTER_CUBIC
        )
    )

    return corrected