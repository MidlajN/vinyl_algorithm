from core.calibration import (
    pixels_per_mm
)

from core.confidence import (
    geometry_confidence
)


def build_geometry(
    spindle,
    outer,
    label,
    boundaries
):
    ppm = pixels_per_mm(
        outer["radius_px"]
    )

    confidence = (
        geometry_confidence(
            spindle,
            outer,
            label
        )
    )

    return {
        "center_x":
            spindle["x"],

        "center_y":
            spindle["y"],

        "outer_radius_px":
            outer["radius_px"],

        "outer_playable_radius_px":
            boundaries[
                "outer_playable_radius_px"
            ],

        "inner_playable_radius_px":
            boundaries[
                "inner_playable_radius_px"
            ],

        "label_radius_px":
            boundaries[
                "label_radius_px"
            ],

        "pixels_per_mm":
            ppm,

        "geometry_confidence":
            confidence
    }