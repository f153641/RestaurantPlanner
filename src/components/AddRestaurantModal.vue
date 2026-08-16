<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="680px"
    destroy-on-close
    class="custom-dialog"
  >
    <div class="scroll-container">
      <el-form label-position="top" :disabled="isViewOnly">
        <!-- 1. 智慧自動填入 -->
        <div v-if="!isViewOnly" class="form-section magic-bg">
          <div class="section-title">🌐 智慧自動填入</div>
          <el-form-item label="Google Maps 網址">
            <el-input
              v-model="inputUrl"
              placeholder="請貼上 Google Maps 分享網址..."
              @paste="handlePaste"
              clearable
            >
              <template #append>
                <el-button type="primary" @click="smartParseUrl(inputUrl)">
                  ⚡ 智慧解析
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <span class="help-text"
            >💡 貼上網址後點選智慧解析，系統會自動帶入店名與地址</span
          >
        </div>

        <el-divider v-if="!isViewOnly" />

        <!-- 2. 基本資訊 -->
        <div class="form-section">
          <div class="section-title">📝 基本資訊</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="餐廳名稱" required>
                <el-input v-model="form.name" placeholder="例如：美式巨無霸漢堡" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="餐廳地址" required>
                <el-input v-model="form.address" placeholder="請輸入完整地址" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="地圖跳轉連結">
            <el-input
              v-model="form.googleMapUrl"
              placeholder="地圖連結（自動解析帶入）"
            />
          </el-form-item>
        </div>

        <el-divider />

        <!-- 3. 營業時間 (依照 weekDaysList 強制進行排序) -->
        <div class="form-section">
          <div class="section-title">⏰ 營業時間</div>

          <div class="detailed-hours-box">
            <div v-for="dayName in weekDaysList" :key="dayName" class="day-row">
              <div class="day-check">
                <el-checkbox
                  v-model="form.businessHours[dayName].isOpen"
                  @change="handleDayToggle(dayName)"
                >
                  <strong>{{ dayName }}</strong>
                </el-checkbox>
              </div>

              <div class="day-content">
                <div v-if="form.businessHours[dayName].isOpen" class="slots-list">
                  <div
                    v-for="(slot, idx) in form.businessHours[dayName].slots"
                    :key="idx"
                    class="slot-item"
                  >
                    <el-time-select
                      v-model="slot.openTime"
                      start="00:00"
                      step="00:30"
                      end="23:30"
                      placeholder="開門"
                      style="width: 120px"
                    />
                    <span>-</span>
                    <el-time-select
                      v-model="slot.closeTime"
                      start="00:00"
                      step="00:30"
                      end="23:30"
                      placeholder="打烊"
                      style="width: 120px"
                    />
                    <el-button
                      v-if="!isViewOnly"
                      type="danger"
                      link
                      :icon="Delete"
                      @click="deleteTimeSlot(dayName, idx)"
                    />
                  </div>
                  <el-button
                    v-if="!isViewOnly"
                    type="primary"
                    link
                    size="small"
                    @click="addTimeSlot(dayName)"
                  >
                    ＋新增時段
                  </el-button>
                </div>
                <span v-else class="closed-label">公休 / 休息</span>
              </div>
            </div>
          </div>
        </div>

        <el-divider />

        <!-- 4. 評價與消費 -->
        <div class="form-section">
          <div class="section-title">📊 評價與消費</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="平均消費區間 (每人 NT$)">
                <div class="cost-range-box">
                  <el-input-number
                    v-model="form.minCost"
                    :min="0"
                    :controls="false"
                    placeholder="最低"
                    style="width: 100%"
                  />
                  <span>~</span>
                  <el-input-number
                    v-model="form.maxCost"
                    :min="0"
                    :controls="false"
                    placeholder="最高"
                    style="width: 100%"
                  />
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="餐廳評價">
                <div class="rate-box">
                  <el-rate v-model="form.rating" allow-half show-score />
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <el-divider />

        <!-- 5. 餐廳標籤 -->
        <div class="form-section">
          <div class="section-title">🏷️ 餐廳標籤</div>

          <div class="tag-row">
            <span class="sub-label">時段：</span>
            <div class="tags-group">
              <el-tag
                v-for="tag in periodTags"
                :key="tag"
                :effect="form.tags.includes(tag) ? 'dark' : 'plain'"
                :class="{ 'clickable-tag': !isViewOnly }"
                @click="!isViewOnly && toggleTag(tag)"
              >
                #{{ tag }}
              </el-tag>
            </div>
          </div>

          <div class="tag-row" style="margin-top: 10px">
            <span class="sub-label">分類：</span>
            <div class="tags-group">
              <el-tag
                v-for="tag in customTags"
                :key="tag"
                :effect="form.tags.includes(tag) ? 'dark' : 'plain'"
                type="info"
                :closable="!isViewOnly"
                :class="{ 'clickable-tag': !isViewOnly }"
                @click="!isViewOnly && toggleTag(tag)"
                @close="!isViewOnly && $emit('delete-tag', tag)"
              >
                #{{ tag }}
              </el-tag>
            </div>
          </div>

          <div v-if="!isViewOnly" class="add-tag-box">
            <el-input
              v-model="newTagInput"
              placeholder="新增自訂分類標籤..."
              style="width: 220px"
              @keyup.enter="createCustomTag"
            >
              <template #append>
                <el-button @click="createCustomTag">建立</el-button>
              </template>
            </el-input>
          </div>
        </div>

        <el-divider />

        <!-- 6. 特色與預約 -->
        <div class="form-section">
          <div class="section-title">💡 特色與預約</div>

          <el-form-item label="圖片 / 菜單連結">
            <el-input v-model="form.menuUrl" placeholder="請貼上照片或菜單網址" />
          </el-form-item>

          <el-form-item label="餐廳特色備忘">
            <el-input
              v-model="form.features"
              type="textarea"
              :rows="2"
              placeholder="招牌菜、環境氣氛等備忘..."
            />
          </el-form-item>

          <el-form-item label="預約資訊">
            <el-radio-group v-model="form.canReserve" @change="handleReserveChange">
              <el-radio :value="null">不確定</el-radio>
              <el-radio :value="false">不可預約</el-radio>
              <el-radio :value="true">可預約</el-radio>
            </el-radio-group>
          </el-form-item>

          <div v-if="form.canReserve" class="reserve-sub-card">
            <el-form-item label="預約方式">
              <el-radio-group v-model="form.reserveType">
                <el-radio value="phone">電話預約</el-radio>
                <el-radio value="online">線上預約</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item
              v-if="form.reserveType === 'phone'"
              label="店家電話號碼"
              style="margin-bottom: 0"
            >
              <el-input v-model="form.phone" placeholder="例如：02-23456789" />
            </el-form-item>
          </div>
        </div>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <template v-if="isViewOnly">
          <!-- 🌟 在檢視模式下只顯示關閉按鈕，隱藏編輯按鈕 -->
          <el-button @click="handleClose">關閉</el-button>
        </template>

        <template v-else>
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit">
            {{ initialData ? "儲存變更" : "確認新增餐廳" }}
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { Delete } from "@element-plus/icons-vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  availableTags: { type: Array, default: () => [] },
  initialData: { type: Object, default: null },
  isViewOnly: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:modelValue",
  "close",
  "add",
  "update",
  "switch-to-edit",
  "add-new-tag",
  "delete-tag",
]);

// 🌟 Modal 顯示狀態（與父元件雙向綁定）
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const inputUrl = ref("");
const newTagInput = ref("");

const DEFAULT_PERIODS = ["早餐", "午餐", "晚餐", "下午茶/點心", "宵夜"];
const periodTags = computed(() => DEFAULT_PERIODS);
const customTags = computed(() =>
  props.availableTags.filter((t) => !DEFAULT_PERIODS.includes(t))
);

// 定義標準星期順序
const weekDaysList = [
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
  "星期日",
];

const createDefaultHours = () => ({
  星期一: { isOpen: true, slots: [{ openTime: "11:00", closeTime: "21:00" }] },
  星期二: { isOpen: true, slots: [{ openTime: "11:00", closeTime: "21:00" }] },
  星期三: { isOpen: true, slots: [{ openTime: "11:00", closeTime: "21:00" }] },
  星期四: { isOpen: true, slots: [{ openTime: "11:00", closeTime: "21:00" }] },
  星期五: { isOpen: true, slots: [{ openTime: "11:00", closeTime: "21:00" }] },
  星期六: { isOpen: true, slots: [{ openTime: "11:00", closeTime: "21:00" }] },
  星期日: { isOpen: true, slots: [{ openTime: "11:00", closeTime: "21:00" }] },
});

const form = reactive({
  id: null,
  name: "",
  address: "",
  googleMapUrl: "",
  businessHours: createDefaultHours(),
  tags: [],
  minCost: null,
  maxCost: null,
  menuUrl: "",
  features: "",
  rating: 0,
  canReserve: null,
  reserveType: "",
  phone: "",
});

const dialogTitle = computed(() => {
  if (props.isViewOnly) return "🍽️ 餐廳詳細資訊";
  return props.initialData ? "✏️ 編輯餐廳資訊" : "✨ 新增口袋餐廳";
});

watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      const parsedData = JSON.parse(JSON.stringify(newData));
      const baseHours = createDefaultHours();
      if (parsedData.businessHours) {
        weekDaysList.forEach((day) => {
          if (parsedData.businessHours[day]) {
            baseHours[day] = parsedData.businessHours[day];
          }
        });
      }
      parsedData.businessHours = baseHours;

      Object.assign(form, parsedData);

      if (newData.googleMapUrl) {
        inputUrl.value = newData.googleMapUrl;
      }
    } else {
      // 重置表單
      Object.assign(form, {
        id: null,
        name: "",
        address: "",
        googleMapUrl: "",
        businessHours: createDefaultHours(),
        tags: [],
        minCost: null,
        maxCost: null,
        menuUrl: "",
        features: "",
        rating: 0,
        canReserve: null,
        reserveType: "",
        phone: "",
      });
      inputUrl.value = "";
    }
  },
  { immediate: true }
);

const handleClose = () => {
  visible.value = false;
  emit("close");
};

const handleReserveChange = (val) => {
  if (val !== true) {
    form.reserveType = "";
    form.phone = "";
  }
};

const addTimeSlot = (dayName) => {
  form.businessHours[dayName].slots.push({ openTime: "", closeTime: "" });
};

const deleteTimeSlot = (dayName, index) => {
  form.businessHours[dayName].slots.splice(index, 1);
  if (form.businessHours[dayName].slots.length === 0) {
    form.businessHours[dayName].isOpen = false;
  }
};

const handleDayToggle = (dayName) => {
  const day = form.businessHours[dayName];
  if (day.isOpen && day.slots.length === 0) {
    day.slots.push({
      openTime: "11:00",
      closeTime: "21:00",
    });
  }
};

const handlePaste = (event) => {
  const pastedText = event.clipboardData?.getData("text") || "";
  inputUrl.value = pastedText;
  smartParseUrl(pastedText);
};

const smartParseUrl = async (targetUrl) => {
  const url = (targetUrl || "").trim();
  if (!url) return;

  form.googleMapUrl = url;

  const isShortUrl =
    url.includes("goo.gl") ||
    url.includes("googleusercontent.com") ||
    !url.includes("/maps/place/");

  if (isShortUrl) {
    form.name = "";
    form.address = "";
    return;
  }

  const placeRegex = /\/maps\/place\/([^/]+)/;
  const queryRegex = /[?&]q=([^&]+)/;
  let detectedName = "";

  const placeMatch = url.match(placeRegex);
  const queryMatch = url.match(queryRegex);

  if (placeMatch && placeMatch[1]) {
    detectedName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  } else if (queryMatch && queryMatch[1]) {
    detectedName = decodeURIComponent(queryMatch[1].replace(/\+/g, " "));
  }

  if (detectedName) {
    if (detectedName.includes(",")) detectedName = detectedName.split(",")[0];
    form.name = detectedName;
  }

  const geoRegex = /@([0-9.]+),([0-9.]+)/;
  const geoMatch = url.match(geoRegex);

  if (geoMatch && geoMatch[1] && geoMatch[2]) {
    const lat = geoMatch[1];
    const lon = geoMatch[2];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=zh-TW`,
        { headers: { "User-Agent": "MyPocketRestaurantApp" } }
      );
      const data = await response.json();

      if (data && data.address) {
        const addr = data.address;
        let rawHouseNumber = addr.house_number || "";
        if (typeof rawHouseNumber === "string") {
          rawHouseNumber = rawHouseNumber.replace("號", "");
        }
        const houseNumber = rawHouseNumber ? `${rawHouseNumber}號` : "";

        const city = addr.city || addr.town || addr.county || "";
        const suburb = addr.suburb || addr.district || "";
        const road = addr.road || "";

        let cleanedAddress = `${city}${suburb}${road}${houseNumber}`;
        if (!cleanedAddress) {
          cleanedAddress = data.display_name
            .replace(/, 中華民國.*$/, "")
            .split(", ")
            .reverse()
            .join("");
        }
        form.address = cleanedAddress.replace("號號", "號");
      } else {
        form.address = "";
      }
    } catch (error) {
      form.address = "";
    }
  } else {
    form.address = "";
  }
};

const toggleTag = (tag) => {
  const idx = form.tags.indexOf(tag);
  if (idx > -1) form.tags.splice(idx, 1);
  else form.tags.push(tag);
};

const createCustomTag = () => {
  const tag = newTagInput.value.trim();
  if (!tag) return;
  emit("add-new-tag", tag);
  if (!form.tags.includes(tag)) form.tags.push(tag);
  newTagInput.value = "";
};

const handleSubmit = () => {
  if (!form.name) return ElMessage.warning("請填寫餐廳名稱！");
  if (!form.address) return ElMessage.warning("請填寫正確的餐廳地址！");

  const hasMin = form.minCost !== "" && form.minCost !== null;
  const hasMax = form.maxCost !== "" && form.maxCost !== null;
  if (hasMin && hasMax && Number(form.maxCost) < Number(form.minCost)) {
    return ElMessage.warning("最高消費不能小於最低消費喔！");
  }

  let cleanedHours = {};
  let hasAnyOpenDay = false;

  weekDaysList.forEach((day) => {
    const data = form.businessHours[day];
    if (data && data.isOpen) {
      const validSlots = data.slots.filter((s) => s.openTime || s.closeTime);
      if (validSlots.length > 0) {
        hasAnyOpenDay = true;
        cleanedHours[day] = { isOpen: true, slots: validSlots };
      } else cleanedHours[day] = { isOpen: false, slots: [] };
    } else cleanedHours[day] = { isOpen: false, slots: [] };
  });

  const payload = {
    ...form,
    businessHours: hasAnyOpenDay ? cleanedHours : null,
    minCost: hasMin ? Number(form.minCost) : null,
    maxCost: hasMax ? Number(form.maxCost) : null,
    rating: form.rating ? Number(form.rating) : null,
    canReserve: form.canReserve,
    reserveType: form.canReserve ? form.reserveType : null,
    phone: form.canReserve && form.reserveType === "phone" ? form.phone : null,
  };

  if (props.initialData) {
    emit("update", payload);
  } else {
    emit("add", payload);
  }
  handleClose();
};
</script>

<style scoped>
.scroll-container {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 12px;
}

.form-section {
  display: flex;
  flex-direction: column;
}

.magic-bg {
  background: #f0fdf4;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
}

.section-title {
  font-size: 1rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 12px;
}

.help-text {
  font-size: 0.8rem;
  color: #16a34a;
}

.sub-label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
  white-space: nowrap;
}

.clickable-tag {
  cursor: pointer;
  user-select: none;
}

.detailed-hours-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  gap: 16px;
}

.day-check {
  width: 90px;
}

.day-content {
  flex: 1;
}

.slots-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.slot-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.closed-label {
  font-size: 0.85rem;
  color: #94a3b8;
}

.cost-range-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rate-box {
  padding-top: 4px;
}

.tag-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.tags-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.add-tag-box {
  margin-top: 12px;
}

.reserve-sub-card {
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
