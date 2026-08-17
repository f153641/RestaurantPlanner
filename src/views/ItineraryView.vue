<template>
  <div class="itinerary-page">
    <!-- 頂部頁面標題列 -->
    <div class="page-header">
      <div>
        <h2>🗓️ 旅遊行程規劃</h2>
        <p class="subtitle">規劃妳的專屬美食之旅</p>
      </div>
      <div>
        <el-button
          v-if="!isEditing"
          type="primary"
          size="large"
          icon="Plus"
          @click="isEditing = true"
        >
          新增行程
        </el-button>
        <el-button v-else size="large" @click="isEditing = false">
          返回行程列表
        </el-button>
      </div>
    </div>

    <!-- 狀態 A：非編輯模式 (表格型態呈現) -->
    <ItineraryTable
      v-if="!isEditing"
      :saved-itineraries="savedItineraries"
      @delete="deleteItinerary"
    />

    <!-- 狀態 B：編輯模式 (加入 FilterBar + 雙欄拖拉區域) -->
    <div v-else class="editor-container">
      <!-- 將過濾後的 filteredRestaurants 傳入編輯器 -->
      <ItineraryEditor
        :all-restaurants="filteredRestaurants"
        :available-tags="availableTags"
        @save="saveItinerary"
        @open-view-modal="openViewModal"
      />
    </div>

    <!-- 餐廳詳情彈窗 -->
    <AddRestaurantModal
      v-model="isModalOpen"
      :initial-data="selectedRestaurant"
      :available-tags="[]"
      :is-view-only="true"
      :show-edit-button="false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { db } from "@/firebase";
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ElMessage, ElMessageBox } from "element-plus";

// 子元件
import FilterBar from "@/components/FilterBar.vue";
import ItineraryTable from "@/components/ItineraryTable.vue";
import ItineraryEditor from "@/components/ItineraryEditor.vue";
import AddRestaurantModal from "@/components/AddRestaurantModal.vue";

// 狀態控制
const isEditing = ref(false);

// Firebase 資料清單
const allRestaurants = ref([]);
const savedItineraries = ref([]);
const firebaseCustomTags = ref([]);

// 🌟 篩選與搜尋狀態
const searchQuery = ref("");
const selectedTags = ref([]);
const selectedCityCode = ref("");
const selectedCityName = ref("");
const selectedDistricts = ref([]);

// Modal 狀態
const isModalOpen = ref(false);
const selectedRestaurant = ref(null);

let unsubRestaurants = null;
let unsubItineraries = null;
let unsubTags = null;

// 時段與自訂標籤計算
const DEFAULT_PERIODS = ["早餐", "午餐", "晚餐", "下午茶/點心", "宵夜"];
const availableTags = computed(() => {
  return [...DEFAULT_PERIODS, ...firebaseCustomTags.value.map((t) => t.name)];
});

onMounted(() => {
  // 1. 監聽口袋餐廳
  const qRestaurants = query(collection(db, "restaurants"));
  unsubRestaurants = onSnapshot(qRestaurants, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ ...doc.data(), id: doc.id }));
    allRestaurants.value = list;
  });

  // 2. 監聽歷史行程
  const qItineraries = query(collection(db, "itineraries"), orderBy("createdAt", "desc"));
  unsubItineraries = onSnapshot(qItineraries, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ ...doc.data(), id: doc.id }));
    savedItineraries.value = list;
  });

  // 3. 監聽自訂標籤
  const qTags = query(collection(db, "customTags"));
  unsubTags = onSnapshot(qTags, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, name: doc.data().name }));
    firebaseCustomTags.value = list;
  });
});

onUnmounted(() => {
  if (unsubRestaurants) unsubRestaurants();
  if (unsubItineraries) unsubItineraries();
  if (unsubTags) unsubTags();
});

// 縣市名稱切換
const handleCityNameChange = (cityName) => {
  selectedCityName.value = cityName;
};

// 🔥 計算屬性：計算過濾後的口袋餐廳列表
const filteredRestaurants = computed(() => {
  return allRestaurants.value.filter((shop) => {
    // 1. 關鍵字搜尋 (餐廳名稱、地址、備註)
    const queryStr = searchQuery.value.trim().toLowerCase();
    const matchSearch =
      !queryStr ||
      (shop.name && shop.name.toLowerCase().includes(queryStr)) ||
      (shop.address && shop.address.toLowerCase().includes(queryStr)) ||
      (shop.notes && shop.notes.toLowerCase().includes(queryStr));

    // 2. 標籤比對
    const matchTags =
      selectedTags.value.length === 0 ||
      selectedTags.value.some((t) => shop.tags && shop.tags.includes(t));

    // 3. 地區比對 (縣市 + 行政區)
    const address = shop.address || "";
    let matchLocation = true;

    if (selectedCityName.value) {
      const matchCity = address.includes(selectedCityName.value);
      if (!matchCity) {
        matchLocation = false;
      } else if (selectedDistricts.value.length > 0) {
        const matchDistrict = selectedDistricts.value.some((dist) =>
          address.includes(dist)
        );
        if (!matchDistrict) matchLocation = false;
      }
    }

    return matchSearch && matchTags && matchLocation;
  });
});

const openViewModal = (restaurant) => {
  selectedRestaurant.value = { ...restaurant };
  isModalOpen.value = true;
};

// 儲存行程至 Firebase
const saveItinerary = async (formData) => {
  const payload = {
    ...formData,
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "itineraries"), payload);
    ElMessage.success("行程已成功儲存！");
    isEditing.value = false;
  } catch (error) {
    console.error("❌ [Firebase] 儲存失敗:", error);
    ElMessage.error("儲存失敗，請檢查連線狀態");
  }
};

// 刪除雲端行程
const deleteItinerary = (id) => {
  ElMessageBox.confirm("確定要刪除這筆行程嗎？", "警告", {
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await deleteDoc(doc(db, "itineraries", id));
        ElMessage.success("行程已刪除");
      } catch (error) {
        console.error("❌ [Firebase] 刪除失敗:", error);
        ElMessage.error("刪除失敗");
      }
    })
    .catch(() => {});
};
</script>

<style scoped>
.itinerary-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1e293b;
}

.subtitle {
  margin: 4px 0 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.editor-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>
