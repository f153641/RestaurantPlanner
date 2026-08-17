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
          @click="startNewItinerary"
        >
          新增行程
        </el-button>
        <el-button v-else size="large" @click="cancelEditing"> 返回行程列表 </el-button>
      </div>
    </div>

    <!-- 狀態 A：非編輯模式 (表格型態呈現) -->
    <div v-if="!isEditing" class="saved-list-container">
      <el-empty
        v-if="!savedItineraries.length"
        description="目前尚無行程，點擊右上角「新增行程」開始規劃美食之旅"
      />

      <el-table
        v-else
        :data="savedItineraries"
        stripe
        style="width: 100%"
        class="itinerary-table"
      >
        <!-- 行程名稱 -->
        <el-table-column prop="title" label="行程名稱" min-width="180">
          <template #default="{ row }">
            <strong>{{ row.title || "未命名行程" }}</strong>
          </template>
        </el-table-column>

        <!-- 出發日期 -->
        <el-table-column label="出發日期" width="160">
          <template #default="{ row }">
            📅 {{ row.startDate ? row.startDate : "未設定日期" }}
          </template>
        </el-table-column>

        <!-- 總天數 -->
        <el-table-column label="天數" width="100" align="center">
          <template #default="{ row }"> 共 {{ row.totalDays || 1 }} 天 </template>
        </el-table-column>

        <!-- 操作欄位 (刪除) -->
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button
              type="danger"
              :icon="Delete"
              circle
              plain
              size="small"
              @click="deleteItinerary(row.id)"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 狀態 B：編輯模式 (雙欄拖拉區域) -->
    <div v-else class="editor-container">
      <!-- 頂部設定區 (行程名稱、日期、天數、儲存按鈕) -->
      <el-card shadow="never" class="mb-4 config-card">
        <el-form :inline="true" class="config-form">
          <el-form-item label="行程名稱">
            <el-input v-model="title" placeholder="" style="width: 240px" clearable />
          </el-form-item>

          <el-form-item label="出發日期">
            <el-date-picker
              v-model="startDate"
              type="date"
              placeholder=""
              value-format="YYYY-MM-DD"
              style="width: 160px"
            />
          </el-form-item>

          <el-form-item label="總天數">
            <el-input-number
              v-model="totalDays"
              :min="1"
              :max="14"
              style="width: 120px"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="success" icon="Check" @click="saveItinerary">
              儲存行程
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 拖拉編輯核心區 -->
      <el-row :gutter="20">
        <!-- 左欄：口袋餐廳選單 -->
        <el-col :span="8">
          <el-card shadow="never" class="panel-card">
            <template #header>
              <div class="panel-header">
                <span>🍽️ 口袋餐廳 (可拖拉至右側)</span>
              </div>
            </template>

            <draggable
              :list="allRestaurants"
              :group="{ name: 'itineraryGroup', pull: 'clone', put: false }"
              :clone="cloneRestaurant"
              item-key="id"
              class="restaurant-drag-list"
            >
              <template #item="{ element }">
                <div class="drag-item">
                  <div class="item-main">
                    <span class="restaurant-name">{{ element.name }}</span>
                    <!-- 詳情按鈕 -->
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click.stop="openViewModal(element)"
                    >
                      詳情
                    </el-button>
                  </div>
                  <div class="item-tags">
                    <el-tag
                      v-for="(tag, idx) in element.tags"
                      :key="idx"
                      size="small"
                      class="mr-1"
                    >
                      #{{ tag }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </draggable>
          </el-card>
        </el-col>

        <!-- 右欄：天數切換與行程表 -->
        <el-col :span="16">
          <el-card shadow="never" class="panel-card">
            <!-- 天數 Tab 分頁 -->
            <el-tabs v-model="activeDayTab" type="card">
              <el-tab-pane
                v-for="day in totalDays"
                :key="'day_' + day"
                :name="'day_' + day"
              >
                <template #label>
                  <span>Day {{ day }}</span>
                  <small v-if="startDate" class="tab-date">
                    ({{ getDayDate(day) }})
                  </small>
                </template>
              </el-tab-pane>
            </el-tabs>

            <!-- 拖動目標放置區 -->
            <draggable
              v-model="currentDayItems"
              group="itineraryGroup"
              item-key="uniqueId"
              class="table-drop-zone"
              ghost-class="ghost-row"
            >
              <template #item="{ element, index }">
                <div class="table-row-item">
                  <div class="col col-name">
                    <strong>{{ element.name }}</strong>
                  </div>

                  <div class="col col-tags">
                    <el-tag
                      v-for="(tag, tIdx) in element.tags"
                      :key="tIdx"
                      size="small"
                      class="mr-1"
                    >
                      #{{ tag }}
                    </el-tag>
                  </div>

                  <div class="col col-time">
                    <el-select
                      v-model="element.selectedTime"
                      placeholder="--:--"
                      size="small"
                      clearable
                      style="width: 100px"
                    >
                      <el-option label="--:--" :value="null" />
                      <el-option
                        v-for="time in timeOptions"
                        :key="time"
                        :label="time"
                        :value="time"
                      />
                    </el-select>
                  </div>

                  <div class="col col-action">
                    <el-button
                      type="danger"
                      :icon="Delete"
                      circle
                      size="small"
                      @click="removeScheduledItem(index)"
                    />
                  </div>
                </div>
              </template>

              <!-- 空白提示區塊放在拖拉區域內 -->
              <template #footer>
                <div v-if="!currentDayItems.length" class="empty-table-tip">
                  請從左側將餐廳拖拉至此處排入 Day {{ currentDayNumber }} 表格
                </div>
              </template>
            </draggable>
          </el-card>
        </el-col>
      </el-row>
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
import draggable from "vuedraggable";
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
import AddRestaurantModal from "@/components/AddRestaurantModal.vue";
import { Delete, View } from "@element-plus/icons-vue";

// 狀態控制
const isEditing = ref(false);

// 編輯中的資料
const title = ref("");
const startDate = ref("");
const totalDays = ref(1);
const activeDayTab = ref("day_1");
const scheduledData = ref({});

// Firebase 資料清單
const allRestaurants = ref([]);
const savedItineraries = ref([]);

// Modal 狀態
const isModalOpen = ref(false);
const selectedRestaurant = ref(null);

const timeOptions = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

let unsubRestaurants = null;
let unsubItineraries = null;

onMounted(() => {
  console.log("🚀 [ItineraryView] 元件已掛載，開始建立 Firebase 即時監聽...");

  // 1. 監聽口袋餐廳
  const qRestaurants = query(collection(db, "restaurants"));
  unsubRestaurants = onSnapshot(qRestaurants, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    allRestaurants.value = list;
    console.log("📥 [Firebase] 已同步口袋餐廳資料 (共 %d 筆):", list.length, list);
  });

  // 2. 監聽歷史行程
  const qItineraries = query(collection(db, "itineraries"), orderBy("createdAt", "desc"));
  unsubItineraries = onSnapshot(qItineraries, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    savedItineraries.value = list;
    console.log("📥 [Firebase] 已同步歷史行程資料 (共 %d 筆):", list.length, list);
  });
});

onUnmounted(() => {
  console.log("🧹 [ItineraryView] 元件即將銷毀，解除 Firebase 監聽");
  if (unsubRestaurants) unsubRestaurants();
  if (unsubItineraries) unsubItineraries();
});

// 計算屬性
const currentDayNumber = computed(
  () => parseInt(activeDayTab.value.replace("day_", ""), 10) || 1
);

const currentDayItems = computed({
  get() {
    if (!scheduledData.value[activeDayTab.value]) {
      scheduledData.value[activeDayTab.value] = [];
    }
    return scheduledData.value[activeDayTab.value];
  },
  set(val) {
    scheduledData.value[activeDayTab.value] = val;
  },
});

const getDayDate = (dayNumber) => {
  if (!startDate.value) return "";
  const date = new Date(startDate.value);
  date.setDate(date.getDate() + (dayNumber - 1));
  return date.toISOString().split("T")[0];
};

// 事件動作
const startNewItinerary = () => {
  console.log("➕ [UI] 點擊「新增行程」，進入編輯模式");
  title.value = "";
  startDate.value = "";
  totalDays.value = 1;
  activeDayTab.value = "day_1";
  scheduledData.value = { day_1: [] };
  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
};

const openViewModal = (restaurant) => {
  selectedRestaurant.value = { ...restaurant };
  isModalOpen.value = true;
};

const cloneRestaurant = (origin) => {
  const clonedItem = {
    ...origin,
    uniqueId: `${origin.id}_${Date.now()}`,
    selectedTime: null,
  };
  console.log(
    `🚚 [Drag] 拖拉餐廳「${origin.name}」至 Day ${currentDayNumber.value}:`,
    clonedItem
  );
  return clonedItem;
};

const removeScheduledItem = (index) => {
  const removed = currentDayItems.value[index];
  currentDayItems.value.splice(index, 1);
  console.log(`🗑️ [UI] 移除項目:`, removed?.name);
};

// 儲存行程至 Firebase
const saveItinerary = async () => {
  if (!title.value.trim()) {
    ElMessage.warning("請為這個行程取一個名字喔！");
    return;
  }

  const hasItems = Object.values(scheduledData.value).some((items) => items.length > 0);
  if (!hasItems) {
    ElMessage.warning("請至少在行程中加入一家餐廳！");
    return;
  }

  const payload = {
    title: title.value.trim(),
    startDate: startDate.value || null,
    totalDays: totalDays.value,
    itinerary: scheduledData.value,
    createdAt: serverTimestamp(),
  };

  console.log("📤 [Firebase] 寫入 Payload:", payload);

  try {
    const docRef = await addDoc(collection(db, "itineraries"), payload);
    console.log(`✅ [Firebase] 儲存成功，ID: ${docRef.id}`);
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
        console.log(`✅ [Firebase] 行程刪除成功，ID: ${id}`);
        ElMessage.success("行程已刪除");
      } catch (error) {
        console.error(`❌ [Firebase] 刪除失敗:`, error);
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

/* 🌟 長條型行程清單樣式 */
.strip-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.itinerary-strip-card {
  border-radius: 10px;
  transition: all 0.2s ease-in-out;
}

.itinerary-strip-card:hover {
  transform: translateY(-2px);
}

.strip-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

/* 1. 左區：標題與資訊 */
.strip-info {
  flex: 2;
  min-width: 200px;
}

.strip-title {
  margin: 0 0 8px 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.meta-tags {
  display: flex;
  align-items: center;
}

/* 2. 中區：每日預覽 */
.strip-preview {
  flex: 4;
  border-left: 1px solid #f1f5f9;
  border-right: 1px solid #f1f5f9;
  padding: 0 20px;
}

.day-strip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.day-strip-row:last-child {
  margin-bottom: 0;
}

.day-badge {
  font-weight: bold;
  font-size: 0.8rem;
  color: #475569;
  background-color: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
}

/* 3. 右區：刪除按鈕 */
.strip-actions {
  flex: 0.5;
  display: flex;
  justify-content: flex-end;
}

/* 編輯區樣式 */
.config-card {
  background-color: #f8fafc;
}

.config-form {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.panel-card {
  min-height: 500px;
}

.panel-header {
  font-weight: bold;
}

.drag-item {
  padding: 10px;
  margin-bottom: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: grab;
}

.item-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-drop-zone {
  min-height: 350px;
  padding: 10px;
  background: #fafafa;
  border-radius: 6px;
}

.table-row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-bottom: 8px;
}

.empty-table-tip {
  text-align: center;
  color: #94a3b8;
  padding: 40px 0;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
}

.text-muted {
  color: #94a3b8;
  font-size: 0.85rem;
}

.mr-1 {
  margin-right: 4px;
}
.mr-2 {
  margin-right: 8px;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-4 {
  margin-bottom: 16px;
}
</style>
