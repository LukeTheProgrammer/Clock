<script setup>
// Simple line icons drawn in the text colour, so they match the clock's gray
// (and dim with it at night). weather.gov's own icons are full-colour photos.
defineProps({
  kind: { type: String, required: true },
})

// A cloud sitting high, leaving room for rain/snow/lightning underneath
const HIGH_CLOUD = 'M7 14h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 6.2 4 4 0 0 0 7 14z'

const PATHS = {
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  ],
  moon: ['M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'],
  'partly-day': [
    'M5.6 10.1A3.5 3.5 0 1 1 11.9 7',
    'M8.5 1.5v1.5M2 8h1.5M3.9 3.4l1 1M13.1 3.4l-1 1',
    'M9 21h9a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8.7 13.6 3.7 3.7 0 0 0 9 21z',
  ],
  'partly-night': [
    'M12 7.5A4.5 4.5 0 0 1 5.5 2.5a4.5 4.5 0 0 0 1 9',
    'M9 21h9a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8.7 13.6 3.7 3.7 0 0 0 9 21z',
  ],
  cloud: ['M7 19h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 11.2 4 4 0 0 0 7 19z'],
  rain: [HIGH_CLOUD, 'M8 17l-1 3M12 17l-1 3M16 17l-1 3'],
  storm: [HIGH_CLOUD, 'M13 15l-2.5 3.5h3.5L11.5 22'],
  snow: [HIGH_CLOUD, 'M8 17.5v.01M12 17.5v.01M16 17.5v.01M10 21v.01M14 21v.01'],
  fog: ['M4 8h16M6 12h12M4 16h16M7 20h10'],
  wind: ['M3 8h11a3 3 0 1 0-3-3', 'M3 12h16a3 3 0 1 1-3 3', 'M3 16h7'],
  drop: ['M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z'],
  alert: ['M12 3L2 21h20L12 3z', 'M12 10v5M12 18v.01'],
}
</script>

<template>
  <svg class="weather-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path v-for="(d, i) in PATHS[kind] ?? PATHS.cloud" :key="i" :d="d" />
  </svg>
</template>

<style scoped>
.weather-icon {
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  vertical-align: -0.15em;
}
</style>
