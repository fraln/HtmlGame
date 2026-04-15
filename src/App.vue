<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

/** 顶栏「魔方」在 /cube/* 下保持高亮 */
const headerActive = computed(() =>
  route.path.startsWith('/cube') ? '/cube' : route.path,
)
</script>

<template>
  <el-container class="layout">
    <el-header>
      <el-menu mode="horizontal" router :default-active="headerActive">
        <el-menu-item index="/">首页</el-menu-item>
        <el-menu-item index="/cube">魔方</el-menu-item>
        <el-menu-item index="/tetris">俄罗斯方块</el-menu-item>
        <el-menu-item index="/2048">2048</el-menu-item>
        <el-menu-item index="/flappy">Flappy Bird</el-menu-item>
        <el-menu-item index="/about">关于</el-menu-item>
      </el-menu>
    </el-header>
    <el-main>
      <RouterView />
    </el-main>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}
</style>
