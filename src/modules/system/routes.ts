import type { RouteRecordRaw } from 'vue-router'
import { AboutView, HomeView } from './views'

export const systemRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutView,
  },
]
