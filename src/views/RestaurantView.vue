<template>
  <div class="restaurant-view">
    <div class="view-header">
      <div class="title-section">
        <h2>🍱 我的口袋餐廳清單</h2>
        <p>探索並篩選妳想去的美食店家</p>
      </div>
      <button class="add-btn" @click="openAddModal">➕ 新增餐廳</button>
    </div>

    <!-- 🌟 傳遞標籤與地區雙向綁定的狀態 -->
    <FilterBar
      v-model:search-query="searchQuery"
      :available-tags="availableTags"
      v-model:selected-tags="selectedTags"
      v-model:selected-city-code="selectedCityCode"
      v-model:selected-districts="selectedDistricts"
      @city-change="handleCityNameChange"
      layout="horizontal"
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
      <p>🔍 沒有符合篩選條件的餐廳，試試看取消某些條件吧！</p>
    </div>

    <!-- 兼具 新增 / 僅檢視 / 編輯 功能的彈窗 -->
    <AddRestaurantModal
      v-model="isModalOpen"
      :available-tags="availableTags"
      :initial-data="currentRestaurant"
      :is-view-only="isViewOnly"
      :show-edit-button="true"
      @close="closeModal"
      @add="addRestaurant"
      @update="updateRestaurant"
      @switch-to-edit="isViewOnly = false"
      @add-new-tag="addNewTag"
      @delete-tag="deleteTag"
      @edit="handleEdit"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
// 引入 Firebase 資料庫與官方語法
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

// 標籤篩選條件
const selectedTags = ref([]);
const onlyReservable = ref(false);

// 🌟 地區篩選條件
const selectedCityCode = ref("");
const selectedCityName = ref("");
const selectedDistricts = ref([]);

// 預設時段與雲端標籤
const DEFAULT_PERIODS = ["早餐", "午餐", "晚餐", "下午茶/點心", "宵夜"];
const firebaseCustomTags = ref([]);

// 自動融合成可用的標籤清單
const availableTags = computed(() => {
  return [...DEFAULT_PERIODS, ...firebaseCustomTags.value.map((t) => t.name)];
});

// 核心餐廳陣列
const restaurants = ref([]);

// Firebase 監聽器註冊變數
let unsubscribeRestaurants = null;
let unsubscribeTags = null;

onMounted(() => {
  // 📡 1. 監聽餐廳資料
  const qRestaurants = query(collection(db, "restaurants"));
  unsubscribeRestaurants = onSnapshot(qRestaurants, (querySnapshot) => {
    const tempShops = [];
    querySnapshot.forEach((doc) => {
      tempShops.push({ ...doc.data(), id: doc.id });
    });
    restaurants.value = tempShops;

    console.log("📡 Firebase 原始餐廳資料:", JSON.parse(JSON.stringify(tempShops)));
  });

  // 📡 2. 監聽自訂標籤資料
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

// 組件銷毀時卸載 Firebase 監聽
onUnmounted(() => {
  if (unsubscribeRestaurants) unsubscribeRestaurants();
  if (unsubscribeTags) unsubscribeTags();
});

// 接收縣市名稱切換事件
const handleCityNameChange = (cityName) => {
  selectedCityName.value = cityName;
};

// 關鍵字搜尋狀態
const searchQuery = ref("");

const WEEKDAYS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

const filteredRestaurants = computed(() => {
  return restaurants.value.filter((shop) => {
    // 1. 關鍵字比對
    const query = searchQuery.value.trim().toLowerCase();
    const matchSearch =
      !query ||
      (shop.name && shop.name.toLowerCase().includes(query)) ||
      (shop.address && shop.address.toLowerCase().includes(query)) ||
      (shop.notes && shop.notes.toLowerCase().includes(query));

    if (!matchSearch) return false;

    // 2. 地區比對
    const address = shop.address || "";
    if (selectedCityName.value) {
      const matchCity = address.includes(selectedCityName.value);
      if (!matchCity) return false;

      if (selectedDistricts.value.length > 0) {
        const matchDistrict = selectedDistricts.value.some((dist) =>
          address.includes(dist)
        );
        if (!matchDistrict) return false;
      }
    }

    // 3. 可預約過濾
    if (onlyReservable.value && !shop.canReserve) return false;

    // 4. 一般自訂標籤過濾
    const regularTags = selectedTags.value.filter((t) => !WEEKDAYS.includes(t));
    if (regularTags.length > 0) {
      const hasRegularTag = regularTags.some((t) => shop.tags && shop.tags.includes(t));
      if (!hasRegularTag) return false;
    }

    // 5. 營業日單選過濾
    const dayTags = selectedTags.value.filter((t) => WEEKDAYS.includes(t));
    const selectedDay = dayTags.length > 0 ? dayTags[dayTags.length - 1] : null;

    if (selectedDay) {
      const isUnset = shop.hoursType === "unset" || !shop.businessHours;
      const isIrregular = Boolean(shop.isIrregularHoliday);

      if (isIrregular || isUnset) return true;

      const isOpen = shop.businessHours?.[selectedDay]?.isOpen === true;
      if (!isOpen) return false;
    }

    return true;
  });
});

// 打開檢視彈窗
const openViewModal = (restaurant) => {
  currentRestaurant.value = { ...restaurant };
  isViewOnly.value = true;
  isModalOpen.value = true;
};

// 打開新增彈窗
const openAddModal = () => {
  currentRestaurant.value = null;
  isViewOnly.value = false;
  isModalOpen.value = true;
};

// 切換至編輯狀態
const handleEdit = () => {
  isViewOnly.value = false;
};

// 關閉彈窗
const closeModal = () => {
  isModalOpen.value = false;
  currentRestaurant.value = null;
  isViewOnly.value = false;
};

// 新增餐廳到雲端
const addRestaurant = async (newShop) => {
  try {
    const shopData = { ...newShop };
    delete shopData.id;
    await addDoc(collection(db, "restaurants"), shopData);
    closeModal();
  } catch (error) {
    console.error("雲端新增失敗:", error);
    alert("新增失敗，請檢查 Firebase 資料庫權限設定！");
  }
};

// 更新餐廳至雲端
const updateRestaurant = async (updatedShop) => {
  if (!updatedShop.id) return;

  try {
    const shopRef = doc(db, "restaurants", updatedShop.id);
    const updateData = { ...updatedShop };
    delete updateData.id;

    await updateDoc(shopRef, updateData);
    closeModal();
  } catch (error) {
    console.error("雲端更新失敗:", error);
    alert("更新失敗，請檢查 Firebase 資料庫權限設定！");
  }
};

// 刪除餐廳
const deleteRestaurant = async (id) => {
  if (!id) {
    console.warn("無法刪除：找不到餐廳 ID", id);
    return;
  }

  if (confirm("確定要從雲端同步刪除這家餐廳嗎？")) {
    try {
      await deleteDoc(doc(db, "restaurants", id));
    } catch (error) {
      console.error("雲端刪除失敗:", error);
    }
  }
};

// 新增自訂標籤
const addNewTag = async (tagName) => {
  const isExist = availableTags.value.includes(tagName);
  if (isExist) return;

  try {
    await addDoc(collection(db, "customTags"), { name: tagName });
  } catch (error) {
    console.error("雲端新增標籤失敗:", error);
  }
};

// 刪除自訂標籤
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
