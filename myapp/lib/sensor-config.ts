// Settings shared by the profile page, the API and the speed calculation.

// Full-scale range of the glove's wrist accelerometer (imu2), in g. This is the
// default; accelerations above it are clipped by the sensor, so a speed
// calculated from a reading at this limit is only a lower bound.
export const DEFAULT_ACCEL_RANGE_G = 16;

// Allowed arm length (shoulder joint to wrist), in metres.
export const ARM_LENGTH_MIN_M = 0.3;
export const ARM_LENGTH_MAX_M = 1.5;
