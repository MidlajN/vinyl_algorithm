from core.radial_boundary import (
    detect_radial_boundary
)

def detect_label_ring(
    normalized,
    outer
):
    expected_radius = (
        outer[
            "radius_px"
        ]
        *
        (
            50.0
            / 152.4
        )
    )

    return detect_radial_boundary(
        image=normalized,
        center=outer["center"],
        expected_radius=expected_radius,
        search_percent=0.20,
        center_offset=15,
        polarity="dark_to_bright",
        sample_count=600,
        radius_step=2
    )