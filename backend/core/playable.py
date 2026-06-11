import cv2 as cv
import numpy as np

from scipy.ndimage import (
    gaussian_filter1d
)

from utils.debug import save_debug_image


def crop_playable_region(
    image,
    center,
    radius,
    margin=40
):
    """
    Crop disc region using OUTER center.

    This suppresses rim artifacts while
    preserving full disc geometry.

    Returns:
    - cropped image
    - local center
    - cropped radius
    - crop offset
    """

    cx, cy = center

    r = int(radius - margin)

    x0 = max(
        0,
        int(cx - r)
    )

    y0 = max(
        0,
        int(cy - r)
    )

    x1 = min(
        image.shape[1],
        int(cx + r)
    )

    y1 = min(
        image.shape[0],
        int(cy + r)
    )

    cropped = image[
        y0:y1,
        x0:x1
    ].copy()

    local_center = (
        cx - x0,
        cy - y0
    )

    # -------------------------
    # circular disc mask
    # -------------------------

    mask = np.zeros(
        cropped.shape[:2],
        dtype=np.uint8
    )

    cv.circle(
        mask,
        (
            int(local_center[0]),
            int(local_center[1])
        ),
        r,
        255,
        -1
    )

    cropped = cv.bitwise_and(
        cropped,
        cropped,
        mask=mask
    )

    return (
        cropped,
        local_center,
        r,
        (x0, y0)
    )


def sample_ring_intensity(
    image,
    center,
    radius,
    sample_count=720
):
    cx, cy = center

    angles = np.linspace(
        0,
        2 * np.pi,
        sample_count,
        endpoint=False
    )

    xs = (
        cx
        + radius
        * np.cos(angles)
    )

    ys = (
        cy
        + radius
        * np.sin(angles)
    )

    xs = np.clip(
        xs.astype(np.int32),
        0,
        image.shape[1] - 1
    )

    ys = np.clip(
        ys.astype(np.int32),
        0,
        image.shape[0] - 1
    )

    values = image[
        ys,
        xs
    ]

    return values


def build_radial_profile(
    image,
    center,
    r_start,
    r_end
):
    radii = np.arange(
        int(r_start),
        int(r_end)
    )

    profile = []

    for r in radii:

        samples = []

        # multi-ring stabilization
        for offset in range(-2, 3):

            ring = sample_ring_intensity(
                image,
                center,
                r + offset
            )

            samples.append(
                ring
            )

        ring = np.concatenate(
            samples
        )

        value = np.percentile(
            ring,
            35
        )

        profile.append(
            value
        )

    return {
        "radii": radii,
        "values": np.array(
            profile
        )
    }


def detect_playable_boundaries(
    normalized,
    spindle,
    label,
    outer,
    disc_center,
    debug=False
):
    """
    Detect playable groove boundaries.

    Crop:
        OUTER centered

    Groove sampling:
        SPINDLE centered
    """

    # =========================
    # crop using OUTER geometry
    # =========================

    (
        normalized,
        local_outer_center,
        cropped_outer_radius,
        crop_offset
    ) = crop_playable_region(
        normalized,
        disc_center,
        outer["radius_px"],
        margin=10
    )

    save_debug_image(debug, "10_playable_crop.png", normalized)

    x0, y0 = crop_offset

    # =========================
    # remap spindle into
    # cropped coordinates
    # =========================

    center = (
        spindle["x"] - x0,
        spindle["y"] - y0
    )

    outer_center = (
        local_outer_center[0],
        local_outer_center[1]
    )

    outer_cx, outer_cy = outer_center
    spindle_cx, spindle_cy = center

    # =========================
    # remap label radius
    # =========================

    label_radius = (
        label["radius_px"]
    )

    outer_radius = (
        cropped_outer_radius
    )

    # =========================
    # OUTER SEARCH
    # =========================

    outer_start = (
        outer_radius * 0.85
    )

    outer_end = (
        outer_radius * 0.97
    )

    outer_profile = (
        build_radial_profile(
            normalized,
            outer_center,
            outer_start,
            outer_end
        )
    )

    outer_smooth = (
        gaussian_filter1d(
            outer_profile[
                "values"
            ],
            sigma=1.5
        )
    )

    outer_grad = np.gradient(
        outer_smooth
    )

    threshold = (
        outer_grad.mean()
        + outer_grad.std()
    )

    candidates = np.where(
        outer_grad > threshold
    )[0]

    candidate_radii = (
        outer_profile[
            "radii"
        ][candidates]
    )

    # -------------------------
    # spacing filter
    # suppress nearby duplicates
    # -------------------------

    spacing_px = 15

    filtered_candidates = []

    last_radius = -1e9

    for r in candidate_radii:

        if (
            r - last_radius
            >= spacing_px
        ):

            filtered_candidates.append(
                r
            )

            last_radius = r

    filtered_candidates = np.array(
        filtered_candidates
    )

    # -------------------------
    # choose candidate
    # currently choose outermost
    # -------------------------

    if len(
        filtered_candidates
    ) == 0:

        outer_idx = np.argmin(
            outer_grad
        )

        outer_playable = (
            outer_profile[
                "radii"
            ][outer_idx]
        )

    else:

        outer_playable = (
            filtered_candidates[0]
        )

    # =========================
    # INNER SEARCH
    # =========================

    groove_span = (
        outer_radius
        - label_radius
    )

    inner_start = (
        label_radius + 5
    )

    inner_end = (
        label_radius
        + groove_span * 0.35
    )

    inner_profile = (
        build_radial_profile(
            normalized,
            center,
            inner_start,
            inner_end
        )
    )

    inner_smooth = (
        gaussian_filter1d(
            inner_profile[
                "values"
            ],
            sigma=1.5
        )
    )

    inner_grad = np.gradient(
        inner_smooth
    )

    inner_idx = np.argmin(
        inner_grad
    )

    inner_playable = (
        inner_profile[
            "radii"
        ][inner_idx]
    )

    result = {
        "outer_playable_radius_px":
            float(
                outer_playable
            ),

        "inner_playable_radius_px":
            float(
                inner_playable
            )
    }

    # =========================
    # DEBUG
    # =========================

    if debug:

        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        debug_img = cv.cvtColor(
            normalized,
            cv.COLOR_GRAY2BGR
        )

        # -------------------------
        # spindle center
        # -------------------------

        cv.circle(
            debug_img,
            (
                int(spindle_cx),
                int(spindle_cy)
            ),
            6,
            (0, 0, 255),
            -1
        )

        cv.putText(
            debug_img,
            "spindle",
            (
                int(spindle_cx) + 10,
                int(spindle_cy)
            ),
            cv.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 0, 255),
            1
        )

        # -------------------------
        # crop center
        # outer geometry center
        # -------------------------

        ocx, ocy = local_outer_center

        cv.circle(
            debug_img,
            (
                int(ocx),
                int(ocy)
            ),
            5,
            (255, 255, 255),
            -1
        )

        cv.putText(
            debug_img,
            "outer center",
            (
                int(ocx) + 10,
                int(ocy)
            ),
            cv.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1
        )

        # -------------------------
        # outer search region
        # -------------------------

        cv.circle(
            debug_img,
            (
                int(outer_cx),
                int(outer_cy)
            ),
            int(outer_start),
            (255, 255, 0),
            2
        )

        cv.putText(
            debug_img,
            "outer start",
            (
                int(outer_cx + outer_start),
                int(outer_cy)
            ),
            cv.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 0),
            1
        )

        cv.circle(
            debug_img,
            (
                int(outer_cx),
                int(outer_cy)
            ),
            int(outer_end),
            (0, 165, 255),
            2
        )

        cv.putText(
            debug_img,
            "outer end",
            (
                int(outer_cx + outer_end),
                int(outer_cy)
            ),
            cv.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 165, 255),
            1
        )

        # -------------------------
        # candidate radii
        # -------------------------

        for r in filtered_candidates:

            cv.circle(
                debug_img,
                (
                    int(outer_cx),
                    int(outer_cy)
                ),
                int(r),
                (80, 80, 80),
                1
            )

        # -------------------------
        # selected playable
        # -------------------------

        cv.circle(
            debug_img,
            (
                int(outer_cx),
                int(outer_cy)
            ),
            int(outer_playable),
            (0, 255, 255),
            3
        )

        cv.putText(
            debug_img,
            f"playable={outer_playable:.1f}",
            (
                int(outer_cx) + 10,
                int(outer_cy + 25)
            ),
            cv.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 255),
            2
        )

        # -------------------------
        # inner playable
        # -------------------------

        cv.circle(
            debug_img,
            (
                int(spindle_cx),
                int(spindle_cy)
            ),
            int(inner_playable),
            (255, 0, 0),
            2
        )

        cv.putText(
            debug_img,
            f"inner={inner_playable:.1f}",
            (
                int(spindle_cx) + 10,
                int(spindle_cy + 50)
            ),
            cv.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 0, 0),
            2
        )

        save_debug_image(debug, "11_playable_debug.png", debug_img)


        # -------------------------
        # plots
        # -------------------------

        fig, ax = plt.subplots(
            2,
            2,
            figsize=(16, 10)
        )

        # OUTER PROFILE
        ax[0, 0].plot(
            outer_profile["radii"],
            outer_profile["values"],
            alpha=0.3,
            label="raw"
        )

        ax[0, 0].plot(
            outer_profile["radii"],
            outer_smooth,
            linewidth=3,
            label="smooth"
        )

        ax[0, 0].axvline(
            outer_start,
            color="cyan",
            linestyle="--",
            label="start"
        )

        ax[0, 0].axvline(
            outer_end,
            color="orange",
            linestyle="--",
            label="end"
        )

        for r in filtered_candidates:
            ax[0, 0].axvline(
                r,
                color="gray",
                alpha=0.4
            )

        ax[0, 0].axvline(
            outer_playable,
            color="red",
            linewidth=3,
            label="selected"
        )

        ax[0, 0].set_title(
            "Outer Profile"
        )

        ax[0, 0].legend()

        # OUTER GRADIENT
        ax[0, 1].plot(
            outer_profile["radii"],
            outer_grad
        )

        ax[0, 1].axhline(
            threshold,
            color="purple",
            linestyle="--",
            label="threshold"
        )

        for r in filtered_candidates:
            ax[0, 1].axvline(
                r,
                color="gray",
                alpha=0.4
            )

        ax[0, 1].axvline(
            outer_playable,
            color="red",
            linewidth=3
        )

        ax[0, 1].set_title(
            "Outer Gradient"
        )

        ax[0, 1].legend()

        # INNER PROFILE
        ax[1, 0].plot(
            inner_profile["radii"],
            inner_profile["values"],
            alpha=0.3,
            label="raw"
        )

        ax[1, 0].plot(
            inner_profile["radii"],
            inner_smooth,
            linewidth=3,
            label="smooth"
        )

        ax[1, 0].axvline(
            inner_playable,
            color="red"
        )

        ax[1, 0].set_title(
            "Inner Profile"
        )

        ax[1, 0].legend()

        # INNER GRADIENT
        ax[1, 1].plot(
            inner_profile["radii"],
            inner_grad
        )

        ax[1, 1].axvline(
            inner_playable,
            color="red"
        )

        ax[1, 1].set_title(
            "Inner Gradient"
        )

        plt.tight_layout()
        plt.savefig(
            "debug/11_playable_profile.png",
            dpi=100,
            bbox_inches="tight"
        )
        plt.close()

    return result