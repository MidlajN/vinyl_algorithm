import cv2 as cv
import numpy as np


def compute_local_variance(gray):
    """
    Local variance map.
    Grooves have high variance.
    Separator rings are smoother.
    """

    mean = cv.blur(
        gray.astype(np.float32),
        (11, 11)
    )

    sq_mean = cv.blur(
        gray.astype(np.float32) ** 2,
        (11, 11)
    )

    variance = sq_mean - mean**2

    return variance