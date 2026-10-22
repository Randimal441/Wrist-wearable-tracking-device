export const GRAVITY_MS2 = 9.81;

// An axis within this fraction of the sensor's full-scale range is treated as clipped.
const SATURATION_FRACTION = 0.98;

export interface ReleaseSpeed {
  aMagG: number;      // acceleration magnitude at release, in g
  omega: number;      // angular speed of the arm, rad/s
  speedKmh: number;
  saturated: boolean; // the accelerometer hit its limit, so the true speed is higher
}

// Release speed from the wrist accelerometer (imu2) at the DELIVERY_END reading.
//   a_mag = sqrt(ax² + ay² + az²)      (g)
//   a     = a_mag × 9.81                (m/s²), treated as the arm's centripetal acceleration
//   ω     = sqrt(a / r)                 (from a = ω²·r, r = arm length in metres)
//   v     = r × ω                       (m/s), shown in km/h
export function releaseSpeed(
  ax: number,
  ay: number,
  az: number,
  armLengthM: number,
  accelRangeG: number
): ReleaseSpeed {
  const aMagG = Math.sqrt(ax * ax + ay * ay + az * az);
  const omega = Math.sqrt((aMagG * GRAVITY_MS2) / armLengthM);
  const speedMs = armLengthM * omega;

  return {
    aMagG,
    omega,
    speedKmh: speedMs * 3.6,
    saturated: Math.max(Math.abs(ax), Math.abs(ay), Math.abs(az)) >= SATURATION_FRACTION * accelRangeG,
  };
}
