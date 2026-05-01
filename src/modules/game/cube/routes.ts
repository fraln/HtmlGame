import type { RouteRecordRaw } from 'vue-router'

export const cubeRoutes: RouteRecordRaw[] = [
  {
    path: '/cube',
    component: () => import('./views/CubeLayout.vue'),
    redirect: '/cube/2x2',
    children: [
      {
        path: '2x2',
        name: 'cube2x2',
        component: () => import('./views/CubeView.vue'),
      },
      {
        path: '3x3',
        name: 'cube3x3',
        component: () => import('./views/Cube3View.vue'),
      },
    ],
  },
  {
    path: '/cube3',
    redirect: '/cube/3x3',
  },
]
