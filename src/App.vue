<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

/** 顶栏「魔方」在 /cube/* 下保持高亮 */
const headerActive = computed(() =>
  route.path.startsWith('/cube') ? '/cube' : route.path,
)

const drawerOpen = ref(false)
const isNarrow = ref(false)

let mq: MediaQueryList | null = null

function updateNarrow() {
  isNarrow.value = mq ? mq.matches : window.innerWidth <= 768
}

onMounted(() => {
  mq = window.matchMedia('(max-width: 768px)')
  updateNarrow()
  mq.addEventListener('change', updateNarrow)
})

onUnmounted(() => {
  mq?.removeEventListener('change', updateNarrow)
})

watch(
  () => route.path,
  () => {
    drawerOpen.value = false
  },
)

function onDrawerSelect() {
  drawerOpen.value = false
}
</script>

<template>
  <el-container class="layout">
    <el-header class="app-header">
      <div class="header-inner">
        <span class="brand" aria-hidden="true">白小猫的小游戏之家</span>
        <el-button
          v-show="isNarrow"
          class="menu-btn"
          text
          type="primary"
          aria-label="打开导航菜单"
          @click="drawerOpen = true"
        >
          菜单
        </el-button>
        <el-menu
          v-show="!isNarrow"
          mode="horizontal"
          router
          class="desktop-menu"
          :ellipsis="false"
          :default-active="headerActive"
        >
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item index="/cube">魔方</el-menu-item>
          <el-menu-item index="/tetris">俄罗斯方块</el-menu-item>
          <el-menu-item index="/2048">2048</el-menu-item>
          <el-menu-item index="/flappy">Flappy Bird</el-menu-item>
          <el-menu-item index="/sokoban">推箱子</el-menu-item>
          <el-menu-item index="/settings">系统设置</el-menu-item>
        </el-menu>
      </div>
      <el-drawer
        v-model="drawerOpen"
        direction="rtl"
        size="min(300px, 88vw)"
        title="导航"
        class="nav-drawer"
      >
        <el-menu
          mode="vertical"
          router
          :default-active="headerActive"
          @select="onDrawerSelect"
        >
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item index="/cube">魔方</el-menu-item>
          <el-menu-item index="/tetris">俄罗斯方块</el-menu-item>
          <el-menu-item index="/2048">2048</el-menu-item>
          <el-menu-item index="/flappy">Flappy Bird</el-menu-item>
          <el-menu-item index="/sokoban">推箱子</el-menu-item>
          <el-menu-item index="/settings">系统设置</el-menu-item>
        </el-menu>
      </el-drawer>
    </el-header>
    <el-main class="app-main">
      <RouterView />
    </el-main>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  min-height: 100dvh;
}

.app-header {
  height: auto !important;
  padding: 0;
  line-height: normal;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px max(12px, env(safe-area-inset-right)) 8px max(12px, env(safe-area-inset-left));
  padding-top: max(8px, env(safe-area-inset-top));
  flex-wrap: wrap;
}

.brand {
  font-weight: 600;
  color: var(--text-h, var(--el-text-color-primary));
  font-size: 16px;
}

.menu-btn {
  flex-shrink: 0;
  touch-action: manipulation;
  min-height: 40px;
  padding: 0 12px;
}

.desktop-menu {
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
  border-bottom: none !important;
  --el-menu-horizontal-height: 44px;
}

.desktop-menu.el-menu--horizontal {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.app-main {
  background: var(--theme-bg-soft);
  padding-left: max(var(--el-main-padding), env(safe-area-inset-left)) !important;
  padding-right: max(var(--el-main-padding), env(safe-area-inset-right)) !important;
  padding-bottom: max(var(--el-main-padding), env(safe-area-inset-bottom)) !important;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .header-inner {
    gap: clamp(6px, 2.2vw, 12px);
    padding: clamp(6px, 1.8vw, 10px) max(clamp(8px, 2.8vw, 16px), env(safe-area-inset-right))
      clamp(6px, 1.8vw, 10px) max(clamp(8px, 2.8vw, 16px), env(safe-area-inset-left));
    padding-top: max(clamp(6px, 1.8vw, 10px), env(safe-area-inset-top));
  }

  .brand {
    font-size: clamp(14px, 4.2vw, 17px);
  }

  .menu-btn {
    min-height: clamp(40px, 11vw, 52px);
    padding: 0 clamp(10px, 3.2vw, 16px);
    font-size: clamp(14px, 4vw, 16px);
  }

  .desktop-menu {
    --el-menu-horizontal-height: clamp(40px, 11vw, 48px);
  }

  .app-main {
    padding-left: max(clamp(10px, 3vw, 20px), env(safe-area-inset-left)) !important;
    padding-right: max(clamp(10px, 3vw, 20px), env(safe-area-inset-right)) !important;
    padding-bottom: max(clamp(10px, 3vw, 20px), env(safe-area-inset-bottom)) !important;
  }
}
</style>
