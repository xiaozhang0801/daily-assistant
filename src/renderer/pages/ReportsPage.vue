<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Copy, FileDown, FileText } from "lucide-vue-next";
import { todayRefreshIntervalMs } from "./todayViewModel";
import { buildTodayReportView, emptyDailyReport } from "./reportsViewModel";

const currentReport = ref(emptyDailyReport);
const reports = ref<Array<{ id: string; date: string; status: string; count: number }>>([]);
let refreshTimer: number | undefined;
let loading = false;

async function copyReport(): Promise<void> {
  await navigator.clipboard?.writeText(currentReport.value);
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadReports(): Promise<void> {
  const dashboard = window.dailyAssistant?.dashboard;
  if (!dashboard || loading) return;

  loading = true;
  try {
    const today = await dashboard.getToday();
    const view = buildTodayReportView({
      date: todayDateKey(),
      reportDraft: today.reportDraft,
      events: today.events
    });
    currentReport.value = view.currentReport;
    reports.value = view.reports;
  } finally {
    loading = false;
  }
}

function refreshWhenVisible(): void {
  if (document.visibilityState === "visible") {
    void loadReports();
  }
}

onMounted(() => {
  void loadReports();
  refreshTimer = window.setInterval(() => {
    void loadReports();
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
        <p>Reports</p>
        <h1>日报库</h1>
      </div>
      <div class="header-actions">
        <button type="button" title="复制当前日报" @click="copyReport">
          <Copy :size="16" :stroke-width="1.9" />
          <span>复制</span>
        </button>
        <button type="button" title="导出 Markdown">
          <FileDown :size="16" :stroke-width="1.9" />
          <span>导出</span>
        </button>
      </div>
    </div>

    <div class="report-layout">
      <aside class="report-list" aria-label="日报列表">
        <article v-for="report in reports" :key="report.id" class="report-row">
          <FileText :size="17" :stroke-width="1.9" />
          <div>
            <strong>{{ report.date }}</strong>
            <span>{{ report.status }} · {{ report.count }} 条事件</span>
          </div>
        </article>
      </aside>

      <section class="editor-panel">
        <textarea v-model="currentReport" spellcheck="false" aria-label="日报内容"></textarea>
      </section>
    </div>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  padding: 24px 26px;
  background: transparent;
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

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 8px 11px;
  background: var(--surface);
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 13px;
  font-weight: 750;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.header-actions button:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.report-layout {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
}

.report-list,
.editor-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-hairline);
}

.report-list {
  display: grid;
  align-content: start;
  gap: 0;
  overflow: auto;
  padding: 8px;
}

.report-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  border-radius: var(--radius);
  padding: 12px;
  color: var(--ink-soft);
  transition:
    background 160ms ease,
    color 160ms ease;
}

.report-row:first-child {
  background: var(--accent-soft);
  color: var(--accent);
}

.report-row:hover {
  background: var(--surface-muted);
}

.report-row strong,
.report-row span {
  display: block;
}

.report-row strong {
  font-size: 14px;
}

.report-row span {
  margin-top: 3px;
  color: var(--ink-soft);
  font-size: 12px;
}

.editor-panel {
  min-height: 0;
  overflow: hidden;
}

.editor-panel textarea {
  width: 100%;
  height: 100%;
  min-height: 520px;
  border: 0;
  padding: 22px;
  background:
    linear-gradient(180deg, rgba(247, 249, 252, 0.72), rgba(255, 255, 255, 0) 130px),
    var(--surface);
  color: var(--ink);
  font-family: "Cascadia Mono", Consolas, "Microsoft YaHei UI", monospace;
  font-size: 13px;
  line-height: 1.68;
}
</style>
