<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCounterStore } from '../stores/counter'

const counter = useCounterStore()
const { count } = storeToRefs(counter)
</script>

<template>
  <el-card class="card">
    <template #header>
      <span>moufang · 首页</span>
    </template>
    <p>Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus</p>
    <el-space>
      <el-text>计数：{{ count }}</el-text>
      <el-button type="primary" @click="counter.increment">+1</el-button>
    </el-space>
  </el-card>
</template>

<style scoped>
.card {
  max-width: 560px;
}
</style>
