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
        <span>Daily Workspace</span>
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
  width: 204px;
  height: 100vh;
  min-height: 100vh;
  flex-direction: column;
  border-right: 1px solid var(--line);
  padding: 18px 14px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--ink);
  box-shadow: 1px 0 0 rgba(255, 255, 255, 0.7) inset;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px 24px;
}

.brand-mark {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius);
  background: var(--surface-strong);
  color: white;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(17, 24, 39, 0.16);
}

.brand strong,
.brand span {
  display: block;
}

.brand strong {
  font-size: 15px;
  letter-spacing: 0;
}

.brand span {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 11px;
}

.nav-list {
  display: grid;
  gap: 6px;
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
  color: var(--ink-soft);
  cursor: pointer;
  text-align: left;
  transition:
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.nav-item:hover {
  background: var(--surface-muted);
  color: var(--ink);
}

.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent-strong);
  box-shadow:
    inset 3px 0 0 var(--accent),
    var(--shadow-hairline);
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
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 10px 9px;
  background: var(--surface-muted);
  color: var(--ink-soft);
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
