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

/** 一次消除 n 行：(100×n)×n，如 1 行 100×1，2 行 200×2 */
function lineClearScore(cleared: number) {
  return 100 * cleared * cleared
}

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
    score.value += lineClearScore(cleared)
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

function tryRotateCcw() {
  if (state.value !== 'playing' || !current.value) return
  const cur = current.value
  const newRot = (cur.rot + 3) % 4
  const kicks = [0, -1, 1, -2, 2]
  for (const k of kicks) {
    if (!collides(cur.id, newRot, cur.x + k, cur.y, board.value)) {
      cur.x += k
      cur.rot = newRot
      return
    }
  }
}

function touchLeft() {
  tryMove(-1, 0)
}
function touchRight() {
  tryMove(1, 0)
}
function touchSoftDrop() {
  tryMove(0, 1)
}
function touchPause() {
  if (state.value === 'playing' || state.value === 'paused') togglePause()
}

/** 棋盘触摸：横向拖移实时对齐列；下滑按住持续软降；松手时短横移可判定纵向滑（软降/顺旋） */
const SWIPE_MIN_PX = 28
const SOFT_DROP_REPEAT_MS = 50

let boardTouch: {
  x0: number
  y0: number
  pieceX0: number
  pid: number
  cellW: number
  /** 本次按下是否已启动过「按住软降」定时器（用于松手时避免再补一次一步） */
  softDropRepeatStarted: boolean
} | null = null

let softDropRepeatTimer: ReturnType<typeof setInterval> | null = null

function stopSoftDropRepeat() {
  if (softDropRepeatTimer) {
    clearInterval(softDropRepeatTimer)
    softDropRepeatTimer = null
  }
}

/** 下滑超过阈值且以纵向为主时，按住期间持续软降 */
function ensureSoftDropRepeat(s: NonNullable<typeof boardTouch>) {
  if (softDropRepeatTimer) return
  s.softDropRepeatStarted = true
  touchSoftDrop()
  softDropRepeatTimer = setInterval(() => {
    if (state.value !== 'playing' || !boardTouch) {
      stopSoftDropRepeat()
      return
    }
    touchSoftDrop()
  }, SOFT_DROP_REPEAT_MS)
}

function getCellWidthPx(boardEl: HTMLElement): number {
  const cell = boardEl.querySelector('.cell')
  if (cell) {
    const w = cell.getBoundingClientRect().width
    if (w > 1) return w
  }
  return 26
}

/** 将活动方块尽量移到目标列（遇障碍则停） */
function movePieceToColumn(targetX: number) {
  if (state.value !== 'playing' || !current.value) return
  const cur = current.value
  let guard = 0
  while (cur.x < targetX && guard++ < COLS + 4) {
    if (!tryMove(1, 0)) break
  }
  guard = 0
  while (cur.x > targetX && guard++ < COLS + 4) {
    if (!tryMove(-1, 0)) break
  }
}

function onBoardPointerDown(e: PointerEvent) {
  if (state.value !== 'playing' || !current.value) return
  const el = e.currentTarget as HTMLElement
  boardTouch = {
    x0: e.clientX,
    y0: e.clientY,
    pieceX0: current.value.x,
    pid: e.pointerId,
    cellW: getCellWidthPx(el),
    softDropRepeatStarted: false,
  }
  el.setPointerCapture(e.pointerId)
}

function onBoardPointerMove(e: PointerEvent) {
  const s = boardTouch
  if (!s || s.pid !== e.pointerId) return
  if (state.value !== 'playing') return
  e.preventDefault()
  const dx = e.clientX - s.x0
  const dy = e.clientY - s.y0
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  const targetCol = s.pieceX0 + Math.round(dx / s.cellW)
  movePieceToColumn(targetCol)
  // 下滑按住：持续软降；手势不再满足时停止
  const wantSoftHold = dy > SWIPE_MIN_PX && ady >= adx
  if (wantSoftHold) {
    ensureSoftDropRepeat(s)
  } else {
    stopSoftDropRepeat()
  }
}

function onBoardPointerFinish(e: PointerEvent) {
  const s = boardTouch
  if (!s || s.pid !== e.pointerId) return
  stopSoftDropRepeat()
  boardTouch = null
  const el = e.currentTarget as HTMLElement
  if (el.hasPointerCapture?.(e.pointerId)) {
    el.releasePointerCapture(e.pointerId)
  }
  if (state.value !== 'playing') return
  const dx = e.clientX - s.x0
  const dy = e.clientY - s.y0
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  // 横向拖移已在 move 中处理；按住软降已在定时器中处理
  // 此处仅识别「以纵向为主」的短划（快速一划即抬起、未进入按住逻辑时）
  if (adx < SWIPE_MIN_PX && ady >= SWIPE_MIN_PX && ady > adx) {
    if (dy > 0) {
      if (!s.softDropRepeatStarted) {
        tryMove(0, 1)
      }
    } else {
      tryRotate()
    }
  }
}

function hardDrop() {
  if (state.value !== 'playing' || !current.value) return
  const cur = current.value
  while (!collides(cur.id, cur.rot, cur.x, cur.y + 1, board.value)) {
    cur.y++
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
      tryMove(0, 1)
      break
    case 'ArrowUp':
    case 'x':
    case 'X':
      tryRotate()
      break
    case 'z':
    case 'Z':
      tryRotateCcw()
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
  stopSoftDropRepeat()
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
          aria-label="游戏区，滑动操作方块"
          @pointerdown="onBoardPointerDown"
          @pointermove="onBoardPointerMove"
          @pointerup="onBoardPointerFinish"
          @pointercancel="onBoardPointerFinish"
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
            计分：仅消行加分，一次消 n 行为 100×n×n 分（如 1 行 100、2 行 400）。<br>
            键盘：← → 移动 · ↓ 软降 · ↑/X 顺旋 · Z 逆旋 · 空格硬降 · P 暂停<br>
            <span class="hint-touch">手机：棋盘上<strong>按住横向拖动</strong>左右移动；<strong>按住下滑</strong>持续软降；<strong>轻划</strong>↑顺旋 / ↓一步；下方亦可点按</span>
          </p>
          <p v-if="state === 'paused'" class="overlay-msg">已暂停</p>
          <p v-if="state === 'gameover'" class="overlay-msg bad">游戏结束</p>
        </aside>
      </div>

      <div class="touch-controls" aria-label="触控操作">
        <div class="touch-grid">
          <el-button
            class="touch-btn"
            :disabled="state !== 'playing'"
            @click="touchLeft"
          >
            左
          </el-button>
          <el-button
            class="touch-btn"
            :disabled="state !== 'playing'"
            @click="tryRotate"
          >
            顺旋
          </el-button>
          <el-button
            class="touch-btn"
            :disabled="state !== 'playing'"
            @click="touchRight"
          >
            右
          </el-button>
          <el-button
            class="touch-btn"
            :disabled="state !== 'playing'"
            @click="touchSoftDrop"
          >
            软降
          </el-button>
          <el-button
            class="touch-btn"
            :disabled="state !== 'playing'"
            @click="hardDrop"
          >
            硬降
          </el-button>
          <el-button
            class="touch-btn"
            :disabled="state !== 'playing'"
            @click="tryRotateCcw"
          >
            逆旋
          </el-button>
        </div>
        <el-button
          v-if="state === 'playing' || state === 'paused'"
          class="touch-pause"
          block
          @click="touchPause"
        >
          {{ state === 'paused' ? '继续' : '暂停' }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.tetris-page {
  max-width: min(96vw, 720px);
  margin: 0 auto;
  text-align: left;
  box-sizing: border-box;
}

.card {
  --el-card-border-color: var(--border);
}

.layout {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(16px, 4vw, 24px);
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
  touch-action: none;
  user-select: none;
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

.touch-controls {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  touch-action: manipulation;
}

.touch-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(6px, 2.2vw, 10px);
  max-width: min(92vw, 420px);
  margin: 0 auto;
}

.touch-btn {
  min-height: clamp(40px, 11vw, 48px);
  touch-action: manipulation;
  font-size: clamp(13px, 3.8vw, 15px);
}

.touch-pause {
  margin-top: clamp(8px, 2.2vw, 12px);
  max-width: min(92vw, 420px);
  margin-left: auto;
  margin-right: auto;
  min-height: clamp(40px, 11vw, 48px);
  touch-action: manipulation;
}

@media (max-width: 768px) {
  .layout {
    flex-direction: column;
    align-items: stretch;
  }

  .board {
    align-self: center;
    padding: clamp(8px, 2.5vw, 12px);
    gap: clamp(2px, 0.55vw, 2px);
    border-radius: clamp(6px, 2vw, 8px);
    /* 窄屏以棋盘滑动为主，隐藏下方虚拟键矩阵 */
  }

  .touch-controls .touch-grid {
    display: none;
  }

  .touch-controls {
    margin-top: clamp(8px, 2.5vw, 12px);
    padding-top: 0;
    border-top: none;
  }

  .row {
    gap: clamp(2px, 0.55vw, 2px);
  }

  .cell {
    width: clamp(16px, 5.5vw, 26px);
    height: clamp(16px, 5.5vw, 26px);
    border-radius: clamp(2px, 0.8vw, 3px);
  }

  .side {
    min-width: 0;
    width: 100%;
    max-width: min(92vw, 420px);
    margin: 0 auto;
    gap: clamp(10px, 3vw, 14px);
  }

  .stat .label {
    font-size: clamp(13px, 3.6vw, 14px);
  }

  .stat .value {
    font-size: clamp(16px, 4.5vw, 20px);
  }

  .next-level-hint {
    font-size: clamp(12px, 3.4vw, 14px);
  }

  .next-grid {
    width: clamp(88px, 24vw, 104px);
    height: clamp(88px, 24vw, 104px);
    padding: clamp(6px, 2vw, 8px);
    gap: clamp(2px, 0.6vw, 2px);
  }

  .hint {
    max-width: none;
    font-size: clamp(12px, 3.4vw, 14px);
  }

  .touch-controls {
    margin-top: clamp(12px, 3.5vw, 16px);
    padding-top: clamp(10px, 3vw, 14px);
  }

  .touch-grid {
    max-width: min(96vw, 420px);
  }
}
</style>
