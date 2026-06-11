import cv2 as cv
import numpy as np

from scipy.ndimage import (
    gaussian_filter1d
)

from scipy.signal import (
    find_peaks,
    peak_widths
)


def detect_track_separators(
    profile,
    playable,
    ppm,
    smoothing_sigma=2.0,
    min_prominence=2.0,
    min_distance_mm=8.0,
    min_width_mm=0.5,
    max_width_mm=8.0,
    ignore_edge_mm=6.0,
    debug=False
):
    """
    Detect separator bands between songs.

    Separator assumptions:
    - brighter than grooves
    - locally prominent
    - finite width
    - physically spaced

    Returns:
        metadata-rich separator list
    """

    radii = profile["radii"]
    energy = profile["energy"]

    # ==================================
    # smoothing
    # ==================================

    signal = gaussian_filter1d(
        energy,
        sigma=smoothing_sigma
    )

    # ==================================
    # playable limits
    # ignore lead-in + deadwax
    # ==================================

    inner_limit = (
        playable[
            "inner_playable_radius_px"
        ]
        + ignore_edge_mm * ppm
    )

    outer_limit = (
        playable[
            "outer_playable_radius_px"
        ]
        - ignore_edge_mm * ppm
    )

    # ==================================
    # physical constraints
    # ==================================

    min_distance_px = (
        min_distance_mm
        * ppm
    )

    min_width_px = (
        min_width_mm
        * ppm
    )

    max_width_px = (
        max_width_mm
        * ppm
    )

    # ==================================
    # peak detection
    # brighter = separator
    # ==================================

    peaks, properties = (
        find_peaks(
            signal,
            prominence=min_prominence,
            distance=min_distance_px
        )
    )

    # ==================================
    # peak widths
    # ==================================

    widths, _, left_ips, right_ips = (
        peak_widths(
            signal,
            peaks,
            rel_height=0.5
        )
    )

    separators = []

    # ==================================
    # build metadata
    # ==================================

    for i, peak_idx in enumerate(
        peaks
    ):

        radius_px = (
            radii[
                peak_idx
            ]
        )

        # -------------------------
        # playable filtering
        # -------------------------

        if (
            radius_px
            < inner_limit
        ):
            continue

        if (
            radius_px
            > outer_limit
        ):
            continue

        width_px = (
            widths[i]
        )

        # -------------------------
        # width filtering
        # -------------------------

        if (
            width_px
            < min_width_px
        ):
            continue

        if (
            width_px
            > max_width_px
        ):
            continue

        prominence = (
            properties[
                "prominences"
            ][i]
        )

        radius_mm = (
            radius_px
            / ppm
        )

        width_mm = (
            width_px
            / ppm
        )

        score = (
            prominence
            / (
                width_mm
                + 1e-6
            )
        )

        separators.append({

            "radius_px":
                float(
                    radius_px
                ),

            "radius_mm":
                float(
                    radius_mm
                ),

            "energy":
                float(
                    signal[
                        peak_idx
                    ]
                ),

            "prominence":
                float(
                    prominence
                ),

            "width_px":
                float(
                    width_px
                ),

            "width_mm":
                float(
                    width_mm
                ),

            "score":
                float(
                    score
                ),

            "left_px":
                float(
                    radii[
                        int(
                            max(
                                0,
                                left_ips[i]
                            )
                        )
                    ]
                ),

            "right_px":
                float(
                    radii[
                        int(
                            min(
                                len(
                                    radii
                                ) - 1,
                                right_ips[i]
                            )
                        )
                    ]
                )
        })

    # ==================================
    # sort inner → outer
    # ==================================

    separators = sorted(
        separators,
        key=lambda x:
        x["radius_px"]
    )

    # ==================================
    # debug
    # ==================================

    if debug:

        import matplotlib.pyplot as plt

        plt.figure(
            figsize=(16, 6)
        )

        plt.plot(
            radii,
            energy,
            alpha=0.3,
            label="raw"
        )

        plt.plot(
            radii,
            signal,
            linewidth=3,
            label="smoothed"
        )

        # playable limits

        plt.axvline(
            inner_limit,
            color="blue",
            linestyle="--",
            label="usable start"
        )

        plt.axvline(
            outer_limit,
            color="orange",
            linestyle="--",
            label="usable end"
        )

        # peaks

        for s in separators:

            plt.axvline(
                s[
                    "radius_px"
                ],
                color="green",
                alpha=0.7
            )

            plt.text(
                s[
                    "radius_px"
                ],
                s[
                    "energy"
                ] + 0.5,
                f'{s["radius_mm"]:.1f}mm',
                rotation=90,
                fontsize=8
            )

        plt.title(
            "Track Separator Detection"
        )

        plt.xlabel(
            "Radius (px)"
        )

        plt.ylabel(
            "Texture Energy"
        )

        plt.legend()

        plt.tight_layout()
        plt.show()

    return {
        "count":
            len(
                separators
            ),

        "separators":
            separators
    }