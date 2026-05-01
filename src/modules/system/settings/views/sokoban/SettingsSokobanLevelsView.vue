<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { SokobanLevel } from '../../../../game/sokoban/levels'

type LevelsResponse = { levels: SokobanLevel[] }
type Tile = '#' | '.' | 'T' | 'B' | 'P' | '*' | '+'
type TileOption = { symbol: Tile; label: string }

const TILE_OPTIONS: TileOption[] = [
  { symbol: '#', label: '墙' },
  { symbol: '.', label: '地板' },
  { symbol: 'T', label: '目标点' },
  { symbol: 'B', label: '箱子' },
  { symbol: 'P', label: '玩家' },
  { symbol: '*', label: '箱子在目标点' },
  { symbol: '+', label: '玩家在目标点' },
]
const TILE_CLASS_MAP: Record<Tile, string> = {
  '#': 'tile-wall',
  '.': 'tile-floor',
  T: 'tile-goal',
  B: 'tile-box',
  P: 'tile-player',
  '*': 'tile-box-goal',
  '+': 'tile-player-goal',
}

const loading = ref(false)
const saving = ref(false)
const levels = ref<SokobanLevel[]>([])
const activeId = ref('')

const editDialogVisible = ref(false)
const addDialogVisible = ref(false)
const editingLevelId = ref('')
const drawTile = ref<Tile>('#')
const editGrid = ref<Tile[][]>([])
const addGrid = ref<Tile[][]>([])
const editLevelName = ref('')
const newLevelName = ref('')
const isMouseDrawing = ref(false)

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
  return rows.map((row) => row.split('') as Tile[])
}

function gridToRows(grid: Tile[][]) {
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

function createBlankGrid(rowCount = 8, colCount = 8) {
  const grid = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => '#' as Tile))
  enforceOuterWalls(grid)
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

function isBorderCell(grid: Tile[][], rowIndex: number, colIndex: number) {
  const rowCount = grid.length
  const colCount = grid[0]?.length ?? 0
  return rowIndex === 0 || colIndex === 0 || rowIndex === rowCount - 1 || colIndex === colCount - 1
}

function enforceOuterWalls(grid: Tile[][]) {
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

function clearExistingPlayer(grid: Tile[][]) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      const tile = grid[r][c]
      if (tile === 'P') grid[r][c] = '.'
      else if (tile === '+') grid[r][c] = 'T'
    }
  }
}

function paintCell(grid: Tile[][], rowIndex: number, colIndex: number, erase = false) {
  const row = grid[rowIndex]
  if (!row) return
  if (isBorderCell(grid, rowIndex, colIndex)) return
  if (erase) {
    row[colIndex] = '.'
    return
  }

  const nextTile = drawTile.value
  if (nextTile === 'P' || nextTile === '+') {
    clearExistingPlayer(grid)
  }
  row[colIndex] = nextTile
}

function startPaint(grid: Tile[][], rowIndex: number, colIndex: number, event: MouseEvent) {
  if (event.button !== 0) return
  isMouseDrawing.value = true
  paintCell(grid, rowIndex, colIndex)
}

function continuePaint(grid: Tile[][], rowIndex: number, colIndex: number, event: MouseEvent) {
  if (!isMouseDrawing.value && event.buttons !== 1) return
  paintCell(grid, rowIndex, colIndex)
}

function stopPaint() {
  isMouseDrawing.value = false
}

function eraseCell(grid: Tile[][], rowIndex: number, colIndex: number, event: MouseEvent) {
  event.preventDefault()
  paintCell(grid, rowIndex, colIndex, true)
}

function resizeGrid(grid: Tile[][], type: 'addRow' | 'removeRow' | 'addCol' | 'removeCol') {
  const rowCount = grid.length
  const colCount = grid[0]?.length ?? 0

  if (type === 'addRow') {
    grid.push(Array.from({ length: colCount || 1 }, () => '#' as Tile))
    enforceOuterWalls(grid)
    return
  }
  if (type === 'removeRow' && rowCount > 1) {
    grid.pop()
    enforceOuterWalls(grid)
    return
  }
  if (type === 'addCol') {
    if (rowCount === 0) {
      grid.push(['#'])
      return
    }
    grid.forEach((row) => row.push('#'))
    enforceOuterWalls(grid)
    return
  }
  if (type === 'removeCol' && colCount > 1) {
    grid.forEach((row) => row.pop())
    enforceOuterWalls(grid)
  }
}

function tileClass(tile: Tile) {
  return TILE_CLASS_MAP[tile]
}

function isGoalTile(tile: Tile) {
  return tile === 'T' || tile === '*' || tile === '+'
}

function isBoxTile(tile: Tile) {
  return tile === 'B' || tile === '*'
}

function isPlayerTile(tile: Tile) {
  return tile === 'P' || tile === '+'
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
onMounted(() => {
  window.addEventListener('mouseup', stopPaint)
})
onUnmounted(() => {
  window.removeEventListener('mouseup', stopPaint)
})
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

  <el-dialog
    v-model="editDialogVisible"
    :title="`编辑关卡：${editingLevel?.name ?? ''}`"
    width="min(920px, 96vw)"
    destroy-on-close
  >
    <div class="dialog-content">
      <el-form label-width="80px">
        <el-form-item label="关卡名称">
          <el-input v-model="editLevelName" maxlength="40" show-word-limit placeholder="请输入关卡名称" />
        </el-form-item>
      </el-form>
      <div class="tools">
        <div class="palette">
          <el-button
            v-for="item in TILE_OPTIONS"
            :key="item.symbol"
            size="small"
            :type="drawTile === item.symbol ? 'primary' : 'default'"
            @click="drawTile = item.symbol"
          >
            {{ item.label }}
          </el-button>
        </div>
        <div class="size-actions">
          <el-button size="small" @click="resizeGrid(editGrid, 'addRow')">新增行</el-button>
          <el-button size="small" @click="resizeGrid(editGrid, 'removeRow')">减少行</el-button>
          <el-button size="small" @click="resizeGrid(editGrid, 'addCol')">新增列</el-button>
          <el-button size="small" @click="resizeGrid(editGrid, 'removeCol')">减少列</el-button>
        </div>
      </div>

      <div
        class="grid-board"
        :style="{ gridTemplateColumns: `repeat(${editGrid[0]?.length ?? 1}, 32px)` }"
        @mouseup="stopPaint"
      >
        <button
          v-for="(tile, idx) in editGrid.flat()"
          :key="idx"
          class="grid-cell"
          :class="[
            tileClass(tile),
            { immutable: isBorderCell(editGrid, Math.floor(idx / (editGrid[0]?.length || 1)), idx % (editGrid[0]?.length || 1)) },
          ]"
          type="button"
          @mousedown="startPaint(editGrid, Math.floor(idx / (editGrid[0]?.length || 1)), idx % (editGrid[0]?.length || 1), $event)"
          @mouseenter="continuePaint(editGrid, Math.floor(idx / (editGrid[0]?.length || 1)), idx % (editGrid[0]?.length || 1), $event)"
          @mouseup="stopPaint"
          @contextmenu="eraseCell(editGrid, Math.floor(idx / (editGrid[0]?.length || 1)), idx % (editGrid[0]?.length || 1), $event)"
        >
          <span v-if="isGoalTile(tile)" class="goal-dot" />
          <span v-if="isBoxTile(tile)" class="box" />
          <span v-if="isPlayerTile(tile)" class="player" />
        </button>
      </div>
    </div>

    <template #footer>
      <el-button @click="editDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveEditedLevel">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="addDialogVisible" title="新增关卡" width="min(920px, 96vw)" destroy-on-close>
    <div class="dialog-content">
      <el-form label-width="80px">
        <el-form-item label="关卡名称">
          <el-input v-model="newLevelName" maxlength="40" show-word-limit placeholder="请输入关卡名称" />
        </el-form-item>
      </el-form>
      <div class="tools">
        <div class="palette">
          <el-button
            v-for="item in TILE_OPTIONS"
            :key="item.symbol"
            size="small"
            :type="drawTile === item.symbol ? 'primary' : 'default'"
            @click="drawTile = item.symbol"
          >
            {{ item.symbol }} {{ item.label }}
          </el-button>
        </div>
        <div class="size-actions">
          <el-button size="small" @click="resizeGrid(addGrid, 'addRow')">+ 行</el-button>
          <el-button size="small" @click="resizeGrid(addGrid, 'removeRow')">- 行</el-button>
          <el-button size="small" @click="resizeGrid(addGrid, 'addCol')">+ 列</el-button>
          <el-button size="small" @click="resizeGrid(addGrid, 'removeCol')">- 列</el-button>
        </div>
      </div>

      <div
        class="grid-board"
        :style="{ gridTemplateColumns: `repeat(${addGrid[0]?.length ?? 1}, 32px)` }"
        @mouseup="stopPaint"
      >
        <button
          v-for="(tile, idx) in addGrid.flat()"
          :key="idx"
          class="grid-cell"
          :class="[
            tileClass(tile),
            { immutable: isBorderCell(addGrid, Math.floor(idx / (addGrid[0]?.length || 1)), idx % (addGrid[0]?.length || 1)) },
          ]"
          type="button"
          @mousedown="startPaint(addGrid, Math.floor(idx / (addGrid[0]?.length || 1)), idx % (addGrid[0]?.length || 1), $event)"
          @mouseenter="continuePaint(addGrid, Math.floor(idx / (addGrid[0]?.length || 1)), idx % (addGrid[0]?.length || 1), $event)"
          @mouseup="stopPaint"
          @contextmenu="eraseCell(addGrid, Math.floor(idx / (addGrid[0]?.length || 1)), idx % (addGrid[0]?.length || 1), $event)"
        >
          <span v-if="isGoalTile(tile)" class="goal-dot" />
          <span v-if="isBoxTile(tile)" class="box" />
          <span v-if="isPlayerTile(tile)" class="player" />
        </button>
      </div>
    </div>

    <template #footer>
      <el-button @click="addDialogVisible = false">取消</el-button>
      <el-button type="success" :loading="saving" @click="saveNewLevel">新增并保存</el-button>
    </template>
  </el-dialog>
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

.preview {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tools {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.palette,
.size-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.grid-board {
  display: grid;
  gap: 4px;
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  max-height: 56vh;
}

.grid-cell {
  position: relative;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
}

.grid-cell.immutable {
  cursor: not-allowed;
  box-shadow: inset 0 0 0 1px #111827;
}

.tile-wall {
  background: color-mix(in srgb, var(--text-h) 72%, #111827);
}

.tile-floor {
  background: color-mix(in srgb, var(--border) 26%, transparent);
}

.tile-goal {
  background: color-mix(in srgb, var(--border) 26%, transparent);
}

.tile-box {
  background: color-mix(in srgb, var(--border) 26%, transparent);
}

.tile-player {
  background: color-mix(in srgb, var(--border) 26%, transparent);
}

.tile-box-goal {
  background: color-mix(in srgb, var(--border) 26%, transparent);
}

.tile-player-goal {
  background: color-mix(in srgb, var(--border) 26%, transparent);
}

.goal-dot {
  position: absolute;
  width: 34%;
  height: 34%;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 75%, #fbbf24);
  z-index: 3;
}

.box,
.player {
  position: absolute;
  border-radius: 6px;
}

.box {
  inset: 14%;
  background: #f59e0b;
  border: 1px solid #b45309;
  z-index: 2;
}

.player {
  inset: 20%;
  border-radius: 50%;
  background: #2563eb;
  border: 1px solid #1d4ed8;
  z-index: 4;
}

@media (max-width: 720px) {
  .card-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
