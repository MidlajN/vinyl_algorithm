import numpy as np


def build_tracks(
    playable,
    separators,
    ppm
):
    """
    Build track intervals.

    Track 1 starts at
    outer playable boundary.

    Track 2 starts at
    first separator.

    Last track ends at
    inner playable boundary.
    """

    outer_r = playable[
        "outer_playable_radius_px"
    ]

    inner_r = playable[
        "inner_playable_radius_px"
    ]

    # -------------------------
    # boundary list
    # descending (outer → inner)
    # -------------------------

    separator_radii = sorted(
        [
            s["radius_px"]
            for s in separators
        ],
        reverse=True
    )

    boundaries = [
        outer_r,
        *separator_radii,
        inner_r
    ]

    tracks = []

    for i in range(
        len(boundaries) - 1
    ):

        start_px = (
            boundaries[i]
        )

        end_px = (
            boundaries[i + 1]
        )

        width_px = (
            start_px - end_px
        )

        tracks.append({
            "track_number":
                i + 1,

            "start_radius_px":
                start_px,

            "end_radius_px":
                end_px,

            "start_radius_mm":
                start_px / ppm,

            "end_radius_mm":
                end_px / ppm,

            "width_px":
                width_px,

            "width_mm":
                width_px / ppm
        })

    return tracks