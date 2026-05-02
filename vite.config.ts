import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PluginOption } from 'vite'

type SokobanLevel = { id: string; name: string; rows: string[] }
type LevelsPayload = { levels: SokobanLevel[] }

type SokobanLevelPackId = 'beginner' | 'easy' | 'medium'

const LEVEL_PACK_FILES: Record<SokobanLevelPackId, string> = {
  beginner: path.resolve(__dirname, 'src/modules/game/sokoban/level-packs/beginner.json'),
  easy: path.resolve(__dirname, 'src/modules/game/sokoban/level-packs/easy.json'),
  medium: path.resolve(__dirname, 'src/modules/game/sokoban/level-packs/medium.json'),
}

function getPackFromUrl(req: IncomingMessage): SokobanLevelPackId | null {
  const raw = req.url ?? '/'
  const qIndex = raw.indexOf('?')
  const search = qIndex >= 0 ? raw.slice(qIndex) : ''
  const params = new URLSearchParams(search)
  const pack = params.get('pack')
  if (pack === 'beginner' || pack === 'easy' || pack === 'medium') return pack
  return null
}

function levelsPathForPack(pack: SokobanLevelPackId): string {
  return LEVEL_PACK_FILES[pack]
}

function createSokobanLevelsApiPlugin(): PluginOption {
  return {
    name: 'sokoban-levels-api',
    configureServer(server) {
      server.middlewares.use('/api/sokoban-levels', async (req, res) => {
        await handleLevelsRequest(req, res)
      })
    },
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function readLevelsFromFile(pack: SokobanLevelPackId) {
  const filePath = levelsPathForPack(pack)
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as SokobanLevel[]
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

function validateRows(rows: string[]) {
  if (!Array.isArray(rows) || rows.length === 0) return 'rows 不能为空'
  const width = rows[0]?.length ?? 0
  if (width === 0) return 'rows 的每一行不能为空'

  const validPattern = /^[#.TBP*+]+$/
  for (const row of rows) {
    if (typeof row !== 'string') return 'rows 中每项都必须是字符串'
    if (row.length !== width) return 'rows 的所有行长度必须一致'
    if (!validPattern.test(row)) return 'rows 包含非法字符，仅允许 # . T B P * +'
  }

  const text = rows.join('')
  const players = (text.match(/[P+]/g) ?? []).length
  const boxes = (text.match(/[B*]/g) ?? []).length
  const goals = (text.match(/[T*+]/g) ?? []).length
  if (players !== 1) return '玩家数量必须为 1（P 或 +）'
  if (boxes === 0) return '至少需要 1 个箱子'
  if (boxes !== goals) return '箱子数量必须与目标点数量一致'

  return null
}

function validateLevels(levels: SokobanLevel[]) {
  if (!Array.isArray(levels)) return 'levels 必须是数组'
  if (levels.length === 0) return null

  const seenIds = new Set<string>()
  for (const level of levels) {
    if (!level || typeof level !== 'object') return 'level 必须是对象'
    if (typeof level.id !== 'string' || !level.id.trim()) return 'level.id 不能为空'
    if (typeof level.name !== 'string' || !level.name.trim()) return 'level.name 不能为空'
    if (seenIds.has(level.id)) return `存在重复 id：${level.id}`
    seenIds.add(level.id)
    const rowError = validateRows(level.rows)
    if (rowError) return `关卡 ${level.id} 校验失败：${rowError}`
  }
  return null
}

async function handleLevelsRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const pack = getPackFromUrl(req)
    if (!pack) {
      sendJson(res, 400, { message: '请使用查询参数 pack=beginner|easy|medium' })
      return
    }

    if (req.method === 'GET') {
      const levels = await readLevelsFromFile(pack)
      sendJson(res, 200, { levels } satisfies LevelsPayload)
      return
    }

    if (req.method === 'PUT') {
      const rawBody = await readBody(req)
      const payload = JSON.parse(rawBody) as Partial<LevelsPayload>
      const levels = payload.levels
      if (!levels) {
        sendJson(res, 400, { message: '请求体缺少 levels' })
        return
      }
      const error = validateLevels(levels)
      if (error) {
        sendJson(res, 400, { message: error })
        return
      }
      const filePath = levelsPathForPack(pack)
      await fs.writeFile(filePath, JSON.stringify(levels, null, 2) + '\n', 'utf-8')
      sendJson(res, 200, { levels } satisfies LevelsPayload)
      return
    }

    sendJson(res, 405, { message: 'Method Not Allowed' })
  } catch (error) {
    sendJson(res, 500, { message: error instanceof Error ? error.message : '服务器内部错误' })
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), VueDevTools(), createSokobanLevelsApiPlugin()],
  /** 监听 0.0.0.0，便于局域网内其他设备通过本机 IP 访问 */
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
})
