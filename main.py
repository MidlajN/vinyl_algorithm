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
    detect_spindle_hole
)

from core.ellipse import (
    detect_outer_ellipse,
    detect_label_ellipse
)

from core.groove_profile import (
    build_radial_profile,
    # detect_label_boundary
)

from core.polar_profile import (
    build_polar_annulus_profile
)

from core.boundaries import (
    detect_boundaries,
    detect_outer_playable,
    detect_separators
)

from core.geometry import (
    build_geometry
)

from debug.visualizer import (
    visualize
)


def detect_initial_disc(
    image,
    blur
):
    circles = cv.HoughCircles(
        blur,
        cv.HOUGH_GRADIENT,
        dp=1.2,
        minDist=300,
        param1=100,
        param2=30,
        minRadius=int(
            image.shape[0] * 0.25
        ),
        maxRadius=int(
            image.shape[0] * 0.48
        )
    )

    # circles = circles[0]

    # largest = max(
    #     circles,
    #     key=lambda c: c[2]
    # )

    # return largest
    circles = np.round(
        circles[0]
    ).astype(int)

    largest = max(
        circles,
        key=lambda c: c[2]
    )

    return (
        int(largest[0]),
        int(largest[1]),
        int(largest[2])
    )


def main():
    image = cv.imread(
        IMAGE_PATH
    )

    gray, blur = preprocess(
        image
    )

    rx, ry, rr = (
        detect_initial_disc(
            image,
            blur
        )
    )

    rx = int(rx)
    ry = int(ry)
    rr = int(rr)

    spindle = (
        detect_spindle_hole(
            gray,
            rx,
            ry,
            rr
        )
    )

    outer = (
        detect_outer_ellipse(
            gray
        )
    )

    # label = (
    #     detect_label_ellipse(
    #         image,
    #         spindle,
    #         rr
    #     )
    # )

    profile = (
        build_radial_profile(
            gray,
            spindle,
            outer[
                "radius_px"
            ]
        )
    )

    boundaries = (
        detect_boundaries(
            profile
        )
    )

    annulus_profile = (
        build_polar_annulus_profile(
            gray,
            spindle,
            boundaries[
                "inner_playable_radius_px"
            ],
            outer[
                "radius_px"
            ]
            * 0.98
        )
    )

    outer_playable_radius_px = (
        detect_outer_playable(
            annulus_profile
        )
    )

    boundaries[
        "outer_playable_radius_px"
    ] = (
        outer_playable_radius_px
    )

    label = {
        "radius_px":
            boundaries[
                "label_radius_px"
            ]
    }
    
    geometry = (
        build_geometry(
            spindle,
            outer,
            label,
            boundaries
        )
    )

    separators = detect_separators(
        annulus_profile,
        boundaries[
            "inner_playable_radius_px"
        ],
        boundaries[
            "outer_playable_radius_px"
        ],
        geometry[
            "pixels_per_mm"
        ]
    )

    boundaries[
        "separators"
    ] = separators

    print(
        label["radius_px"]
    )

    print(
        "\nGeometry:"
    )

    print(
        geometry
    )

    print(
        "\nSeparators:"
    )

    print(
        separators
    )

    visualize(
        image,
        outer,
        label,
        spindle,
        annulus_profile,
        boundaries
    )


if __name__ == "__main__":
    main()
