// Turn weather.gov's free-text `shortForecast` ("Chance Rain Showers",
// "Mostly Clear", ...) into one of the icons WeatherIcon can draw.
// Order matters: the most significant weather wins ("Rain And Snow" -> snow).
const RULES = [
  [/thunder|t-storm/, 'storm'],
  [/snow|flurr|sleet|ice|freezing|blizzard|wintry/, 'snow'],
  [/rain|shower|drizzle/, 'rain'],
  [/fog|haze|smoke|mist|dust/, 'fog'],
  [/partly|mostly sunny|mostly clear/, 'partly'],
  [/cloudy|overcast/, 'cloud'],
  [/sunny|clear|fair|frost|hot|cold/, 'clear'],
  [/wind|breezy|blustery/, 'wind'],
]

/**
 * @param {string} shortForecast e.g. "Slight Chance Rain Showers"
 * @param {boolean} isDaytime picks sun or moon for clear/partly cloudy
 * @returns {string} an icon kind for WeatherIcon
 */
export function conditionKind(shortForecast, isDaytime = true) {
  const text = (shortForecast ?? '').toLowerCase()
  const match = RULES.find(([pattern]) => pattern.test(text))
  const kind = match ? match[1] : 'cloud'

  if (kind === 'clear') {
    return isDaytime ? 'sun' : 'moon'
  }

  if (kind === 'partly') {
    return isDaytime ? 'partly-day' : 'partly-night'
  }

  return kind
}
