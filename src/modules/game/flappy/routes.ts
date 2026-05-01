import type { RouteRecordRaw } from 'vue-router'

export const flappyRoutes: RouteRecordRaw[] = [
  {
    path: '/flappy',
    name: 'flappy',
    component: () => import('./views/FlappyBirdView.vue'),
  },
]
