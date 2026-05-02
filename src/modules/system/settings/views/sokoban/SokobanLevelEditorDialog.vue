<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

export type SokobanEditorTile = '#' | '.' | 'T' | 'B' | 'P' | '*' | '+'

type TileOption = { symbol: SokobanEditorTile; label: string }

const TILE_OPTIONS: TileOption[] = [
  { symbol: '#', label: '墙' },
  { symbol: '.', label: '地板' },
  { symbol: 'T', label: '目标点' },
  { symbol: 'B', label: '箱子' },
  { symbol: 'P', label: '玩家' },
  { symbol: '*', label: '箱子在目标点' },
  { symbol: '+', label: '玩家在目标点' },
]

const TILE_CLASS_MAP: Record<SokobanEditorTile, string> = {
  '#': 'tile-wall',
  '.': 'tile-floor',
  T: 'tile-goal',
  B: 'tile-box',
  P: 'tile-player',
  '*': 'tile-box-goal',
  '+': 'tile-player-goal',
}

const props = withDefaults(
  defineProps<{
    mode: 'edit' | 'add'
    title: string
    saving?: boolean
  }>(),
  { saving: false },
)

const emit = defineEmits<{
  (e: 'confirm'): void
}>()

const visible = defineModel<boolean>({ required: true })
const levelName = defineModel<string>('levelName', { required: true })
const grid = defineModel<SokobanEditorTile[][]>('grid', { required: true })
const drawTile = defineModel<SokobanEditorTile>('drawTile', { required: true })

const isMouseDrawing = ref(false)

const colCount = computed(() => grid.value[0]?.length ?? 1)

const submitLabel = computed(() => (props.mode === 'add' ? '新增并保存' : '保存'))
const submitButtonType = computed(() => (props.mode === 'add' ? 'success' : 'primary'))

function isBorderCell(gridArg: SokobanEditorTile[][], rowIndex: number, colIndex: number) {
  const rowCount = gridArg.length
  const colCountLocal = gridArg[0]?.length ?? 0
  return rowIndex === 0 || colIndex === 0 || rowIndex === rowCount - 1 || colIndex === colCountLocal - 1
}

function enforceOuterWalls(gridArg: SokobanEditorTile[][]) {
  if (!gridArg.length || !gridArg[0]?.length) return
  const lastRow = gridArg.length - 1
  const lastCol = gridArg[0].length - 1
  for (let r = 0; r <= lastRow; r++) {
    for (let c = 0; c <= lastCol; c++) {
      if (r === 0 || c === 0 || r === lastRow || c === lastCol) {
        gridArg[r][c] = '#'
      }
    }
  }
}

function clearExistingPlayer(gridArg: SokobanEditorTile[][]) {
  for (let r = 0; r < gridArg.length; r++) {
    for (let c = 0; c < (gridArg[r]?.length ?? 0); c++) {
      const tile = gridArg[r][c]
      if (tile === 'P') gridArg[r][c] = '.'
      else if (tile === '+') gridArg[r][c] = 'T'
    }
  }
}

function paintCell(gridArg: SokobanEditorTile[][], rowIndex: number, colIndex: number, erase = false) {
  const row = gridArg[rowIndex]
  if (!row) return
  if (isBorderCell(gridArg, rowIndex, colIndex)) return
  if (erase) {
    row[colIndex] = '.'
    return
  }

  const nextTile = drawTile.value
  if (nextTile === 'P' || nextTile === '+') {
    clearExistingPlayer(gridArg)
  }
  row[colIndex] = nextTile
}

function startPaint(gridArg: SokobanEditorTile[][], rowIndex: number, colIndex: number, event: MouseEvent) {
  if (event.button !== 0) return
  isMouseDrawing.value = true
  paintCell(gridArg, rowIndex, colIndex)
}

function continuePaint(gridArg: SokobanEditorTile[][], rowIndex: number, colIndex: number, event: MouseEvent) {
  if (!isMouseDrawing.value && event.buttons !== 1) return
  paintCell(gridArg, rowIndex, colIndex)
}

function stopPaint() {
  isMouseDrawing.value = false
}

function eraseCell(gridArg: SokobanEditorTile[][], rowIndex: number, colIndex: number, event: MouseEvent) {
  event.preventDefault()
  paintCell(gridArg, rowIndex, colIndex, true)
}

function resizeGrid(gridArg: SokobanEditorTile[][], type: 'addRow' | 'removeRow' | 'addCol' | 'removeCol') {
  const rowCount = gridArg.length
  const colCountLocal = gridArg[0]?.length ?? 0

  if (type === 'addRow') {
    const prevRows = rowCount
    const w = colCountLocal || 1
    const newRow = Array.from({ length: w }, (_, c) =>
      w <= 2 || c === 0 || c === w - 1 ? ('#' as SokobanEditorTile) : ('.' as SokobanEditorTile),
    )
    gridArg.push(newRow)
    if (prevRows >= 2) {
      const innerRow = gridArg[prevRows - 1]
      const end = (innerRow?.length ?? 0) - 1
      for (let c = 1; c < end; c++) {
        innerRow[c] = '.'
      }
    }
    enforceOuterWalls(gridArg)
    return
  }
  if (type === 'removeRow' && rowCount > 1) {
    gridArg.pop()
    enforceOuterWalls(gridArg)
    return
  }
  if (type === 'addCol') {
    if (rowCount === 0) {
      gridArg.push(['#'])
      return
    }
    const prevCols = colCountLocal
    const lastRowBefore = rowCount - 1
    gridArg.forEach((row, r) => {
      const edgeRow = r === 0 || r === lastRowBefore
      row.push(edgeRow ? ('#' as SokobanEditorTile) : ('.' as SokobanEditorTile))
    })
    if (prevCols >= 2) {
      const newLast = gridArg[0].length - 1
      for (let r = 1; r < gridArg.length - 1; r++) {
        const row = gridArg[r]
        if (row) row[newLast - 1] = '.'
      }
    }
    enforceOuterWalls(gridArg)
    return
  }
  if (type === 'removeCol' && colCountLocal > 1) {
    gridArg.forEach((row) => row.pop())
    enforceOuterWalls(gridArg)
  }
}

function tileClass(tile: SokobanEditorTile) {
  return TILE_CLASS_MAP[tile]
}

function isGoalTile(tile: SokobanEditorTile) {
  return tile === 'T' || tile === '*' || tile === '+'
}

function isBoxTile(tile: SokobanEditorTile) {
  return tile === 'B' || tile === '*'
}

function isPlayerTile(tile: SokobanEditorTile) {
  return tile === 'P' || tile === '+'
}

function onCancel() {
  visible.value = false
}

onMounted(() => {
  window.addEventListener('mouseup', stopPaint)
})
onUnmounted(() => {
  window.removeEventListener('mouseup', stopPaint)
})
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="min(920px, 96vw)" destroy-on-close>
    <div class="dialog-content">
      <el-form label-width="80px">
        <el-form-item label="关卡名称">
          <el-input v-model="levelName" maxlength="40" show-word-limit placeholder="请输入关卡名称" />
        </el-form-item>
      </el-form>
      <div class="tools">
        <div class="palette">
          <el-button
            v-for="item in TILE_OPTIONS"
            :key="item.symbol"
            class="palette-btn"
            size="small"
            :type="drawTile === item.symbol ? 'primary' : 'default'"
            @click="drawTile = item.symbol"
          >
            <span class="palette-row">
              <span class="palette-swatch" :class="tileClass(item.symbol)">
                <span v-if="isGoalTile(item.symbol)" class="goal-dot" />
                <span v-if="isBoxTile(item.symbol)" class="box" />
                <span v-if="isPlayerTile(item.symbol)" class="player" />
              </span>
              <span class="palette-label">{{ item.label }}</span>
            </span>
          </el-button>
        </div>
        <div class="size-actions">
          <el-button size="small" @click="resizeGrid(grid, 'addRow')">新增行</el-button>
          <el-button size="small" @click="resizeGrid(grid, 'removeRow')">减少行</el-button>
          <el-button size="small" @click="resizeGrid(grid, 'addCol')">新增列</el-button>
          <el-button size="small" @click="resizeGrid(grid, 'removeCol')">减少列</el-button>
        </div>
      </div>

      <div
        class="grid-board"
        :style="{ gridTemplateColumns: `repeat(${colCount}, 32px)` }"
        @mouseup="stopPaint"
      >
        <button
          v-for="(tile, idx) in grid.flat()"
          :key="idx"
          class="grid-cell"
          :class="[
            tileClass(tile),
            { immutable: isBorderCell(grid, Math.floor(idx / colCount), idx % colCount) },
          ]"
          type="button"
          @mousedown="startPaint(grid, Math.floor(idx / colCount), idx % colCount, $event)"
          @mouseenter="continuePaint(grid, Math.floor(idx / colCount), idx % colCount, $event)"
          @mouseup="stopPaint"
          @contextmenu="eraseCell(grid, Math.floor(idx / colCount), idx % colCount, $event)"
        >
          <span v-if="isGoalTile(tile)" class="goal-dot" />
          <span v-if="isBoxTile(tile)" class="box" />
          <span v-if="isPlayerTile(tile)" class="player" />
        </button>
      </div>
    </div>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button :type="submitButtonType" :loading="saving" @click="emit('confirm')">
        {{ submitLabel }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
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

.palette-btn :deep(.el-button__inner) {
  display: inline-flex;
  align-items: center;
}

.palette-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.palette-swatch {
  position: relative;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 1px solid var(--el-border-color);
  flex-shrink: 0;
  box-sizing: border-box;
}

.palette-swatch .goal-dot {
  width: 38%;
  height: 38%;
}

.palette-swatch .box {
  inset: 12%;
}

.palette-swatch .player {
  inset: 18%;
}

.palette-label {
  line-height: 1.2;
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
  z-index: 10;
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
</style>
