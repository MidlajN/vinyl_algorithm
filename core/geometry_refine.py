import numpy as np


def refine_geometry(
    outer,
    label
):
    """
    Refine vinyl geometry using
    detected label ring.

    Returns:
    - refined center
    - corrected scale
    - spindle estimate
    - confidence metrics
    """

    outer_x, outer_y = (
        outer["center"]
    )

    label_x, label_y = (
        label["center"]
    )

    outer_radius = (
        outer["radius_px"]
    )

    label_radius = (
        label["radius_px"]
    )

    # -------------------------
    # expected label radius
    # -------------------------

    expected_label_radius = (
        outer_radius
        *
        (
            50.0
            / 152.4
        )
    )

    # -------------------------
    # center agreement
    # -------------------------

    dx = (
        label_x
        - outer_x
    )

    dy = (
        label_y
        - outer_y
    )

    center_error_px = float(
        np.sqrt(
            dx**2
            + dy**2
        )
    )

    # -------------------------
    # weighted center
    # -------------------------

    refined_x = (
        outer_x * 0.75
        +
        label_x * 0.25
    )

    refined_y = (
        outer_y * 0.75
        +
        label_y * 0.25
    )

    # -------------------------
    # scale correction
    # -------------------------

    scale_factor = (
        expected_label_radius
        /
        label_radius
    )

    scale_error = abs(
        1.0
        - scale_factor
    )

    # -------------------------
    # geometry confidence
    # -------------------------

    center_score = max(
        0.0,
        1.0
        - (
            center_error_px
            / 15.0
        )
    )

    scale_score = max(
        0.0,
        1.0
        - (
            scale_error
            / 0.08
        )
    )

    confidence = (
        center_score
        * 0.6
        +
        scale_score
        * 0.4
    )

    return {
        "center_x":
            float(
                refined_x
            ),

        "center_y":
            float(
                refined_y
            ),

        "spindle_x":
            float(
                refined_x
            ),

        "spindle_y":
            float(
                refined_y
            ),

        "expected_label_radius_px":
            float(
                expected_label_radius
            ),

        "detected_label_radius_px":
            float(
                label_radius
            ),

        "scale_factor":
            float(
                scale_factor
            ),

        "center_error_px":
            center_error_px,

        "geometry_confidence":
            float(
                confidence
            )
    }