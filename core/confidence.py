import numpy as np


def geometry_confidence(
    spindle,
    outer,
    label
):
    (
        (ox, oy),
        (ow, oh),
        oa
    ) = outer["ellipse"]

    outer_radius = (
        outer["radius_px"]
    )

    # -------------------------
    # spindle alignment
    # -------------------------

    spindle_error = np.sqrt(
        (
            spindle["x"] - ox
        ) ** 2
        +
        (
            spindle["y"] - oy
        ) ** 2
    )

    spindle_error_pct = (
        spindle_error
        / outer_radius
    )

    # -------------------------
    # ellipse circularity
    # -------------------------

    ellipse_ratio = min(
        ow,
        oh
    ) / max(
        ow,
        oh
    )

    # -------------------------
    # label sanity
    # -------------------------

    label_ratio = (
        label["radius_px"]
        / outer_radius
    )

    # expected:
    # label roughly 20–45%
    label_validity = 1.0

    if label_ratio < 0.18:
        label_validity = 0.5

    elif label_ratio > 0.50:
        label_validity = 0.5

    # -------------------------
    # score
    # -------------------------

    score = 1.0

    # tolerate spindle drift
    score -= min(
        spindle_error_pct * 2,
        0.15
    )

    # penalize tilted ellipse
    score -= (
        1.0
        - ellipse_ratio
    ) * 0.25

    # label sanity
    score *= label_validity

    return float(
        round(
            max(score, 0),
            3
        )
    )