import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Chat from '../views/Chat.vue'
import Alive from '../views/Alive.vue'

const routes = [
  { path: '/', name: "Home", component: Home },
  { path: '/chat', name: "Chat", component: Chat },
  { path: '/alive', name: "Alive", component: Alive }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
})

export default router
