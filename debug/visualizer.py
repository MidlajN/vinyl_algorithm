import cv2 as cv
import matplotlib.pyplot as plt
import numpy as np


def _projected_ring_points(
    outer,
    radius_px,
    points=720
):
    (
        center,
        size,
        angle
    ) = outer[
        "ellipse"
    ]

    scale = (
        radius_px
        / outer[
            "radius_px"
        ]
    )

    rotation = np.deg2rad(
        angle
    )

    theta = np.linspace(
        0,
        2 * np.pi,
        points,
        endpoint=False
    )

    x = (
        size[0]
        * scale
        / 2.0
        * np.cos(theta)
    )

    y = (
        size[1]
        * scale
        / 2.0
        * np.sin(theta)
    )

    projected_x = (
        center[0]
        + x
        * np.cos(rotation)
        - y
        * np.sin(rotation)
    )

    projected_y = (
        center[1]
        + x
        * np.sin(rotation)
        + y
        * np.cos(rotation)
    )

    return np.round(
        np.stack(
            [
                projected_x,
                projected_y
            ],
            axis=1
        )
    ).astype(
        np.int32
    ).reshape(
        -1,
        1,
        2
    )


def _draw_projected_ring(
    image,
    outer,
    radius_px,
    color,
    thickness
):
    cv.polylines(
        image,
        [
            _projected_ring_points(
                outer,
                radius_px
            )
        ],
        True,
        color,
        thickness
    )


def visualize(
    image,
    outer,
    label,
    spindle,
    profile=None,
    boundaries=None
):
    debug = image.copy()

    # -------------------------
    # outer ellipse
    # -------------------------

    cv.ellipse(
        debug,
        outer["ellipse"],
        (0, 255, 0),
        4
    )

    # -------------------------
    # groove-derived label radius
    # -------------------------

    _draw_projected_ring(
        debug,
        outer,
        label["radius_px"],
        (255, 0, 0),
        4
    )

    _draw_projected_ring(
        debug,
        outer,
        boundaries[
            "inner_playable_radius_px"
        ],
        (255, 255, 0),
        3
    )

    # -------------------------
    # spindle
    # -------------------------

    cv.circle(
        debug,
        (
            spindle["x"],
            spindle["y"]
        ),
        8,
        (0, 0, 255),
        -1
    )

    # --------------------------
    # Outer playable
    # --------------------------

    if (
        "outer_playable_radius_px"
        in boundaries
    ):
        outer_playable = int(
            boundaries[
                "outer_playable_radius_px"
            ]
        )

        _draw_projected_ring(
            debug,
            outer,
            outer_playable,
            (
                255,
                255,
                0
            ),
            3
        )

    for separator in boundaries.get(
        "separators",
        []
    ):
        _draw_projected_ring(
            debug,
            outer,
            separator[
                "center_radius_px"
            ],
            (
                255,
                0,
                255
            ),
            2
        )

    cv.imwrite(
        "debug/geometry_result.jpg",
        debug
    )

    # -------------------------
    # layout
    # -------------------------

    if profile is None:

        plt.figure(
            figsize=(10, 10)
        )

        plt.title(
            "Profile Detection Failed"
        )


        plt.imshow(
            cv.cvtColor(
                debug,
                cv.COLOR_BGR2RGB
            )
        )

        plt.axis("off")
        plt.show()

        return

    # -------------------------
    # geometry + profile
    # -------------------------

    plt.figure(
        figsize=(16, 7)
    )

    # Geometry
    plt.subplot(1, 2, 1)

    plt.imshow(
        cv.cvtColor(
            debug,
            cv.COLOR_BGR2RGB
        )
    )

    plt.title(
        "Geometry Detection"
    )

    plt.axis("off")

    # Groove profile
    plt.subplot(1, 2, 2)

    plt.plot(
        profile["radii"],
        profile["smoothed"]
    )

    plt.axvline(
        label["radius_px"],
        color="red"
    )

    plt.axvline(
        boundaries["outer_playable_radius_px"],
        color="blue"
    )

    for separator in boundaries.get(
        "separators",
        []
    ):
        plt.axvspan(
            separator[
                "start_radius_px"
            ],
            separator[
                "end_radius_px"
            ],
            color="magenta",
            alpha=0.2
        )

    plt.title(
        "Radial Groove Profile"
    )

    plt.xlabel(
        "Radius (px)"
    )

    plt.ylabel(
        "Texture Energy"
    )

    plt.grid(True)

    plt.tight_layout()
    plt.show()
