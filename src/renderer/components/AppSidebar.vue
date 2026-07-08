<script setup lang="ts">
import type { Component } from "vue";
import { CalendarDays, FileClock, FileText, History, Settings } from "lucide-vue-next";

defineProps<{ active: string }>();

const emit = defineEmits<{
  select: [page: string];
}>();

const items: Array<{ id: string; label: string; icon: Component }> = [
  { id: "today", label: "今日", icon: CalendarDays },
  { id: "timeline", label: "时间线", icon: FileClock },
  { id: "reports", label: "报告", icon: FileText },
  { id: "history", label: "历史", icon: History },
  { id: "settings", label: "设置", icon: Settings }
];
</script>

<template>
  <nav class="sidebar" aria-label="主导航">
    <div class="brand">
      <span class="brand-mark">日</span>
      <div>
        <strong>日报助手</strong>
        <span>Local Desk</span>
      </div>
    </div>

    <div class="nav-list">
      <button
        v-for="item in items"
        :key="item.id"
        class="nav-item"
        :class="{ active: active === item.id }"
        type="button"
        :title="item.label"
        @click="emit('select', item.id)"
      >
        <component :is="item.icon" :size="18" :stroke-width="1.9" />
        <span>{{ item.label }}</span>
      </button>
    </div>

    <div class="sidebar-footer">
      <span class="signal-dot" aria-hidden="true"></span>
      <span>本地记录</span>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  width: 188px;
  min-height: 100vh;
  flex-direction: column;
  padding: 18px 12px;
  background: var(--surface-strong);
  color: #f7f3e9;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px 22px;
}

.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius);
  background: var(--accent);
  color: white;
  font-weight: 800;
}

.brand strong,
.brand span {
  display: block;
}

.brand strong {
  font-size: 15px;
}

.brand span {
  margin-top: 2px;
  color: rgba(247, 243, 233, 0.56);
  font-size: 11px;
}

.nav-list {
  display: grid;
  gap: 5px;
}

.nav-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: var(--radius);
  padding: 10px 11px;
  background: transparent;
  color: rgba(247, 243, 233, 0.72);
  cursor: pointer;
  text-align: left;
}

.nav-item:hover,
.nav-item.active {
  background: rgba(255, 253, 248, 0.11);
  color: #fffdf8;
}

.nav-item.active {
  box-shadow: inset 3px 0 0 var(--accent);
}

.nav-item span {
  overflow: hidden;
  font-size: 14px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding: 10px 8px;
  border: 1px solid rgba(255, 253, 248, 0.1);
  border-radius: var(--radius);
  color: rgba(247, 243, 233, 0.68);
  font-size: 12px;
}

.signal-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--ok);
  box-shadow: 0 0 0 4px rgba(40, 131, 91, 0.22);
}
</style>
