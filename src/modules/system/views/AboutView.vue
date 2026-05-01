<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const aboutTabs = [
  { label: '系统设置', path: '/about' },
  { label: '主题配置', path: '/about/theme' },
]

const activeTab = computed(() =>
  route.path.startsWith('/about/theme') ? '/about/theme' : '/about',
)

function onSelectTab(key: string) {
  router.push(key)
}
</script>

<template>
  <section class="about-layout">
    <el-card class="about-nav-card">
      <el-menu
        mode="horizontal"
        :ellipsis="false"
        :default-active="activeTab"
        @select="onSelectTab"
      >
        <el-menu-item v-for="tab in aboutTabs" :key="tab.path" :index="tab.path">
          {{ tab.label }}
        </el-menu-item>
      </el-menu>
    </el-card>

    <RouterView />
  </section>
</template>

<style scoped>
.about-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.about-nav-card :deep(.el-card__body) {
  padding: 0 16px;
}

.about-nav-card :deep(.el-menu--horizontal > .el-menu-item) {
  height: 48px;
  line-height: 48px;
}
</style>
