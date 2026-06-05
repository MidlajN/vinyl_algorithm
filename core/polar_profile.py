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


def _enhance_for_grooves(
    gray
):
    clahe = cv.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    equalized = clahe.apply(
        gray
    ).astype(
        np.float32
    )

    background = cv.GaussianBlur(
        equalized,
        (0, 0),
        31
    )

    enhanced = cv.normalize(
        equalized - background + 128,
        None,
        0,
        255,
        cv.NORM_MINMAX
    )

    return enhanced.astype(
        np.float32
    )


def _circle_maps(
    radii,
    theta,
    spindle
):
    radius_grid = radii[
        :,
        None
    ]

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

    return map_x, map_y


def _ellipse_maps(
    radii,
    theta,
    outer
):
    (
        (center_x, center_y),
        (width, height),
        angle
    ) = outer[
        "ellipse"
    ]

    outer_radius = outer[
        "radius_px"
    ]

    rotation = np.deg2rad(
        angle
    )

    axis_x = np.array(
        [
            np.cos(rotation),
            np.sin(rotation)
        ],
        dtype=np.float32
    )

    axis_y = np.array(
        [
            -np.sin(rotation),
            np.cos(rotation)
        ],
        dtype=np.float32
    )

    scale = (
        radii
        / outer_radius
    )[
        :,
        None
    ]

    cos_theta = np.cos(
        theta
    )[
        None,
        :
    ]

    sin_theta = np.sin(
        theta
    )[
        None,
        :
    ]

    half_width = width / 2.0
    half_height = height / 2.0

    map_x = (
        center_x
        + scale
        * (
            half_width
            * cos_theta
            * axis_x[0]
            + half_height
            * sin_theta
            * axis_y[0]
        )
    ).astype(
        np.float32
    )

    map_y = (
        center_y
        + scale
        * (
            half_width
            * cos_theta
            * axis_x[1]
            + half_height
            * sin_theta
            * axis_y[1]
        )
    ).astype(
        np.float32
    )

    return map_x, map_y


def build_polar_annulus_profile(
    gray,
    spindle,
    inner_radius,
    outer_radius,
    outer=None,
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

    if outer is None:
        map_x, map_y = _circle_maps(
            radii,
            theta,
            spindle
        )

        projection = "circle"

    else:
        map_x, map_y = _ellipse_maps(
            radii,
            theta,
            outer
        )

        projection = "ellipse"

    enhanced = _enhance_for_grooves(
        gray
    )

    polar = cv.remap(
        enhanced,
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

    radial_background = cv.blur(
        normalized_polar,
        (1, 41)
    )

    dark_map = np.maximum(
        radial_background
        - normalized_polar,
        0
    )

    dark_signal = _robust_mean(
        dark_map
    )

    dark_norm = _normalize_signal(
        dark_signal
    )

    smoothness = (
        1
        - texture_norm
    )

    texture_reference = np.percentile(
        texture,
        35,
        axis=0,
        keepdims=True
    )

    dark_reference = np.percentile(
        dark_map,
        65,
        axis=0,
        keepdims=True
    )

    smooth_continuity = np.mean(
        texture <= texture_reference,
        axis=1
    )

    dark_continuity = np.mean(
        dark_map >= dark_reference,
        axis=1
    )

    separator_continuity = (
        smooth_continuity
        * 0.55
        + dark_continuity
        * 0.45
    )

    separator_score = (
        smoothness
        * 0.40
        + dark_norm
        * 0.35
        + _normalize_signal(
            separator_continuity
        )
        * 0.25
    )

    separator_score = _moving_average(
        separator_score,
        7
    )

    return {
        "kind": "polar_annulus",
        "projection": projection,
        "radii": radii,
        "raw": activity,
        "smoothed": smoothed,
        "activity": activity,
        "texture": texture_signal,
        "texture_map": texture,
        "variance": variance_signal,
        "brightness": brightness_signal,
        "darkness": dark_signal,
        "separator_score": separator_score,
        "separator_continuity": separator_continuity,
        "normalized_polar": normalized_polar,
        "polar": polar
    }
