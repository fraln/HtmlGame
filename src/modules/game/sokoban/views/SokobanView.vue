<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { SOKOBAN_LEVELS, type SokobanLevel } from '../levels'

type Dir = 'up' | 'down' | 'left' | 'right'
type Pos = { r: number; c: number }
type Tile = 'wall' | 'floor' | 'goal'
type Snapshot = { player: Pos; boxes: Pos[]; steps: number }

const STORAGE_KEY = 'htmlgame:sokoban:best'

const LEVELS: SokobanLevel[] = SOKOBAN_LEVELS

const levelIndex = ref(0)
const board = ref<Tile[][]>([])
const player = ref<Pos>({ r: 0, c: 0 })
const boxes = ref<Pos[]>([])
const goals = ref<Pos[]>([])
const steps = ref(0)
const won = ref(false)
const history = ref<Snapshot[]>([])
const bestSteps = ref<Record<string, number>>({})
const boardRef = ref<HTMLElement | null>(null)
const touchStart = ref<Pos | null>(null)

const currentLevel = computed(() => LEVELS[levelIndex.value])
const rowsCount = computed(() => board.value.length)
const colsCount = computed(() => board.value[0]?.length ?? 0)
const statusText = computed(() => (won.value ? '已通关' : '进行中'))
const levelBest = computed(() => bestSteps.value[currentLevel.value.id] ?? null)
const boardSizeText = computed(() => `${colsCount.value} x ${rowsCount.value}`)

function keyOf(r: number, c: number) {
  return `${r},${c}`
}

function samePos(a: Pos, b: Pos) {
  return a.r === b.r && a.c === b.c
}

function hasBox(r: number, c: number) {
  return boxes.value.some((b) => b.r === r && b.c === c)
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < rowsCount.value && c >= 0 && c < colsCount.value
}

function isWall(r: number, c: number) {
  if (!inBounds(r, c)) return true
  return board.value[r][c] === 'wall'
}

function isGoal(r: number, c: number) {
  return goals.value.some((g) => g.r === r && g.c === c)
}

function cloneBoxes(src: Pos[]) {
  return src.map((x) => ({ ...x }))
}

function snapshot() {
  return {
    player: { ...player.value },
    boxes: cloneBoxes(boxes.value),
    steps: steps.value,
  }
}

function parseLevel(level: SokobanLevel) {
  const grid: Tile[][] = []
  const goalList: Pos[] = []
  const boxList: Pos[] = []
  let p: Pos | null = null

  const width = Math.max(...level.rows.map((x) => x.length))
  for (let r = 0; r < level.rows.length; r++) {
    const row = level.rows[r].padEnd(width, '#')
    const parsed: Tile[] = []
    for (let c = 0; c < width; c++) {
      const ch = row[c]
      if (ch === '#') {
        parsed.push('wall')
      } else if (ch === 'T') {
        parsed.push('goal')
        goalList.push({ r, c })
      } else if (ch === 'B') {
        parsed.push('floor')
        boxList.push({ r, c })
      } else if (ch === 'P') {
        parsed.push('floor')
        p = { r, c }
      } else if (ch === '*') {
        parsed.push('goal')
        goalList.push({ r, c })
        boxList.push({ r, c })
      } else if (ch === '+') {
        parsed.push('goal')
        goalList.push({ r, c })
        p = { r, c }
      } else {
        parsed.push('floor')
      }
    }
    grid.push(parsed)
  }

  if (!p) throw new Error(`关卡 ${level.id} 缺少玩家起点`)
  if (goalList.length === 0) throw new Error(`关卡 ${level.id} 缺少目标点`)
  if (goalList.length !== boxList.length) throw new Error(`关卡 ${level.id} 箱子数与目标点数不一致`)

  board.value = grid
  goals.value = goalList
  boxes.value = boxList
  player.value = p
  steps.value = 0
  won.value = false
  history.value = []
}

function loadBest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, number>
    if (parsed && typeof parsed === 'object') bestSteps.value = parsed
  } catch {
    bestSteps.value = {}
  }
}

function saveBestIfNeeded() {
  if (!won.value) return
  const levelId = currentLevel.value.id
  const old = bestSteps.value[levelId]
  if (old && old <= steps.value) return
  bestSteps.value = { ...bestSteps.value, [levelId]: steps.value }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bestSteps.value))
}

function checkWin() {
  const boxSet = new Set(boxes.value.map((b) => keyOf(b.r, b.c)))
  won.value = goals.value.every((g) => boxSet.has(keyOf(g.r, g.c)))
  if (won.value) saveBestIfNeeded()
}

function resetLevel() {
  parseLevel(currentLevel.value)
  checkWin()
}

function switchLevel(next: number) {
  levelIndex.value = Math.min(Math.max(next, 0), LEVELS.length - 1)
  resetLevel()
}

function undo() {
  if (history.value.length === 0) return
  const prev = history.value.pop()
  if (!prev) return
  player.value = { ...prev.player }
  boxes.value = cloneBoxes(prev.boxes)
  steps.value = prev.steps
  won.value = false
  checkWin()
}

function move(dir: Dir) {
  if (won.value) return

  const d =
    dir === 'up'
      ? { r: -1, c: 0 }
      : dir === 'down'
        ? { r: 1, c: 0 }
        : dir === 'left'
          ? { r: 0, c: -1 }
          : { r: 0, c: 1 }

  const nr = player.value.r + d.r
  const nc = player.value.c + d.c
  if (isWall(nr, nc)) return

  const boxIdx = boxes.value.findIndex((b) => b.r === nr && b.c === nc)
  if (boxIdx >= 0) {
    const br = nr + d.r
    const bc = nc + d.c
    if (isWall(br, bc) || hasBox(br, bc)) return
    history.value.push(snapshot())
    boxes.value[boxIdx] = { r: br, c: bc }
    player.value = { r: nr, c: nc }
    steps.value++
    checkWin()
    return
  }

  history.value.push(snapshot())
  player.value = { r: nr, c: nc }
  steps.value++
  checkWin()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key.startsWith('Arrow')) e.preventDefault()
  if (e.key === 'r' || e.key === 'R') {
    resetLevel()
    return
  }
  if (e.key === 'u' || e.key === 'U') {
    undo()
    return
  }
  if (e.key === '[') {
    switchLevel(levelIndex.value - 1)
    return
  }
  if (e.key === ']') {
    switchLevel(levelIndex.value + 1)
    return
  }
  if (e.key === 'ArrowUp') move('up')
  else if (e.key === 'ArrowDown') move('down')
  else if (e.key === 'ArrowLeft') move('left')
  else if (e.key === 'ArrowRight') move('right')
}

function onBoardTouchStart(e: TouchEvent) {
  const t = e.changedTouches[0]
  if (!t) return
  touchStart.value = { r: t.clientY, c: t.clientX }
}

function onBoardTouchEnd(e: TouchEvent) {
  if (!touchStart.value || won.value) return
  const t = e.changedTouches[0]
  if (!t) return
  const dx = t.clientX - touchStart.value.c
  const dy = t.clientY - touchStart.value.r
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  touchStart.value = null

  // 避免误触：短距离滑动不触发移动
  const minSwipe = 24
  if (absX < minSwipe && absY < minSwipe) return
  if (absX > absY) move(dx > 0 ? 'right' : 'left')
  else move(dy > 0 ? 'down' : 'up')
}

const displayCells = computed(() =>
  board.value.map((row, r) =>
    row.map((tile, c) => ({
      wall: tile === 'wall',
      goal: isGoal(r, c),
      box: hasBox(r, c),
      player: samePos(player.value, { r, c }),
    })),
  ),
)

onMounted(() => {
  loadBest()
  resetLevel()
  window.addEventListener('keydown', onKeydown)
  boardRef.value?.addEventListener('touchstart', onBoardTouchStart, { passive: true })
  boardRef.value?.addEventListener('touchend', onBoardTouchEnd, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  boardRef.value?.removeEventListener('touchstart', onBoardTouchStart)
  boardRef.value?.removeEventListener('touchend', onBoardTouchEnd)
})
</script>

<template>
  <div class="sokoban-page">
    <el-card class="card">
      <template #header>
        <div class="header">
          <span>推箱子</span>
          <el-tag size="small" :type="won ? 'success' : 'info'">{{ statusText }}</el-tag>
        </div>
      </template>

      <div class="layout">
        <section class="board-wrap">
          <div
            ref="boardRef"
            class="board"
            role="grid"
            :aria-rowcount="rowsCount"
            :aria-colcount="colsCount"
            aria-label="推箱子棋盘"
            :style="{ gridTemplateColumns: `repeat(${colsCount}, minmax(0, 1fr))` }"
          >
            <div
              v-for="(cell, idx) in displayCells.flat()"
              :key="idx"
              class="cell"
              :class="{ wall: cell.wall, floor: !cell.wall }"
            >
              <span v-if="cell.goal" class="goal-dot" />
              <span v-if="cell.box" class="box" />
              <span v-if="cell.player" class="player" />
            </div>
          </div>
        </section>

        <aside class="side">
          <div class="stat">
            <span class="label">关卡</span>
            <span class="value">{{ levelIndex + 1 }} / {{ LEVELS.length }}</span>
          </div>
          <div class="stat">
            <span class="label">名称</span>
            <span class="value value-sm">{{ currentLevel.name }}</span>
          </div>
          <div class="stat">
            <span class="label">尺寸</span>
            <span class="value value-sm">{{ boardSizeText }}</span>
          </div>
          <div class="stat">
            <span class="label">步数</span>
            <span class="value">{{ steps }}</span>
          </div>
          <div class="stat">
            <span class="label">最佳</span>
            <span class="value">{{ levelBest ?? '-' }}</span>
          </div>

          <div class="actions">
            <el-button :disabled="levelIndex <= 0" @click="switchLevel(levelIndex - 1)">上一关</el-button>
            <el-button :disabled="levelIndex >= LEVELS.length - 1" @click="switchLevel(levelIndex + 1)">
              下一关
            </el-button>
            <el-button type="primary" @click="resetLevel">重开 (R)</el-button>
            <el-button :disabled="history.length === 0" @click="undo">撤销 (U)</el-button>
          </div>

          <p class="hint">方向键移动玩家，推动箱子覆盖所有目标点即可通关。</p>
          <p class="hint">快捷键：`[` / `]` 切关，R 重开，U 撤销一步。</p>
          <p v-if="won" class="pass">通关！可切换下一关继续挑战。</p>
        </aside>
      </div>

      <div class="touch-controls" aria-label="触控方向键">
        <div class="touch-grid">
          <span class="touch-placeholder" />
          <el-button class="touch-btn" :disabled="won" @click="move('up')">上</el-button>
          <span class="touch-placeholder" />
          <el-button class="touch-btn" :disabled="won" @click="move('left')">左</el-button>
          <el-button class="touch-btn" type="primary" :disabled="won" @click="move('down')">下</el-button>
          <el-button class="touch-btn" :disabled="won" @click="move('right')">右</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.sokoban-page {
  max-width: min(96vw, 760px);
  margin: 0 auto;
  text-align: left;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.layout {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(16px, 4vw, 24px);
  align-items: flex-start;
  justify-content: center;
}

.board-wrap {
  width: 100%;
  max-width: min(420px, calc(100vw - 48px));
  margin: 0 auto;
}

.board {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--code-bg);
  box-sizing: border-box;
  touch-action: none;
  user-select: none;
}

.cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  display: grid;
  place-items: center;
}

.cell.floor {
  background: color-mix(in srgb, var(--border) 26%, transparent);
}

.cell.wall {
  background: color-mix(in srgb, var(--text-h) 72%, #111827);
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
  inset: 14%;
  border-radius: 6px;
}

.box {
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

.side {
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.stat .label {
  color: var(--text);
  font-size: 14px;
}

.stat .value {
  font-family: var(--mono);
  font-size: 20px;
  color: var(--text-h);
}

.stat .value-sm {
  font-size: 16px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
  max-width: 280px;
}

.pass {
  margin: 0;
  font-weight: 500;
  color: #22c55e;
}

.touch-controls {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.touch-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(6px, 2.2vw, 10px);
  max-width: min(92vw, 360px);
  margin: 0 auto;
}

.touch-placeholder {
  display: block;
}

.touch-btn {
  min-height: clamp(40px, 11vw, 48px);
  touch-action: manipulation;
}

@media (max-width: 768px) {
  .layout {
    flex-direction: column;
    align-items: stretch;
  }

  .board-wrap {
    max-width: min(92vw, 420px);
  }

  .board {
    padding: clamp(8px, 2.8vw, 12px);
    gap: clamp(3px, 1vw, 4px);
    border-radius: clamp(10px, 2.6vw, 12px);
  }

  .cell {
    border-radius: clamp(6px, 1.8vw, 8px);
  }

  .side {
    min-width: 0;
    width: 100%;
    max-width: min(92vw, 420px);
    margin: 0 auto;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hint {
    max-width: none;
    font-size: clamp(12px, 3.4vw, 14px);
  }
}

@media (max-width: 480px) {
  .sokoban-page {
    max-width: 100vw;
  }

  .board-wrap,
  .side {
    max-width: calc(100vw - 24px);
  }

  .stat .value {
    font-size: 18px;
  }

  .touch-controls {
    position: sticky;
    bottom: 0;
    background: var(--bg);
    z-index: 2;
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0));
  }

  .touch-grid {
    max-width: min(96vw, 420px);
  }

  .touch-btn {
    min-height: 48px;
  }
}
</style>
