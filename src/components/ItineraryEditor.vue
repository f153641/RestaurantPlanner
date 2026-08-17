<template>
  <div class="editor-container">
    <!-- 頂部設定區 (行程名稱、日期、天數、儲存按鈕) -->
    <el-card shadow="never" class="mb-4 config-card">
      <el-form :inline="true" class="config-form">
        <el-form-item label="行程名稱">
          <el-input
            v-model="title"
            placeholder="例如：台北美食三日遊"
            style="width: 200px"
            clearable
          />
        </el-form-item>

        <el-form-item label="出發日期">
          <el-date-picker
            v-model="startDate"
            type="date"
            placeholder="選擇日期"
            value-format="YYYY-MM-DD"
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item label="總天數">
          <el-input-number v-model="totalDays" :min="1" :max="14" style="width: 110px" />
        </el-form-item>

        <el-form-item>
          <el-button type="success" icon="Check" @click="handleSave">
            儲存行程
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 拖拉編輯核心區 -->
    <el-row :gutter="20">
      <!-- 左欄：口袋餐廳選單與垂直篩選器 -->
      <el-col :span="9">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span>🍽️ 口袋餐廳</span>
              <el-button type="info" link size="small" @click="resetFilters">
                重設篩選
              </el-button>
            </div>
          </template>

          <!-- 🌟 引入垂直佈局的精簡版 FilterBar -->
          <FilterBar
            :search-query="searchQuery"
            :available-tags="availableTags"
            :selected-tags="selectedTags"
            :selected-city-code="selectedCityCode"
            :selected-districts="selectedDistricts"
            @update:searchQuery="searchQuery = $event"
            @update:selectedTags="selectedTags = $event"
            @update:selectedCityCode="selectedCityCode = $event"
            @update:selectedDistricts="selectedDistricts = $event"
            @city-change="handleCityChange"
            layout="vertical"
          />

          <!-- 可拖拉餐廳清單 -->
          <!-- 可拖拉餐廳清單 -->
          <draggable
            :list="filteredRestaurants"
            :group="{ name: 'itineraryGroup', pull: 'clone', put: false }"
            :clone="cloneRestaurant"
            item-key="id"
            class="restaurant-drag-list"
          >
            <template #item="{ element }">
              <div class="drag-item">
                <div class="item-main">
                  <span class="restaurant-name">{{ element.name }}</span>
                  <div class="action-buttons">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click.stop="$emit('open-view-modal', element)"
                    >
                      詳情
                    </el-button>
                    <el-button
                      type="success"
                      link
                      size="small"
                      @click.stop="openMapModal(element)"
                    >
                      📍 地圖
                    </el-button>
                  </div>
                </div>

                <div class="item-sub" v-if="element.address">
                  <small class="address-text">{{ element.address }}</small>
                </div>

                <!-- 🌟 新增：營業時間狀態提示標籤 -->
                <div
                  class="status-tags"
                  v-if="
                    element.isIrregularHoliday ||
                    element.hoursType === 'unset' ||
                    !element.businessHours
                  "
                >
                  <el-tag
                    v-if="element.isIrregularHoliday"
                    size="small"
                    type="warning"
                    effect="plain"
                    class="mr-1"
                  >
                    ⚠️ 公休日不固定
                  </el-tag>
                  <el-tag
                    v-else-if="element.hoursType === 'unset' || !element.businessHours"
                    size="small"
                    type="info"
                    effect="plain"
                    class="mr-1"
                  >
                    ❓ 未設定營業時間
                  </el-tag>
                </div>

                <!-- 原有的自訂分類標籤 -->
                <div class="item-tags" v-if="element.tags && element.tags.length">
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

            <template #footer>
              <div v-if="!filteredRestaurants.length" class="empty-restaurants">
                查無符合條件的餐廳
              </div>
            </template>
          </draggable>
        </el-card>
      </el-col>

      <!-- 右欄：天數切換與行程表 -->
      <el-col :span="15">
        <el-card shadow="never" class="panel-card">
          <el-tabs v-model="activeDayTab" type="card">
            <el-tab-pane
              v-for="day in totalDays"
              :key="'day_' + day"
              :name="'day_' + day"
            >
              <template #label>
                <span>Day {{ day }}</span>
                <small v-if="startDate" class="tab-date"> ({{ getDayDate(day) }}) </small>
              </template>
            </el-tab-pane>
          </el-tabs>

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

            <template #footer>
              <div v-if="!currentDayItems.length" class="empty-table-tip">
                請從左側將餐廳拖拉至此處排入 Day {{ currentDayNumber }} 表格
              </div>
            </template>
          </draggable>
        </el-card>
      </el-col>
    </el-row>

    <!-- Google Map 預覽彈窗 -->
    <el-dialog
      v-model="isMapModalOpen"
      :title="'📍 ' + (selectedMapRestaurant?.name || '餐廳地圖')"
      width="600px"
      destroy-on-close
    >
      <div class="map-dialog-content">
        <p v-if="selectedMapRestaurant?.address" class="address-text">
          <strong>地址：</strong>{{ selectedMapRestaurant.address }}
        </p>

        <div class="map-iframe-container" v-if="mapEmbedUrl">
          <iframe
            width="100%"
            height="350"
            style="border: 0"
            loading="lazy"
            allowfullscreen
            referrerpolicy="no-referrer-when-downgrade"
            :src="mapEmbedUrl"
          ></iframe>
        </div>

        <div class="map-actions" v-if="selectedMapRestaurant?.googleMapUrl">
          <el-button
            type="primary"
            tag="a"
            :href="selectedMapRestaurant.googleMapUrl"
            target="_blank"
          >
            在 Google Map 中開啟 ↗
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import draggable from "vuedraggable";
import { Delete } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import FilterBar from "@/components/FilterBar.vue";

const props = defineProps({
  allRestaurants: {
    type: Array,
    default: () => [],
  },
  availableTags: {
    type: Array,
    default: () => [],
  },
  initialData: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["save", "open-view-modal"]);

// 行程內部狀態
const title = ref("");
const startDate = ref("");
const totalDays = ref(1);
const activeDayTab = ref("day_1");
const scheduledData = ref({ day_1: [] });

// 地圖彈窗狀態
const isMapModalOpen = ref(false);
const selectedMapRestaurant = ref(null);

// 篩選狀態 (綁定至 FilterBar)
const searchQuery = ref("");
const selectedCityCode = ref("");
const selectedCityName = ref("");
const selectedDistricts = ref([]);
const selectedTags = ref([]);

// 2. 🌟 監聽 initialData 進行資料填入（編輯模式回填 / 新增模式重置）
watch(
  () => props.initialData,
  (newData) => {
    if (newData && typeof newData === "object") {
      // 填入基本欄位
      title.value = newData.title || "";
      startDate.value = newData.startDate || "";
      totalDays.value = newData.totalDays || 1;

      // 填入各天排程細節 (使用深拷貝確保獨立性)
      scheduledData.value = newData.itinerary
        ? JSON.parse(JSON.stringify(newData.itinerary))
        : { day_1: [] };

      activeDayTab.value = "day_1";
    } else {
      // 清空表單 (新增模式)
      title.value = "";
      startDate.value = "";
      totalDays.value = 1;
      scheduledData.value = { day_1: [] };
      activeDayTab.value = "day_1";
    }
  },
  { immediate: true }
);

// 處理縣市變更事件
const handleCityChange = (cityName) => {
  selectedCityName.value = cityName;
  selectedDistricts.value = [];
};

// 重設所有篩選條件
const resetFilters = () => {
  searchQuery.value = "";
  selectedCityCode.value = "";
  selectedCityName.value = "";
  selectedDistricts.value = [];
  selectedTags.value = [];
};

// 🌟 口袋餐廳多條件動態過濾
// 🌟 修正後的口袋餐廳多條件動態過濾
const WEEKDAYS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

const filteredRestaurants = computed(() => {
  if (!props.allRestaurants) return [];

  return props.allRestaurants.filter((restaurant) => {
    // 1. 🔍 關鍵字搜尋過濾
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase();
      const matchName = restaurant.name?.toLowerCase().includes(query);
      const matchAddr = restaurant.address?.toLowerCase().includes(query);
      if (!matchName && !matchAddr) return false;
    }

    // 2. 🗺️ 地區過濾
    if (selectedCityName.value) {
      if (!restaurant.address?.includes(selectedCityName.value)) return false;
    }
    if (selectedDistricts.value.length > 0) {
      const matchDistrict = selectedDistricts.value.some((dist) =>
        restaurant.address?.includes(dist)
      );
      if (!matchDistrict) return false;
    }

    // 3. 🏷️ 一般自訂標籤過濾
    const regularTags = selectedTags.value.filter((tag) => !WEEKDAYS.includes(tag));
    if (regularTags.length > 0) {
      const hasRegularTag = regularTags.some((tag) => restaurant.tags?.includes(tag));
      if (!hasRegularTag) return false;
    }

    // 4. ⏰ 營業日單選篩選邏輯
    const dayTags = selectedTags.value.filter((tag) => WEEKDAYS.includes(tag));
    // 取得單選的星期標籤 (若有)
    const selectedDay = dayTags.length > 0 ? dayTags[dayTags.length - 1] : null;

    if (selectedDay) {
      const isUnset = restaurant.hoursType === "unset" || !restaurant.businessHours;
      const isIrregular = Boolean(restaurant.isIrregularHoliday);

      // 餐廳若設定「公休日不一定」或「不設定營業時間」，預設每日都符合條件呈現
      if (isIrregular || isUnset) return true;

      // 比對該單一星期是否有營業 (isOpen === true)
      const isOpen = restaurant.businessHours?.[selectedDay]?.isOpen === true;
      if (!isOpen) return false;
    }

    return true;
  });
});

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

const mapEmbedUrl = computed(() => {
  if (!selectedMapRestaurant.value) return "";
  const queryLocation =
    selectedMapRestaurant.value.address || selectedMapRestaurant.value.name;
  if (!queryLocation) return "";

  return `https://www.google.com/maps?q=${encodeURIComponent(
    queryLocation
  )}&output=embed`;
});

const getDayDate = (dayNumber) => {
  if (!startDate.value) return "";
  const date = new Date(startDate.value);
  date.setDate(date.getDate() + (dayNumber - 1));
  return date.toISOString().split("T")[0];
};

const cloneRestaurant = (origin) => {
  return {
    ...origin,
    uniqueId: `${origin.id}_${Date.now()}`,
    selectedTime: null,
  };
};

const removeScheduledItem = (index) => {
  currentDayItems.value.splice(index, 1);
};

const openMapModal = (restaurant) => {
  selectedMapRestaurant.value = restaurant;
  isMapModalOpen.value = true;
};

const handleSave = () => {
  if (!title.value.trim()) {
    ElMessage.warning("請為這個行程取一個名字喔！");
    return;
  }

  const hasItems = Object.values(scheduledData.value).some((items) => items.length > 0);
  if (!hasItems) {
    ElMessage.warning("請至少在行程中加入一家餐廳！");
    return;
  }

  emit("save", {
    id: props.initialData?.id || null,
    title: title.value.trim(),
    startDate: startDate.value || null,
    totalDays: totalDays.value,
    itinerary: scheduledData.value,
  });
};
</script>

<style scoped>
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
  min-height: 550px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.action-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
}

.restaurant-name {
  font-weight: 600;
  color: #1e293b;
}

.address-text {
  color: #64748b;
  font-size: 0.8rem;
  display: block;
  margin-top: 2px;
}

.item-tags {
  margin-top: 6px;
}

.table-drop-zone {
  min-height: 380px;
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

.empty-restaurants {
  text-align: center;
  color: #94a3b8;
  padding: 20px 0;
  font-size: 0.85rem;
}

.empty-table-tip {
  text-align: center;
  color: #94a3b8;
  padding: 40px 0;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
}

.tab-date {
  color: #64748b;
  margin-left: 4px;
}

.map-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.map-iframe-container {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map-actions {
  display: flex;
  justify-content: flex-end;
}

.mr-1 {
  margin-right: 4px;
}
.mb-4 {
  margin-bottom: 16px;
}

.status-tags {
  margin-top: 4px;
}

.item-tags {
  margin-top: 4px;
}
</style>
