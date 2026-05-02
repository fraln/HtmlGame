import type { RouteRecordRaw } from 'vue-router'

export const tetrisRoutes: RouteRecordRaw[] = [
  {
    path: '/tetris',
    name: 'tetris',
    component: () => import('./views/TetrisView.vue'),
  },
]
