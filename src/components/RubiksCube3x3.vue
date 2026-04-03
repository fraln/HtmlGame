<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { CUBE_FACE_COLORS, CUBE_INNER_COLOR } from '../constants/cubeFaceColors'
import {
  disposeStickerTextureCache,
  getStickerTexture,
  makeInnerPlasticMaterial,
  makeStickerMaterial,
} from '../utils/cubeStickers'

const containerRef = ref<HTMLDivElement | null>(null)

const sceneRef = shallowRef<THREE.Scene | null>(null)
const rendererRef = shallowRef<THREE.WebGLRenderer | null>(null)
const controlsRef = shallowRef<OrbitControls | null>(null)
const cubiesRef = shallowRef<THREE.Mesh[]>([])

type FaceKey = 'U' | 'D' | 'F' | 'B' | 'L' | 'R'
const faceLabelsRef = shallowRef<Partial<Record<FaceKey, THREE.Sprite>>>({})

const LABEL_SPRITE_SCALE = 0.26

function createChineseLabelTexture(text: string): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new THREE.CanvasTexture(canvas)
  }
  ctx.clearRect(0, 0, size, size)
  const pad = 28
  const w = size - pad * 2
  const h = size - pad * 2
  const r = 18
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.beginPath()
  ctx.moveTo(pad + r, pad)
  ctx.lineTo(pad + w - r, pad)
  ctx.quadraticCurveTo(pad + w, pad, pad + w, pad + r)
  ctx.lineTo(pad + w, pad + h - r)
  ctx.quadraticCurveTo(pad + w, pad + h, pad + w - r, pad + h)
  ctx.lineTo(pad + r, pad + h)
  ctx.quadraticCurveTo(pad, pad + h, pad, pad + h - r)
  ctx.lineTo(pad, pad + r)
  ctx.quadraticCurveTo(pad, pad, pad + r, pad)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 120px system-ui, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, size / 2, size / 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function createFaceSprite(text: string): THREE.Sprite {
  const map = createChineseLabelTexture(text)
  const mat = new THREE.SpriteMaterial({
    map,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(LABEL_SPRITE_SCALE, LABEL_SPRITE_SCALE, 1)
  return sprite
}

let animationFrameId = 0
let resizeObserver: ResizeObserver | null = null

const GRID = 0.43
const EPS = 0.15
const CUBIE_SIZE = 0.44
/** 角块圆角半径（与尺寸成比例，勿超过几何体限制） */
const CUBIE_ROUND_RADIUS = 0.055
const CUBIE_ROUND_SEGMENTS = 4

const ALL_MOVES = [
  'U',
  "U'",
  'D',
  "D'",
  'F',
  "F'",
  'B',
  "B'",
  'L',
  "L'",
  'R',
  "R'",
] as const

const isBusy = ref(false)
const moveQueue: string[] = []

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

function getWorldPos(mesh: THREE.Object3D): THREE.Vector3 {
  const v = new THREE.Vector3()
  mesh.getWorldPosition(v)
  return v
}

function cubiesInLayer(moveBase: string, cubies: THREE.Mesh[]): THREE.Mesh[] {
  const ys = cubies.map((c) => getWorldPos(c).y)
  const zs = cubies.map((c) => getWorldPos(c).z)
  const xs = cubies.map((c) => getWorldPos(c).x)
  switch (moveBase) {
    case 'U': {
      const maxY = Math.max(...ys)
      return cubies.filter((m) => getWorldPos(m).y >= maxY - EPS)
    }
    case 'D': {
      const minY = Math.min(...ys)
      return cubies.filter((m) => getWorldPos(m).y <= minY + EPS)
    }
    case 'F': {
      const maxZ = Math.max(...zs)
      return cubies.filter((m) => getWorldPos(m).z >= maxZ - EPS)
    }
    case 'B': {
      const minZ = Math.min(...zs)
      return cubies.filter((m) => getWorldPos(m).z <= minZ + EPS)
    }
    case 'R': {
      const maxX = Math.max(...xs)
      return cubies.filter((m) => getWorldPos(m).x >= maxX - EPS)
    }
    case 'L': {
      const minX = Math.min(...xs)
      return cubies.filter((m) => getWorldPos(m).x <= minX + EPS)
    }
    default:
      return []
  }
}

function parseMove(move: string): { base: string; prime: boolean } {
  const base = move[0] ?? ''
  const prime = move[1] === "'"
  return { base, prime }
}

function axisAngleForMove(base: string, prime: boolean): {
  axis: 'x' | 'y' | 'z'
  angle: number
} {
  const quarter = Math.PI / 2
  const table: Record<string, { axis: 'x' | 'y' | 'z'; angle: number }> = {
    U: { axis: 'y', angle: -quarter },
    D: { axis: 'y', angle: quarter },
    R: { axis: 'x', angle: -quarter },
    L: { axis: 'x', angle: quarter },
    F: { axis: 'z', angle: -quarter },
    B: { axis: 'z', angle: quarter },
  }
  const entry = table[base]
  if (!entry) {
    return { axis: 'y', angle: 0 }
  }
  return {
    axis: entry.axis,
    angle: prime ? -entry.angle : entry.angle,
  }
}

function createCubie(sx: number, sy: number, sz: number, cubieSize: number): THREE.Mesh {
  const { R, L, U, D, F, B } = CUBE_FACE_COLORS
  const inner = CUBE_INNER_COLOR

  const materials = [
    sx > 0
      ? makeStickerMaterial(getStickerTexture(R))
      : makeInnerPlasticMaterial(inner),
    sx < 0
      ? makeStickerMaterial(getStickerTexture(L))
      : makeInnerPlasticMaterial(inner),
    sy > 0
      ? makeStickerMaterial(getStickerTexture(U))
      : makeInnerPlasticMaterial(inner),
    sy < 0
      ? makeStickerMaterial(getStickerTexture(D))
      : makeInnerPlasticMaterial(inner),
    sz > 0
      ? makeStickerMaterial(getStickerTexture(F))
      : makeInnerPlasticMaterial(inner),
    sz < 0
      ? makeStickerMaterial(getStickerTexture(B))
      : makeInnerPlasticMaterial(inner),
  ]

  const geo = new RoundedBoxGeometry(
    cubieSize,
    cubieSize,
    cubieSize,
    CUBIE_ROUND_SEGMENTS,
    CUBIE_ROUND_RADIUS,
  )
  const mesh = new THREE.Mesh(geo, materials)
  mesh.position.set(sx * GRID, sy * GRID, sz * GRID)
  return mesh
}

function disposeMeshMaterials(mesh: THREE.Mesh) {
  const mats = mesh.material
  const list = Array.isArray(mats) ? mats : [mats]
  for (const m of list) {
    if (m instanceof THREE.MeshStandardMaterial) {
      m.map = null
    }
    m.dispose()
  }
}

function disposeCubieMeshes(cubies: THREE.Mesh[]) {
  for (const mesh of cubies) {
    mesh.geometry.dispose()
    disposeMeshMaterials(mesh)
  }
}

function createCubiesInScene(scene: THREE.Scene): THREE.Mesh[] {
  const cubies: THREE.Mesh[] = []
  for (const sx of [-1, 0, 1]) {
    for (const sy of [-1, 0, 1]) {
      for (const sz of [-1, 0, 1]) {
        const c = createCubie(sx, sy, sz, CUBIE_SIZE)
        scene.add(c)
        cubies.push(c)
      }
    }
  }
  return cubies
}

function faceOuterOffset(): number {
  return GRID + CUBIE_SIZE / 2 + 0.05
}

function createFaceLabels(scene: THREE.Scene): Partial<Record<FaceKey, THREE.Sprite>> {
  const out = faceOuterOffset()
  const defs: { key: FaceKey; text: string; pos: [number, number, number] }[] = [
    { key: 'U', text: '上', pos: [0, out, 0] },
    { key: 'D', text: '下', pos: [0, -out, 0] },
    { key: 'F', text: '前', pos: [0, 0, out] },
    { key: 'B', text: '后', pos: [0, 0, -out] },
    { key: 'L', text: '左', pos: [-out, 0, 0] },
    { key: 'R', text: '右', pos: [out, 0, 0] },
  ]
  const map: Partial<Record<FaceKey, THREE.Sprite>> = {}
  for (const { key, text, pos } of defs) {
    const sprite = createFaceSprite(text)
    sprite.position.set(pos[0], pos[1], pos[2])
    scene.add(sprite)
    map[key] = sprite
  }
  return map
}

function resetFaceLabelsTransform() {
  const out = faceOuterOffset()
  const labels = faceLabelsRef.value
  const set = (
    key: FaceKey,
    x: number,
    y: number,
    z: number,
  ) => {
    const o = labels[key]
    if (o) {
      o.position.set(x, y, z)
      o.quaternion.identity()
    }
  }
  set('U', 0, out, 0)
  set('D', 0, -out, 0)
  set('F', 0, 0, out)
  set('B', 0, 0, -out)
  set('L', -out, 0, 0)
  set('R', out, 0, 0)
}

function rebuildCubies() {
  const scene = sceneRef.value
  const old = cubiesRef.value
  if (!scene || old.length !== 27) return

  for (const mesh of old) {
    scene.remove(mesh)
  }
  disposeCubieMeshes(old)
  cubiesRef.value = createCubiesInScene(scene)
  resetFaceLabelsTransform()
}

function waitUntilIdle(): Promise<void> {
  return new Promise((resolve) => {
    function tick() {
      if (!isBusy.value) {
        resolve()
      } else {
        requestAnimationFrame(tick)
      }
    }
    tick()
  })
}

async function resetCube() {
  moveQueue.length = 0
  await waitUntilIdle()
  rebuildCubies()
}

function scrambleCube(scrambleLength = 40) {
  for (let i = 0; i < scrambleLength; i++) {
    const m = ALL_MOVES[Math.floor(Math.random() * ALL_MOVES.length)]
    moveQueue.push(m)
  }
  if (!isBusy.value) {
    void runNextMove()
  }
}

function initScene(container: HTMLDivElement) {
  const width = container.clientWidth
  const height = container.clientHeight || 400

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0f1115)

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(2.8, 2.4, 3.6)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xffffff, 0.55)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xffffff, 1.1)
  dir.position.set(4, 6, 5)
  dir.castShadow = true
  scene.add(dir)

  const cubies = createCubiesInScene(scene)
  faceLabelsRef.value = createFaceLabels(scene)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.target.set(0, 0, 0)
  controls.update()

  sceneRef.value = scene
  rendererRef.value = renderer
  controlsRef.value = controls
  cubiesRef.value = cubies

  function loop() {
    animationFrameId = requestAnimationFrame(loop)
    controls.update()
    renderer.render(scene, camera)
  }
  controls.update()
  renderer.render(scene, camera)
  animationFrameId = requestAnimationFrame(loop)

  function onResize() {
    const w = container.clientWidth
    const h = container.clientHeight || 400
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }

  resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)
  onResize()
}

function dispose() {
  cancelAnimationFrame(animationFrameId)
  resizeObserver?.disconnect()
  resizeObserver = null

  const scene = sceneRef.value
  const renderer = rendererRef.value
  const controls = controlsRef.value

  controls?.dispose()
  moveQueue.length = 0

  if (scene) {
    scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        disposeMeshMaterials(obj)
      } else if (obj instanceof THREE.Sprite) {
        const mat = obj.material as THREE.SpriteMaterial
        mat.map?.dispose()
        mat.dispose()
      }
    })
    scene.clear()
  }

  disposeStickerTextureCache()

  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }

  sceneRef.value = null
  rendererRef.value = null
  controlsRef.value = null
  cubiesRef.value = []
  faceLabelsRef.value = {}
}

function rotateLayerAnimated(
  scene: THREE.Scene,
  cubies: THREE.Mesh[],
  axis: 'x' | 'y' | 'z',
  angle: number,
  faceLabel?: THREE.Object3D,
): Promise<void> {
  if (cubies.length === 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const pivot = new THREE.Group()
    scene.add(pivot)
    for (const c of cubies) {
      pivot.attach(c)
    }
    if (faceLabel) {
      pivot.attach(faceLabel)
    }

    const duration = 260
    const start = performance.now()

    function step(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const eased = easeInOutQuad(t)
      const a = angle * eased
      pivot.rotation.set(0, 0, 0)
      if (axis === 'x') pivot.rotation.x = a
      if (axis === 'y') pivot.rotation.y = a
      if (axis === 'z') pivot.rotation.z = a

      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        pivot.rotation.set(0, 0, 0)
        if (axis === 'x') pivot.rotation.x = angle
        if (axis === 'y') pivot.rotation.y = angle
        if (axis === 'z') pivot.rotation.z = angle
        for (const c of cubies) {
          scene.attach(c)
        }
        if (faceLabel) {
          scene.attach(faceLabel)
        }
        scene.remove(pivot)
        resolve()
      }
    }
    requestAnimationFrame(step)
  })
}

async function runNextMove() {
  const scene = sceneRef.value
  const cubies = cubiesRef.value
  if (!scene || cubies.length !== 27) return

  const next = moveQueue.shift()
  if (!next) {
    isBusy.value = false
    return
  }

  isBusy.value = true
  const { base, prime } = parseMove(next)
  const { axis, angle } = axisAngleForMove(base, prime)
  const layer = cubiesInLayer(base, cubies)
  const faceKey = base as FaceKey
  const faceLabel = faceLabelsRef.value[faceKey]

  await rotateLayerAnimated(scene, layer, axis, angle, faceLabel)
  isBusy.value = false
  void runNextMove()
}

function applyMove(move: string) {
  moveQueue.push(move)
  if (!isBusy.value) {
    void runNextMove()
  }
}

defineExpose({ applyMove, isBusy, resetCube, scrambleCube })

onMounted(() => {
  const el = containerRef.value
  if (el) initScene(el)
})

onBeforeUnmount(() => {
  dispose()
})
</script>

<template>
  <div ref="containerRef" class="cube-root" />
</template>

<style scoped>
.cube-root {
  position: relative;
  width: 100%;
  min-height: 420px;
  border-radius: 8px;
  overflow: hidden;
}
</style>
