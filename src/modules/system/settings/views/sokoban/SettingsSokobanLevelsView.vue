<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { SokobanLevel } from '../../../../game/sokoban/levels'
import SokobanLevelEditorDialog from './SokobanLevelEditorDialog.vue'
import type { SokobanEditorTile } from './SokobanLevelEditorDialog.vue'

type LevelsResponse = { levels: SokobanLevel[] }

const loading = ref(false)
const saving = ref(false)
const levels = ref<SokobanLevel[]>([])
const activeId = ref('')

const editDialogVisible = ref(false)
const addDialogVisible = ref(false)
const editingLevelId = ref('')
const drawTile = ref<SokobanEditorTile>('#')
const editGrid = ref<SokobanEditorTile[][]>([])
const addGrid = ref<SokobanEditorTile[][]>([])
const editLevelName = ref('')
const newLevelName = ref('')

const activeLevel = computed(() => levels.value.find((level) => level.id === activeId.value) ?? null)
const editingLevel = computed(() => levels.value.find((level) => level.id === editingLevelId.value) ?? null)

function nextLevelId(currentLevels: SokobanLevel[]) {
  const maxSuffix = currentLevels.reduce((max, level) => {
    const match = /^l(\d+)$/.exec(level.id)
    if (!match) return max
    const suffix = Number(match[1])
    return Number.isFinite(suffix) ? Math.max(max, suffix) : max
  }, 0)
  return `l${maxSuffix + 1}`
}

function rowsToGrid(rows: string[]) {
  return rows.map((row) => row.split('') as SokobanEditorTile[])
}

function gridToRows(grid: SokobanEditorTile[][]) {
  return grid.map((line) => line.join(''))
}

function validateRows(rows: string[]) {
  if (rows.length === 0) return '关卡至少要有一行'
  const width = rows[0]?.length ?? 0
  if (width === 0) return '关卡至少要有一列'

  const validPattern = /^[#.TBP*+]+$/
  for (const row of rows) {
    if (row.length !== width) return '所有行长度必须一致'
    if (!validPattern.test(row)) return '仅允许字符 # . T B P * +'
  }

  const text = rows.join('')
  const players = (text.match(/[P+]/g) ?? []).length
  const boxes = (text.match(/[B*]/g) ?? []).length
  const goals = (text.match(/[T*+]/g) ?? []).length

  if (players !== 1) return '玩家数量必须为 1（P 或 +）'
  if (boxes === 0) return '至少需要 1 个箱子'
  if (boxes !== goals) return '箱子数量必须与目标点数量一致'
  return null
}

function fillInteriorFloor(grid: SokobanEditorTile[][]) {
  if (!grid.length || !grid[0]?.length) return
  const lr = grid.length - 1
  const lc = grid[0].length - 1
  for (let r = 1; r < lr; r++) {
    for (let c = 1; c < lc; c++) {
      grid[r][c] = '.'
    }
  }
}

function enforceOuterWalls(grid: SokobanEditorTile[][]) {
  if (!grid.length || !grid[0]?.length) return
  const lastRow = grid.length - 1
  const lastCol = grid[0].length - 1
  for (let r = 0; r <= lastRow; r++) {
    for (let c = 0; c <= lastCol; c++) {
      if (r === 0 || c === 0 || r === lastRow || c === lastCol) {
        grid[r][c] = '#'
      }
    }
  }
}

function createBlankGrid(rowCount = 8, colCount = 8) {
  const grid = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => '#' as SokobanEditorTile),
  )
  enforceOuterWalls(grid)
  fillInteriorFloor(grid)
  return grid
}

function openEditDialog(level: SokobanLevel) {
  editingLevelId.value = level.id
  editLevelName.value = level.name
  drawTile.value = '#'
  editGrid.value = rowsToGrid(level.rows)
  enforceOuterWalls(editGrid.value)
  editDialogVisible.value = true
}

function openAddDialog() {
  const baseRows = activeLevel.value?.rows ?? []
  const rowCount = baseRows.length || 8
  const colCount = baseRows[0]?.length || 8
  const nextId = nextLevelId(levels.value)
  newLevelName.value = `自定义 ${nextId.slice(1)}`
  drawTile.value = '#'
  addGrid.value = createBlankGrid(rowCount, colCount)
  addDialogVisible.value = true
}

async function loadLevels() {
  loading.value = true
  try {
    const response = await fetch('/api/sokoban-levels')
    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || `读取失败（${response.status}）`)
    }
    const data = (await response.json()) as LevelsResponse
    levels.value = data.levels
    if (!levels.value.length) {
      activeId.value = ''
      return
    }
    if (!levels.value.some((level) => level.id === activeId.value)) {
      activeId.value = levels.value[0].id
    }
  } catch (error) {
    ElMessage.error(`加载关卡失败：${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

async function persistLevels(nextLevels: SokobanLevel[]) {
  saving.value = true
  try {
    const response = await fetch('/api/sokoban-levels', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levels: nextLevels }),
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      throw new Error(payload?.message ?? `保存失败（${response.status}）`)
    }
    const data = (await response.json()) as LevelsResponse
    levels.value = data.levels
    ElMessage.success('已保存到关卡文件')
  } catch (error) {
    ElMessage.error(`保存失败：${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    saving.value = false
  }
}

async function saveEditedLevel() {
  if (!editingLevel.value) return
  const trimmedName = editLevelName.value.trim()
  if (!trimmedName) {
    ElMessage.warning('关卡名称不能为空')
    return
  }
  const rows = gridToRows(editGrid.value)
  const invalid = validateRows(rows)
  if (invalid) {
    ElMessage.warning(invalid)
    return
  }

  const nextLevels = levels.value.map((level) =>
    level.id === editingLevel.value?.id ? { ...level, name: trimmedName, rows } : level,
  )
  await persistLevels(nextLevels)
  editDialogVisible.value = false
}

async function saveNewLevel() {
  const trimmedName = newLevelName.value.trim()
  if (!trimmedName) {
    ElMessage.warning('关卡名称不能为空')
    return
  }
  const rows = gridToRows(addGrid.value)
  const invalid = validateRows(rows)
  if (invalid) {
    ElMessage.warning(invalid)
    return
  }

  const id = nextLevelId(levels.value)
  const newLevel: SokobanLevel = { id, name: trimmedName, rows }
  const nextLevels = [...levels.value, newLevel]
  await persistLevels(nextLevels)
  activeId.value = id
  addDialogVisible.value = false
}

onMounted(loadLevels)
</script>

<template>
  <el-card class="sokoban-levels-card" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>推箱子关卡样式管理</span>
        <div class="header-actions">
          <el-button type="success" @click="openAddDialog">新增关卡</el-button>
          <el-button type="primary" :loading="loading" @click="loadLevels">刷新</el-button>
        </div>
      </div>
    </template>

    <div class="level-list">
      <div v-for="level in levels" :key="level.id" class="level-row">
        <div class="level-meta">
          <strong>{{ level.name }}</strong>
        </div>
        <el-button size="small" type="primary" plain @click="openEditDialog(level)">编辑</el-button>
      </div>
    </div>
  </el-card>

  <SokobanLevelEditorDialog
    v-model="editDialogVisible"
    v-model:level-name="editLevelName"
    v-model:grid="editGrid"
    v-model:draw-tile="drawTile"
    mode="edit"
    :title="`编辑关卡：${editingLevel?.name ?? ''}`"
    :saving="saving"
    @confirm="saveEditedLevel"
  />

  <SokobanLevelEditorDialog
    v-model="addDialogVisible"
    v-model:level-name="newLevelName"
    v-model:grid="addGrid"
    v-model:draw-tile="drawTile"
    mode="add"
    title="新增关卡"
    :saving="saving"
    @confirm="saveNewLevel"
  />
</template>

<style scoped>
.sokoban-levels-card {
  text-align: left;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.level-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.level-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.level-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.level-meta small {
  color: var(--el-text-color-secondary);
}

@media (max-width: 720px) {
  .card-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
