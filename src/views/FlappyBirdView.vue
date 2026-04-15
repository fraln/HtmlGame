<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const STORAGE_KEY = 'htmlgame:flappy:best'

type GameState = 'idle' | 'playing' | 'gameover'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const state = ref<GameState>('idle')
const score = ref(0)
const best = ref(0)

// 逻辑尺寸（会按容器缩放绘制）
const W = 360
const H = 560

// 物理参数（像素 / 秒）
const GRAVITY = 1650
const JUMP_VY = -520
const MAX_FALL = 980
const PIPE_SPEED = 170
const PIPE_GAP = 150
const PIPE_W = 62
const PIPE_INTERVAL = 1.35 // 秒

// 鸟
const bird = {
  x: 110,
  y: 260,
  r: 14,
  vy: 0,
}

type Pipe = {
  x: number
  gapY: number
  passed: boolean
}

let pipes: Pipe[] = []
let raf = 0
let lastTs = 0
let spawnAcc = 0

const statusText = computed(() => {
  if (state.value === 'idle') return '按空格/点击开始'
  if (state.value === 'gameover') return '游戏结束：空格/点击再来一局'
  return ''
})

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

function randGapY() {
  const margin = 80
  const min = margin + PIPE_GAP / 2
  const max = H - margin - PIPE_GAP / 2
  return min + Math.random() * (max - min)
}

function resetWorld() {
  score.value = 0
  bird.x = 110
  bird.y = 260
  bird.vy = 0
  pipes = []
  spawnAcc = 0
  lastTs = 0
}

function startGame() {
  resetWorld()
  state.value = 'playing'
}

function jump() {
  if (state.value === 'idle') {
    startGame()
  }
  if (state.value === 'gameover') {
    startGame()
  }
  if (state.value !== 'playing') return
  bird.vy = JUMP_VY
}

function stop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  lastTs = 0
}

function hitTest(p: Pipe) {
  const topY2 = p.gapY - PIPE_GAP / 2
  const botY1 = p.gapY + PIPE_GAP / 2

  const birdLeft = bird.x - bird.r
  const birdRight = bird.x + bird.r
  const birdTop = bird.y - bird.r
  const birdBottom = bird.y + bird.r

  // pipe x-range
  const pipeLeft = p.x
  const pipeRight = p.x + PIPE_W
  const xOverlap = birdRight > pipeLeft && birdLeft < pipeRight
  if (!xOverlap) return false

  // in gap?
  const inGap = birdTop >= topY2 && birdBottom <= botY1
  return !inGap
}

function update(dt: number) {
  // spawn pipes
  spawnAcc += dt
  while (spawnAcc >= PIPE_INTERVAL) {
    spawnAcc -= PIPE_INTERVAL
    pipes.push({ x: W + 10, gapY: randGapY(), passed: false })
  }

  // physics
  bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * dt)
  bird.y += bird.vy * dt

  // move pipes
  for (const p of pipes) p.x -= PIPE_SPEED * dt
  pipes = pipes.filter((p) => p.x + PIPE_W > -20)

  // score
  for (const p of pipes) {
    if (!p.passed && p.x + PIPE_W < bird.x - bird.r) {
      p.passed = true
      score.value += 1
      saveBest()
    }
  }

  // collisions
  if (bird.y - bird.r <= 0 || bird.y + bird.r >= H) {
    state.value = 'gameover'
    return
  }
  for (const p of pipes) {
    if (hitTest(p)) {
      state.value = 'gameover'
      return
    }
  }
}

function draw(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save()
  ctx.scale(scale, scale)

  // bg
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, W, H)

  // subtle grid
  ctx.globalAlpha = 0.12
  ctx.strokeStyle = '#94a3b8'
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // pipes
  for (const p of pipes) {
    const topH = p.gapY - PIPE_GAP / 2
    const botY = p.gapY + PIPE_GAP / 2
    const botH = H - botY
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(p.x, 0, PIPE_W, topH)
    ctx.fillRect(p.x, botY, PIPE_W, botH)
    // pipe lip
    ctx.fillStyle = '#16a34a'
    ctx.fillRect(p.x - 2, topH - 10, PIPE_W + 4, 10)
    ctx.fillRect(p.x - 2, botY, PIPE_W + 4, 10)
  }

  // bird
  const tilt = Math.max(-0.9, Math.min(0.9, bird.vy / 700))
  ctx.save()
  ctx.translate(bird.x, bird.y)
  ctx.rotate(tilt)
  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.arc(0, 0, bird.r, 0, Math.PI * 2)
  ctx.fill()
  // eye
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(5, -4, 2.8, 0, Math.PI * 2)
  ctx.fill()
  // beak
  ctx.fillStyle = '#fb923c'
  ctx.beginPath()
  ctx.moveTo(bird.r - 2, 1)
  ctx.lineTo(bird.r + 10, 5)
  ctx.lineTo(bird.r - 2, 9)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // HUD
  ctx.fillStyle = '#e5e7eb'
  ctx.font = 'bold 26px system-ui, Segoe UI, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(String(score.value), W / 2, 52)

  ctx.font = '14px system-ui, Segoe UI, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#cbd5e1'
  ctx.fillText(`最佳：${best.value}`, 14, 26)

  // overlay
  if (state.value !== 'playing') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#f8fafc'
    ctx.font = 'bold 22px system-ui, Segoe UI, sans-serif'
    ctx.fillText('Flappy Bird', W / 2, H / 2 - 40)
    ctx.font = '14px system-ui, Segoe UI, sans-serif'
    ctx.fillStyle = '#e2e8f0'
    ctx.fillText(statusText.value, W / 2, H / 2)
    ctx.fillStyle = '#cbd5e1'
    ctx.fillText('空格 / 点击 / 触摸：跳跃', W / 2, H / 2 + 28)
  }

  ctx.restore()
}

function loop(ts: number) {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  const scale = rect.width / W
  canvas.width = Math.floor(rect.width * dpr)
  canvas.height = Math.floor(rect.height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const dt = lastTs ? Math.min(0.033, (ts - lastTs) / 1000) : 0
  lastTs = ts

  if (state.value === 'playing' && dt > 0) update(dt)
  draw(ctx, scale)

  raf = requestAnimationFrame(loop)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault()
    jump()
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    jump()
  }
}

function onPointerDown(e: PointerEvent) {
  e.preventDefault()
  jump()
}

onMounted(() => {
  loadBest()
  resetWorld()
  const c = canvasRef.value
  if (c) {
    c.addEventListener('pointerdown', onPointerDown, { passive: false })
  }
  window.addEventListener('keydown', onKeydown)
  raf = requestAnimationFrame(loop)
})

onUnmounted(() => {
  stop()
  const c = canvasRef.value
  if (c) c.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="page">
    <el-card class="card">
      <template #header>
        <div class="header">
          <span>Flappy Bird</span>
          <el-space>
            <el-tag size="small" type="info">分数：{{ score }}</el-tag>
            <el-tag size="small" type="success">最佳：{{ best }}</el-tag>
          </el-space>
        </div>
      </template>

      <div class="wrap">
        <canvas ref="canvasRef" class="canvas" />
        <div class="actions">
          <el-button type="primary" @click="jump">
            {{ state === 'playing' ? '跳跃' : state === 'gameover' ? '再来一局' : '开始' }}
          </el-button>
          <el-button @click="resetWorld">重置</el-button>
        </div>
        <p class="hint">操作：空格 / 回车 / 点击 / 触摸</p>
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

.wrap {
  display: grid;
  gap: 12px;
  justify-items: center;
}

.canvas {
  width: min(360px, 92vw);
  aspect-ratio: 360 / 560;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--code-bg);
  box-shadow: var(--shadow);
  touch-action: manipulation;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
}
</style>

