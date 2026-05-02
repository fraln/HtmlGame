# HtmlGame

基于 **Vue 3**、**TypeScript** 与 **Vite** 的浏览器小游戏合集，界面使用 **Element Plus**，魔方场景使用 **Three.js**。

源码位于 **`web/`** 目录；请在 `web` 下安装依赖并运行脚本。

## 功能概览

| 模块 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | 系统入口 |
| 魔方 | `/cube`、`/cube/2x2`、`/cube/3x3` | 2×2 / 3×3，(`/cube3` 重定向至 3×3) |
| 俄罗斯方块 | `/tetris` | — |
| 2048 | `/2048` | — |
| Flappy Bird | `/flappy` | — |
| 推箱子 | `/sokoban` | 多关卡包（beginner / easy / medium） |
| 设置 | `/settings` | 通用设置、主题、推箱子关卡编辑等 |

## 技术栈

- Vue 3（`<script setup>` SFC）
- TypeScript、Vue Router、Pinia
- Vite 8、Element Plus、Three.js

## 本地开发

**环境要求：** Node.js（建议使用当前 LTS）。

```bash
cd web
pnpm install
pnpm dev
```

开发服务器在 `vite.config.ts` 中配置了 `host: true`，可在局域网内通过本机 IP 访问。

### 常用命令（在 `web` 目录执行）

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 类型检查并构建生产包 |
| `pnpm preview` | 预览构建结果 |
| `pnpm lint` | ESLint 并尝试自动修复 |
| `pnpm lint:check` | 仅检查，不写入 |

亦支持 `npm`：将上述 `pnpm` 换成 `npm run` 即可（例如 `npm run dev`）。

## 推箱子关卡（开发环境）

开发模式下，Vite 插件提供 **`/api/sokoban-levels`**（查询参数 `pack=beginner|easy|medium`）：`GET` 读取关卡 JSON，`PUT` 校验并写回对应 `level-packs` 文件。仅用于本地开发；生产构建不包含该中间件逻辑。

## 目录结构（简要）

```
HtmlGame/
├── README.md
├── .gitignore
└── web/                 # 前端应用根目录
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── router/
        ├── modules/     # 按业务模块划分（游戏、系统设置等）
        └── ...
```

## 相关文档

- [Vue 3](https://vuejs.org/)
- [Vite](https://vite.dev/)
- [Vue Router](https://router.vuejs.org/)
- [Element Plus](https://element-plus.org/)
