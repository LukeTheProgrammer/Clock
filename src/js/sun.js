// Sunrise and sunset for a given day and place, worked out locally (no API).
// This is the standard sunrise equation, the same maths as the `suncalc`
// library, trimmed to what the clock needs. Accurate to about a minute.

const RAD = Math.PI / 180
const DAY_MS = 1000 * 60 * 60 * 24
const J1970 = 2440588
const J2000 = 2451545
const OBLIQUITY = RAD * 23.4397
// The sun's centre is 0.833° below the horizon at sunrise/sunset (refraction + its radius)
const HORIZON = RAD * -0.833

const toDays = (date) => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000
const fromJulian = (j) => new Date((j + 0.5 - J1970) * DAY_MS)

/**
 * @param {Date} date any time on the day you want
 * @param {number} lat degrees north
 * @param {number} lon degrees east (west is negative)
 * @returns {{ sunrise: Date, sunset: Date } | null} null during polar day/night
 */
export function sunTimes(date, lat, lon) {
  const lw = RAD * -lon
  const phi = RAD * lat

  const cycle = Math.round(toDays(date) - 0.0009 - lw / (2 * Math.PI))
  const approxNoon = 0.0009 + lw / (2 * Math.PI) + cycle

  const anomaly = RAD * (357.5291 + 0.98560028 * approxNoon)
  const centre =
    RAD * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly))
  const longitude = anomaly + centre + RAD * 102.9372 + Math.PI
  const declination = Math.asin(Math.sin(longitude) * Math.sin(OBLIQUITY))

  const equation = 0.0053 * Math.sin(anomaly) - 0.0069 * Math.sin(2 * longitude)
  const noon = J2000 + approxNoon + equation

  const cosHourAngle =
    (Math.sin(HORIZON) - Math.sin(phi) * Math.sin(declination)) /
    (Math.cos(phi) * Math.cos(declination))

  if (cosHourAngle < -1 || cosHourAngle > 1) {
    return null
  }

  const hourAngle = Math.acos(cosHourAngle)
  const set = J2000 + 0.0009 + (hourAngle + lw) / (2 * Math.PI) + cycle + equation

  return {
    sunrise: fromJulian(noon - (set - noon)),
    sunset: fromJulian(set),
  }
}
