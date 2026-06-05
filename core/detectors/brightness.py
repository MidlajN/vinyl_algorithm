import cv2 as cv
import numpy as np


def normalize_brightness(gray):
    """
    Remove flashlight gradient.
    Makes brightness usable.
    """

    large_blur = cv.GaussianBlur(
        gray,
        (0, 0),
        sigmaX=45
    )

    normalized = cv.divide(
        gray.astype(np.float32),
        large_blur.astype(np.float32) + 1
    )

    normalized = cv.normalize(
        normalized,
        None,
        0,
        255,
        cv.NORM_MINMAX
    )

    return normalized.astype(np.uint8)