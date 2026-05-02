/**
 * 2×2 魔方各外露面与内侧贴纸颜色（Three.js MeshStandardMaterial 使用 0xRRGGBB）。
 * 修改魔方配色只需改本文件中的数值。
 *
 * 默认接近常见「西方配色」：上白、下黄、前绿、后蓝、左橙、右红。
 */
export type CubeFaceColorKey = 'U' | 'D' | 'F' | 'B' | 'L' | 'R'

export const CUBE_FACE_COLORS: Record<CubeFaceColorKey, number> = {
  U: 0xffffff, // 上 白
  D: 0xffff00, // 下 黄
  F: 0x00ff02, // 前 绿
  B: 0x0181fe, // 后 蓝
  L: 0xfd7f42, // 左 橙
  R: 0xfe0000, // 右 红
}

/** 角块内侧（不可见面）颜色 */
export const CUBE_INNER_COLOR = 0x1a1a1a
