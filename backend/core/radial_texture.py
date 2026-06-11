import numpy as np


def build_radial_texture_profile(
    image,
    spindle,
    inner_radius_px,
    outer_radius_px,
    sample_count=720,
    band_half_width=2
):
    """
    Separator-oriented profile.

    Measures circumferential
    variation of groove regime.

    Goal:
        groove region -> high
        separator -> low
    """

    cx = spindle["x"]
    cy = spindle["y"]

    h, w = image.shape[:2]

    angles = np.linspace(
        0,
        2 * np.pi,
        sample_count,
        endpoint=False
    )

    cosines = np.cos(
        angles
    )

    sines = np.sin(
        angles
    )

    radii = []
    energy = []

    for r in range(
        int(inner_radius_px),
        int(outer_radius_px)
    ):

        band_values = []

        for offset in range(
            -band_half_width,
            band_half_width + 1
        ):

            rr = r + offset

            x = (
                cx
                + rr * cosines
            ).astype(np.int32)

            y = (
                cy
                + rr * sines
            ).astype(np.int32)

            valid = (
                (x >= 0)
                & (x < w)
                & (y >= 0)
                & (y < h)
            )

            values = image[
                y[valid],
                x[valid]
            ]

            band_values.append(
                values
            )

        band_values = np.concatenate(
            band_values
        )

        # separator metric
        ring_variation = np.std(
            band_values
        )

        radii.append(r)

        energy.append(
            ring_variation
        )

    return {
        "radii": np.array(
            radii
        ),
        "energy": np.array(
            energy
        )
    }