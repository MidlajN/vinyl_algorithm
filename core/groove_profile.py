import cv2 as cv
import numpy as np


def compute_texture_energy(
    gray,
    center_x,
    center_y,
    radius,
    angles=720
):
    values = []

    for theta in np.linspace(
        0,
        2 * np.pi,
        angles,
        endpoint=False
    ):
        x = int(
            center_x
            + radius
            * np.cos(theta)
        )

        y = int(
            center_y
            + radius
            * np.sin(theta)
        )

        if (
            x < 1
            or x >= gray.shape[1] - 1
            or y < 1
            or y >= gray.shape[0] - 1
        ):
            continue

        patch = gray[
            y-1:y+2,
            x-1:x+2
        ]

        gx = cv.Sobel(
            patch,
            cv.CV_64F,
            1,
            0,
            ksize=3
        )

        gy = cv.Sobel(
            patch,
            cv.CV_64F,
            0,
            1,
            ksize=3
        )

        magnitude = np.sqrt(
            gx**2 + gy**2
        )

        values.append(
            np.mean(
                magnitude
            )
        )

    if len(values) < 10:
        return 0

    return float(
        np.mean(values)
    )


def moving_average(
    signal,
    window=9
):
    return np.convolve(
        signal,
        np.ones(window)
        / window,
        mode="same"
    )


def build_radial_profile(
    gray,
    spindle,
    outer_radius
):
    profile = []

    min_radius = 20

    max_radius = int(
        outer_radius * 0.95
    )

    for r in range(
        min_radius,
        max_radius
    ):
        energy = (
            compute_texture_energy(
                gray,
                spindle["x"],
                spindle["y"],
                r
            )
        )

        profile.append(
            energy
        )

    profile = np.array(
        profile
    )

    smoothed = moving_average(
        profile,
        15
    )

    return {
        "raw": profile,
        "smoothed": smoothed,
        "radii": np.arange(
            min_radius,
            max_radius
        )
    }

import numpy as np
import cv2 as cv

from core.detectors.texture import (
    compute_texture_energy1
)

from core.detectors.variance import (
    compute_local_variance
)

from core.detectors.brightness import (
    normalize_brightness
)

def normalize_profile(profile):
    profile = profile.astype(np.float32)

    min_val = np.min(profile)
    max_val = np.max(profile)

    if max_val - min_val < 1e-6:
        return np.zeros_like(profile)

    return (
        profile - min_val
    ) / (
        max_val - min_val
    )


def radial_mean(
    image,
    center_x,
    center_y,
    max_radius
):
    h, w = image.shape[:2]

    y, x = np.indices((h, w))

    radius = np.sqrt(
        (x - center_x) ** 2 +
        (y - center_y) ** 2
    ).astype(np.int32)

    profile = np.zeros(max_radius)

    for r in range(max_radius):
        mask = radius == r

        if np.any(mask):
            profile[r] = np.mean(
                image[mask]
            )

    return profile


def build_groove_profile(
    gray,
    geometry
):
    cx = geometry["center_x"]
    cy = geometry["center_y"]

    max_radius = int(
        geometry["outer_radius_px"]
    )

    brightness_map = normalize_brightness(
        gray
    )

    texture_map = compute_texture_energy1(
        gray
    )

    variance_map = compute_local_variance(
        gray
    )

    brightness_profile = radial_mean(
        brightness_map,
        cx,
        cy,
        max_radius
    )

    texture_profile = radial_mean(
        texture_map,
        cx,
        cy,
        max_radius
    )

    variance_profile = radial_mean(
        variance_map,
        cx,
        cy,
        max_radius
    )

    brightness_profile = normalize_profile(
        brightness_profile
    )

    texture_profile = normalize_profile(
        texture_profile
    )

    variance_profile = normalize_profile(
        variance_profile
    )

    return {
        "brightness": brightness_profile,
        "texture": texture_profile,
        "variance": variance_profile
    }