import App from './App'
import { createPinia } from 'pinia'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
import { PiniaVuePlugin } from 'pinia'
Vue.use(PiniaVuePlugin)
Vue.config.productionTip = false
App.mpType = 'app'
new Vue({ ...App }).$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  return { app }
}
// #endif
