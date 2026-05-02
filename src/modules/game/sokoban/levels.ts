import beginnerPack from './level-packs/beginner.json'
import easyPack from './level-packs/easy.json'
import mediumPack from './level-packs/medium.json'

export type SokobanLevel = { id: string; name: string; rows: string[] }

/** 关卡难度分包：对应 `level-packs/*.json` */
export type SokobanLevelPackId = 'beginner' | 'easy' | 'medium'

export const SOKOBAN_PACK_LABELS: Record<SokobanLevelPackId, string> = {
  beginner: '入门',
  easy: '简单',
  medium: '中等',
}

export const SOKOBAN_PACK_ORDER: SokobanLevelPackId[] = ['beginner', 'easy', 'medium']

/** 各难度关卡 id 前缀，避免各包之间 id 与最佳步数记录冲突 */
export const SOKOBAN_PACK_ID_PREFIX: Record<SokobanLevelPackId, string> = {
  beginner: 'l',
  easy: 'e',
  medium: 'm',
}

export function nextSokobanLevelId(levels: SokobanLevel[], pack: SokobanLevelPackId): string {
  const prefix = SOKOBAN_PACK_ID_PREFIX[pack]
  const re = new RegExp(`^${prefix}(\\d+)$`)
  const maxSuffix = levels.reduce((max, level) => {
    const m = re.exec(level.id)
    if (!m) return max
    const n = Number(m[1])
    return Number.isFinite(n) ? Math.max(max, n) : max
  }, 0)
  return `${prefix}${maxSuffix + 1}`
}

// 图例：
// # 墙，. 地板，T 目标点，B 箱子，P 玩家，* 箱子在目标点上，+ 玩家在目标点上
export const SOKOBAN_LEVEL_PACKS: Record<SokobanLevelPackId, SokobanLevel[]> = {
  beginner: beginnerPack as SokobanLevel[],
  easy: easyPack as SokobanLevel[],
  medium: mediumPack as SokobanLevel[],
}

/** @deprecated 使用 `SOKOBAN_LEVEL_PACKS.beginner` */
export const SOKOBAN_LEVELS: SokobanLevel[] = SOKOBAN_LEVEL_PACKS.beginner
