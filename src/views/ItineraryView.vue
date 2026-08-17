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
          @click="openAddMode"
        >
          新增行程
        </el-button>
        <el-button v-else size="large" @click="isEditing = false">
          返回行程列表
        </el-button>
      </div>
    </div>

    <!-- 狀態 A：非編輯模式 (表格型態呈現，加入編輯與刪除按鈕) -->
    <ItineraryTable
      v-if="!isEditing"
      :saved-itineraries="savedItineraries"
      @edit="openEditMode"
      @delete="deleteItinerary"
    />

    <!-- 狀態 B：編輯模式 (加入雙欄拖拉區域與舊資料回填) -->
    <div v-else class="editor-container">
      <ItineraryEditor
        :all-restaurants="filteredRestaurants"
        :available-tags="availableTags"
        :initial-data="editingItinerary"
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
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ElMessage, ElMessageBox } from "element-plus";

// 子元件
import ItineraryTable from "@/components/ItineraryTable.vue";
import ItineraryEditor from "@/components/ItineraryEditor.vue";
import AddRestaurantModal from "@/components/AddRestaurantModal.vue";

// 狀態控制
const isEditing = ref(false);
const editingItinerary = ref(null); // 儲存當前點擊編輯的行程資料

// Firebase 資料清單
const allRestaurants = ref([]);
const savedItineraries = ref([]);
const firebaseCustomTags = ref([]);

// 🌟 篩選與搜尋狀態 (對應 ItineraryEditor 內部傳入或是全域共用)
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
const WEEKDAYS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

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

// 🔥 開啟新增模式
const openAddMode = () => {
  editingItinerary.value = null; // 清空代表新增
  isEditing.value = true;
};

// 🔥 開啟編輯模式
const openEditMode = (row) => {
  console.log("🔍 點擊編輯，取得的行程原始資料:", row);

  // 🌟 關鍵修正：透過深拷貝產生獨立的複本，確保 id 完整且不會互相干擾
  editingItinerary.value = JSON.parse(JSON.stringify(row));

  isEditing.value = true;
};

// 🔥 計算屬性：計算過濾後的口袋餐廳列表（支援單選營業日、未設定、公休日不固定）
const filteredRestaurants = computed(() => {
  return allRestaurants.value.filter((shop) => {
    // 1. 關鍵字搜尋 (餐廳名稱、地址、備註)
    const queryStr = searchQuery.value.trim().toLowerCase();
    const matchSearch =
      !queryStr ||
      (shop.name && shop.name.toLowerCase().includes(queryStr)) ||
      (shop.address && shop.address.toLowerCase().includes(queryStr)) ||
      (shop.notes && shop.notes.toLowerCase().includes(queryStr));

    if (!matchSearch) return false;

    // 2. 地區比對 (縣市 + 行政區)
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

    // 3. 一般自訂標籤過濾
    const regularTags = selectedTags.value.filter((t) => !WEEKDAYS.includes(t));
    if (regularTags.length > 0) {
      const hasRegularTag = regularTags.some((t) => shop.tags && shop.tags.includes(t));
      if (!hasRegularTag) return false;
    }

    // 4. 營業日單選過濾 (結合未設定與公休日不固定相容)
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

const openViewModal = (restaurant) => {
  selectedRestaurant.value = { ...restaurant };
  isModalOpen.value = true;
};

// 🔥 儲存行程至 Firebase (支援新增與更新)
const saveItinerary = async (formData) => {
  try {
    if (formData.id) {
      // 🟢 有 ID：更新現有行程 (Update)
      const docRef = doc(db, "itineraries", formData.id);
      const updateData = { ...formData };
      delete updateData.id; // 不把 id 欄位重複寫進文件內

      await updateDoc(docRef, updateData);
      ElMessage.success("行程已成功更新！");
    } else {
      // 🟢 無 ID：新增行程 (Create)
      const payload = {
        ...formData,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "itineraries"), payload);
      ElMessage.success("行程已成功儲存！");
    }
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
