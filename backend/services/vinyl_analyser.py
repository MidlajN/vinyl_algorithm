import cv2 as cv
import numpy as np

from config import (
    IMAGE_PATH
)

from core.preprocess import (
    preprocess
)

from core.spindle import (
    detect_spindle
)

from core.ellipse import (
    detect_outer_ellipse,
)


from core.rectify import (
    rectify_disc
)

from core.label import (
    detect_label_ring
)

from core.vinyl_normalize import (
    normalize_vinyl
)

from core.geometry_refine import (
    refine_geometry
)

def crop_to_disc(
    image,
    outer,
    margin=10
):
    """
    Crop tightly around disc
    and remove outside area.

    Returns:
    - cropped image
    - updated outer geometry
    """

    cx, cy = outer["center"]

    r = int(
        outer["radius_px"]
    )

    # -------------------------
    # bounding crop
    # -------------------------

    x0 = max(
        0,
        int(cx - r - margin)
    )

    y0 = max(
        0,
        int(cy - r - margin)
    )

    x1 = min(
        image.shape[1],
        int(cx + r + margin)
    )

    y1 = min(
        image.shape[0],
        int(cy + r + margin)
    )

    cropped = image[
        y0:y1,
        x0:x1
    ].copy()

    # -------------------------
    # local center
    # -------------------------

    local_cx = (
        cx - x0
    )

    local_cy = (
        cy - y0
    )

    # -------------------------
    # disc mask
    # -------------------------

    mask = np.zeros(
        cropped.shape[:2],
        dtype=np.uint8
    )

    cv.circle(
        mask,
        (
            int(local_cx),
            int(local_cy)
        ),
        int(r + margin),
        255,
        -1
    )

    cropped = cv.bitwise_and(
        cropped,
        cropped,
        mask=mask
    )

    # -------------------------
    # updated geometry
    # -------------------------

    cropped_outer = outer.copy()

    cropped_outer[
        "center"
    ] = (
        float(local_cx),
        float(local_cy)
    )

    return (
        cropped,
        cropped_outer
    )

def analyse_vinyl(image_path: str):

    image = cv.imread(image_path)

    if image is None:
        return {
            "success": False,
            "error": "Image not found"
        }

    gray, blur = preprocess(image)

    outer = (
        detect_outer_ellipse(
            gray
        )
    )

    cropped, outer = (
        crop_to_disc(
            image, 
            outer,
            margin=20
        )
    )

    rectified = rectify_disc(
        cropped,
        outer
    )

    gray_rectified, blur = preprocess(
        rectified
    )

    # -------------------------
    # refresh geometry
    # rectification changed center
    # -------------------------

    outer = detect_outer_ellipse(
        gray_rectified
    )

    print(
        "\n--- RECTIFIED GEOMETRY ---"
    )

    print(
        "rectified center:",
        outer["center"]
    )

    normalized = normalize_vinyl(
        rectified,
        outer
    )

    # -------------------------
    # update center after crop
    # rectified disc should
    # remain centered
    # -------------------------


    label = detect_label_ring(
        normalized,
        outer
    )

    refined = refine_geometry(
        outer,
        label
    )

    from core.refine_rectify import (
        refine_rectification
    )

    micro_rectified = (
        refine_rectification(
            rectified,
            outer,
            refined
        )
    )

    gray_micro, _ = preprocess(
        micro_rectified
    )

    micro_outer = (
        detect_outer_ellipse(
            gray_micro
        )
    )

    # -------------------------
    # keep stable center
    # use only outer radius
    # -------------------------

    outer["radius_px"] = (
        micro_outer[
            "radius_px"
        ]
    )

    outer["center"] = (
        micro_outer["center"]
    )

    outer[
        "major_radius_px"
    ] = (
        micro_outer[
            "major_radius_px"
        ]
    )

    outer[
        "minor_radius_px"
    ] = (
        micro_outer[
            "minor_radius_px"
        ]
    )

    spindle = detect_spindle(
        micro_rectified,
        (
            refined["center_x"],
            refined["center_y"]
        ),
        outer
    )

    # -------------------------
    # preserve true disc center
    # before spindle correction
    # -------------------------

    true_disc_center = (
        outer["center"][0],
        outer["center"][1]
    )

    # -------------------------
    # canonical center
    # spindle is truth
    # -------------------------

    outer["center"] = (
        true_disc_center
    )

    normalized = normalize_vinyl(
        micro_rectified,
        outer
    )

    label = detect_label_ring(
        normalized,
        outer
    )

    refined = refine_geometry(
        outer,
        label
    )

    disc_center = true_disc_center

    refined_center = (
        refined["center_x"],
        refined["center_y"]
    )

    spindle_center = (
        spindle["x"],
        spindle["y"]
    )

    label_center = (
        label["center"][0],
        label["center"][1]
    )

    # -------------------------
    # geometry diagnostics
    # -------------------------

    outer_cx, outer_cy = (
        disc_center
    )

    label_cx, label_cy = (
        label_center
    )

    spindle_x, spindle_y = (
        spindle_center
    )
    refined_x, refined_y = (
        refined_center
    )

    print("\n--- GEOMETRY DIAGNOSTICS ---")

    print(
        f"Outer center   : "
        f"({outer_cx:.2f}, "
        f"{outer_cy:.2f})"
    )

    print(
        f"Refined center : "
        f"({refined_x:.2f}, "
        f"{refined_y:.2f})"
    )

    print(
        f"Label center   : "
        f"({label_cx:.2f}, "
        f"{label_cy:.2f})"
    )

    print(
        f"Spindle center : "
        f"({spindle_x:.2f}, "
        f"{spindle_y:.2f})"
    )

    ppm = (
        outer["radius_px"]
        / 152.4
    )

    mm_per_px = (
        1.0 / ppm
    )

    print("\n--- PHYSICAL SCALE ---")

    print(
        f"Outer radius : "
        f"{outer['radius_px']:.2f}px"
    )

    print(
        f"Pixels/mm    : "
        f"{ppm:.3f}"
    )

    print(
        f"mm/pixel     : "
        f"{mm_per_px:.4f}"
    )

    # -------------------------
    # center deltas
    # -------------------------

    def center_distance(
        p1,
        p2
    ):
        return np.sqrt(
            (p1[0] - p2[0])**2
            +
            (p1[1] - p2[1])**2
        )

    outer_vs_spindle = (
        center_distance(
            (outer_cx, outer_cy),
            (spindle_x, spindle_y)
        )
    )

    outer_vs_label = (
        center_distance(
            (outer_cx, outer_cy),
            (label_cx, label_cy)
        )
    )

    spindle_vs_label = (
        center_distance(
            (spindle_x, spindle_y),
            (label_cx, label_cy)
        )
    )

    refined_vs_spindle = (
        center_distance(
            (
                refined_x,
                refined_y
            ),
            (
                spindle_x,
                spindle_y
            )
        )
    )

    print(
        f"\nOuter ↔ Spindle : "
        f"{outer_vs_spindle:.2f}px"
    )

    print(
        f"Outer ↔ Label   : "
        f"{outer_vs_label:.2f}px"
    )

    print(
        f"Spindle ↔ Label : "
        f"{spindle_vs_label:.2f}px"
    )

    print(
        f"Refined ↔ Spindle : "
        f"{refined_vs_spindle:.2f}px"
    )


    from core.playable import (
        detect_playable_boundaries
    )

    playable = (
        detect_playable_boundaries(
            normalized,
            spindle,
            label,
            outer,
            disc_center,
            debug=False
        ) 
    )

    print("\n--- PLAYABLE ---")

    print(
        f"Outer Playable Radius : "
        f"{playable['outer_playable_radius_px']:.2f}px"
    )

    print(
        f"Inner Playable Radius : "
        f"{playable['inner_playable_radius_px']:.3f}px"
    )


    from core.radial_texture import (
        build_radial_texture_profile
    )

    from core.separator_detection import (
        detect_track_separators
    )

    # =====================================
    # build texture profile
    # grooves only
    # =====================================

    profile = (
        build_radial_texture_profile(
            normalized,
            spindle,
            playable[
                "inner_playable_radius_px"
            ],
            playable[
                "outer_playable_radius_px"
            ]
        )
    )

    # =====================================
    # separator detection
    # =====================================

    separator_result = (
        detect_track_separators(
            profile=profile,
            playable=playable,
            ppm=ppm,

            smoothing_sigma=2.0,

            min_prominence=2.0,

            min_distance_mm=8.0,

            min_width_mm=0.5,
            max_width_mm=6.0,

            ignore_edge_mm=6.0,

            debug=False
        )
    )

    print('Seperator : ', separator_result)

    separators = (
        separator_result[
            "separators"
        ]
    )

    from core.tracks import ( 
        build_tracks 
        )
    
    tracks = build_tracks(
        playable=playable,
        separators=separators,
        ppm=ppm
    )

    from core.tonearm import ( calculate_servo_angle )

    from config import (
        PIVOT_TO_SPINDLE_MM,
        ARM_LENGTH_MM,
        SERVO_ZERO_OFFSET_DEG
    )

    print(
        "\n--- TRACKS ---"
    )

    print(
        f"Detected Tracks: "
        f"{len(tracks)}"
    )

    for track in tracks:

        print(
            f"\nTrack "
            f"{track['track_number']}"
        )

        print(
            f"start px : "
            f"{track['start_radius_px']:.2f}"
        )

        print(
            f"end px   : "
            f"{track['end_radius_px']:.2f}"
        )

        print(
            f"start mm : "
            f"{track['start_radius_mm']:.2f}"
        )

        print(
            f"end mm   : "
            f"{track['end_radius_mm']:.2f}"
        )

        print(
            f"width mm : "
            f"{track['width_mm']:.2f}"
        )

        angle = (
            calculate_servo_angle(

                groove_radius_mm = track["start_radius_mm"],

                pivot_to_spindle_mm = PIVOT_TO_SPINDLE_MM,

                arm_length_mm = ARM_LENGTH_MM,

                servo_offset_deg = SERVO_ZERO_OFFSET_DEG
            )
        )

        track["servo_angle_deg"] = round(angle, 2)

    # =====================================
    # VISUAL DEBUG
    # =====================================

    debug_img = cv.cvtColor(
        normalized,
        cv.COLOR_GRAY2BGR
    )

    cx = spindle["x"]
    cy = spindle["y"]

    # -------------------------------------
    # spindle center
    # -------------------------------------

    cv.circle(
        debug_img,
        (
            int(cx),
            int(cy)
        ),
        5,
        (0, 0, 255),
        -1
    )

    # -------------------------------------
    # playable boundaries
    # -------------------------------------

    cv.circle(
        debug_img,
        (
            int(cx),
            int(cy)
        ),
        int(
            playable[
                "inner_playable_radius_px"
            ]
        ),
        (255, 0, 0),
        2
    )

    cv.circle(
        debug_img,
        (
            int(cx),
            int(cy)
        ),
        int(
            playable[
                "outer_playable_radius_px"
            ]
        ),
        (0, 255, 255),
        2
    )

    # -------------------------------------
    # separator visualization
    # -------------------------------------

    for idx, s in enumerate(
        separators,
        start=1
    ):

        r = int(
            s[
                "radius_px"
            ]
        )

        left = int(
            s[
                "left_px"
            ]
        )

        right = int(
            s[
                "right_px"
            ]
        )

        score = (
            s[
                "score"
            ]
        )

        # -------------------------
        # separator width region
        # -------------------------

        cv.circle(
            debug_img,
            (
                int(cx),
                int(cy)
            ),
            left,
            (80, 80, 80),
            1
        )

        cv.circle(
            debug_img,
            (
                int(cx),
                int(cy)
            ),
            right,
            (80, 80, 80),
            1
        )

        # -------------------------
        # separator center
        # -------------------------

        cv.circle(
            debug_img,
            (
                int(cx),
                int(cy)
            ),
            r,
            (0, 255, 0),
            2
        )

        # -------------------------
        # label
        # -------------------------

        angle = np.deg2rad(
            315
        )

        tx = int(
            cx
            + r
            * np.cos(angle)
        )

        ty = int(
            cy
            + r
            * np.sin(angle)
        )

        cv.putText(
            debug_img,
            (
                f"T{idx} "
                f"{s['radius_mm']:.1f}mm"
            ),
            (
                tx,
                ty
            ),
            cv.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 255, 0),
            1
        )
    
    # -------------------------------------
    # track starts
    # -------------------------------------

    for idx, t in enumerate(
        tracks,
        start=1
    ):

        r = int(
            t[
                "start_radius_px"
            ]
        )

        angle = np.deg2rad(
            230
        )

        tx = int(
            cx
            + r
            * np.cos(angle)
        )

        ty = int(
            cy
            + r
            * np.sin(angle)
        )

        cv.circle(
            debug_img,
            (
                int(cx),
                int(cy)
            ),
            r,
            (255, 0, 255),
            1
        )

        cv.putText(
            debug_img,
            (
                f"Track - {idx} "
                f"{t['start_radius_mm']}mm"
            ),
            (
                tx,
                ty
            ),
            cv.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 0, 255),
            1
        )

    # =====================================
    # SAVE + SHOW
    # =====================================

    cv.imwrite(
        "debug/separator_detection.png",
        debug_img
    )

    return {
        'success': True,
        'tracks': tracks,
    }