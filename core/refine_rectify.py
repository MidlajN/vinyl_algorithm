import cv2 as cv
import numpy as np


def refine_rectification(
    image,
    outer,
    refined,
    padding=40
):
    """
    Micro rectification.

    Translation only.

    Prevents edge clipping by
    padding before warp.
    """

    h, w = image.shape[:2]

    outer_x, outer_y = (
        outer["center"]
    )

    refined_x = (
        refined["center_x"]
    )

    refined_y = (
        refined["center_y"]
    )

    dx = (
        outer_x
        - refined_x
    )

    dy = (
        outer_y
        - refined_y
    )

    print(
        "\n--- MICRO RECTIFICATION ---"
    )

    print(
        f"dx: {dx:.2f}"
    )

    print(
        f"dy: {dy:.2f}"
    )

    # -------------------------
    # pad image
    # -------------------------

    padded = cv.copyMakeBorder(
        image,
        padding,
        padding,
        padding,
        padding,
        cv.BORDER_CONSTANT,
        value=(0, 0, 0)
    )

    matrix = np.array([
        [1, 0, dx],
        [0, 1, dy]
    ], dtype=np.float32)

    corrected = cv.warpAffine(
        padded,
        matrix,
        (
            padded.shape[1],
            padded.shape[0]
        ),
        flags=cv.INTER_CUBIC
    )

    # -------------------------
    # crop back to original
    # -------------------------

    start_y = padding
    end_y = padding + h

    start_x = padding
    end_x = padding + w

    corrected = corrected[
        start_y:end_y,
        start_x:end_x
    ]

    return corrected
