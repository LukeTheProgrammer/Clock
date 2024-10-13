<template>
    <div class="clock-container">
        <div class="row-1">
            <div class="row-item">
                <p class="current-date font-ml">{{ date }}</p>
            </div>
        </div>

        <div class="row-2">
            <div class="row-item">
                <p class="current-time font-xl">{{ time }}</p>
            </div>
        </div>

        <div class="row-3">
            <div class="row-item">
                <div class="current-high-low">
                    <p class="font-ml">{{ todayHigh }}&deg;</p>
                    <p class="font-ml">{{ todayLow }}&deg;</p>
                </div>
                <p class="current-temp font-xl">
                    {{ Math.round(this.temp) }}&deg;
                </p>
                <div>&nbsp;</div>
            </div>
        </div>

        <div class="row-4">
            <div class="forecast-container">
                <div
                    v-for="day in forecastBar"
                    :key="`forecast_day_${day.date}`"
                    class="forecast-day"
                >
                    <p class="forecast-date font-s">
                        {{ day.date }}
                    </p>
                    <div class="forecast-temps">
                        <span class="temp-high font-m">
                            {{ Math.round(day.high) }}&deg;
                        </span>
                        <span class="temp-pipe">|</span>
                        <span class="temp-low font-m">
                            {{ Math.round(day.low) }}&deg;
                        </span>
                    </div>
                </div>
            </div>
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
            time: '',
            date: '',
            temp: 0,
            weather: {},
            forecast: {},
            timerId: setInterval(() => this.updateTime(), 1000),
            weatherId: setInterval(() => this.getWeather(), 1000 * 60 * 60),
        }
    },

    computed: {
        today() {
            const date = format(new Date(), 'YYYY-MM-DD')
            return (date) ? this.forecast[date] ?? null : null
        },
        todayHigh() {
            return (this.today) ? this.today.reduce((carry, val) => Math.max(carry, val)) : 0
        },
        todayLow() {
            return (this.today) ? this.today.reduce((carry, val) => Math.min(carry, val)) : 0
        },
        forecastBar() {
            let days = []

            for (const date in this.forecast) {
                if (sameDay(new Date(), parse(date))) {
                    continue;
                }

                if (days?.length > 3) {
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
    },

    methods: {
        arrayMax(data) {
            return (data?.length) ? data.reduce((carry, val) => Math.max(carry, val)) : 0;
        },

        arrayMin(data) {
            return (data?.length) ? data.reduce((carry, val) => Math.min(carry, val)) : 0;
        },

        testWeatherData() {
            this.weather = example_weather
            this.forecast = example_forecast
        },

        updateTime() {
            const now = new Date()
            this.date = format(now, 'dddd MMMM DD')
            this.time = format(now, 'hh:mm:ss')
        },

        getWeather() {
            const url = "https://api.weather.gov/points/38.9124,-94.6267"

            axios
                .get(url)
                .then((response) => {
                    console.log("points", response)
                    // this.getForecast(response.data)
                    this.getForecastHourly(response.data)
                })
                .catch(err => console.error(err))
        },

        getForecastHourly(points) {
            const props = points?.properties ?? {}
            const forecast = props?.forecastHourly ?? false

            if (!forecast) {
                console.error('Points endpoint did not return a forecastHourly prop')
                return false
            }

            axios.get(forecast)
                .then(
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

            axios.get(forecast)
                .then(
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
                const date = (periodDate) ? parse(periodDate) : null
                const key = (date) ? format(date, 'YYYY-MM-DD') : null

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
                    low: weather[date].reduce((carry, val) => Math.min(carry, val))
                })
            }
        },

        getTemperatureFromPeriod(period) {
            const temp = parseInt(period?.temperature ?? 0)
            return isNaN(temp) ? 0 : temp
        },

        getDateFromPeriod(period) {
            const periodDate = period?.startTime ?? null
            const date = (periodDate) ? parse(periodDate) : null
            return (date) ? format(date, 'YYYY-MM-DD') : null
        },
    },
};
</script>

<style lang="scss"></style>
