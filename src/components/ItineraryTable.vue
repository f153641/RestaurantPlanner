<template>
  <div class="saved-list-container">
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

      <!-- 🌟 操作欄位 (新增編輯按鈕) -->
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <!-- ✏️ 編輯按鈕 -->
          <el-button
            type="primary"
            :icon="Edit"
            circle
            plain
            size="small"
            @click="$emit('edit', row)"
          />
          <!-- 🗑️ 刪除按鈕 -->
          <el-button
            type="danger"
            :icon="Delete"
            circle
            plain
            size="small"
            @click="$emit('delete', row.id)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { Delete, Edit } from "@element-plus/icons-vue";

defineProps({
  savedItineraries: {
    type: Array,
    default: () => [],
  },
});

defineEmits(["delete", "edit"]);
</script>
