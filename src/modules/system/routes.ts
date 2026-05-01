import type { RouteRecordRaw } from 'vue-router'
import { AboutHomeView, AboutThemeView, AboutView, HomeView } from './views'

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
    redirect: { name: 'about-home' },
    children: [
      {
        path: '',
        name: 'about-home',
        component: AboutHomeView,
      },
      {
        path: 'theme',
        name: 'about-theme',
        component: AboutThemeView,
      },
    ],
  },
]
