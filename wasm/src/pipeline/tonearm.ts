// Mirrors backend/core/tonearm.py → calculate_servo_angle()
// Law of cosines: A=pivot↔spindle, B=arm, C=groove_radius
// θ = arccos((A²+B²-C²)/(2AB)) + servo_offset

export const PIVOT_TO_SPINDLE_MM  = 220.0;
export const ARM_LENGTH_MM        = 195.0;
export const SERVO_ZERO_OFFSET_DEG = 90;

export function calculateServoAngle(
  grooveRadiusMm:     number,
  pivotToSpindleMm  = PIVOT_TO_SPINDLE_MM,
  armLengthMm       = ARM_LENGTH_MM,
  servoOffsetDeg    = SERVO_ZERO_OFFSET_DEG,
): number {
  const A = pivotToSpindleMm;
  const B = armLengthMm;
  const C = grooveRadiusMm;

  const cosTheta = Math.max(-1, Math.min(1, (A * A + B * B - C * C) / (2 * A * B)));
  const thetaDeg = (Math.acos(cosTheta) * 180) / Math.PI;

  return thetaDeg + servoOffsetDeg;
}
