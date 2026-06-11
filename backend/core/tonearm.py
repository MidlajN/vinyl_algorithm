import numpy as np


def calculate_servo_angle(
    groove_radius_mm: float,
    pivot_to_spindle_mm: float,
    arm_length_mm: float,
    servo_offset_deg: float = 0
):
    """
    Calculate servo angle
    using tonearm geometry.

    Triangle:

    pivot ↔ spindle = A
    pivot ↔ stylus  = B
    spindle ↔ groove = C
    """

    A = pivot_to_spindle_mm
    B = arm_length_mm
    C = groove_radius_mm

    cos_theta = (
        (A**2 + B**2 - C**2)
        /
        (2 * A * B)
    )

    # numerical safety
    cos_theta = np.clip(
        cos_theta,
        -1.0,
        1.0
    )

    theta_rad = np.arccos(
        cos_theta
    )

    theta_deg = np.degrees(
        theta_rad
    )

    return (
        theta_deg
        + servo_offset_deg
    )