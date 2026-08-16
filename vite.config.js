import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 這行設定可以讓妳在程式碼中用 '@/' 直接代表 'src/' 資料夾，以後引進元件比較方便
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})