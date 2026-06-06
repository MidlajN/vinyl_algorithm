import numpy as np


def refine_geometry(
    outer,
    label
):
    """
    Refine geometry using
    label agreement.

    For now:
    - trust label center
    - estimate residual shift
    - estimate scale agreement
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
    # 100mm diameter
    # -------------------------

    expected_label_radius = (
        outer_radius
        * (
            50.0
            / 152.4
        )
    )

    # -------------------------
    # center error
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
    # refined center
    # trust label
    # -------------------------

    refined_x = (
        label_x
    )

    refined_y = (
        label_y
    )

    # -------------------------
    # scale estimate
    # diagnostic only
    # -------------------------

    scale_factor = (
        expected_label_radius
        /
        label_radius
    )

    confidence = max(
        0.0,
        1.0
        - (
            center_error_px
            / 15.0
        )
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

        "translation_dx":
            float(dx),

        "translation_dy":
            float(dy),

        "center_error_px":
            center_error_px,

        "geometry_confidence":
            float(
                confidence
            )
    }