<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { WorkEvent } from "../../shared/types";
import TimelineList from "../components/TimelineList.vue";
import { summarizeEventCategories, todayRefreshIntervalMs } from "./todayViewModel";

const events = ref<WorkEvent[]>([]);
let refreshTimer: number | undefined;
let loading = false;

const categorySummary = computed(() => summarizeEventCategories(events.value));

async function loadTimeline(): Promise<void> {
  const dashboard = window.dailyAssistant?.dashboard;
  if (!dashboard || loading) return;

  loading = true;
  try {
    const today = await dashboard.getToday();
    events.value = today.events;
  } finally {
    loading = false;
  }
}

function refreshWhenVisible(): void {
  if (document.visibilityState === "visible") {
    void loadTimeline();
  }
}

onMounted(() => {
  void loadTimeline();
  refreshTimer = window.setInterval(() => {
    void loadTimeline();
  }, todayRefreshIntervalMs);
  window.addEventListener("focus", refreshWhenVisible);
  document.addEventListener("visibilitychange", refreshWhenVisible);
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
  window.removeEventListener("focus", refreshWhenVisible);
  document.removeEventListener("visibilitychange", refreshWhenVisible);
});
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <p>Timeline</p>
        <h1>完整时间线</h1>
      </div>
      <span>今日</span>
    </div>

    <div class="page-grid">
      <TimelineList :events="events" />
      <aside class="side-panel">
        <p>分组</p>
        <h2>工作类型</h2>
        <div v-if="categorySummary.length" class="category-list">
          <div v-for="item in categorySummary" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.count }}</strong>
          </div>
        </div>
        <p v-else class="empty-note">暂无分类数据</p>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  padding: 24px 26px;
  background: transparent;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.page-header p,
.page-header h1 {
  margin: 0;
}

.page-header p {
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.page-header h1 {
  margin-top: 5px;
  font-size: 25px;
}

.page-header > span {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 11px;
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 700;
  box-shadow: var(--shadow-hairline);
}

.page-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
}

.side-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 18px;
  background: var(--surface);
  overflow: auto;
  box-shadow: var(--shadow-hairline);
}

.side-panel p,
.side-panel h2 {
  margin: 0;
}

.side-panel p {
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.side-panel h2 {
  margin-top: 4px;
  font-size: 17px;
}

.category-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.category-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid transparent;
  border-radius: var(--radius);
  padding: 10px 12px;
  background: var(--surface-muted);
}

.category-list span {
  color: var(--ink-soft);
  font-size: 13px;
}

.category-list strong {
  font-size: 18px;
}

.empty-note {
  margin: 18px 0 0;
  color: var(--ink-muted);
  font-size: 13px;
}
</style>
