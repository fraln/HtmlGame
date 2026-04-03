import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), VueDevTools()],
  /** 监听 0.0.0.0，便于局域网内其他设备通过本机 IP 访问 */
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
})
