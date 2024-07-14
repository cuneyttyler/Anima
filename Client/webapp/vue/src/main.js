// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import Home from './views/Home'
import Chat from './views/Chat'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  { path: '/', component: Home },
  { path: '/chat', component: Chat }
]
 
 const router = new VueRouter({
  mode: 'history',
  base: '/',
  routes
 })

Vue.config.productionTip = false

new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
