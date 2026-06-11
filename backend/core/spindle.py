import cv2 as cv
import numpy as np

from utils.debug import save_debug_image


def detect_spindle(
    image,
    refined_center,
    outer,
    search_offset=15,
    sample_count=180,
    sample_offset=3,
    debug=False
):
    """
    Fast + accurate spindle detector.

    Strategy:
    - local search around refined center
    - physically constrained radius
    - polarity agnostic
    - circular consistency scoring

    Returns:
    {
        "x": float,
        "y": float,
        "radius_px": float,
        "score": float
    }
    """

    if len(image.shape) == 3:

        gray = cv.cvtColor(
            image,
            cv.COLOR_BGR2GRAY
        )

    else:
        gray = image.copy()

    h, w = gray.shape[:2]

    cx0, cy0 = refined_center

    # -------------------------
    # expected spindle radius
    # -------------------------

    pixels_per_mm = (
        outer["radius_px"]
        / 152.4
    )

    expected_radius = (
        pixels_per_mm
        * 3.62
    )

    min_radius = max(
        3,
        int(expected_radius * 0.6)
    )

    max_radius = int(
        expected_radius * 1.4
    )

    # -------------------------
    # local normalize
    # suppress label texture
    # -------------------------

    # blur = cv.GaussianBlur(
    #     gray,
    #     (0, 0),
    #     sigmaX=5
    # )

    # normalized = cv.normalize(
    #     cv.absdiff(
    #         blur,
    #         gray
    #     ),
    #     None,
    #     0,
    #     255,
    #     cv.NORM_MINMAX
    # )

    normalized = gray

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
    # local center search
    # -------------------------

    for dx in range(
        -search_offset,
        search_offset + 1
    ):

        for dy in range(
            -search_offset,
            search_offset + 1
        ):

            cx = cx0 + dx
            cy = cy0 + dy

            center_penalty = (
                np.hypot(dx, dy)
                * 0.15
            )

            for r in range(
                min_radius,
                max_radius + 1
            ):

                inner_r = (
                    r
                    - sample_offset
                )

                outer_r = (
                    r
                    + sample_offset
                )

                if inner_r <= 0:
                    continue

                # -------------------------
                # sample ring
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

                if (
                    np.count_nonzero(
                        valid
                    )
                    <
                    sample_count * 0.9
                ):
                    continue

                inner_values = normalized[
                    y1[valid],
                    x1[valid]
                ]

                outer_values = normalized[
                    y2[valid],
                    x2[valid]
                ]

                transition = (
                    np.mean(
                        outer_values
                    )
                    -
                    np.mean(
                        inner_values
                    )
                )

                # -------------------------
                # polarity agnostic
                # -------------------------

                strength = abs(
                    transition
                )

                radius_penalty = (
                    abs(
                        r
                        - expected_radius
                    )
                    * 0.35
                )

                # -------------------------
                # circular consistency
                # -------------------------

                consistency_penalty = (
                    np.std(
                        outer_values
                        -
                        inner_values
                    )
                    * 0.35
                )

                score = (
                    strength
                    - consistency_penalty
                    - center_penalty
                    - radius_penalty
                )

                if score > best_score:

                    # print(
                    #     "\nNEW BEST"
                    # )

                    # print(
                    #     "center:",
                    #     (cx, cy)
                    # )

                    # print(
                    #     "radius:",
                    #     r
                    # )

                    # print(
                    #     "transition:",
                    #     strength
                    # )

                    # print(
                    #     "consistency_penalty:",
                    #     consistency_penalty
                    # )

                    # print(
                    #     "center_penalty:",
                    #     center_penalty
                    # )

                    # print(
                    #     "radius_penalty:",
                    #     radius_penalty
                    # )

                    # print(
                    #     "score:",
                    #     score
                    # )

                    best_score = score

                    best = {
                        "x":
                            float(cx),

                        "y":
                            float(cy),

                        "radius_px":
                            float(r),

                        "score":
                            float(score)
                    }

    if best is None:

        raise RuntimeError(
            "Spindle detection failed"
        )

    debug_img = cv.cvtColor(
        gray.copy(),
        cv.COLOR_GRAY2BGR
    )

    cx = best["x"]
    cy = best["y"]
    r = best["radius_px"]

    angles_debug = np.linspace(
        0,
        2 * np.pi,
        72,
        endpoint=False
    )

    for theta in angles_debug:

        x1 = int(
            cx
            + (r - sample_offset)
            * np.cos(theta)
        )

        y1 = int(
            cy
            + (r - sample_offset)
            * np.sin(theta)
        )

        x2 = int(
            cx
            + (r + sample_offset)
            * np.cos(theta)
        )

        y2 = int(
            cy
            + (r + sample_offset)
            * np.sin(theta)
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
        int(r),
        (0,255,0),
        2
    )

    cv.circle(
        debug_img,
        (
            int(cx),
            int(cy)
        ),
        3,
        (0,0,255),
        -1
    )

    save_debug_image(debug, "08_spindle_debug.png", debug_img)

    return best