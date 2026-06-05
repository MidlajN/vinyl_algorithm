import cv2 as cv
import matplotlib.pyplot as plt


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

    cv.circle(
        debug,
        (
            spindle["x"],
            spindle["y"]
        ),
        int(
            label["radius_px"]
        ),
        (255, 0, 0),
        4
    )

    cv.circle(
        debug,
        (
            spindle["x"],
            spindle["y"]
        ),
        int(
            boundaries[
                "inner_playable_radius_px"
            ]
        ),
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

        cv.circle(
            debug,
            (
                int(
                    spindle[
                        "x"
                    ]
                ),
                int(
                    spindle[
                        "y"
                    ]
                )
            ),
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
        cv.circle(
            debug,
            (
                int(
                    spindle[
                        "x"
                    ]
                ),
                int(
                    spindle[
                        "y"
                    ]
                )
            ),
            int(
                separator[
                    "center_radius_px"
                ]
            ),
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
