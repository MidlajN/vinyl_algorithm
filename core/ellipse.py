import cv2 as cv
import numpy as np


def ellipse_radius(ellipse):
    (_, _), (major, minor), _ = ellipse

    a = major / 2
    b = minor / 2

    return float(
        np.sqrt(a * b)
    )


def detect_outer_ellipse(gray):
    blur = cv.GaussianBlur(
        gray,
        (7, 7),
        0
    )

    _, thresh = cv.threshold(
        blur,
        0,
        255,
        cv.THRESH_BINARY_INV 
        + cv.THRESH_OTSU
    )

    kernel = cv.getStructuringElement(
        cv.MORPH_ELLIPSE,
        (9, 9)
    )

    thresh = cv.morphologyEx(
        thresh,
        cv.MORPH_CLOSE,
        kernel
    )

    contours, _ = cv.findContours(
        thresh,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
    )

    largest = max(
        contours,
        key=cv.contourArea
    )

    ellipse = cv.fitEllipse(
        largest
    )
    
    (
        (cx, cy),
        (major, minor),
        angle
    ) = ellipse

    if minor > major:
        major, minor = (
            minor,
            major
        )

        angle += 90
    
    ellipse = (
        (cx, cy),
        (
            major,
            minor
        ),
        angle
    )

    major_radius = major / 2
    minor_radius = minor / 2

    return {
        "ellipse": ellipse,
        "mask": thresh,

        "center": (
            float(cx),
            float(cy)
        ),

        "major_radius_px":
            float(
                major_radius
            ),

        "minor_radius_px":
            float(
                minor_radius
            ),

        "angle":
            float(angle),

        "radius_px":
            ellipse_radius(
                ellipse
            )
}

def detect_label_ellipse(
    image,
    spindle,
    rough_radius
):
    crop_radius = int(
        rough_radius * 0.45
    )

    x1 = max(
        spindle["x"]
        - crop_radius,
        0
    )

    y1 = max(
        spindle["y"]
        - crop_radius,
        0
    )

    x2 = min(
        spindle["x"]
        + crop_radius,
        image.shape[1]
    )

    y2 = min(
        spindle["y"]
        + crop_radius,
        image.shape[0]
    )

    crop = image[
        y1:y2,
        x1:x2
    ]

    hsv = cv.cvtColor(
        crop,
        cv.COLOR_BGR2HSV
    )

    lower = np.array(
        [5, 40, 40]
    )

    upper = np.array(
        [35, 255, 255]
    )

    mask = cv.inRange(
        hsv,
        lower,
        upper
    )

    contours, _ = cv.findContours(
        mask,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
    )

    largest = max(
        contours,
        key=cv.contourArea
    )

    ellipse = cv.fitEllipse(
        largest
    )

    (
        (cx, cy),
        (major, minor),
        angle
    ) = ellipse

    corrected = (
        (
            cx + x1,
            cy + y1
        ),
        (
            major,
            minor
        ),
        angle
    )

    return {
        "ellipse":
            corrected,
        "mask":
            mask,
        "radius_px":
            ellipse_radius(
                corrected
            )
    }