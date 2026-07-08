<script setup lang="ts">
import { onMounted, ref } from "vue";
import { CalendarCheck, Clock, FileText } from "lucide-vue-next";
import type { DailyHistoryDay } from "../../shared/types";

const days = ref<DailyHistoryDay[]>([]);
const loading = ref(false);
const errorMessage = ref("");

async function loadHistory(): Promise<void> {
  const dashboard = window.dailyAssistant?.dashboard;
  if (!dashboard || loading.value) return;

  loading.value = true;
  errorMessage.value = "";
  try {
    days.value = await dashboard.getHistory();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "读取历史记录失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadHistory();
});
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <p>历史归档</p>
        <h1>历史记录</h1>
      </div>
    </div>

    <div class="history-panel">
      <div class="table-head">
        <span>日期</span>
        <span>记录时长</span>
        <span>事件</span>
        <span>日报</span>
      </div>
      <article v-if="errorMessage" class="history-row table-state">
        <span>{{ errorMessage }}</span>
      </article>
      <article v-else-if="loading" class="history-row table-state">
        <span>正在读取历史记录</span>
      </article>
      <article v-else-if="days.length === 0" class="history-row table-state">
        <span>暂无历史记录</span>
      </article>
      <template v-else>
        <article v-for="day in days" :key="day.date" class="history-row">
          <div class="date-cell">
            <CalendarCheck :size="17" :stroke-width="1.9" />
            <strong>{{ day.date }}</strong>
          </div>
          <div>
            <Clock :size="16" :stroke-width="1.9" />
            <span>{{ day.duration }}</span>
          </div>
          <div>
            <span>{{ day.events }} 条</span>
          </div>
          <div>
            <FileText :size="16" :stroke-width="1.9" />
            <span>{{ day.report }}</span>
          </div>
        </article>
      </template>
    </div>
  </section>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  padding: 26px 28px;
  background: transparent;
}

.page-header {
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
  letter-spacing: 0;
}

.page-header h1 {
  margin-top: 5px;
  font-size: 28px;
  font-weight: 760;
}

.history-panel {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-raised);
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.table-head,
.history-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) repeat(3, minmax(120px, 1fr));
  align-items: center;
  gap: 12px;
  padding: 13px 18px;
}

.table-head {
  border-bottom: 1px solid var(--line);
  background: rgba(243, 246, 248, 0.82);
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 800;
}

.history-row + .history-row {
  border-top: 1px solid var(--line);
}

.history-row {
  transition: background 160ms ease;
}

.history-row:hover {
  background: var(--surface-muted);
}

.history-row > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--ink-soft);
  font-size: 13px;
}

.table-state {
  color: var(--ink-muted);
  font-size: 13px;
}

.table-state span {
  grid-column: 1 / -1;
}

.date-cell strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
