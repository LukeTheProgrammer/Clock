<template>
  <!--
    Three equal columns. The time row (hh | mm | ss) sets the rhythm: its colons
    sit in the gaps between the columns, and every other row centres one item
    per column under the hours, minutes and seconds.
  -->
  <div class="clock-container">
    <p class="cell font-l">{{ dayName }}</p>
    <p class="cell font-l">{{ monthName }}</p>
    <p class="cell font-l">{{ dayOfMonth }}</p>

    <p class="cell time font-xl">{{ hours }}</p>
    <p class="cell time time-colon font-xl">{{ minutes }}</p>
    <p class="cell time time-colon font-xl">{{ seconds }}</p>

    <p class="cell temp-high font-ml" title="Today's high">
      <svg class="temp-arrow" viewBox="0 0 10 14" aria-hidden="true">
        <path d="M5 13V2M1.5 5.5L5 2l3.5 3.5" />
      </svg>{{ todayHigh }}&deg;
    </p>
    <p class="cell current-temp font-xl">
      {{ Math.round(temp) }}<span class="current-temp-degree">&deg;</span>
    </p>
    <p class="cell temp-low font-ml" title="Today's low">
      <svg class="temp-arrow" viewBox="0 0 10 14" aria-hidden="true">
        <path d="M5 1v11M1.5 8.5L5 12l3.5-3.5" />
      </svg>{{ todayLow }}&deg;
    </p>

    <!--
      With 3 days each day takes one column of the grid. Any other count
      spreads the days evenly across the full width instead.
    -->
    <div class="forecast-container" :class="{ 'forecast-on-grid': forecastDays === 3 }">
      <div v-for="day in forecastBar" :key="`forecast_day_${day.date}`" class="forecast-day">
        <p class="forecast-date font-s">
          {{ day.date }}
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
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import example_forecast from '../example-data/forecast.json'
import example_weather from '../example-data/weather.json'
import { parse, format, sameDay } from '@formkit/tempo'

export default {
  name: 'ClockPage',
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
      temp: 0,
      weather: {},
      forecast: {},
      // Add ?debug to the URL to show the viewport size readout
      debug: new URLSearchParams(window.location.search).has('debug'),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timerId: setInterval(() => this.updateTime(), 1000),
      weatherId: setInterval(() => this.getWeather(), 1000 * 60 * 60),
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

        days.push({
          date: format(parse(date), 'ddd MM/DD'),
          high: this.arrayMax(this.forecast[date] ?? []),
          low: this.arrayMin(this.forecast[date] ?? []),
        })
      }

      return days
    },
  },

  mounted() {
    this.updateTime()
    this.getWeather()
    // this.testWeatherData()
    window.addEventListener('resize', this.updateScreenSize)
  },

  unmounted() {
    window.removeEventListener('resize', this.updateScreenSize)
  },

  methods: {
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

      for (const i in periods) {
        const period = periods[i] ?? {}
        const temp = this.getTemperatureFromPeriod(period)
        const date = this.getDateFromPeriod(period)

        if (i == 0) {
          this.temp = temp
        }

        if (!date) {
          console.error('Missing date prop from period', JSON.stringify(period))
          continue
        }

        if (!(date in this.forecast)) {
          this.forecast[date] = []
        }

        this.forecast[date].push(temp)
      }
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
