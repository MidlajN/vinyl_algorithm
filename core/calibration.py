from config import (
    VINYL_RADIUS_MM
)


def pixels_per_mm(
    outer_radius_px
):
    return (
        outer_radius_px
        / VINYL_RADIUS_MM
    )