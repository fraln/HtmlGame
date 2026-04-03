import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/cube',
      component: () => import('../views/cube/CubeLayout.vue'),
      redirect: '/cube/2x2',
      children: [
        {
          path: '2x2',
          name: 'cube2x2',
          component: () => import('../views/CubeView.vue'),
        },
        {
          path: '3x3',
          name: 'cube3x3',
          component: () => import('../views/Cube3View.vue'),
        },
      ],
    },
    {
      path: '/cube3',
      redirect: '/cube/3x3',
    },
  ],
})

export default router
