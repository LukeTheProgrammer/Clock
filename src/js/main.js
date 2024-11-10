// Import our custom CSS
import '../scss/styles.scss'

// Import only the Bootstrap components we need
import { Popover } from 'bootstrap'

import { createApp } from 'vue'
import App from '../App.vue'
import router from '../router'

// Create an example popover
document.querySelectorAll('[data-bs-toggle="popover"]').forEach((popover) => {
  new Popover(popover)
})

const app = createApp(App)

app.use(router)

app.mount('#app')
