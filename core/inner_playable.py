from core.radial_boundary import (
    detect_radial_boundary
)
import cv

def detect_inner_playable(
    normalized,
    geometry
):
    pixels_per_mm = (
        geometry[
            "pixels_per_mm"
        ]
    )

    expected_mm = 68

    expected_radius = (
        expected_mm
        * pixels_per_mm
    )

    radial_boundary = detect_radial_boundary(
        image=normalized,

        center=(
            geometry[
                "center_x"
            ],
            geometry[
                "center_y"
            ]
        ),

        expected_radius=
            expected_radius,

        search_percent=0.25,

        center_offset=10,

        polarity=
            "dark_to_bright"
    )

    return radial_boundary