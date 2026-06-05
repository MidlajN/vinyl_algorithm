import cv2 as cv
import numpy as np


def detect_radial_boundary(
    image,
    center,
    expected_radius,
    search_percent=0.20,
    center_offset=12,
    polarity="bright_to_dark",
    sample_count=720,
    sample_offset=8
):
    """
    Detect circular vinyl boundaries
    using radial transition scoring.

    polarity:

    bright_to_dark:
        inside brighter
        outside darker

    dark_to_bright:
        inside darker
        outside brighter
    """

    cx0, cy0 = center

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

    best_score = -1e9
    best = None

    h, w = image.shape

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

            for r in range(
                min_radius,
                max_radius + 1
            ):

                inner_values = []
                outer_values = []

                for theta in angles:

                    cos_t = np.cos(
                        theta
                    )

                    sin_t = np.sin(
                        theta
                    )

                    # ------------------
                    # inside sample
                    # ------------------

                    x1 = int(
                        cx
                        + (
                            r
                            - sample_offset
                        )
                        * cos_t
                    )

                    y1 = int(
                        cy
                        + (
                            r
                            - sample_offset
                        )
                        * sin_t
                    )

                    # ------------------
                    # outside sample
                    # ------------------

                    x2 = int(
                        cx
                        + (
                            r
                            + sample_offset
                        )
                        * cos_t
                    )

                    y2 = int(
                        cy
                        + (
                            r
                            + sample_offset
                        )
                        * sin_t
                    )

                    if (
                        0 <= x1 < w
                        and
                        0 <= y1 < h
                        and
                        0 <= x2 < w
                        and
                        0 <= y2 < h
                    ):

                        inner_values.append(
                            image[
                                y1,
                                x1
                            ]
                        )

                        outer_values.append(
                            image[
                                y2,
                                x2
                            ]
                        )

                if (
                    len(inner_values)
                    < sample_count
                    * 0.8
                ):
                    continue

                inner_values = np.array(
                    inner_values
                )

                outer_values = np.array(
                    outer_values
                )

                # inner_mean = np.mean(
                #     inner_values
                # )

                # outer_mean = np.mean(
                #     outer_values
                # )

                # transition = (
                #     outer_mean
                #     - inner_mean
                # )
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

                # ------------------
                # polarity
                # ------------------

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

                # ------------------
                # robustness
                # ------------------

                transition_std = np.std(
                    outer_values
                    - inner_values
                )

                score -= (
                    transition_std
                    * 0.25
                )

                # slight preference
                # to expected radius

                # radius_penalty = (
                #     abs(
                #         r
                #         - expected_radius
                #     )
                #     * 0.10
                # )

                # score -= (
                #     radius_penalty
                # )
                
                center_distance = np.hypot(
                    dx,
                    dy
                )

                center_penalty = (
                    center_distance
                    * 0.15
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
                        "center": (
                            float(cx),
                            float(cy)
                        ),

                        "radius_px":
                            float(r),

                        "score":
                            float(score)
                    }

    if best is None:
        raise RuntimeError(
            "Boundary detection failed"
        )

    return best