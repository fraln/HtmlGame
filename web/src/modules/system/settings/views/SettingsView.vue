<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const settingsTabs = [
  { label: '系统设置', path: '/settings' },
  { label: '主题配置', path: '/settings/theme' },
  { label: '推箱子关卡样式', path: '/settings/sokoban-levels' },
]

const activeTab = computed(() => {
  if (route.path.startsWith('/settings/sokoban-levels')) return '/settings/sokoban-levels'
  if (route.path.startsWith('/settings/theme')) return '/settings/theme'
  return '/settings'
})

function onSelectTab(key: string) {
  router.push(key)
}
</script>

<template>
  <section class="settings-layout">
    <el-card class="settings-nav-card">
      <el-menu
        mode="horizontal"
        :ellipsis="false"
        :default-active="activeTab"
        @select="onSelectTab"
      >
        <el-menu-item v-for="tab in settingsTabs" :key="tab.path" :index="tab.path">
          {{ tab.label }}
        </el-menu-item>
      </el-menu>
    </el-card>

    <RouterView />
  </section>
</template>

<style scoped>
.settings-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-nav-card :deep(.el-card__body) {
  padding: 0 16px;
}

.settings-nav-card :deep(.el-menu--horizontal > .el-menu-item) {
  height: 48px;
  line-height: 48px;
}
</style>
