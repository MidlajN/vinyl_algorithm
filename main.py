# import cv2 as cv
# import numpy as np
# import matplotlib.pyplot as plt
# import os


# # ==========================================
# # CONFIG
# # ==========================================

# IMAGE_PATH = "images/vinyl.jpg"
# DEBUG_DIR = "debug"

# os.makedirs(DEBUG_DIR, exist_ok=True)


# def show_debug_steps(debug_data):
#     plt.figure(
#         figsize=(18, 14)
#     )

#     for i, (
#         title,
#         image
#     ) in enumerate(
#         debug_data.items(),
#         1
#     ):

#         plt.subplot(
#             3,
#             3,
#             i
#         )

#         if len(image.shape) == 2:
#             plt.imshow(
#                 image,
#                 cmap="gray"
#             )
#         else:
#             plt.imshow(
#                 cv.cvtColor(
#                     image,
#                     cv.COLOR_BGR2RGB
#                 )
#             )

#         plt.title(title)
#         plt.axis("off")

#     plt.tight_layout()
#     plt.show()

# # ==========================================
# # PREPROCESS
# # ==========================================

# def preprocess(image):
#     gray = cv.cvtColor(
#         image,
#         cv.COLOR_BGR2GRAY
#     )

#     blur = cv.GaussianBlur(
#         gray,
#         (9, 9),
#         2
#     )

#     return gray, blur


# # ==========================================
# # INITIAL ROUGH DISC
# # only for spindle search region
# # ==========================================

# def detect_initial_disc(
#     image,
#     blur
# ):
#     circles = cv.HoughCircles(
#         blur,
#         cv.HOUGH_GRADIENT,
#         dp=1.2,
#         minDist=300,
#         param1=100,
#         param2=30,
#         minRadius=int(
#             image.shape[0] * 0.25
#         ),
#         maxRadius=int(
#             image.shape[0] * 0.48
#         )
#     )

#     if circles is None:
#         raise Exception(
#             "Could not detect vinyl"
#         )

#     circles = np.round(
#         circles[0]
#     ).astype(int)

#     largest = max(
#         circles,
#         key=lambda c: c[2]
#     )

#     return largest


# # ==========================================
# # SPINDLE DETECTION
# # ==========================================

# def detect_spindle_hole(
#     gray,
#     estimated_x,
#     estimated_y,
#     estimated_radius
# ):
#     search_radius = int(
#         estimated_radius * 0.15
#     )

#     x1 = max(
#         estimated_x - search_radius,
#         0
#     )

#     y1 = max(
#         estimated_y - search_radius,
#         0
#     )

#     x2 = min(
#         estimated_x + search_radius,
#         gray.shape[1]
#     )

#     y2 = min(
#         estimated_y + search_radius,
#         gray.shape[0]
#     )

#     crop = gray[
#         y1:y2,
#         x1:x2
#     ]

#     blur = cv.GaussianBlur(
#         crop,
#         (11, 11),
#         2
#     )

#     circles = cv.HoughCircles(
#         blur,
#         cv.HOUGH_GRADIENT,
#         dp=1.2,
#         minDist=20,
#         param1=50,
#         param2=15,
#         minRadius=4,
#         maxRadius=30
#     )

#     if circles is None:
#         raise Exception(
#             "Could not detect spindle hole"
#         )

#     circles = np.round(
#         circles[0]
#     ).astype(int)

#     best = None
#     best_score = -1

#     for c in circles:
#         x, y, r = c

#         mask = np.zeros_like(
#             crop
#         )

#         cv.circle(
#             mask,
#             (x, y),
#             r,
#             255,
#             -1
#         )

#         brightness = cv.mean(
#             crop,
#             mask=mask
#         )[0]

#         if brightness > best_score:
#             best_score = brightness
#             best = c

#     sx, sy, sr = best

#     return (
#         int(sx + x1),
#         int(sy + y1)
#     )


# # ==========================================
# # OUTER ELLIPSE
# # ==========================================

# def detect_outer_ellipse(
#     gray
# ):
#     blur = cv.GaussianBlur(
#         gray,
#         (7, 7),
#         0
#     )

#     _, thresh = cv.threshold(
#         blur,
#         0,
#         255,
#         cv.THRESH_BINARY_INV
#         + cv.THRESH_OTSU
#     )

#     kernel = cv.getStructuringElement(
#         cv.MORPH_ELLIPSE,
#         (9, 9)
#     )

#     thresh = cv.morphologyEx(
#         thresh,
#         cv.MORPH_CLOSE,
#         kernel
#     )

#     contours, _ = cv.findContours(
#         thresh,
#         cv.RETR_EXTERNAL,
#         cv.CHAIN_APPROX_SIMPLE
#     )

#     if not contours:
#         raise Exception(
#             "No outer contour found"
#         )

#     largest = max(
#         contours,
#         key=cv.contourArea
#     )

#     if len(largest) < 5:
#         raise Exception(
#             "Not enough contour points"
#         )

#     ellipse = cv.fitEllipse(
#         largest
#     )

#     return ellipse, thresh


# # ==========================================
# # LABEL ELLIPSE
# # ==========================================

# def detect_label_ellipse(
#     image,
#     spindle_x,
#     spindle_y,
#     rough_radius
# ):
#     crop_radius = int(
#         rough_radius * 0.45
#     )

#     x1 = max(
#         spindle_x - crop_radius,
#         0
#     )

#     y1 = max(
#         spindle_y - crop_radius,
#         0
#     )

#     x2 = min(
#         spindle_x + crop_radius,
#         image.shape[1]
#     )

#     y2 = min(
#         spindle_y + crop_radius,
#         image.shape[0]
#     )

#     crop = image[
#         y1:y2,
#         x1:x2
#     ]

#     hsv = cv.cvtColor(
#         crop,
#         cv.COLOR_BGR2HSV
#     )

#     lower = np.array([
#         5, 40, 40
#     ])

#     upper = np.array([
#         35, 255, 255
#     ])

#     mask = cv.inRange(
#         hsv,
#         lower,
#         upper
#     )

#     kernel = cv.getStructuringElement(
#         cv.MORPH_ELLIPSE,
#         (7, 7)
#     )

#     mask = cv.morphologyEx(
#         mask,
#         cv.MORPH_CLOSE,
#         kernel
#     )

#     contours, _ = cv.findContours(
#         mask,
#         cv.RETR_EXTERNAL,
#         cv.CHAIN_APPROX_SIMPLE
#     )

#     if not contours:
#         raise Exception(
#             "No label contour"
#         )

#     largest = max(
#         contours,
#         key=cv.contourArea
#     )

#     if len(largest) < 5:
#         raise Exception(
#             "Label ellipse failed"
#         )

#     ellipse = cv.fitEllipse(
#         largest
#     )

#     (
#         (cx, cy),
#         (major, minor),
#         angle
#     ) = ellipse

#     actual_ellipse = (
#         (
#             cx + x1,
#             cy + y1
#         ),
#         (
#             major,
#             minor
#         ),
#         angle
#     )

#     return actual_ellipse, mask


# # ==========================================
# # VALIDATION
# # ==========================================

# def validate_geometry(
#     spindle_x,
#     spindle_y,
#     outer_ellipse,
#     label_ellipse
# ):
#     (ox, oy), _, o_angle = (
#         outer_ellipse
#     )

#     (lx, ly), _, l_angle = (
#         label_ellipse
#     )

#     spindle_error = np.sqrt(
#         (
#             spindle_x - ox
#         ) ** 2
#         +
#         (
#             spindle_y - oy
#         ) ** 2
#     )

#     label_center_error = np.sqrt(
#         (
#             lx - ox
#         ) ** 2
#         +
#         (
#             ly - oy
#         ) ** 2
#     )

#     angle_error = abs(
#         o_angle - l_angle
#     )

#     return {
#         "spindle_error_px":
#             round(
#                 spindle_error,
#                 2
#             ),
#         "label_center_error_px":
#             round(
#                 label_center_error,
#                 2
#             ),
#         "angle_error_deg":
#             round(
#                 angle_error,
#                 2
#             )
#     }


# # ==========================================
# # DRAW DEBUG
# # ==========================================

# def draw_debug(
#     image,
#     spindle_x,
#     spindle_y,
#     outer_ellipse,
#     label_ellipse
# ):
#     debug = image.copy()

#     cv.ellipse(
#         debug,
#         outer_ellipse,
#         (0, 255, 0),
#         4
#     )

#     cv.ellipse(
#         debug,
#         label_ellipse,
#         (255, 0, 0),
#         4
#     )

#     cv.circle(
#         debug,
#         (
#             spindle_x,
#             spindle_y
#         ),
#         8,
#         (0, 0, 255),
#         -1
#     )

#     os_path = os.path.join(
#         DEBUG_DIR,
#         "debug.png"
#     )

#     cv.imwrite(
#         os_path,
#         debug
#     )

#     return debug


# # ==========================================
# # MAIN
# # ==========================================

# def main():
#     debug_data = {}

#     image = cv.imread(
#         IMAGE_PATH
#     )

#     if image is None:
#         raise Exception(
#             "Image not found"
#         )

#     gray, blur = preprocess(
#         image
#     )

#     debug_data["Grayscale"] = gray
#     debug_data["Blur"] = blur

#     rx, ry, rr = (
#         detect_initial_disc(
#             image,
#             blur
#         )
#     )

#     spindle_x, spindle_y = (
#         detect_spindle_hole(
#             gray,
#             rx,
#             ry,
#             rr
#         )
#     )

#     outer_ellipse, mask = (
#         detect_outer_ellipse(
#             gray
#         )
#     )

#     debug_data["Disc Mask"] = mask

#     label_ellipse, label_mask = (
#         detect_label_ellipse(
#             image,
#             spindle_x,
#             spindle_y,
#             rr
#         )
#     )

#     debug_data["Label Mask"] = label_mask

#     metrics = (
#         validate_geometry(
#             spindle_x,
#             spindle_y,
#             outer_ellipse,
#             label_ellipse
#         )
#     )

#     print("\nValidation:")
#     print(metrics)

#     debug = draw_debug(
#         image,
#         spindle_x,
#         spindle_y,
#         outer_ellipse,
#         label_ellipse
#     )

#     debug_data["Final Geometry"] = (
#         debug
#     )

#     show_debug_steps(
#         debug_data
#     )

# if __name__ == "__main__":
#     main()

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

import cv2 as cv
import numpy as np


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

def main():
    image = cv.imread(
        IMAGE_PATH
    )

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

    cv.imwrite(
        'debug/cropped.png',
        cropped
    )

    rectified = rectify_disc(
        cropped,
        outer
    )

    gray_rect = cv.cvtColor(
        rectified,
        cv.COLOR_BGR2GRAY
    )

    rect_outer = detect_outer_ellipse(
        gray_rect
    )

    debug_rect = rectified.copy()

    cv.ellipse(
        debug_rect,
        rect_outer["ellipse"],
        (0,255,0),
        3
    )

    cv.circle(
        debug_rect,
        (
            int(rect_outer["center"][0]),
            int(rect_outer["center"][1])
        ),
        8,
        (0,0,255),
        -1
    )

    cv.imwrite(
        "debug/rectifier_check.png",
        debug_rect
    )

    cv.imshow('rectified', rectified)

    gray, blur = preprocess(
        rectified
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

    h, w = gray.shape[:2]

    outer["center"] = (
        w / 2,
        h / 2
    )

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

    outer["center"] = (
        refined["center_x"],
        refined["center_y"]
    )

    gray, blur = preprocess(
        micro_rectified
    )

    normalized = normalize_vinyl(
        micro_rectified,
        outer
    )

    cv.imshow(
        'normalized',
        normalized
    )

    label = detect_label_ring(
        normalized,
        outer
    )

    refined = refine_geometry(
        outer,
        label
    )

    spindle = detect_spindle(
        micro_rectified,
        (
            refined["center_x"],
            refined["center_y"]
        ),
        outer
    )

    outer["center"] = (
        spindle["x"],
        spindle["y"]
    )

    gray_source = gray.copy()

    normalized_gray = (
        normalized.copy()
    )

    normalized_inv = cv.bitwise_not(
        normalized_gray
    )

    from core.radial_energy import (
        build_radial_energy_profile,
    )

    profile_gray = (
        build_radial_energy_profile(
            gray_source,
            spindle,
            label["radius_px"] + 10,
            outer["radius_px"] - 10
        )
    )

    profile_norm = (
        build_radial_energy_profile(
            normalized_gray,
            spindle,
            label["radius_px"] + 10,
            outer["radius_px"] - 10
        )
    )

    profile_inv = (
        build_radial_energy_profile(
            normalized_inv,
            spindle,
            label["radius_px"] + 10,
            outer["radius_px"] - 10
        )
    )

    from scipy.ndimage import (
        gaussian_filter1d
    )

    profile_gray[
        "smoothed"
    ] = gaussian_filter1d(
        profile_gray["energy"],
        sigma=4
    )

    profile_norm[
        "smoothed"
    ] = gaussian_filter1d(
        profile_norm["energy"],
        sigma=4
    )

    profile_inv[
        "smoothed"
    ] = gaussian_filter1d(
        profile_inv["energy"],
        sigma=4
    )

    import matplotlib.pyplot as plt

    plt.figure(
        figsize=(15, 6)
    )

    plt.plot(
        profile_gray["radii"],
        profile_gray["smoothed"],
        label="gray"
    )

    plt.plot(
        profile_norm["radii"],
        profile_norm["smoothed"],
        label="normalized"
    )

    plt.plot(
        profile_inv["radii"],
        profile_inv["smoothed"],
        label="normalized inverted"
    )

    plt.legend()

    plt.grid(True)

    plt.title(
        "Radial Energy Comparison"
    )

    plt.xlabel(
        "Radius (px)"
    )

    plt.ylabel(
        "Energy"
    )

    plt.show()

    profile = build_radial_energy_profile(
        gray,
        spindle,
        inner_radius_px=
            label["radius_px"] + 10,

        outer_radius_px=
            outer["radius_px"] - 10
    )

    import matplotlib.pyplot as plt

    plt.figure(
        figsize=(12, 5)
    )

    plt.plot(
        profile["radii"],
        profile["energy"]
    )

    plt.title(
        "Radial Groove Energy"
    )

    plt.xlabel(
        "Radius (px)"
    )

    plt.ylabel(
        "Energy"
    )

    plt.grid(True)

    plt.show()


    debug = micro_rectified.copy()

    # -------------------------
    # outer center
    # -------------------------

    cv.circle(
        debug,
        (
            int(
                outer["center"][0]
            ),
            int(
                outer["center"][1]
            )
        ),
        8,
        (0,255,0),
        -1
    )

    # -------------------------
    # label center
    # -------------------------

    cv.circle(
        debug,
        (
            int(
                label["center"][0]
            ),
            int(
                label["center"][1]
            )
        ),
        8,
        (255,255,0),
        -1
    )

    # -------------------------
    # refined spindle
    # -------------------------

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
        8,
        (0,0,255),
        -1
    )

    # -------------------------
    # detected label
    # -------------------------

    cv.circle(
        debug,
        (
            int(
                label["center"][0]
            ),
            int(
                label["center"][1]
            )
        ),
        int(
            label[
                "radius_px"
            ]
        ),
        (255,255,0),
        3
    )

    # -------------------------
    # expected label
    # -------------------------

    cv.circle(
        debug,
        (
            int(
                spindle["x"]
            ),
            int(
                spindle["y"]
            )
        ),
        int(
            refined[
                "expected_label_radius_px"
            ]
        ),
        (255,0,255),
        2
    )

    cv.imshow(
        'debug',
        debug
    )

if __name__ == "__main__":
    main()
