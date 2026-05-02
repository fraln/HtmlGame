import type { RouteRecordRaw } from 'vue-router'

export const sokobanRoutes: RouteRecordRaw[] = [
  {
    path: '/sokoban',
    name: 'sokoban',
    component: () => import('./views/SokobanView.vue'),
  },
]
