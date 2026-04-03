<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const subActive = computed(() => route.path)
</script>

<template>
  <div class="cube-layout">
    <nav class="cube-subnav" aria-label="魔方类型">
      <el-menu
        mode="horizontal"
        router
        :ellipsis="false"
        :default-active="subActive"
        class="sub-menu"
      >
        <el-menu-item index="/cube/2x2">2×2 魔方</el-menu-item>
        <el-menu-item index="/cube/3x3">3×3 魔方</el-menu-item>
      </el-menu>
    </nav>
    <RouterView />
  </div>
</template>

<style scoped>
.cube-layout {
  max-width: 1200px;
  margin: 0 auto;
}

.cube-subnav {
  margin-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.sub-menu {
  border-bottom: none;
  --el-menu-horizontal-height: 44px;
}

.sub-menu.el-menu--horizontal {
  justify-content: flex-start;
}
</style>
