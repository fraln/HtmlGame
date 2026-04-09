<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from 'vue'

/** 从 1 级升到 2 级所需累计分；之后每升一级所需分数为上一段的 2 倍 */
const FIRST_SEGMENT = 200

/** 达到等级 L 所需的最低累计分（L=1 为 0） */
function cum(level: number): number {
  if (level <= 1) return 0
  return FIRST_SEGMENT * (2 ** (level - 1) - 1)
}

function levelFromScore(s: number) {
  let L = 1
  while (s >= cum(L + 1)) L++
  return L
}

/** 当前等级段长度（本段内再得多少分升级） */
function segmentSizeForLevel(L: number) {
  return cum(L + 1) - cum(L)
}

const INITIAL_DROP_MS = 900
const SPEED_FACTOR = 1.5
const MIN_DROP_MS = 50

function dropIntervalMs(lv: number) {
  return Math.max(MIN_DROP_MS, INITIAL_DROP_MS / SPEED_FACTOR ** (lv - 1))
}

/** 10×(2 隐藏 + 20 可见) */
const COLS = 10
const HIDDEN = 2
const VISIBLE_ROWS = 20
const ROWS = HIDDEN + VISIBLE_ROWS

type PieceId = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** 每种方块 4 个朝向，4×4 网格，1 表示方块 */
const SHAPES: Record<PieceId, number[][][]> = {
  0: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],
  1: [
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  2: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  3: [
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
  ],
  4: [
    [
      [0, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  5: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  6: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
}

const COLORS: Record<PieceId, string> = {
  0: '#22d3ee',
  1: '#facc15',
  2: '#c084fc',
  3: '#4ade80',
  4: '#f87171',
  5: '#60a5fa',
  6: '#fb923c',
}

function emptyBoard(): number[][] {
  return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0))
}

const board = shallowRef<number[][]>(emptyBoard())
const current = ref<{
  id: PieceId
  rot: number
  x: number
  y: number
} | null>(null)
const nextId = ref<PieceId>(0)
const score = ref(0)
const linesTotal = ref(0)
const state = ref<'idle' | 'playing' | 'paused' | 'gameover'>('idle')

const level = computed(() => levelFromScore(score.value))

let dropTimer: ReturnType<typeof setInterval> | null = null

function randomPiece(): PieceId {
  return (Math.floor(Math.random() * 7) as PieceId)
}

function shapeAt(id: PieceId, rot: number) {
  return SHAPES[id][rot % 4]
}

function cellsOf(id: PieceId, rot: number, px: number, py: number): [number, number][] {
  const g = shapeAt(id, rot)
  const out: [number, number][] = []
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (g[r]?.[c]) out.push([py + r, px + c])
    }
  }
  return out
}

function collides(id: PieceId, rot: number, px: number, py: number, b: number[][]): boolean {
  for (const [row, col] of cellsOf(id, rot, px, py)) {
    if (col < 0 || col >= COLS || row >= ROWS) return true
    if (row >= 0 && b[row][col] !== 0) return true
  }
  return false
}

function mergePiece(b: number[][], id: PieceId, rot: number, px: number, py: number) {
  const copy = b.map((row) => [...row])
  for (const [row, col] of cellsOf(id, rot, px, py)) {
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      copy[row][col] = id + 1
    }
  }
  return copy
}

function clearLines(b: number[][]): { board: number[][]; cleared: number } {
  const rest: number[][] = []
  let cleared = 0
  for (let r = 0; r < ROWS; r++) {
    if (b[r].every((c) => c !== 0)) {
      cleared++
    } else {
      rest.push(b[r])
    }
  }
  while (rest.length < ROWS) {
    rest.unshift(Array(COLS).fill(0))
  }
  return { board: rest, cleared }
}

const LINE_SCORE = [0, 100, 300, 500, 800]

function spawnNext(): boolean {
  const id = nextId.value
  nextId.value = randomPiece()
  const rot = 0
  const px = 3
  const py = 0
  if (collides(id, rot, px, py, board.value)) {
    current.value = null
    return false
  }
  current.value = { id, rot, x: px, y: py }
  return true
}

function startGame() {
  board.value = emptyBoard()
  score.value = 0
  linesTotal.value = 0
  nextId.value = randomPiece()
  state.value = 'playing'
  if (!spawnNext()) {
    state.value = 'gameover'
    return
  }
  restartDropTimer()
}

function restartDropTimer() {
  if (dropTimer) clearInterval(dropTimer)
  const ms = dropIntervalMs(level.value)
  dropTimer = setInterval(() => {
    if (state.value !== 'playing') return
    tickGravity()
  }, ms)
}

function tickGravity() {
  const cur = current.value
  if (!cur) return
  const ny = cur.y + 1
  if (!collides(cur.id, cur.rot, cur.x, ny, board.value)) {
    cur.y = ny
    return
  }
  lockPiece()
}

function lockPiece() {
  const cur = current.value
  if (!cur) return
  let b = mergePiece(board.value, cur.id, cur.rot, cur.x, cur.y)
  const { board: nb, cleared } = clearLines(b)
  b = nb
  board.value = b
  if (cleared > 0) {
    linesTotal.value += cleared
    const mult = levelFromScore(score.value)
    score.value += LINE_SCORE[cleared] * mult
  }
  if (!spawnNext()) {
    state.value = 'gameover'
    if (dropTimer) {
      clearInterval(dropTimer)
      dropTimer = null
    }
  }
}

function tryMove(dx: number, dy: number) {
  if (state.value !== 'playing' || !current.value) return
  const cur = current.value
  const nx = cur.x + dx
  const ny = cur.y + dy
  if (!collides(cur.id, cur.rot, nx, ny, board.value)) {
    cur.x = nx
    cur.y = ny
    return true
  }
  return false
}

function tryRotate() {
  if (state.value !== 'playing' || !current.value) return
  const cur = current.value
  const newRot = (cur.rot + 1) % 4
  const kicks = [0, -1, 1, -2, 2]
  for (const k of kicks) {
    if (!collides(cur.id, newRot, cur.x + k, cur.y, board.value)) {
      cur.x += k
      cur.rot = newRot
      return
    }
  }
}

function hardDrop() {
  if (state.value !== 'playing' || !current.value) return
  const cur = current.value
  while (!collides(cur.id, cur.rot, cur.x, cur.y + 1, board.value)) {
    cur.y++
    score.value += 2
  }
  lockPiece()
}

function togglePause() {
  if (state.value === 'playing') state.value = 'paused'
  else if (state.value === 'paused') state.value = 'playing'
}

const displayCells = computed(() => {
  const b = board.value
  const cur = current.value
  const grid: { filled: boolean; color: string }[][] = []
  for (let r = HIDDEN; r < ROWS; r++) {
    const row: { filled: boolean; color: string }[] = []
    for (let c = 0; c < COLS; c++) {
      const id = b[r][c]
      if (id > 0) {
        row.push({ filled: true, color: COLORS[(id - 1) as PieceId] })
      } else {
        row.push({ filled: false, color: '' })
      }
    }
    grid.push(row)
  }
  if (cur && (state.value === 'playing' || state.value === 'paused')) {
    for (const [row, col] of cellsOf(cur.id, cur.rot, cur.x, cur.y)) {
      if (row < HIDDEN || row >= ROWS || col < 0 || col >= COLS) continue
      const gr = row - HIDDEN
      grid[gr][col] = { filled: true, color: COLORS[cur.id] }
    }
  }
  return grid
})

const nextPreviewCells = computed(() => {
  const id = nextId.value
  const g = shapeAt(id, 0)
  const color = COLORS[id]
  const cells: { filled: boolean; color: string }[] = []
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(i / 4)
    const c = i % 4
    cells.push({ filled: !!g[r]?.[c], color })
  }
  return cells
})

/** 距下一级还需多少分 */
const scoreToNextLevel = computed(() => cum(level.value + 1) - score.value)

/** 本等级段内已得分数（用于无障碍描述） */
const scoreIntoSegment = computed(() => score.value - cum(level.value))

/** 当前等级段总需求分数 */
const currentSegmentSize = computed(() => segmentSizeForLevel(level.value))

/** 本段进度 0～100%，用于进度条 */
const scoreProgressRatio = computed(() => {
  const den = currentSegmentSize.value
  if (den <= 0) return 0
  return (scoreIntoSegment.value / den) * 100
})

watch(level, (n, o) => {
  if (o !== undefined && n !== o && state.value === 'playing') restartDropTimer()
})

function onKeydown(e: KeyboardEvent) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault()
  }
  if (state.value === 'gameover' && e.key === 'Enter') {
    startGame()
    return
  }
  if (e.key === 'p' || e.key === 'P') {
    if (state.value === 'playing' || state.value === 'paused') togglePause()
    return
  }
  if (state.value !== 'playing') return
  switch (e.key) {
    case 'ArrowLeft':
      tryMove(-1, 0)
      break
    case 'ArrowRight':
      tryMove(1, 0)
      break
    case 'ArrowDown':
      if (tryMove(0, 1)) score.value += 1
      break
    case 'ArrowUp':
    case 'x':
    case 'X':
      tryRotate()
      break
    case 'z':
    case 'Z':
      if (current.value) {
        const cur = current.value
        const newRot = (cur.rot + 3) % 4
        const kicks = [0, -1, 1, -2, 2]
        for (const k of kicks) {
          if (!collides(cur.id, newRot, cur.x + k, cur.y, board.value)) {
            cur.x += k
            cur.rot = newRot
            break
          }
        }
      }
      break
    case ' ':
      hardDrop()
      break
    default:
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (dropTimer) clearInterval(dropTimer)
})
</script>

<template>
  <div class="tetris-page">
    <el-card class="card">
      <template #header>
        <span>俄罗斯方块</span>
      </template>
      <div class="layout">
        <div
          class="board"
          role="grid"
          :aria-rowcount="VISIBLE_ROWS"
          :aria-colcount="COLS"
        >
          <div
            v-for="(row, ri) in displayCells"
            :key="ri"
            class="row"
          >
            <div
              v-for="(cell, ci) in row"
              :key="ci"
              class="cell"
              :class="{ filled: cell.filled }"
              :style="cell.filled ? { '--cell': cell.color } : {}"
            />
          </div>
        </div>
        <aside class="side">
          <div class="stat">
            <span class="label">分数</span>
            <span class="value">{{ score }}</span>
          </div>
          <div class="stat">
            <span class="label">等级</span>
            <span class="value">{{ level }}</span>
          </div>
          <div class="stat">
            <span class="label">消除行</span>
            <span class="value">{{ linesTotal }}</span>
          </div>
          <div class="next-level">
            <div class="stat">
              <span class="label">距下一级</span>
              <span class="value value-sm">{{ scoreToNextLevel }} 分</span>
            </div>
            <div
              class="level-progress"
              role="progressbar"
              :aria-valuemin="0"
              :aria-valuemax="currentSegmentSize"
              :aria-valuenow="scoreIntoSegment"
              :aria-label="`本等级段内已累积 ${scoreIntoSegment} 分，本段共 ${currentSegmentSize} 分`"
            >
              <div
                class="level-progress-fill"
                :style="{
                  width: `${scoreProgressRatio}%`,
                }"
              />
            </div>
          </div>
          <div class="next-wrap">
            <span class="label">下一个</span>
            <div class="next-grid">
              <div
                v-for="(nc, i) in nextPreviewCells"
                :key="i"
                class="next-cell"
                :class="{ filled: nc.filled }"
                :style="nc.filled ? { '--cell': nc.color } : {}"
              />
            </div>
          </div>
          <div class="actions">
            <el-button
              v-if="state === 'idle' || state === 'gameover'"
              type="primary"
              @click="startGame"
            >
              {{ state === 'gameover' ? '再来一局' : '开始游戏' }}
            </el-button>
            <el-button
              v-if="state === 'playing' || state === 'paused'"
              @click="togglePause"
            >
              {{ state === 'paused' ? '继续' : '暂停' }}
            </el-button>
          </div>
          <p class="hint">
            ← → 移动 · ↓ 软降 · ↑ / X 顺时针<br>
             · Z 逆时针 · 空格硬降 · P 暂停
          </p>
          <p v-if="state === 'paused'" class="overlay-msg">已暂停</p>
          <p v-if="state === 'gameover'" class="overlay-msg bad">游戏结束</p>
        </aside>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.tetris-page {
  max-width: 720px;
  margin: 0 auto;
  text-align: left;
}

.card {
  --el-card-border-color: var(--border);
}

.layout {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
  justify-content: center;
}

.board {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border-radius: 8px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.row {
  display: flex;
  gap: 2px;
}

.cell {
  width: 26px;
  height: 26px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--border) 35%, transparent);
  box-sizing: border-box;
}

.cell.filled {
  background: var(--cell, var(--accent));
  border: 1px solid color-mix(in srgb, var(--cell) 70%, #000);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
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
  font-size: 18px;
}

.next-level {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.next-level-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
}

.next-level-hint strong {
  font-family: var(--mono);
  font-weight: 600;
  color: var(--text-h);
}

.level-progress {
  height: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--border) 50%, transparent);
  overflow: hidden;
}

.level-progress-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--accent),
    color-mix(in srgb, var(--accent) 70%, #fff)
  );
  transition: width 0.2s ease;
}

.next-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.next-wrap .label {
  font-size: 14px;
  color: var(--text);
}

.next-grid {
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  grid-template-columns: repeat(4, 1fr);
  width: 104px;
  height: 104px;
  gap: 2px;
  padding: 8px;
  border-radius: 8px;
  background: var(--code-bg);
  border: 1px solid var(--border);
}

.next-cell {
  border-radius: 2px;
  background: color-mix(in srgb, var(--border) 35%, transparent);
}

.next-cell.filled {
  background: var(--cell);
  border: 1px solid color-mix(in srgb, var(--cell) 70%, #000);
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

.overlay-msg {
  margin: 0;
  font-weight: 500;
  color: var(--accent);
}

.overlay-msg.bad {
  color: #f87171;
}

@media (max-width: 600px) {
  .cell {
    width: 22px;
    height: 22px;
  }
}
</style>
