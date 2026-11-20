<template>
  <!--
    Three equal columns. The time row (hh | mm | ss) sets the rhythm: its colons
    sit in the gaps between the columns, and every other row centres one item
    per column under the hours, minutes and seconds.
  -->
  <div class="clock-container" :class="{ night: isNight }">
    <p class="cell date-dow font-l">{{ dayName }}</p>
    <p class="cell font-l">{{ monthName }}</p>
    <p class="cell date-day font-l">{{ dayOfMonth }}</p>

    <p class="cell time font-xl">{{ hours }}</p>
    <p class="cell time time-colon font-xl">{{ minutes }}</p>
    <p class="cell time time-colon font-xl">{{ seconds }}</p>

    <!-- Left: today's high and low, spread over the height of the current temp -->
    <div class="cell temp-range">
      <p class="temp-high font-ml" title="Today's high">
        <svg class="temp-arrow" viewBox="0 0 10 14" aria-hidden="true">
          <path d="M5 13V2M1.5 5.5L5 2l3.5 3.5" />
        </svg>{{ todayHigh }}&deg;
      </p>
      <p class="temp-low font-ml" title="Today's low">
        <svg class="temp-arrow" viewBox="0 0 10 14" aria-hidden="true">
          <path d="M5 1v11M1.5 8.5L5 12l3.5-3.5" />
        </svg>{{ todayLow }}&deg;
      </p>
    </div>

    <p class="cell current-temp font-xl">
      <!-- The degree sign hangs into the gap so the digits stay under the minutes -->
      {{ Math.round(currentTemp) }}<span class="current-temp-degree">&deg;</span>
    </p>

    <!-- Right: current conditions above the rain chance for the rest of today -->
    <div class="cell current-conditions">
      <WeatherIcon
        class="current-icon"
        :kind="conditionKind(currentPeriod?.shortForecast, currentPeriod?.isDaytime ?? true)"
      />
      <p class="current-rain font-ml" title="Chance of rain for the rest of today">
        <WeatherIcon kind="drop" class="rain-icon" />{{ todayRainChance }}%
      </p>
    </div>

    <!-- An active weather alert takes over the forecast row -->
    <div v-if="topAlert" class="alert-banner" :class="`alert-${topAlert.severity.toLowerCase()}`">
      <WeatherIcon kind="alert" class="alert-icon" />
      <div class="alert-text">
        <p class="alert-event font-m">{{ topAlert.event }}</p>
        <p class="alert-detail font-s">
          <span v-if="topAlert.until">until {{ topAlert.until }}</span>
          <span v-if="alerts.length > 1"> &middot; +{{ alerts.length - 1 }} more</span>
        </p>
      </div>
    </div>

    <!--
      With 3 days each day takes one column of the grid. Any other count
      spreads the days evenly across the full width instead.
    -->
    <div v-else class="forecast-container" :class="{ 'forecast-on-grid': forecastDays === 3 }">
      <div v-for="day in forecastBar" :key="`forecast_day_${day.date}`" class="forecast-day">
        <p class="forecast-date font-s">
          <span>{{ day.dayName }}</span>
          <span>{{ day.monthDay }}</span>
        </p>
        <p class="forecast-conditions font-m" :title="day.shortForecast">
          <WeatherIcon :kind="day.kind" />
          <span class="forecast-rain font-s">
            <WeatherIcon kind="drop" />{{ day.rainChance }}%
          </span>
        </p>
        <div class="forecast-temps">
          <span class="temp-high font-m"> {{ Math.round(day.high) }}&deg; </span>
          <span class="temp-pipe">|</span>
          <span class="temp-low font-m"> {{ Math.round(day.low) }}&deg; </span>
        </div>
      </div>
    </div>

    <div v-if="debug" class="debug-readout">
      <p class="font-m">h: {{ screenHeight }} px</p>
      <p class="font-m">w: {{ screenWidth }} px</p>
      <p v-if="sun" class="font-m">
        sun: {{ formatTime(sun.sunrise) }}-{{ formatTime(sun.sunset) }}
      </p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import example_forecast from '../example-data/forecast.json'
import example_weather from '../example-data/weather.json'
import { parse, format, sameDay } from '@formkit/tempo'
import WeatherIcon from '@/components/WeatherIcon.vue'
import { conditionKind } from '@/js/conditions.js'
import { sunTimes } from '@/js/sun.js'

// Where the clock lives (used for the forecast, alerts and sunrise/sunset)
const LATITUDE = 38.9124
const LONGITUDE = -94.6267

const SEVERITY_ORDER = ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown']

export default {
  name: 'ClockPage',
  components: { WeatherIcon },
  data() {
    return {
      dayName: '',
      monthName: '',
      dayOfMonth: '',
      hours: '',
      minutes: '',
      seconds: '',
      // How many days the forecast row shows (3 lines up with the clock's columns)
      forecastDays: 3,
      now: Date.now(),
      temp: 0,
      weather: {},
      forecast: {},
      // Every hourly period from weather.gov, for conditions and rain chance
      hourly: [],
      alerts: [],
      // ?dim=on / ?dim=off forces night dimming on or off (for testing)
      dimOverride: new URLSearchParams(window.location.search).get('dim'),
      // Add ?debug to the URL to show the viewport size readout
      debug: new URLSearchParams(window.location.search).has('debug'),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timerId: setInterval(() => this.updateTime(), 1000),
      weatherId: setInterval(() => this.getWeather(), 1000 * 60 * 60),
      alertsId: setInterval(() => this.getAlerts(), 1000 * 60 * 5),
    }
  },

  computed: {
    today() {
      const date = format(new Date(), 'YYYY-MM-DD')
      return date ? this.forecast[date] ?? null : null
    },
    todayHigh() {
      return this.today ? this.today.reduce((carry, val) => Math.max(carry, val)) : 0
    },
    todayLow() {
      return this.today ? this.today.reduce((carry, val) => Math.min(carry, val)) : 0
    },
    forecastBar() {
      let days = []

      for (const date in this.forecast) {
        if (sameDay(new Date(), parse(date))) {
          continue
        }

        if (days.length >= this.forecastDays) {
          break
        }

        const summary = this.daySummary(date)

        days.push({
          date: format(parse(date), 'ddd MM/DD'),
          dayName: format(parse(date), 'ddd'),
          monthDay: format(parse(date), 'MM/DD'),
          high: this.arrayMax(this.forecast[date] ?? []),
          low: this.arrayMin(this.forecast[date] ?? []),
          ...summary,
        })
      }

      return days
    },

    // The hourly period covering right now (the data is only fetched hourly,
    // so the first period can be up to an hour old)
    currentPeriod() {
      return (
        this.hourly.find((p) => p.start <= this.now && this.now < p.end) ?? this.hourly[0] ?? null
      )
    },

    // Highest chance of rain from now until midnight
    todayRainChance() {
      const today = format(new Date(this.now), 'YYYY-MM-DD')
      const rest = this.hourly.filter((p) => p.date === today && p.end > this.now)
      return rest.length ? Math.max(...rest.map((p) => p.rainChance)) : 0
    },

    currentTemp() {
      return this.currentPeriod?.temp ?? this.temp
    },

    sun() {
      return sunTimes(new Date(this.now), LATITUDE, LONGITUDE)
    },

    // Dim the display between sunset and sunrise
    isNight() {
      if (this.dimOverride === 'on') return true
      if (this.dimOverride === 'off') return false
      if (!this.sun) return false
      return this.now < this.sun.sunrise.valueOf() || this.now >= this.sun.sunset.valueOf()
    },

    topAlert() {
      return this.alerts[0] ?? null
    },
  },

  mounted() {
    this.updateTime()
    this.getWeather()
    this.getAlerts()
    // this.testWeatherData()
    window.addEventListener('resize', this.updateScreenSize)
  },

  unmounted() {
    clearInterval(this.timerId)
    clearInterval(this.weatherId)
    clearInterval(this.alertsId)
    window.removeEventListener('resize', this.updateScreenSize)
  },

  methods: {
    conditionKind,

    formatTime(date) {
      return format(date, 'h:mm A')
    },

    // Conditions and peak rain chance for one forecast day. If rain is likely,
    // show the conditions from its rainiest hour; otherwise from mid-afternoon.
    daySummary(date) {
      const hours = this.hourly.filter((p) => p.date === date)

      if (!hours.length) {
        return { kind: 'cloud', shortForecast: '', rainChance: 0 }
      }

      const rainChance = Math.max(...hours.map((p) => p.rainChance))
      const rainiest = hours.find((p) => p.rainChance === rainChance)
      const afternoon = hours.reduce((best, p) =>
        Math.abs(p.hour - 14) < Math.abs(best.hour - 14) ? p : best
      )
      const pick = rainChance >= 30 ? rainiest : afternoon

      return {
        kind: conditionKind(pick.shortForecast, true),
        shortForecast: pick.shortForecast,
        rainChance,
      }
    },

    getAlerts() {
      const url = `https://api.weather.gov/alerts/active?point=${LATITUDE},${LONGITUDE}`

      axios
        .get(url)
        .then((resp) => this.processAlerts(resp.data))
        .catch((err) => console.error(err))
    },

    processAlerts(data) {
      const features = data?.features ?? []

      this.alerts = features
        .map((f) => f?.properties ?? {})
        .filter((a) => a.event && a.status !== 'Test')
        .map((a) => {
          const ends = a.ends ?? a.expires ?? null
          return {
            event: a.event,
            severity: SEVERITY_ORDER.includes(a.severity) ? a.severity : 'Unknown',
            until: ends ? this.formatTime(new Date(ends)) : null,
          }
        })
        .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    },

    updateScreenSize() {
      this.screenWidth = window.innerWidth
      this.screenHeight = window.innerHeight
    },

    arrayMax(data) {
      return data?.length ? data.reduce((carry, val) => Math.max(carry, val)) : 0
    },

    arrayMin(data) {
      return data?.length ? data.reduce((carry, val) => Math.min(carry, val)) : 0
    },

    testWeatherData() {
      this.weather = example_weather
      this.forecast = example_forecast
    },

    updateTime() {
      const now = new Date()
      this.now = now.valueOf()
      this.dayName = format(now, 'ddd')
      this.monthName = format(now, 'MMM')
      this.dayOfMonth = format(now, 'DD')
      this.hours = format(now, 'hh')
      this.minutes = format(now, 'mm')
      this.seconds = format(now, 'ss')
    },

    getWeather() {
      const url = 'https://api.weather.gov/points/38.9124,-94.6267'

      axios
        .get(url)
        .then((response) => {
          console.log('points', response)
          // this.getForecast(response.data)
          this.getForecastHourly(response.data)
        })
        .catch((err) => console.error(err))
    },

    getForecastHourly(points) {
      const props = points?.properties ?? {}
      const forecast = props?.forecastHourly ?? false

      if (!forecast) {
        console.error('Points endpoint did not return a forecastHourly prop')
        return false
      }

      axios.get(forecast).then(
        (resp) => {
          console.log('forecast', resp)
          this.processForecastHourly(resp.data)
        },
        (err) => console.error(err)
      )
    },

    processForecastHourly(data) {
      const props = data?.properties ?? {}
      const periods = props?.periods ?? []

      if (!periods?.length) {
        console.error('Hourly forecast did not have a periods array')
        return false
      }

      this.forecast = {}
      this.hourly = periods.map((period) => {
        const start = new Date(period?.startTime ?? NaN)
        return {
          start: start.valueOf(),
          end: new Date(period?.endTime ?? NaN).valueOf(),
          date: this.getDateFromPeriod(period),
          hour: start.getHours(),
          temp: this.getTemperatureFromPeriod(period),
          rainChance: period?.probabilityOfPrecipitation?.value ?? 0,
          shortForecast: period?.shortForecast ?? '',
          isDaytime: period?.isDaytime ?? true,
        }
      })

      for (const i in periods) {
        const period = periods[i] ?? {}
        const temp = this.getTemperatureFromPeriod(period)
        const date = this.getDateFromPeriod(period)


        if (!date) {
          console.error('Missing date prop from period', JSON.stringify(period))
          continue
        }

        if (!(date in this.forecast)) {
          this.forecast[date] = []
        }

        this.forecast[date].push(temp)
      }

      this.temp = this.hourly[0]?.temp ?? 0
    },

    getForecast(points) {
      const props = points?.properties ?? {}
      const forecast = props?.forecast ?? false

      if (!forecast) {
        console.error('Points endpoint did not return a forecast prop')
        return false
      }

      axios.get(forecast).then(
        (resp) => {
          console.log('forecast', resp)
          this.processForecast(resp.data)
        },
        (err) => console.error(err)
      )
    },

    processForecast(data) {
      const props = data?.properties ?? {}
      const periods = props?.periods ?? []

      if (!periods?.length) {
        console.error('Forecast did not have a periods array')
        return false
      }

      let weather = {}

      for (const i in periods) {
        const period = periods[i] ?? {}
        const temp = period?.temperature ?? null
        const periodDate = period?.startTime ?? null
        const date = periodDate ? parse(periodDate) : null
        const key = date ? format(date, 'YYYY-MM-DD') : null

        if (!temp) {
          console.error('Missing temp prop from period', JSON.stringify(period))
          continue
        }

        if (!key) {
          console.error('Missing date prop from period', JSON.stringify(period))
          continue
        }

        if (!(key in weather)) {
          weather[key] = []
        }

        // console.log(key, period?.temperature, temp, parseInt(temp))

        weather[key].push(parseInt(temp))
      }

      this.forecast = []

      for (const date in weather) {
        this.forecast.push({
          date: date,
          high: weather[date].reduce((carry, val) => Math.max(carry, val)),
          low: weather[date].reduce((carry, val) => Math.min(carry, val)),
        })
      }
    },

    getTemperatureFromPeriod(period) {
      const temp = parseInt(period?.temperature ?? 0)
      return isNaN(temp) ? 0 : temp
    },

    getDateFromPeriod(period) {
      const periodDate = period?.startTime ?? null
      const date = periodDate ? parse(periodDate) : null
      return date ? format(date, 'YYYY-MM-DD') : null
    },
  },
}
</script>

<style lang="scss"></style>
