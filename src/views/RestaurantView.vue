<template>
  <div class="restaurant-view">
    <div class="view-header">
      <div class="title-section">
        <h2>🍱 我的口袋餐廳清單</h2>
        <p>探索並篩選妳想去的美食店家</p>
      </div>
      <button class="add-btn" @click="openAddModal">➕ 新增餐廳</button>
    </div>

    <FilterBar
      :available-tags="availableTags"
      v-model:selected-tags="selectedTags"
      v-model:only-reservable="onlyReservable"
    />

    <div class="cards-grid" v-if="filteredRestaurants.length > 0">
      <RestaurantCard
        v-for="restaurant in filteredRestaurants"
        :key="restaurant.id"
        :restaurant="restaurant"
        @click="openViewModal(restaurant)"
        @delete-restaurant="deleteRestaurant"
      />
    </div>

    <div class="empty-state" v-else>
      <p>🔍 沒有符合篩選條件的餐廳，試試看取消某些標籤吧！</p>
    </div>

    <!-- 兼具 新增 / 僅檢視 / 編輯 功能的彈窗 -->
    <AddRestaurantModal
      v-model="isModalOpen"
      :available-tags="availableTags"
      :initial-data="currentRestaurant"
      :is-view-only="isViewOnly"
      @close="closeModal"
      @add="addRestaurant"
      @update="updateRestaurant"
      @switch-to-edit="isViewOnly = false"
      @add-new-tag="addNewTag"
      @delete-tag="deleteTag"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
// 引入 Firebase 資料庫與官方語法 (新增 updateDoc)
import { db } from "@/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";

// 引入小元件
import FilterBar from "@/components/FilterBar.vue";
import RestaurantCard from "@/components/RestaurantCard.vue";
import AddRestaurantModal from "@/components/AddRestaurantModal.vue";

// 控制 Modal 彈窗與編輯/檢視狀態
const isModalOpen = ref(false);
const isViewOnly = ref(false);
const currentRestaurant = ref(null);

// 篩選條件的狀態
const selectedTags = ref([]);
const onlyReservable = ref(false);

// 🌟 1. 固定不可刪除的預設時段
const DEFAULT_PERIODS = ["早餐", "午餐", "晚餐", "下午茶/點心", "宵夜"];

// 🌟 2. 用來裝雲端自訂標籤的陣列
const firebaseCustomTags = ref([]);

// 🌟 3. 自動融合成同一個標籤陣列給子組件使用
const availableTags = computed(() => {
  return [...DEFAULT_PERIODS, ...firebaseCustomTags.value.map((t) => t.name)];
});

// 🛒 核心餐廳陣列
const restaurants = ref([]);

// 📡 用來註冊 Firebase 退訂監聽的變數
let unsubscribeRestaurants = null;
let unsubscribeTags = null;

onMounted(() => {
  // 📡 監聽餐廳資料
  const qRestaurants = query(collection(db, "restaurants"));
  unsubscribeRestaurants = onSnapshot(qRestaurants, (querySnapshot) => {
    const tempShops = [];
    querySnapshot.forEach((doc) => {
      tempShops.push({ id: doc.id, ...doc.data() });
    });
    restaurants.value = tempShops;
  });

  // 📡 監聽自訂標籤資料
  const qTags = query(collection(db, "customTags"));
  unsubscribeTags = onSnapshot(qTags, (querySnapshot) => {
    const tempTags = [];
    querySnapshot.forEach((doc) => {
      tempTags.push({
        id: doc.id,
        name: doc.data().name,
      });
    });
    firebaseCustomTags.value = tempTags;
  });
});

// 當頁面關閉時，切斷與 Firebase 的連線
onUnmounted(() => {
  if (unsubscribeRestaurants) unsubscribeRestaurants();
  if (unsubscribeTags) unsubscribeTags();
});

// 🔥 核心篩選邏輯（自動計算）
const filteredRestaurants = computed(() => {
  return restaurants.value.filter((shop) => {
    const matchTags =
      selectedTags.value.length === 0 ||
      selectedTags.value.some((t) => shop.tags && shop.tags.includes(t));
    const matchReserve = !onlyReservable.value || shop.canReserve;
    return matchTags && matchReserve;
  });
});

// 🔍 打開僅檢視彈窗 (點擊卡片觸發)
const openViewModal = (restaurant) => {
  currentRestaurant.value = { ...restaurant };
  isViewOnly.value = true;
  isModalOpen.value = true;
};

// ➕ 打開新增餐廳彈窗
const openAddModal = () => {
  currentRestaurant.value = null;
  isViewOnly.value = false;
  isModalOpen.value = true;
};

// ❌ 關閉彈窗並重置狀態
const closeModal = () => {
  isModalOpen.value = false;
  currentRestaurant.value = null;
  isViewOnly.value = false;
};

// ➕ 功能：將新餐廳推送到雲端資料庫
const addRestaurant = async (newShop) => {
  try {
    await addDoc(collection(db, "restaurants"), newShop);
    closeModal();
  } catch (error) {
    console.error("雲端新增失敗:", error);
    alert("新增失敗，請檢查 Firebase 資料庫權限設定！");
  }
};

// ✏️ 功能：更新雲端資料庫的餐廳資料
const updateRestaurant = async (updatedShop) => {
  if (!updatedShop.id) return;

  try {
    const shopRef = doc(db, "restaurants", updatedShop.id);
    // 複製一份資料並排除不可寫入文件的 id 欄位
    const updateData = { ...updatedShop };
    delete updateData.id;

    await updateDoc(shopRef, updateData);
    closeModal();
  } catch (error) {
    console.error("雲端更新失敗:", error);
    alert("更新失敗，請檢查 Firebase 資料庫權限設定！");
  }
};

// 🗑️ 功能：從雲端資料庫刪除餐廳
const deleteRestaurant = async (id) => {
  if (confirm("確定要從雲端同步刪除這家餐廳嗎？")) {
    try {
      await deleteDoc(doc(db, "restaurants", id));
    } catch (error) {
      console.error("雲端刪除失敗:", error);
    }
  }
};

// 🌟 4. 新增自訂標籤
const addNewTag = async (tagName) => {
  const isExist = availableTags.value.includes(tagName);
  if (isExist) return;

  try {
    await addDoc(collection(db, "customTags"), { name: tagName });
  } catch (error) {
    console.error("雲端新增標籤失敗:", error);
  }
};

// 🗑️ 5. 從 Firebase 雲端刪除該自訂標籤
const deleteTag = async (tagName) => {
  const targetTag = firebaseCustomTags.value.find((t) => t.name === tagName);
  if (targetTag) {
    try {
      await deleteDoc(doc(db, "customTags", targetTag.id));
      selectedTags.value = selectedTags.value.filter((t) => t !== tagName);
    } catch (error) {
      console.error("雲端刪除標籤失敗:", error);
    }
  }
};
</script>

<style scoped>
.restaurant-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 40px 20px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.title-section h2 {
  margin: 0;
  font-size: 1.8rem;
  color: #2c3e50;
}

.title-section p {
  margin: 5px 0 0 0;
  color: #7f8c8d;
}

.add-btn {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover {
  background-color: #3aa876;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
  margin-top: 25px;
}

/* 確保卡片可點擊 */
.cards-grid :deep(.restaurant-card) {
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 50px;
  background-color: #fff;
  border-radius: 8px;
  color: #7f8c8d;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-top: 25px;
}
</style>
