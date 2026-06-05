import cv2 as cv
import numpy as np


def _moving_average(
    signal,
    window
):
    if window <= 1:
        return signal

    return np.convolve(
        signal,
        np.ones(window) / window,
        mode="same"
    )


def _robust_mean(
    values,
    trim=10
):
    low = np.percentile(
        values,
        trim,
        axis=1,
        keepdims=True
    )

    high = np.percentile(
        values,
        100 - trim,
        axis=1,
        keepdims=True
    )

    clipped = np.clip(
        values,
        low,
        high
    )

    return np.mean(
        clipped,
        axis=1
    )


def _normalize_signal(
    signal
):
    low = np.percentile(
        signal,
        5
    )

    high = np.percentile(
        signal,
        95
    )

    if high <= low:
        return np.zeros_like(
            signal,
            dtype=np.float32
        )

    normalized = (
        signal
        - low
    ) / (
        high
        - low
    )

    return np.clip(
        normalized,
        0,
        1
    ).astype(
        np.float32
    )


def build_polar_annulus_profile(
    gray,
    spindle,
    inner_radius,
    outer_radius,
    angles=1440
):
    min_radius = max(
        1,
        int(inner_radius)
    )

    max_radius = max(
        min_radius + 1,
        int(outer_radius)
    )

    radii = np.arange(
        min_radius,
        max_radius + 1,
        dtype=np.float32
    )

    theta = np.linspace(
        0,
        2 * np.pi,
        angles,
        endpoint=False,
        dtype=np.float32
    )

    radius_grid = radii[:, None]

    map_x = (
        spindle["x"]
        + radius_grid
        * np.cos(theta)[None, :]
    ).astype(
        np.float32
    )

    map_y = (
        spindle["y"]
        + radius_grid
        * np.sin(theta)[None, :]
    ).astype(
        np.float32
    )

    polar = cv.remap(
        gray.astype(np.float32),
        map_x,
        map_y,
        interpolation=cv.INTER_LINEAR,
        borderMode=cv.BORDER_REPLICATE
    )

    angular_median = np.median(
        polar,
        axis=0,
        keepdims=True
    )

    angular_std = np.std(
        polar,
        axis=0,
        keepdims=True
    )

    normalized_polar = (
        polar
        - angular_median
    ) / (
        angular_std
        + 1e-6
    )

    radial_gradient = cv.Sobel(
        normalized_polar,
        cv.CV_32F,
        0,
        1,
        ksize=3
    )

    angular_gradient = cv.Sobel(
        normalized_polar,
        cv.CV_32F,
        1,
        0,
        ksize=3
    )

    texture = np.sqrt(
        radial_gradient ** 2
        + 0.35
        * angular_gradient ** 2
    )

    local_mean = cv.blur(
        normalized_polar,
        (15, 5)
    )

    local_sq_mean = cv.blur(
        normalized_polar ** 2,
        (15, 5)
    )

    local_variance = np.maximum(
        local_sq_mean
        - local_mean ** 2,
        0
    )

    brightness_signal = _robust_mean(
        normalized_polar
    )

    texture_signal = _robust_mean(
        texture
    )

    variance_signal = _robust_mean(
        local_variance
    )

    texture_norm = _normalize_signal(
        texture_signal
    )

    variance_norm = _normalize_signal(
        variance_signal
    )

    brightness_norm = _normalize_signal(
        np.abs(
            brightness_signal
            - np.median(brightness_signal)
        )
    )

    activity = (
        texture_norm
        * 0.65
        + variance_norm
        * 0.25
        + brightness_norm
        * 0.10
    )

    smoothed = _moving_average(
        activity,
        9
    )

    return {
        "kind": "polar_annulus",
        "radii": radii,
        "raw": activity,
        "smoothed": smoothed,
        "activity": activity,
        "texture": texture_signal,
        "texture_map": texture,
        "variance": variance_signal,
        "brightness": brightness_signal,
        "polar": polar
    }
