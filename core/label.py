import cv2 as cv
import numpy as np


def detect_label_ring(
    gray,
    outer
):
    cx, cy = outer[
        "center"
    ]

    outer_radius = outer[
        "radius_px"
    ]

    # -------------------------
    # Expected geometry
    # -------------------------

    expected_ratio = (
        50.0 / 152.4
    )

    expected_radius = (
        outer_radius
        * expected_ratio
    )

    search_min = int(
        expected_radius
        * 0.75
    )

    search_max = int(
        expected_radius
        * 1.30
    )

    angles = np.linspace(
        0,
        2 * np.pi,
        720
    )

    scores = []
    radii = []

    # -------------------------
    # Radial transition scan
    # -------------------------

    for r in range(
        search_min,
        search_max
    ):

        outer_samples = []
        inner_samples = []

        for theta in angles:

            cos_t = np.cos(theta)
            sin_t = np.sin(theta)

            # sample slightly inside
            x1 = int(
                cx
                + (r - 8)
                * cos_t
            )

            y1 = int(
                cy
                + (r - 8)
                * sin_t
            )

            # sample slightly outside
            x2 = int(
                cx
                + (r + 8)
                * cos_t
            )

            y2 = int(
                cy
                + (r + 8)
                * sin_t
            )

            if (
                0 <= x1 < gray.shape[1]
                and
                0 <= y1 < gray.shape[0]
                and
                0 <= x2 < gray.shape[1]
                and
                0 <= y2 < gray.shape[0]
            ):

                inner_samples.append(
                    gray[
                        y1,
                        x1
                    ]
                )

                outer_samples.append(
                    gray[
                        y2,
                        x2
                    ]
                )

        if (
            len(inner_samples)
            < 100
        ):
            continue

        inner_mean = np.mean(
            inner_samples
        )

        outer_mean = np.mean(
            outer_samples
        )

        transition_strength = abs(
            outer_mean
            - inner_mean
        )

        scores.append(
            transition_strength
        )

        radii.append(r)

    if len(scores) == 0:
        raise RuntimeError(
            "Could not detect label"
        )

    scores = np.array(
        scores
    )

    scores = cv.GaussianBlur(
        scores.reshape(-1,1),
        (1,15),
        0
    ).flatten()

    best_idx = np.argmax(
        scores
    )

    best_radius = float(
        radii[
            best_idx
        ]
    )

    return {
        "center": (
            float(cx),
            float(cy)
        ),

        "radius_px":
            best_radius,

        "confidence":
            float(
                scores[
                    best_idx
                ]
            )
    }