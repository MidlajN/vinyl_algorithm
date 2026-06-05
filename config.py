import os


def _get_bool(
    name,
    default=False
):
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {
        "1",
        "true",
        "yes",
        "on"
    }


IMAGE_PATH = os.getenv(
    "IMAGE_PATH",
    "images/vinyl.jpg"
)

VINYL_DIAMETER_MM = float(
    os.getenv(
        "VINYL_DIAMETER_MM",
        "304.8"
    )
)

VINYL_RADIUS_MM = float(
    os.getenv(
        "VINYL_RADIUS_MM",
        "152.4"
    )
)

LABEL_DIAMETER_MM = float(
    os.getenv(
        "LABEL_DIAMETER_MM",
        "101.6"
    )
)

LABEL_RADIUS_MM = float(
    os.getenv(
        "LABEL_RADIUS_MM",
        "50.8"
    )
)

DEBUG_MODE = _get_bool(
    "DEBUG_MODE",
    default=True
)
