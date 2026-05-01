import type { RouteRecordRaw } from 'vue-router'
import { cubeRoutes } from './cube/routes'
import { flappyRoutes } from './flappy/routes'
import { game2048Routes } from './game2048/routes'
import { sokobanRoutes } from './sokoban/routes'
import { tetrisRoutes } from './tetris/routes'

export const gameRoutes: RouteRecordRaw[] = [
  ...cubeRoutes,
  ...tetrisRoutes,
  ...game2048Routes,
  ...flappyRoutes,
  ...sokobanRoutes,
]
