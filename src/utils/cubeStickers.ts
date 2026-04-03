import * as THREE from 'three'

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}

function fillRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

const stickerTextureCache = new Map<number, THREE.CanvasTexture>()

function createStickerTexture(faceColor: number): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new THREE.CanvasTexture(canvas)
  }
  ctx.fillStyle = '#f4f4f4'
  ctx.fillRect(0, 0, size, size)
  const pad = Math.round(size * 0.09)
  const iw = size - pad * 2
  const ih = size - pad * 2
  const cornerR = Math.min(22, iw * 0.18)
  ctx.fillStyle = hexToCss(faceColor)
  fillRoundRectPath(ctx, pad, pad, iw, ih, cornerR)
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

export function getStickerTexture(faceColor: number): THREE.CanvasTexture {
  const cached = stickerTextureCache.get(faceColor)
  if (cached) return cached
  const tex = createStickerTexture(faceColor)
  stickerTextureCache.set(faceColor, tex)
  return tex
}

export function disposeStickerTextureCache() {
  for (const tex of stickerTextureCache.values()) {
    tex.dispose()
  }
  stickerTextureCache.clear()
}

export function makeStickerMaterial(tex: THREE.CanvasTexture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.06,
  })
}

export function makeInnerPlasticMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.04,
  })
}
