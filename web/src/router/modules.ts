import type { RouteRecordRaw } from 'vue-router'
import { gameRoutes, systemRoutes } from '../modules/routes'

export const appRoutes: RouteRecordRaw[] = [
  ...systemRoutes,
  ...gameRoutes,
]
