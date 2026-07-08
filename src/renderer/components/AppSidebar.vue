<script setup lang="ts">
import type { Component } from "vue";
import { CalendarDays, Database, FileClock, FileText, History, Settings } from "lucide-vue-next";
import appLogo from "../assets/app-logo.svg";

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
      <img class="brand-mark" :src="appLogo" alt="" aria-hidden="true" />
      <div>
        <strong>日报助手</strong>
        <span>工作记录台</span>
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
      <Database :size="15" :stroke-width="1.9" />
      <span>本地记录</span>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  width: 232px;
  height: 100dvh;
  min-height: 100dvh;
  flex-direction: column;
  border-right: 1px solid rgba(217, 225, 236, 0.86);
  padding: 18px 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(244, 247, 251, 0.78)),
    var(--surface-glass);
  color: var(--ink);
  box-shadow:
    16px 0 44px rgba(57, 70, 96, 0.07),
    inset -1px 0 0 rgba(255, 255, 255, 0.76);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 20px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.56);
  box-shadow: var(--shadow-hairline);
  margin-bottom: 22px;
}

.brand-mark {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border: 1px solid rgba(217, 225, 236, 0.92);
  border-radius: 14px;
  box-shadow:
    0 12px 28px rgba(57, 70, 96, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
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
  gap: 8px;
}

.nav-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border: 0;
  border: 1px solid transparent;
  border-radius: 15px;
  padding: 10px 12px;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
  text-align: left;
  transition:
    background 240ms var(--motion),
    border-color 240ms var(--motion),
    color 240ms var(--motion),
    transform 240ms var(--motion),
    box-shadow 240ms var(--motion);
}

.nav-item:hover {
  border-color: rgba(217, 225, 236, 0.9);
  background: rgba(255, 255, 255, 0.62);
  color: var(--ink);
  transform: translateX(1px);
}

.nav-item.active {
  border-color: rgba(54, 87, 214, 0.18);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(232, 237, 255, 0.92)),
    var(--accent-soft);
  color: var(--accent-strong);
  box-shadow:
    inset 3px 0 0 var(--accent),
    0 12px 28px rgba(54, 87, 214, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
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
  border: 1px solid rgba(217, 225, 236, 0.86);
  border-radius: 16px;
  padding: 11px 10px;
  background: rgba(255, 255, 255, 0.56);
  color: var(--ink-muted);
  font-size: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
}
</style>
