<script setup lang="ts">
import { ref } from 'vue'
import {
  applyThemePreset,
  getInitialThemePreset,
  themePresets,
  type ThemePreset,
} from '../../../theme'

const currentPresetId = ref(getInitialThemePreset().id)

function onThemeChange(preset: ThemePreset) {
  currentPresetId.value = preset.id
  applyThemePreset(preset)
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="header">
        <span>主题配置</span>
        <el-tag type="info">主色 + 撞色</el-tag>
      </div>
    </template>

    <div class="preset-grid">
      <button
        v-for="preset in themePresets"
        :key="preset.id"
        class="preset-item"
        :class="{ active: preset.id === currentPresetId }"
        type="button"
        @click="onThemeChange(preset)"
      >
        <span class="name">{{ preset.name }}</span>
        <span class="colors">
          <span class="swatch" :style="{ backgroundColor: preset.main }"></span>
          <span class="swatch" :style="{ backgroundColor: preset.contrast }"></span>
        </span>
      </button>
    </div>

    <div class="preview">
      <div class="preview-bg">
        <h3 class="preview-title">示例标题（主色）</h3>
        <div class="row">
          <button class="preview-btn" type="button">主按钮</button>
          <span class="preview-tag">标签</span>
          <span class="preview-badge">角标</span>
        </div>
        <div class="row">
          <span class="small-emphasis">小字强调（撞色）</span>
          <span class="selected">选中状态</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.preset-item {
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  padding: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  text-align: left;
}

.preset-item.active {
  border-color: var(--theme-selected-border);
  box-shadow: 0 0 0 2px var(--theme-selected-bg);
}

.name {
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.colors {
  display: flex;
  gap: 8px;
}

.swatch {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.preview {
  margin-top: 16px;
}

.preview-bg {
  border-radius: 14px;
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-soft);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-title {
  margin: 0;
  color: var(--theme-title);
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-btn {
  background: var(--theme-btn-bg);
  color: var(--theme-btn-text);
  border: none;
  border-radius: 10px;
  height: 34px;
  padding: 0 14px;
  font-size: 14px;
}

.preview-tag {
  background: var(--theme-tag-bg);
  color: var(--theme-emphasis);
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
}

.preview-badge {
  background: var(--theme-badge-bg);
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
}

.small-emphasis {
  color: var(--theme-emphasis);
  font-size: 12px;
}

.selected {
  background: var(--theme-selected-bg);
  border: 1px solid var(--theme-selected-border);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
}
</style>
