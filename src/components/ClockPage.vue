<template>
  <div class="clock-container">
    <div class="row-1">
      <div class="row-item">
        <p class="current-date font-m">{{ date }}</p>
      </div>
    </div>

    <div class="row-2">
      <div class="row-item">
        <p class="current-time font-xl">{{ time }}</p>
      </div>
    </div>

    <div class="row-3">
      <div class="row-item">
        <p v-if="weather.main" class="current-temp font-l">{{ Math.round(weather.main.temp) }}&deg;</p>
      </div>
    </div>

    <div class="row-4">
      <div v-if="forecast.daily" class="forecast-container">
        <div v-for="day in forecast.daily.slice(0, 4)" :key="`forecast_day_${day.dt}`" class="forecast-day">
          <p class="forecast-date font-s">{{ getForecastDate(day.dt) }}</p>
          <div class="forecast-temps">
            <span class="temp-high font-m">{{ Math.round(day.temp.max) }}&deg;</span>
            <span class="temp-low font-m">{{ Math.round(day.temp.min) }}&deg;</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import example_forecast from '../example-data/forecast.json';
import example_weather from '../example-data/weather.json';

const weather_api_key = 'e2758ded7d3d6c8203d2f987d2483ca8';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default {
  name: 'ClockPage',
  data() {
    return {
      time: '',
      date: '',
      weather: {},
      forecast: {},
      timerId: setInterval(() => this.updateTime(), 1000),
        weatherId: setInterval(() => this.getWeather(), 1000 * 60 * 15),
        forecastId: setInterval(() => this.getOneCallWeather(), 1000 * 60 * 60),
    };
  },

  mounted() {
    this.updateTime();
    this.getWeather();
    this.getOneCallWeather();
    // this.testWeatherData();
  },

  methods: {
    testWeatherData() {
      this.weather = example_weather;
      this.forecast = example_forecast;
    },

    pad(num, digit) {
      let zero = '';

      for (let i = 0; i < digit; i++) {
        zero += '0';
      }

      return (zero + num).slice(-digit);
    },

    twelveHourClock(hours) {
      return this.pad(hours > 12 ? hours - 12 : hours, 2);
    },

    updateTime() {
      var cd = new Date();

      this.time =
        this.twelveHourClock(cd.getHours()) + ':' + this.pad(cd.getMinutes(), 2) + ':' + this.pad(cd.getSeconds(), 2);

      this.date = weekdays[cd.getDay()] + ' ' + months[cd.getMonth()] + ' ' + cd.getDate();
    },

    getWeather() {
      const url = 'https://api.openweathermap.org/data/2.5/weather';
      const params = {
        id: '4274317',
        appid: weather_api_key,
        mode: 'json',
        units: 'imperial',
      };

      axios
        .get(url, {params: params})
        .then((response) => {
          console.log('weather/current', response);
          this.weather = response.data;
        })
        .catch((err) => {
          console.log(err);
        });
    },

    getOneCallWeather() {
      const url = 'https://api.openweathermap.org/data/2.5/onecall';
      const params = {
        lat: '38.9667',
        lon: '-94.6169',
        appid: weather_api_key,
        units: 'imperial',
      };

      axios
        .get(url, {params: params})
        .then((response) => {
          console.log('weather/one-call', response);
          this.forecast = response.data;
          // this.handleOneCallResponse(response.data);
        })
        .catch((err) => console.log(err));
    },

    getForecastDate(item_dt) {
      const dt = new Date(item_dt * 1000);
      const weekday = weekdays[dt.getDay()];
      //   const month = dt.getMonth() + 1;
      const day = dt.getDate();

      //   return `${weekday} ${month}/${day}`;
      return `${weekday} ${day}`;
    },
  },
};
</script>

<style lang="scss"></style>
