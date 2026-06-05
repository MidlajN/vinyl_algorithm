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