import cv2 as cv
import numpy as np


def build_radial_energy_profile(
    gray,
    spindle,
    inner_radius_px,
    outer_radius_px,
    sample_count=720,
    band_width=3
):
    """
    Build groove energy profile.

    Measures groove texture energy
    for each radius around spindle.

    Higher energy:
        groove-dense region

    Lower energy:
        separator / dead wax
    """

    cx = spindle["x"]
    cy = spindle["y"]

    h, w = gray.shape[:2]

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

        samples = []

        # small radial band
        for dr in range(
            -band_width,
            band_width + 1
        ):

            rr = r + dr

            xs = (
                cx
                + rr * cosines
            ).astype(np.int32)

            ys = (
                cy
                + rr * sines
            ).astype(np.int32)

            valid = (
                (xs >= 0)
                & (xs < w)
                & (ys >= 0)
                & (ys < h)
            )

            values = gray[
                ys[valid],
                xs[valid]
            ]

            if len(values) == 0:
                continue

            samples.append(
                values
            )

        if len(samples) == 0:
            continue

        band_stack = np.stack(
            samples,
            axis=0
        )

        # average radial band
        ring = np.mean(
            band_stack,
            axis=0
        )

        # smooth slightly
        ring = cv.GaussianBlur(
            ring.reshape(1, -1),
            (1, 9),
            0
        ).flatten()

        # groove texture energy
        texture_energy = np.std(
            np.diff(ring)
        )

        radii.append(r)

        energy.append(
            texture_energy
        )

    return {
        "radii": np.array(
            radii
        ),
        "energy": np.array(
            energy
        )
    }

import cv2 as cv
import numpy as np


def detect_radial_boundary(
    image,
    center,
    expected_radius,
    search_percent=0.20,
    center_offset=12,
    sample_count=720,
    sample_offset=8,
    radius_step=2
):
    """
    Detect radial boundary using BOTH polarities.

    bright_to_dark:
        inside brighter
        outside darker

    dark_to_bright:
        inside darker
        outside brighter
    """

    def run_single_polarity(
        polarity
    ):

        cx0, cy0 = center

        h, w = image.shape[:2]

        min_radius = int(
            expected_radius
            * (
                1.0
                - search_percent
            )
        )

        max_radius = int(
            expected_radius
            * (
                1.0
                + search_percent
            )
        )

        angles = np.linspace(
            0,
            2 * np.pi,
            sample_count,
            endpoint=False
        )

        cosines = np.cos(
            angles
        ).astype(np.float32)

        sines = np.sin(
            angles
        ).astype(np.float32)

        best_score = -1e9
        best = None

        for dx in range(
            -center_offset,
            center_offset + 1
        ):

            for dy in range(
                -center_offset,
                center_offset + 1
            ):

                cx = cx0 + dx
                cy = cy0 + dy

                center_distance = np.hypot(
                    dx,
                    dy
                )

                center_penalty = (
                    center_distance
                    * 0.15
                )

                for r in range(
                    min_radius,
                    max_radius + 1,
                    radius_step
                ):

                    inner_r = (
                        r
                        - sample_offset
                    )

                    outer_r = (
                        r
                        + sample_offset
                    )

                    x1 = (
                        cx
                        + inner_r
                        * cosines
                    ).astype(np.int32)

                    y1 = (
                        cy
                        + inner_r
                        * sines
                    ).astype(np.int32)

                    x2 = (
                        cx
                        + outer_r
                        * cosines
                    ).astype(np.int32)

                    y2 = (
                        cy
                        + outer_r
                        * sines
                    ).astype(np.int32)

                    valid = (
                        (x1 >= 0)
                        & (x1 < w)
                        & (y1 >= 0)
                        & (y1 < h)
                        & (x2 >= 0)
                        & (x2 < w)
                        & (y2 >= 0)
                        & (y2 < h)
                    )

                    valid_count = (
                        np.count_nonzero(
                            valid
                        )
                    )

                    if (
                        valid_count
                        < sample_count * 0.8
                    ):
                        continue

                    valid_idx = np.where(
                        valid
                    )[0]

                    inner_values = image[
                        y1[valid],
                        x1[valid]
                    ]

                    outer_values = image[
                        y2[valid],
                        x2[valid]
                    ]

                    angles_valid = (
                        angles[
                            valid_idx
                        ]
                    )

                    inner_level = (
                        np.percentile(
                            inner_values,
                            30
                        )
                    )

                    outer_level = (
                        np.percentile(
                            outer_values,
                            70
                        )
                    )

                    transition = (
                        outer_level
                        - inner_level
                    )

                    left_mask = (
                        np.cos(
                            angles_valid
                        ) < 0
                    )

                    right_mask = (
                        np.cos(
                            angles_valid
                        ) >= 0
                    )

                    left_transition = (
                        np.mean(
                            outer_values[
                                left_mask
                            ]
                            -
                            inner_values[
                                left_mask
                            ]
                        )
                    )

                    right_transition = (
                        np.mean(
                            outer_values[
                                right_mask
                            ]
                            -
                            inner_values[
                                right_mask
                            ]
                        )
                    )

                    # -----------------
                    # polarity scoring
                    # -----------------

                    if polarity == (
                        "dark_to_bright"
                    ):

                        score = (
                            transition
                        )

                    else:

                        score = (
                            -transition
                        )

                    transition_std = (
                        np.std(
                            outer_values
                            -
                            inner_values
                        )
                    )

                    score -= (
                        transition_std
                        * 0.25
                    )

                    score -= (
                        center_penalty
                    )

                    if (
                        score
                        > best_score
                    ):

                        best_score = (
                            score
                        )

                        best = {

                            "polarity":
                                polarity,

                            "center":
                                (
                                    float(cx),
                                    float(cy)
                                ),

                            "radius_px":
                                float(r),

                            "score":
                                float(score),

                            "transition":
                                float(
                                    transition
                                ),

                            "left_transition":
                                float(
                                    left_transition
                                ),

                            "right_transition":
                                float(
                                    right_transition
                                )
                        }

        if best is None:

            raise RuntimeError(
                f"{polarity} failed"
            )

        return best

    # --------------------------------
    # run BOTH polarities
    # --------------------------------

    bright_to_dark = (
        run_single_polarity(
            "bright_to_dark"
        )
    )

    dark_to_bright = (
        run_single_polarity(
            "dark_to_bright"
        )
    )

    # --------------------------------
    # diagnostics
    # --------------------------------

    print(
        "\n--- BRIGHT TO DARK ---"
    )

    for k, v in (
        bright_to_dark.items()
    ):
        print(k, ":", v)

    print(
        "\n--- DARK TO BRIGHT ---"
    )

    for k, v in (
        dark_to_bright.items()
    ):
        print(k, ":", v)

    # --------------------------------
    # debug image helper
    # --------------------------------

    def save_debug(
        result,
        name
    ):

        debug = cv.cvtColor(
            image.copy(),
            cv.COLOR_GRAY2BGR
        )

        cx, cy = (
            result["center"]
        )

        r = (
            result["radius_px"]
        )

        for angle in np.linspace(
            0,
            2 * np.pi,
            72,
            endpoint=False
        ):

            x1 = int(
                cx
                + (
                    r
                    - sample_offset
                )
                * np.cos(angle)
            )

            y1 = int(
                cy
                + (
                    r
                    - sample_offset
                )
                * np.sin(angle)
            )

            x2 = int(
                cx
                + (
                    r
                    + sample_offset
                )
                * np.cos(angle)
            )

            y2 = int(
                cy
                + (
                    r
                    + sample_offset
                )
                * np.sin(angle)
            )

            cv.line(
                debug,
                (x1, y1),
                (x2, y2),
                (0,255,255),
                1
            )

        cv.circle(
            debug,
            (
                int(cx),
                int(cy)
            ),
            int(r),
            (255,255,0),
            2
        )

        cv.circle(
            debug,
            (
                int(cx),
                int(cy)
            ),
            4,
            (0,0,255),
            -1
        )

        cv.imwrite(
            f"debug/{name}.png",
            debug
        )

    save_debug(
        bright_to_dark,
        "boundary_bright_to_dark"
    )

    save_debug(
        dark_to_bright,
        "boundary_dark_to_bright"
    )

    return {
        "bright_to_dark":
            bright_to_dark,

        "dark_to_bright":
            dark_to_bright
    }