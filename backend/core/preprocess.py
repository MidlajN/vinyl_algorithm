import cv2 as cv


def preprocess(image):
    gray = cv.cvtColor(
        image,
        cv.COLOR_BGR2GRAY
    )

    blur = cv.GaussianBlur(
        gray,
        (9, 9),
        2
    )

    return gray, blur