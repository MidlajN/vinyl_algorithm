import cv2 as cv
import numpy as np

from utils.debug import save_debug_image


def detect_radial_boundary(
    image,
    center,
    expected_radius,
    search_percent=0.20,
    center_offset=12,
    polarity="bright_to_dark",
    sample_count=720,
    sample_offset=8,
    radius_step=2,
    debug=False
):
    """
    Fast radial boundary detector.

    polarity:

    bright_to_dark:
        inside brighter
        outside darker

    dark_to_bright:
        inside darker
        outside brighter
    """

    cx0, cy0 = center

    h, w = image.shape[:2]

    # -------------------------
    # radius search range
    # -------------------------

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

    # -------------------------
    # precompute trig
    # -------------------------

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

    # -------------------------
    # center search
    # -------------------------

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

            # -------------------------
            # radius search
            # -------------------------

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

                # -------------------------
                # vectorized coordinates
                # -------------------------

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

                # -------------------------
                # bounds mask
                # -------------------------

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

                valid_count = np.count_nonzero(
                    valid
                )

                if (
                    valid_count
                    < sample_count * 0.8
                ):
                    continue

                # -------------------------
                # sample pixels
                # -------------------------

                # inner_values = image[
                #     y1[valid],
                #     x1[valid]
                # ]

                # outer_values = image[
                #     y2[valid],
                #     x2[valid]
                # ]

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
                    angles[valid_idx]
                )

                # -------------------------
                # robust intensity levels
                # -------------------------

                inner_level = np.percentile(
                    inner_values,
                    30
                )

                outer_level = np.percentile(
                    outer_values,
                    70
                )

                transition = (
                    outer_level
                    - inner_level
                )

                # -------------------------
                # polarity scoring
                # -------------------------

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

                left_transition = np.mean(
                    outer_values[
                        left_mask
                    ]
                    -
                    inner_values[
                        left_mask
                    ]
                )

                right_transition = np.mean(
                    outer_values[
                        right_mask
                    ]
                    -
                    inner_values[
                        right_mask
                    ]
                )

                if polarity == (
                    "dark_to_bright"
                ):

                    score = (
                        transition
                    )

                elif polarity == (
                    "bright_to_dark"
                ):

                    score = (
                        -transition
                    )

                else:

                    raise ValueError(
                        "invalid polarity"
                    )

                # -------------------------
                # robustness
                # -------------------------

                transition_std = np.std(
                    outer_values
                    - inner_values
                )

                score -= (
                    transition_std
                    * 0.25
                )

                # -------------------------
                # center penalty
                # -------------------------

                score -= (
                    center_penalty
                )

                # -------------------------
                # best candidate
                # -------------------------

                if (
                    score
                    > best_score
                ):

                    best_score = (
                        score
                    )

                    best = {

                        "center": (
                            float(cx),
                            float(cy)
                        ),

                        "radius_px":
                            float(r),

                        "score":
                            float(score),
                        
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
            "Boundary detection failed"
        )
    
    print(
        "\nBoundary diagnostics"
    )

    print(
        "left transition:",
        best[
            "left_transition"
        ]
    )

    print(
        "right transition:",
        best[
            "right_transition"
        ]
    )

    debug_img = cv.cvtColor(
        image.copy(),
        cv.COLOR_GRAY2BGR
    )

    cx, cy = best["center"]
    r = best["radius_px"]

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
            debug_img,
            (x1, y1),
            (x2, y2),
            (0,255,255),
            1
        )

    cv.circle(
        debug_img,
        (
            int(cx),
            int(cy)
        ),
        4,
        (0,0,255),
        -1
    )

    cv.circle(
        debug_img,
        (
            int(cx),
            int(cy)
        ),
        int(r),
        (255,255,0),
        2
    )

    save_debug_image(debug, "09_label_boundary_debug.png", debug_img)

    return best