<template>
  <div class="filter-bar">
    <div class="tags-filter">
      <span class="filter-label">時段：</span>
      <div class="tags-group">
        <button 
          :class="['filter-tag-btn', { active: isAllSelected(periodTags) }]"
          @click="clearCategory(periodTags)"
        >全部</button>
        <button 
          v-for="tag in periodTags" :key="tag"
          :class="['filter-tag-btn', { active: selectedTags.includes(tag) }]"
          @click="toggleTag(tag)"
        >{{ tag }}</button>
      </div>
    </div>

    <div class="tags-filter">
      <span class="filter-label">分類：</span>
      <div class="tags-group">
        <button 
          :class="['filter-tag-btn', { active: isAllSelected(customTags) }]"
          @click="clearCategory(customTags)"
        >全部</button>
        <button 
          v-for="tag in customTags" :key="tag"
          :class="['filter-tag-btn', { active: selectedTags.includes(tag) }]"
          @click="toggleTag(tag)"
        >{{ tag }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps(['availableTags', 'selectedTags', 'onlyReservable'])
const emit = defineEmits(['update:selectedTags', 'update:onlyReservable'])

const DEFAULT_PERIODS = ['早餐', '午餐', '晚餐', '下午茶/點心', '宵夜']
const periodTags = computed(() => props.availableTags.filter(t => DEFAULT_PERIODS.includes(t)))
const customTags = computed(() => props.availableTags.filter(t => !DEFAULT_PERIODS.includes(t)))

const isAllSelected = (categoryTags) => {
  return !categoryTags.some(t => props.selectedTags.includes(t))
}

const clearCategory = (categoryTags) => {
  const newTags = props.selectedTags.filter(t => !categoryTags.includes(t))
  emit('update:selectedTags', newTags)
}

const toggleTag = (tag) => {
  let tags = [...props.selectedTags]
  tags.includes(tag) ? tags = tags.filter(t => t !== tag) : tags.push(tag)
  emit('update:selectedTags', tags)
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 16px; /* 兩行之間的垂直距離 */
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.tags-filter {
  display: flex;
  align-items: center;
  gap: 12px; /* 標籤和「時段：」的距離 */
}

.filter-label {
  font-weight: bold;
  color: #4a5568;
  width: 50px; /* 固定寬度，確保兩行對齊 */
  flex-shrink: 0;
}

.tags-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px; /* 每個按鈕之間的水平間隔 */
}

.filter-tag-btn {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  background-color: #f7fafc;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.filter-tag-btn.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}
</style>