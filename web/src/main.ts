import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn.mjs'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import './style.css'
import { applyThemePreset, getInitialThemePreset } from './modules/system/theme'

const app = createApp(App)
applyThemePreset(getInitialThemePreset())

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
