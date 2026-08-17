<template>
  <div class="restaurant-card">
    <div class="card-image-wrapper">
      <img
        :src="restaurant.menuUrl || defaultImage"
        :alt="restaurant.name"
        class="card-image"
      />

      <!-- 訂位狀態標籤：有填寫 canReserve 才會顯示 -->
      <span
        v-if="
          restaurant.canReserve !== undefined &&
          restaurant.canReserve !== null &&
          restaurant.canReserve !== ''
        "
        :class="['reserve-badge', restaurant.canReserve ? 'status-yes' : 'status-no']"
      >
        {{ restaurant.canReserve ? "🟢 可訂位" : "⌛ 現場候位" }}
      </span>
    </div>

    <div class="card-content">
      <div class="card-header">
        <h3 class="restaurant-name">{{ restaurant.name }}</h3>
        <!-- 使用安全轉換的 computed，解決 null.toFixed() 崩潰問題 -->
        <span class="restaurant-rating">⭐ {{ formattedRating }}</span>
      </div>

      <div class="card-meta">
        <span v-if="restaurant.avgCost" class="avg-cost"
          >💰 均消: ${{ restaurant.avgCost }} / 人</span
        >
        <div v-if="restaurant.tags && restaurant.tags.length" class="card-tags">
          <span v-for="(tag, i) in restaurant.tags" :key="i" class="tag">
            #{{ tag }}
          </span>
        </div>
      </div>

      <p v-if="restaurant.features" class="restaurant-features">
        {{ restaurant.features }}
      </p>

      <a
        v-if="restaurant.googleMapUrl || restaurant.address"
        :href="restaurant.googleMapUrl"
        target="_blank"
        class="address-link"
        title="點擊開啟 Google 地圖"
      >
        📍 {{ restaurant.address }}
      </a>
    </div>

    <div class="card-footer">
      <button class="delete-btn" @click.stop="$emit('delete-restaurant', restaurant.id)">
        🗑️ 刪除餐廳
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

// 定義元件接收的參數 (Props)
const props = defineProps({
  restaurant: {
    type: Object,
    required: true,
  },
});

// 定義元件會向外發送的事件 (Emits)
defineEmits(["delete-restaurant"]);

// 預設圖片：如果使用者沒填圖片連結，就用這張精美的美食預設圖
const defaultImage = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500";

// 🛡️ 安全計算 rating：防止為 null/undefined 時執行 .toFixed() 導致頁面崩潰
const formattedRating = computed(() => {
  const r = props.restaurant?.rating;
  if (typeof r === "number" && !isNaN(r)) return r.toFixed(1);
  if (typeof r === "string" && r.trim() !== "" && !isNaN(Number(r))) {
    return Number(r).toFixed(1);
  }
  return "暫無評分";
});
</script>

<style scoped>
.restaurant-card {
  background-color: #ffffff;
  border-radius: 12px;
  overflow: hidden; /* 讓圖片的圓角能被裁切 */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

/* 滑鼠懸停時有微浮起的效果 */
.restaurant-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* 圖片區塊 */
.card-image-wrapper {
  position: relative;
  width: 100%;
  height: 180px;
  background-color: #eaedd0;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 確保圖片不變形填滿 */
}

/* 訂位狀態標籤 */
.reserve-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.status-yes {
  background-color: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}
.status-no {
  background-color: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

/* 內容區塊 */
.card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* 讓內容自動撐開，保持卡片底部對齊 */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.restaurant-name {
  margin: 0;
  font-size: 1.2rem;
  color: #2c3e50;
  font-weight: bold;
}

.restaurant-rating {
  font-weight: bold;
  color: #f39c12;
  font-size: 0.95rem;
}

.card-meta {
  margin-bottom: 12px;
}

.avg-cost {
  display: block;
  font-size: 0.9rem;
  color: #e74c3c;
  font-weight: 500;
  margin-bottom: 6px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  background-color: #f1f2f6;
  color: #57606f;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.restaurant-features {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.5;
  margin: 0 0 16px 0;
  flex-grow: 1; /* 確保內文短的卡片也能把地址推到底部 */
}

/* 地址連結樣式 */
.address-link {
  font-size: 0.85rem;
  color: #3498db;
  text-decoration: none;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2; /* 最多顯示兩行地址 */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.address-link:hover {
  text-decoration: underline;
  color: #2980b9;
}

/* 卡片底部工具列 */
.card-footer {
  padding: 12px 16px;
  border-top: 1px solid #f1f2f6;
  display: flex;
  justify-content: flex-end;
}

.delete-btn {
  background: none;
  border: none;
  color: #a4b0be;
  cursor: pointer;
  font-size: 0.85rem;
  transition: color 0.2s;
}

.delete-btn:hover {
  color: #ff4757; /* 懸停時變紅 */
}

.restaurant-rating {
  width: 25%; /* 固定寬度百分比 */
  min-width: 80px; /* 設定最小寬度，防止容器縮太小 */
  white-space: nowrap; /* 強制文字不換行 */
  display: flex;
  align-items: center;
  justify-content: flex-end; /* 讓星星與評分靠右對齊 */
  flex-shrink: 0; /* 避免被左側店名壓縮 */
}
</style>
