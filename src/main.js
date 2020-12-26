import Vue from 'vue'
import App from './App.vue'
import VueFluent from "vfluentdesign";
import "vfluentdesign/lib/index.css";

Vue.use(VueFluent);

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
