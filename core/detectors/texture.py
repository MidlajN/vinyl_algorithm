import cv2 as cv
import numpy as np


def compute_texture_energy1(gray):
    """
    Groove texture detector using Laplacian energy.
    Grooves create high-frequency micro texture.
    """

    blur = cv.GaussianBlur(gray, (5, 5), 0)

    laplacian = cv.Laplacian(
        blur,
        cv.CV_32F,
        ksize=3
    )

    texture = np.abs(laplacian)

    return texture