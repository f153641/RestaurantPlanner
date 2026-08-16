import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'

// ⚡ 引入我們搬好家的雲端連線引擎
import './firebase'

// ⚡ 引入 Element Plus 及其 CSS 樣式檔
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 建立 Vue 應用程式，不加醜陋的 router
const app = createApp(App)

// 2. 註冊 Element Plus
app.use(ElementPlus)

// 直接掛載到網頁上
app.mount('#app')