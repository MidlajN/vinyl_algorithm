from pathlib import Path
import cv2 as cv


DEBUG_DIR = Path(
    "debug"
)

DEBUG_DIR.mkdir(
    exist_ok=True
)


def save_debug_image(
    enabled: bool,
    filename: str,
    image
):
    """
    Save debug image only
    when debug=True.
    """

    if not enabled:
        return

    path = (
        DEBUG_DIR
        / filename
    )

    cv.imwrite(
        str(path),
        image
    )