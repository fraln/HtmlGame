export type SokobanLevel = { id: string; name: string; rows: string[] }

// 图例：
// # 墙，. 地板，T 目标点，B 箱子，P 玩家，* 箱子在目标点上，+ 玩家在目标点上
import levelsData from './levels.json'

export const SOKOBAN_LEVELS: SokobanLevel[] = levelsData as SokobanLevel[]
