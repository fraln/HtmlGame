export type ThemePreset = {
  id: string
  name: string
  main: string
  contrast: string
}

const STORAGE_KEY = 'htmlgame-theme-preset'

export const themePresets: ThemePreset[] = [
  { id: 'warm-orange', name: '暖橙 + 浅天蓝', main: '#FF9500', contrast: '#00B4FF' },
  { id: 'soft-pink', name: '柔粉 + 薄荷青', main: '#FF6B9D', contrast: '#4ED9B8' },
  { id: 'bright-yellow', name: '亮黄 + 香芋紫', main: '#FFD300', contrast: '#9B5DE5' },
  { id: 'hot-red', name: '正红 + 明黄', main: '#FF3344', contrast: '#FFDD00' },
  { id: 'lake-cyan', name: '湖蓝 + 亮粉', main: '#00C2CB', contrast: '#FF4FB3' },
  { id: 'grass-green', name: '草绿 + 橘红', main: '#2ED573', contrast: '#FF5722' },
  { id: 'dusty-rose', name: '豆沙粉 + 雾霾蓝', main: '#E88EA0', contrast: '#74B9FF' },
  { id: 'apricot', name: '奶杏色 + 青绿', main: '#FFCFA6', contrast: '#55D8C1' },
  { id: 'taro-lime', name: '香芋紫 + 浅柠', main: '#B19CD9', contrast: '#D4FF9C' },
]

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const int = Number.parseInt(value, 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

function toRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function lighten(hex: string, ratio: number) {
  const { r, g, b } = hexToRgb(hex)
  const mix = (channel: number) => Math.round(channel + (255 - channel) * ratio)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function darken(hex: string, ratio: number) {
  const { r, g, b } = hexToRgb(hex)
  const mix = (channel: number) => Math.round(channel * (1 - ratio))
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function setThemeCssVariables(preset: ThemePreset) {
  const root = document.documentElement
  root.style.setProperty('--theme-main', preset.main)
  root.style.setProperty('--theme-contrast', preset.contrast)
  root.style.setProperty('--theme-bg-soft', toRgba(preset.main, 0.1))
  root.style.setProperty('--theme-title', preset.main)
  root.style.setProperty('--theme-btn-bg', preset.main)
  root.style.setProperty('--theme-btn-text', '#ffffff')
  root.style.setProperty('--theme-border', preset.contrast)
  root.style.setProperty('--theme-tag-bg', toRgba(preset.contrast, 0.16))
  root.style.setProperty('--theme-badge-bg', preset.contrast)
  root.style.setProperty('--theme-emphasis', preset.contrast)
  root.style.setProperty('--theme-selected-bg', toRgba(preset.main, 0.18))
  root.style.setProperty('--theme-selected-border', preset.main)

  root.style.setProperty('--el-color-primary', preset.main)
  root.style.setProperty('--el-color-primary-light-3', lighten(preset.main, 0.3))
  root.style.setProperty('--el-color-primary-light-5', lighten(preset.main, 0.5))
  root.style.setProperty('--el-color-primary-light-7', lighten(preset.main, 0.7))
  root.style.setProperty('--el-color-primary-light-8', lighten(preset.main, 0.8))
  root.style.setProperty('--el-color-primary-light-9', lighten(preset.main, 0.9))
  root.style.setProperty('--el-color-primary-dark-2', darken(preset.main, 0.2))
}

export function getThemePresetById(id: string) {
  return themePresets.find((item) => item.id === id)
}

export function getInitialThemePreset() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const matched = saved ? getThemePresetById(saved) : undefined
  return matched ?? themePresets[0]
}

export function applyThemePreset(preset: ThemePreset) {
  setThemeCssVariables(preset)
  localStorage.setItem(STORAGE_KEY, preset.id)
}
