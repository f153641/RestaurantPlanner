<template>
  <div :class="['filter-bar', layout]">
    <!-- ================================================== -->
    <!-- ↔️ 1. 橫向模式 (RestaurantView.vue)                -->
    <!-- ================================================== -->
    <template v-if="layout === 'horizontal'">
      <!-- 🔍 關鍵字搜尋 -->
      <div class="filter-item search-item">
        <span class="filter-label">搜尋：</span>
        <el-input
          :model-value="searchQuery"
          placeholder="搜尋餐廳名稱或地址..."
          clearable
          size="default"
          @input="(val) => emit('update:searchQuery', val)"
        />
      </div>

      <!-- 🗺️ 縣市與行政區 -->
      <div class="filter-item location-item">
        <span class="filter-label">地區：</span>
        <div class="location-controls">
          <el-select
            :model-value="selectedCityCode"
            placeholder="選擇縣市"
            clearable
            size="default"
            :loading="loadingCities"
            @change="handleCityChange"
          >
            <el-option
              v-for="city in cityList"
              :key="city.countycode"
              :label="city.countyname"
              :value="city.countycode"
            />
          </el-select>

          <el-select
            v-if="selectedCityCode"
            :model-value="selectedDistricts"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="選擇行政區"
            clearable
            size="default"
            :loading="loadingDistricts"
            @change="handleDistrictChange"
          >
            <el-option
              v-for="dist in districtList"
              :key="dist.towncode"
              :label="dist.townname"
              :value="dist.townname"
            />
          </el-select>
        </div>
      </div>

      <!-- ⏰ 時段標籤 -->
      <div v-if="periodTags.length > 0" class="filter-item tags-item">
        <span class="filter-label">時段：</span>
        <div class="tags-group">
          <button
            :class="['filter-tag-btn', { active: isAllSelected(periodTags) }]"
            @click="clearCategory(periodTags)"
          >
            全部
          </button>
          <button
            v-for="tag in periodTags"
            :key="tag"
            :class="['filter-tag-btn', { active: selectedTags.includes(tag) }]"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <!-- 📅 營業時間 (星期) -->
      <div class="filter-item tags-item">
        <span class="filter-label">營業日：</span>
        <div class="tags-group">
          <button
            :class="['filter-tag-btn', { active: isAllSelected(WEEKDAY_TAGS) }]"
            @click="clearCategory(WEEKDAY_TAGS)"
          >
            全部
          </button>
          <button
            v-for="day in WEEKDAY_TAGS"
            :key="day"
            :class="['filter-tag-btn', { active: selectedTags.includes(day) }]"
            @click="toggleTag(day)"
          >
            {{ day }}
          </button>
        </div>
      </div>

      <!-- 🏷️ 分類標籤 -->
      <div v-if="customTags.length > 0" class="filter-item tags-item">
        <span class="filter-label">分類：</span>
        <div class="tags-group">
          <button
            :class="['filter-tag-btn', { active: isAllSelected(customTags) }]"
            @click="clearCategory(customTags)"
          >
            全部
          </button>
          <button
            v-for="tag in customTags"
            :key="tag"
            :class="['filter-tag-btn', { active: selectedTags.includes(tag) }]"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </template>

    <!-- ================================================== -->
    <!-- ↕️ 2. 縱向模式 (ItineraryView.vue 口袋餐廳版)        -->
    <!-- ================================================== -->
    <template v-else>
      <!-- 🔍 常駐 1：關鍵字搜尋框 -->
      <div class="filter-item search-item">
        <el-input
          :model-value="searchQuery"
          placeholder="搜尋餐廳名稱或地址..."
          clearable
          size="default"
          prefix-icon="Search"
          @input="(val) => emit('update:searchQuery', val)"
        />
      </div>

      <!-- 🗺️ 常駐 2：地區選擇 (縣市 + 行政區橫向並排) -->
      <div class="filter-item location-item">
        <div class="location-controls">
          <el-select
            :model-value="selectedCityCode"
            placeholder="選擇縣市"
            clearable
            size="default"
            :loading="loadingCities"
            @change="handleCityChange"
          >
            <el-option
              v-for="city in cityList"
              :key="city.countycode"
              :label="city.countyname"
              :value="city.countycode"
            />
          </el-select>

          <el-select
            v-if="selectedCityCode"
            :model-value="selectedDistricts"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="選擇行政區"
            clearable
            size="default"
            :loading="loadingDistricts"
            @change="handleDistrictChange"
          >
            <el-option
              v-for="dist in districtList"
              :key="dist.towncode"
              :label="dist.townname"
              :value="dist.townname"
            />
          </el-select>
        </div>
      </div>

      <!-- 🪗 按鈕牆收納區：手風琴折疊面板 -->
      <el-collapse v-model="activeCollapse" class="compact-collapse">
        <el-collapse-item name="tags">
          <template #title>
            <div class="collapse-title">
              <span>🏷️ 標籤與營業日篩選</span>
              <el-tag v-if="selectedTags.length > 0" size="small" type="success" round>
                已選 {{ selectedTags.length }} 項
              </el-tag>
            </div>
          </template>

          <div class="accordion-tags-content">
            <!-- ⏰ 時段標籤牆 -->
            <div v-if="periodTags.length > 0" class="filter-item tags-item">
              <span class="filter-label">時段：</span>
              <div class="tags-group">
                <button
                  :class="['filter-tag-btn', { active: isAllSelected(periodTags) }]"
                  @click="clearCategory(periodTags)"
                >
                  全部
                </button>
                <button
                  v-for="tag in periodTags"
                  :key="tag"
                  :class="['filter-tag-btn', { active: selectedTags.includes(tag) }]"
                  @click="toggleTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>

            <!-- 📅 營業時間 (星期) 按鈕牆 -->
            <div class="filter-item tags-item">
              <span class="filter-label">營業日：</span>
              <div class="tags-group">
                <button
                  :class="['filter-tag-btn', { active: isAllSelected(WEEKDAY_TAGS) }]"
                  @click="clearCategory(WEEKDAY_TAGS)"
                >
                  全部
                </button>
                <button
                  v-for="day in WEEKDAY_TAGS"
                  :key="day"
                  :class="['filter-tag-btn', { active: selectedTags.includes(day) }]"
                  @click="toggleTag(day)"
                >
                  {{ day }}
                </button>
              </div>
            </div>

            <!-- 🏷️ 分類標籤牆 -->
            <div v-if="customTags.length > 0" class="filter-item tags-item">
              <span class="filter-label">分類：</span>
              <div class="tags-group">
                <button
                  :class="['filter-tag-btn', { active: isAllSelected(customTags) }]"
                  @click="clearCategory(customTags)"
                >
                  全部
                </button>
                <button
                  v-for="tag in customTags"
                  :key="tag"
                  :class="['filter-tag-btn', { active: selectedTags.includes(tag) }]"
                  @click="toggleTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  searchQuery: { type: String, default: "" },
  availableTags: { type: Array, default: () => [] },
  selectedTags: { type: Array, default: () => [] },
  selectedCityCode: { type: String, default: "" },
  selectedDistricts: { type: Array, default: () => [] },
  layout: { type: String, default: "horizontal" },
});

const emit = defineEmits([
  "update:searchQuery",
  "update:selectedTags",
  "update:selectedCityCode",
  "update:selectedDistricts",
  "city-change",
]);

const activeCollapse = ref([]);

// 預設時段與星期常量
const DEFAULT_PERIODS = ["早餐", "午餐", "晚餐", "下午茶/點心", "宵夜"];
const WEEKDAY_TAGS = ["一", "二", "三", "四", "五", "六", "日", "不一定"];

const periodTags = computed(() =>
  (props.availableTags || []).filter((t) => DEFAULT_PERIODS.includes(t))
);

// 過濾掉時段與星期的自訂分類標籤
const customTags = computed(() =>
  (props.availableTags || []).filter(
    (t) => !DEFAULT_PERIODS.includes(t) && !WEEKDAY_TAGS.includes(t)
  )
);

const loadingCities = ref(false);
const loadingDistricts = ref(false);
const cityList = ref([]);
const districtList = ref([]);

const fetchCities = async () => {
  loadingCities.value = true;
  try {
    const res = await fetch("https://api.nlsc.gov.tw/other/ListCounty");
    if (res.ok) {
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = xmlDoc.getElementsByTagName("countyItem");

      const list = [];
      for (let i = 0; i < items.length; i++) {
        const countycode = items[i].getElementsByTagName("countycode")[0]?.textContent;
        const countyname = items[i].getElementsByTagName("countyname")[0]?.textContent;
        if (countycode && countyname) list.push({ countycode, countyname });
      }
      cityList.value = list;
    }
  } catch (err) {
    console.error("載入縣市失敗:", err);
  } finally {
    loadingCities.value = false;
  }
};

const fetchDistricts = async (countycode) => {
  if (!countycode) return;
  loadingDistricts.value = true;
  try {
    const res = await fetch(`https://api.nlsc.gov.tw/other/ListTown/${countycode}`);
    if (res.ok) {
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = xmlDoc.getElementsByTagName("townItem");

      const list = [];
      for (let i = 0; i < items.length; i++) {
        const towncode = items[i].getElementsByTagName("towncode")[0]?.textContent;
        const townname = items[i].getElementsByTagName("townname")[0]?.textContent;
        if (townname) list.push({ towncode, townname });
      }
      districtList.value = list;
    }
  } catch (err) {
    console.error("載入鄉鎮市區失敗:", err);
    districtList.value = [];
  } finally {
    loadingDistricts.value = false;
  }
};

onMounted(() => {
  fetchCities();
});

const handleCityChange = async (val) => {
  const selectedCityObj = cityList.value.find((c) => c.countycode === val);
  const cityName = selectedCityObj ? selectedCityObj.countyname : "";

  emit("update:selectedCityCode", val || "");
  emit("update:selectedDistricts", []);
  districtList.value = [];

  if (val) {
    await fetchDistricts(val);
  }
  emit("city-change", cityName);
};

const handleDistrictChange = (val) => {
  emit("update:selectedDistricts", val);
};

const isAllSelected = (categoryTags) => {
  return !categoryTags.some((t) => props.selectedTags.includes(t));
};

const clearCategory = (categoryTags) => {
  const newTags = props.selectedTags.filter((t) => !categoryTags.includes(t));
  emit("update:selectedTags", newTags);
};

const toggleTag = (tag) => {
  let tags = [...props.selectedTags];
  tags.includes(tag) ? (tags = tags.filter((t) => t !== tag)) : tags.push(tag);
  emit("update:selectedTags", tags);
};
</script>

<style scoped>
/* 共通樣式 */
.filter-bar {
  display: flex;
  background: #ffffff;
  border-radius: 8px;
}

.filter-label {
  font-weight: bold;
  color: #4a5568;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.tags-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-tag-btn {
  padding: 4px 12px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  background-color: #f7fafc;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.filter-tag-btn.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

/* -------------------------------------------------- */
/* ↔️ 1. 橫向模式 (RestaurantView) */
/* -------------------------------------------------- */
.filter-bar.horizontal {
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-bar.horizontal .filter-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-bar.horizontal .filter-label {
  width: 60px;
}

.filter-bar.horizontal .search-item .el-input {
  width: 300px;
}

.filter-bar.horizontal .location-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-bar.horizontal .location-controls .el-select {
  width: 180px;
}

/* -------------------------------------------------- */
/* ↕️ 2. 縱向模式 (ItineraryView 口袋餐廳) */
/* -------------------------------------------------- */
.filter-bar.vertical {
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
}

.filter-bar.vertical .filter-item {
  width: 100%;
}

.filter-bar.vertical .filter-label {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 4px;
}

/* 🌟 地區橫向並排 */
.filter-bar.vertical .location-controls {
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 100%;
}

.filter-bar.vertical .location-controls .el-select {
  flex: 1;
  min-width: 0;
  width: 100% !important;
}

.filter-bar.vertical .search-item .el-input {
  width: 100% !important;
}

.filter-bar.vertical .filter-tag-btn {
  padding: 3px 10px;
  font-size: 0.8rem;
}

/* 手風琴專用樣式 */
.compact-collapse {
  border: none;
  background: transparent;
  margin-top: 2px;
}

.compact-collapse :deep(.el-collapse-item__header) {
  height: 32px;
  line-height: 32px;
  background: transparent;
  border: none;
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 600;
}

.compact-collapse :deep(.el-collapse-item__wrap) {
  background: transparent;
  border: none;
}

.compact-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}

.collapse-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;
}

.accordion-tags-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 6px;
  border-top: 1px dashed #cbd5e1;
}
</style>
