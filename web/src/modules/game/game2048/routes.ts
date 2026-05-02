import type { RouteRecordRaw } from 'vue-router'

export const game2048Routes: RouteRecordRaw[] = [
  {
    path: '/2048',
    name: 'game2048',
    component: () => import('./views/Game2048View.vue'),
  },
]
