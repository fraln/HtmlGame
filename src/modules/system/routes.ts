import type { RouteRecordRaw } from 'vue-router'
import { HomeView } from './home/views'
import {
  SettingsHomeView,
  SettingsSokobanLevelsView,
  SettingsThemeView,
  SettingsView,
} from './settings/views'

export const systemRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    redirect: { name: 'settings-home' },
    children: [
      {
        path: '',
        name: 'settings-home',
        component: SettingsHomeView,
      },
      {
        path: 'theme',
        name: 'settings-theme',
        component: SettingsThemeView,
      },
      {
        path: 'sokoban-levels',
        name: 'settings-sokoban-levels',
        component: SettingsSokobanLevelsView,
      },
    ],
  },
]
