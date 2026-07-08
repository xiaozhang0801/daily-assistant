<script setup lang="ts">
import { CalendarCheck, Clock, FileText } from "lucide-vue-next";

const days = [
  { date: "2026-07-08", duration: "0m", events: 0, report: "草稿" },
  { date: "2026-07-07", duration: "0m", events: 0, report: "未生成" },
  { date: "2026-07-06", duration: "0m", events: 0, report: "未生成" }
];
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <p>History</p>
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
    </div>
  </section>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24px 26px;
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
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.page-header h1 {
  margin-top: 5px;
  font-size: 25px;
}

.history-panel {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-hairline);
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
  background: var(--surface-muted);
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

.date-cell strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
