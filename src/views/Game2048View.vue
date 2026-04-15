<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const SIZE = 4
const STORAGE_KEY = 'htmlgame:2048:best'
const ANIM_MS = 140
const DESKTOP_STEP = 82 // 72 + 10
const MOBILE_STEP = 70 // 60 + 10

type Dir = 'left' | 'right' | 'up' | 'down'
type Pos = { r: number; c: number }
type Tile = { id: number; v: number; r: number; c: number }
type Snapshot = { tiles: Tile[]; score: number; won: boolean; over: boolean }

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function cloneTiles(ts: Tile[]): Tile[] {
  return ts.map((t) => ({ ...t }))
}

function emptyCells(tiles: Tile[]): Pos[] {
  const occ = new Set(tiles.map((t) => `${t.r},${t.c}`))
  const out: Pos[] = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!occ.has(`${r},${c}`)) out.push({ r, c })
  return out
}

function addRandomTile(tiles: Tile[], nextId: () => number): { tiles: Tile[]; spawned: Tile | null } {
  const empties = emptyCells(tiles)
  if (empties.length === 0) return { tiles, spawned: null }
  const pick = empties[Math.floor(Math.random() * empties.length)]
  const v = Math.random() < 0.9 ? 2 : 4
  const t: Tile = { id: nextId(), v, r: pick.r, c: pick.c }
  return { tiles: [...tiles, t], spawned: t }
}

function key(r: number, c: number) {
  return `${r},${c}`
}

function has2048(tiles: Tile[]) {
  return tiles.some((t) => t.v >= 2048)
}

function canMove(tiles: Tile[]) {
  if (tiles.length < SIZE * SIZE) return true
  const m = new Map<string, number>()
  for (const t of tiles) m.set(key(t.r, t.c), t.v)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = m.get(key(r, c))!
      if (r + 1 < SIZE && m.get(key(r + 1, c)) === v) return true
      if (c + 1 < SIZE && m.get(key(r, c + 1)) === v) return true
    }
  }
  return false
}

function extractLine(tiles: Tile[], dir: Dir, index: number): { cells: (Tile | null)[]; pos: (i: number) => Pos } {
  // 返回一条长度 SIZE 的 line，以及 line[i] 对应的棋盘坐标
  const cells: (Tile | null)[] = Array(SIZE).fill(null)
  const pos = (i: number): Pos => {
    if (dir === 'left') return { r: index, c: i }
    if (dir === 'right') return { r: index, c: SIZE - 1 - i }
    if (dir === 'up') return { r: i, c: index }
    return { r: SIZE - 1 - i, c: index } // down
  }
  const map = new Map<string, Tile>()
  for (const t of tiles) map.set(key(t.r, t.c), t)
  for (let i = 0; i < SIZE; i++) {
    const p = pos(i)
    cells[i] = map.get(key(p.r, p.c)) ?? null
  }
  return { cells, pos }
}

function planMove(tiles: Tile[], dir: Dir): { next: Tile[]; gained: number; moved: boolean; mergedIds: number[]; removeIds: number[] } {
  const byId = new Map<number, Tile>()
  for (const t of tiles) byId.set(t.id, { ...t })

  const removeIds: number[] = []
  const mergedIds: number[] = []
  let gained = 0

  // 先清空占位，逐 line 生成目标
  const nextById = new Map<number, Tile>()

  for (let idx = 0; idx < SIZE; idx++) {
    const { cells, pos } = extractLine(tiles, dir, idx)
    const list = cells.filter((x): x is Tile => !!x).map((t) => ({ ...t }))

    let write = 0
    for (let i = 0; i < list.length; i++) {
      const cur = list[i]
      const nxt = i + 1 < list.length ? list[i + 1] : null
      if (nxt && nxt.v === cur.v) {
        // 合并到 cur（保留 cur 的 id），删除 nxt
        const p = pos(write)
        const keep = { ...cur, v: cur.v * 2, r: p.r, c: p.c }
        nextById.set(keep.id, keep)
        removeIds.push(nxt.id)
        mergedIds.push(keep.id)
        gained += keep.v
        i++
        write++
      } else {
        const p = pos(write)
        const movedTile = { ...cur, r: p.r, c: p.c }
        nextById.set(movedTile.id, movedTile)
        write++
      }
    }
  }

  // 未被写入 nextById 且不在 removeIds 的（理论上不会发生）直接丢弃
  const next = [...nextById.values()]
  const moved =
    next.length !== tiles.length ||
    next.some((t) => {
      const o = byId.get(t.id)
      return !o || o.r !== t.r || o.c !== t.c || o.v !== t.v
    })

  return { next, gained, moved, mergedIds, removeIds }
}

const tiles = ref<Tile[]>([])
const score = ref(0)
const best = ref<number>(0)
const won = ref(false)
const over = ref(false)
const moving = ref(false)
const history = ref<Snapshot | null>(null)

let idSeq = 1
function nextId() {
  return idSeq++
}

const state = computed(() => (over.value ? 'gameover' : won.value ? 'won' : 'playing'))

const animSpawnIds = ref<Set<number>>(new Set())
const animMergeIds = ref<Set<number>>(new Set())

function loadBest() {
  const v = Number(localStorage.getItem(STORAGE_KEY) ?? '0')
  best.value = Number.isFinite(v) ? v : 0
}

function saveBest() {
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem(STORAGE_KEY, String(best.value))
  }
}

function reset() {
  score.value = 0
  won.value = false
  over.value = false
  moving.value = false
  history.value = null
  animSpawnIds.value = new Set()
  animMergeIds.value = new Set()
  idSeq = 1
  let ts: Tile[] = []
  const a = addRandomTile(ts, nextId)
  const b = addRandomTile(a.tiles, nextId)
  ts = b.tiles
  tiles.value = ts
  const sp = new Set<number>()
  if (a.spawned) sp.add(a.spawned.id)
  if (b.spawned) sp.add(b.spawned.id)
  animSpawnIds.value = sp
}

function tryUndo() {
  if (!history.value || moving.value) return
  tiles.value = cloneTiles(history.value.tiles)
  score.value = history.value.score
  won.value = history.value.won
  over.value = history.value.over
  history.value = null
  animSpawnIds.value = new Set()
  animMergeIds.value = new Set()
}

async function step(dir: Dir) {
  if (over.value || moving.value) return

  const plan = planMove(tiles.value, dir)
  if (!plan.moved) return

  history.value = { tiles: cloneTiles(tiles.value), score: score.value, won: won.value, over: over.value }
  moving.value = true
  animSpawnIds.value = new Set()
  animMergeIds.value = new Set(plan.mergedIds)

  // 先让 tile 移动到目标（包含保留 id 的合并结果）
  tiles.value = plan.next
  score.value += plan.gained
  saveBest()

  // 等待移动结束后再生成新 tile，并触发 spawn 动画
  await sleep(ANIM_MS + 10)

  const add = addRandomTile(tiles.value, nextId)
  tiles.value = add.tiles
  animSpawnIds.value = add.spawned ? new Set([add.spawned.id]) : new Set()

  if (!won.value && has2048(tiles.value)) won.value = true
  if (!canMove(tiles.value)) over.value = true

  // 允许下一次操作
  await sleep(40)
  moving.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key.startsWith('Arrow')) e.preventDefault()
  if (e.key === 'r' || e.key === 'R') {
    reset()
    return
  }
  if (e.key === 'u' || e.key === 'U') {
    tryUndo()
    return
  }
  switch (e.key) {
    case 'ArrowLeft':
      void step('left')
      break
    case 'ArrowRight':
      void step('right')
      break
    case 'ArrowUp':
      void step('up')
      break
    case 'ArrowDown':
      void step('down')
      break
    default:
      break
  }
}

function tileClass(v: number) {
  if (v === 0) return 't0'
  if (v <= 16) return `t${v}`
  if (v <= 128) return 't128'
  if (v <= 512) return 't512'
  if (v <= 2048) return 't2048'
  return 'tbig'
}

function isSpawn(id: number) {
  return animSpawnIds.value.has(id)
}

function isMerge(id: number) {
  return animMergeIds.value.has(id)
}

const statusText = computed(() => {
  if (state.value === 'gameover') return '游戏结束'
  if (state.value === 'won') return '达成 2048'
  return moving.value ? '移动中' : '进行中'
})

const bgCells = computed(() => Array.from({ length: SIZE * SIZE }, (_, i) => i))
const stepPx = ref(DESKTOP_STEP)

function updateStep() {
  stepPx.value = window.matchMedia('(max-width: 480px)').matches ? MOBILE_STEP : DESKTOP_STEP
}

onMounted(() => {
  loadBest()
  reset()
  updateStep()
  window.addEventListener('resize', updateStep)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateStep)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="page">
    <el-card class="card">
      <template #header>
        <div class="header">
          <span>2048</span>
          <el-tag size="small" :type="state === 'gameover' ? 'danger' : state === 'won' ? 'success' : 'info'">
            {{ statusText }}
          </el-tag>
        </div>
      </template>

      <div class="layout">
        <section class="board-wrap">
          <div class="board" role="grid" aria-label="2048 棋盘">
            <div class="bg">
              <div v-for="i in bgCells" :key="i" class="bg-cell" />
            </div>
            <div class="tiles">
              <div
                v-for="t in tiles"
                :key="t.id"
                class="tile"
                :style="{ transform: `translate(${t.c * stepPx}px, ${t.r * stepPx}px)` }"
              >
                <div
                  class="tile-inner"
                  :class="[
                    tileClass(t.v),
                    isSpawn(t.id) ? 'anim-spawn' : '',
                    isMerge(t.id) ? 'anim-merge' : '',
                  ]"
                >
                  <span class="num">{{ t.v }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside class="side">
          <div class="stat">
            <span class="label">分数</span>
            <span class="value">{{ score }}</span>
          </div>
          <div class="stat">
            <span class="label">最佳</span>
            <span class="value">{{ best }}</span>
          </div>

          <div class="actions">
            <el-button type="primary" @click="reset">新游戏 (R)</el-button>
            <el-button :disabled="!history" @click="tryUndo">撤销 (U)</el-button>
          </div>

          <p class="hint">方向键移动。相同数字相撞会合并并加分。</p>
          <p class="hint">提示：合并后会随机生成 2（90%）或 4（10%）。</p>
        </aside>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  text-align: left;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.layout {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
  justify-content: center;
}

.board {
  position: relative;
  width: 342px;
  height: 342px;
  padding: 14px;
  border-radius: 12px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.bg {
  display: grid;
  grid-template-columns: repeat(4, 72px);
  grid-template-rows: repeat(4, 72px);
  gap: 10px;
  position: absolute;
  inset: 14px;
}

.bg-cell {
  border-radius: 10px;
  background: color-mix(in srgb, var(--border) 30%, transparent);
}

.tiles {
  position: absolute;
  inset: 14px;
}

.tile {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  position: absolute;
  top: 0;
  left: 0;
  user-select: none;
  transition: transform 140ms ease, background-color 160ms ease;
  will-change: transform;
}

.tile-inner {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  display: grid;
  place-items: center;
}

.num {
  font-family: var(--mono);
  font-weight: 700;
  color: #1f2937;
  font-size: 22px;
}

@media (prefers-color-scheme: dark) {
  .num {
    color: #0b1220;
  }
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

@keyframes pop {
  0% {
    transform: scale(0.6);
  }
  60% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

.anim-spawn {
  animation: pop 140ms ease-out;
}

.anim-merge {
  animation: pop 170ms ease-out;
}

/* 色板（接近原版 2048，同时适配暗色背景） */
.t0 {
  background: color-mix(in srgb, var(--border) 30%, transparent);
}
.t2 { background: #eee4da; }
.t4 { background: #ede0c8; }
.t8 { background: #f2b179; }
.t16 { background: #f59563; }
.t32 { background: #f67c5f; }
.t64 { background: #f65e3b; }
.t128 { background: #edcf72; }
.t256 { background: #edcc61; }
.t512 { background: #edc850; }
.t1024 { background: #edc53f; }
.t2048 { background: #edc22e; }
.tbig { background: #3c3a32; }

.t8 .num,
.t16 .num,
.t32 .num,
.t64 .num,
.tbig .num {
  color: #f9fafb;
}

.t128 .num,
.t256 .num,
.t512 .num,
.t1024 .num,
.t2048 .num {
  color: #111827;
  font-size: 20px;
}

@media (max-width: 480px) {
  .board {
    width: 294px;
    height: 294px;
  }
  .bg {
    grid-template-columns: repeat(4, 60px);
    grid-template-rows: repeat(4, 60px);
  }
  .tile {
    width: 60px;
    height: 60px;
  }
}
</style>

