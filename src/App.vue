<template>
  <!-- 🌟 使用 el-config-provider 注入繁體中文語系包 -->
  <el-config-provider :locale="zhTw">
    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <span class="logo">🌍 餐廳規劃助手</span>

          <el-tabs v-model="activeTab" class="nav-tabs">
            <el-tab-pane label="🍽️ 我的口袋餐廳" name="restaurants" />
            <el-tab-pane label="📅 行程規劃" name="itinerary" />
          </el-tabs>
        </div>
      </header>

      <main class="app-main">
        <RestaurantView v-if="activeTab === 'restaurants'" />
        <ItineraryView v-else-if="activeTab === 'itinerary'" />
      </main>
    </div>
  </el-config-provider>
</template>

<script setup>
import { ref } from "vue";
// 🌟 引入 Element Plus 的繁體中文語系檔
import zhTw from "element-plus/es/locale/lang/zh-tw";

import RestaurantView from "./views/RestaurantView.vue";
import ItineraryView from "./views/ItineraryView.vue";

const activeTab = ref("restaurants");
</script>

<style scoped>
.app-container {
  font-family: "Helvetica Neue", Arial, "Noto Sans TC", sans-serif;
  color: #333;
  margin: 0;
  padding: 0;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.app-header {
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.logo {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c3e50;
}

.nav-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
}

.nav-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.nav-tabs :deep(.el-tabs__item) {
  font-size: 1rem;
  font-weight: bold;
  height: 60px;
  line-height: 60px;
}

.app-main {
  padding-top: 20px;
}
</style>
