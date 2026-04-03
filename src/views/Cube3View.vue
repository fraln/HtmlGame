<script setup lang="ts">
import { ref } from 'vue'
import RubiksCube3x3 from '../components/RubiksCube3x3.vue'

const cubeRef = ref<InstanceType<typeof RubiksCube3x3> | null>(null)

const faceMoves = [
  { name: '上', code: 'U', moves: ['U', "U'"] as const },
  { name: '下', code: 'D', moves: ['D', "D'"] as const },
  { name: '前', code: 'F', moves: ['F', "F'"] as const },
  { name: '后', code: 'B', moves: ['B', "B'"] as const },
  { name: '左', code: 'L', moves: ['L', "L'"] as const },
  { name: '右', code: 'R', moves: ['R', "R'"] as const },
] as const

function onMove(m: string) {
  cubeRef.value?.applyMove(m)
}

async function onReset() {
  await cubeRef.value?.resetCube()
}

function onScramble() {
  cubeRef.value?.scrambleCube()
}
</script>

<template>
  <el-card class="page">
    <template #header>
      <span class="cube-title">3×3 魔方</span>
    </template>
    <div class="layout">
      <div class="main">
        <div class="toolbar">
          <el-button type="warning" plain @click="onReset">重置</el-button>
          <el-button type="success" plain @click="onScramble">随机打乱</el-button>
        </div>
        <RubiksCube3x3 ref="cubeRef" class="canvas-wrap" />
        <div class="controls">
          <div v-for="row in faceMoves" :key="row.code" class="row">
            <el-text class="face-label" type="info">{{ row.name }}面</el-text>
            <el-button-group>
              <el-button
                size="small"
                :title="`${row.code}：从外侧看该面，顺时针 90°`"
                @click="onMove(row.moves[0])"
              >
                顺
              </el-button>
              <el-button
                size="small"
                :title="`${row.code}'：从外侧看该面，逆时针 90°`"
                @click="onMove(row.moves[1])"
              >
                逆
              </el-button>
            </el-button-group>
            <el-text class="notation" size="small" type="info">
              {{ row.moves[0] }} / {{ row.moves[1] }}
            </el-text>
          </div>
        </div>
      </div>

      <aside class="manual">
        <el-card shadow="never" class="manual-card">
          <template #header>
            <span>使用手册</span>
          </template>
          <div class="manual-body">
            <section>
              <h4 class="manual-h">视角</h4>
              <p>在左侧视图上按住鼠标拖拽，观察魔方。</p>
            </section>
            <section>
              <h4 class="manual-h">六面称呼与记号</h4>
              <ul class="manual-list">
                <li><strong>上 / U</strong>：顶面</li>
                <li><strong>下 / D</strong>：底面</li>
                <li><strong>前 / F</strong>：前面</li>
                <li><strong>后 / B</strong>：背面</li>
                <li><strong>左 / L</strong>：左侧</li>
                <li><strong>右 / R</strong>：右侧</li>
              </ul>
            </section>
            <section>
              <h4 class="manual-h">「顺」与「逆」</h4>
              <p>
                站在魔方<strong>外侧</strong>、正对某一面的方向看过去：<strong>顺</strong> 表示该层沿
                <strong>顺时针</strong> 转 90°；<strong>逆</strong> 表示
                <strong>逆时针</strong> 转 90°。国际记号中常写作
                <code>U</code> 与 <code>U'</code>（带撇表示逆）。
              </p>
            </section>
          </div>
        </el-card>
      </aside>
    </div>
  </el-card>
</template>

<style scoped>
.page {
  max-width: 1160px;
}

.cube-title {
  font-weight: 600;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
  gap: 20px;
  align-items: start;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .manual {
    order: 3;
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.canvas-wrap {
  margin-bottom: 16px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.face-label {
  min-width: 2.5rem;
}

.notation {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  opacity: 0.85;
}

.manual-card {
  --el-card-padding: 14px;
}

.manual-body {
  font-size: 13px;
  line-height: 1.65;
  color: var(--el-text-color-regular);
}

.manual-body section + section {
  margin-top: 14px;
}

.manual-h {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.manual-body p {
  margin: 0;
}

.manual-list {
  margin: 0;
  padding-left: 1.1rem;
}

.manual-list li {
  margin: 4px 0;
}

.manual-body code {
  padding: 0 4px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  font-size: 12px;
}
</style>
