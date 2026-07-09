<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { CalendarDays, Copy, FileDown, FileText, Save, Sparkles } from "lucide-vue-next";
import { todayRefreshIntervalMs } from "./todayViewModel";
import {
  buildTodayReportView,
  emptyDailyReport,
  toDesktopBridgeUnavailableMessage,
  toMarkdownExportUnavailableMessage
} from "./reportsViewModel";

const currentReport = ref(emptyDailyReport);
const weeklyReportDraft = ref("# 本周周报\n\n- 点击「生成本周周报」后，从已保存日报库汇总。");
const reports = ref<Array<{ id: string; date: string; status: string; count: number }>>([]);
const saving = ref(false);
const weeklyGenerating = ref(false);
const weeklySaving = ref(false);
const reportDirty = ref(false);
const weeklyDirty = ref(false);
const saveStatusMessage = ref("");
const saveErrorMessage = ref("");
const weeklyStatusMessage = ref("");
const weeklyErrorMessage = ref("");
const weeklyMeta = ref<{
  weekKey: string;
  startDate: string;
  endDate: string;
  sourceReportCount: number;
} | null>(null);
let refreshTimer: number | undefined;
let loading = false;

const weeklyMetaLabel = computed(() => {
  if (!weeklyMeta.value) return "本周";
  return `${weeklyMeta.value.startDate} 至 ${weeklyMeta.value.endDate} · ${weeklyMeta.value.weekKey}`;
});

async function copyReport(): Promise<void> {
  saveErrorMessage.value = "";
  try {
    await navigator.clipboard?.writeText(currentReport.value);
    saveStatusMessage.value = "当前日报已复制到剪贴板";
  } catch (error) {
    saveErrorMessage.value = error instanceof Error ? error.message : "复制当前日报失败";
  }
}

async function copyWeeklyReport(): Promise<void> {
  weeklyErrorMessage.value = "";
  try {
    await navigator.clipboard?.writeText(weeklyReportDraft.value);
    weeklyStatusMessage.value = "本周周报已复制到剪贴板";
  } catch (error) {
    weeklyErrorMessage.value = error instanceof Error ? error.message : "复制本周周报失败";
  }
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function clockLabel(): string {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
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
      reportSaved: today.reportSaved,
      events: today.events
    });
    if (!reportDirty.value) {
      currentReport.value = view.currentReport;
    }
    reports.value = view.reports;
  } finally {
    loading = false;
  }
}

async function saveCurrentReport(): Promise<void> {
  const dashboard = window.dailyAssistant?.dashboard;
  if (!dashboard) {
    saveErrorMessage.value = toDesktopBridgeUnavailableMessage("保存日报");
    return;
  }

  saving.value = true;
  saveStatusMessage.value = "";
  saveErrorMessage.value = "";
  try {
    const result = await dashboard.saveReport(currentReport.value);
    currentReport.value = result.content;
    reportDirty.value = false;
    saveStatusMessage.value = `已保存 ${clockLabel()}`;
    await loadReports();
  } catch (error) {
    saveErrorMessage.value = error instanceof Error ? error.message : "保存日报失败";
  } finally {
    saving.value = false;
  }
}

async function generateWeeklyReport(): Promise<void> {
  const dashboard = window.dailyAssistant?.dashboard;
  if (!dashboard) {
    weeklyErrorMessage.value = toDesktopBridgeUnavailableMessage("生成周报");
    return;
  }

  weeklyGenerating.value = true;
  weeklyStatusMessage.value = "";
  weeklyErrorMessage.value = "";
  try {
    const result = await dashboard.generateWeeklyReport();
    weeklyReportDraft.value = result.content;
    weeklyDirty.value = false;
    weeklyMeta.value = {
      weekKey: result.weekKey,
      startDate: result.startDate,
      endDate: result.endDate,
      sourceReportCount: result.sourceReportCount
    };
    weeklyStatusMessage.value =
      result.sourceReportCount > 0 ? `已汇总 ${result.sourceReportCount} 篇日报` : "本周暂无已保存日报";
  } catch (error) {
    weeklyErrorMessage.value = error instanceof Error ? error.message : "生成周报失败";
  } finally {
    weeklyGenerating.value = false;
  }
}

async function saveCurrentWeeklyReport(): Promise<void> {
  const dashboard = window.dailyAssistant?.dashboard;
  if (!dashboard) {
    weeklyErrorMessage.value = toDesktopBridgeUnavailableMessage("保存周报");
    return;
  }

  weeklySaving.value = true;
  weeklyStatusMessage.value = "";
  weeklyErrorMessage.value = "";
  try {
    const result = await dashboard.saveWeeklyReport(weeklyReportDraft.value);
    weeklyReportDraft.value = result.content;
    weeklyDirty.value = false;
    weeklyMeta.value = {
      weekKey: result.weekKey,
      startDate: result.startDate,
      endDate: result.endDate,
      sourceReportCount: weeklyMeta.value?.sourceReportCount ?? 0
    };
    weeklyStatusMessage.value = `周报已保存 ${clockLabel()}`;
  } catch (error) {
    weeklyErrorMessage.value = error instanceof Error ? error.message : "保存周报失败";
  } finally {
    weeklySaving.value = false;
  }
}

function updateCurrentReport(event: Event): void {
  currentReport.value = (event.target as HTMLTextAreaElement).value;
  reportDirty.value = true;
  saveErrorMessage.value = "";
  if (saveStatusMessage.value.startsWith("已保存")) {
    saveStatusMessage.value = "未保存修改";
  }
  reports.value = reports.value.map((report, index) => (index === 0 ? { ...report, status: "草稿" } : report));
}

function updateWeeklyReport(event: Event): void {
  weeklyReportDraft.value = (event.target as HTMLTextAreaElement).value;
  weeklyDirty.value = true;
  weeklyErrorMessage.value = "";
  if (weeklyStatusMessage.value.startsWith("周报已保存")) {
    weeklyStatusMessage.value = "周报有未保存修改";
  }
}

function showMarkdownExportMessage(): void {
  saveErrorMessage.value = toMarkdownExportUnavailableMessage();
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
        <p>报告归档</p>
        <h1>日报库</h1>
      </div>
      <div class="header-actions">
        <span v-if="saveErrorMessage" class="save-message error">{{ saveErrorMessage }}</span>
        <span v-else-if="saveStatusMessage" class="save-message">{{ saveStatusMessage }}</span>
        <button type="button" title="复制当前日报" @click="copyReport">
          <Copy :size="16" :stroke-width="1.9" />
          <span>复制</span>
        </button>
        <button type="button" title="保存当前日报" :disabled="saving || !currentReport.trim()" @click="saveCurrentReport">
          <Save :size="16" :stroke-width="1.9" />
          <span>{{ saving ? "保存中" : "保存" }}</span>
        </button>
        <button type="button" title="导出 Markdown" @click="showMarkdownExportMessage">
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
            <span>{{ report.status }}，{{ report.count }} 条事件</span>
          </div>
        </article>
        <article class="report-row weekly-row">
          <CalendarDays :size="17" :stroke-width="1.9" />
          <div>
            <strong>本周周报</strong>
            <span>{{ weeklyMeta ? `${weeklyMeta.sourceReportCount} 篇日报` : "等待生成" }}</span>
          </div>
        </article>
      </aside>

      <div class="editor-stack">
        <section class="editor-panel">
          <textarea :value="currentReport" spellcheck="false" aria-label="日报内容" @input="updateCurrentReport"></textarea>
        </section>

        <section class="weekly-panel" aria-label="周报总结">
          <div class="weekly-header">
            <div>
              <p>周报总结</p>
              <h2>{{ weeklyMetaLabel }}</h2>
            </div>
            <div class="weekly-actions">
              <span v-if="weeklyErrorMessage" class="save-message error">{{ weeklyErrorMessage }}</span>
              <span v-else-if="weeklyStatusMessage" class="save-message">{{ weeklyStatusMessage }}</span>
              <button type="button" title="复制本周周报" @click="copyWeeklyReport">
                <Copy :size="16" :stroke-width="1.9" />
                <span>复制</span>
              </button>
              <button type="button" title="从日报库生成本周周报" :disabled="weeklyGenerating" @click="generateWeeklyReport">
                <Sparkles :size="16" :stroke-width="1.9" />
                <span>{{ weeklyGenerating ? "生成中" : "生成本周周报" }}</span>
              </button>
              <button
                type="button"
                title="保存本周周报"
                :disabled="weeklySaving || !weeklyReportDraft.trim()"
                @click="saveCurrentWeeklyReport"
              >
                <Save :size="16" :stroke-width="1.9" />
                <span>{{ weeklySaving ? "保存中" : weeklyDirty ? "保存修改" : "保存周报" }}</span>
              </button>
            </div>
          </div>
          <textarea
            class="weekly-textarea"
            :value="weeklyReportDraft"
            spellcheck="false"
            aria-label="周报内容"
            @input="updateWeeklyReport"
          ></textarea>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
  padding: 26px 28px;
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
  letter-spacing: 0;
}

.page-header h1 {
  margin-top: 5px;
  font-size: 28px;
  font-weight: 760;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-message {
  color: var(--ok);
  font-size: 12px;
  font-weight: 700;
}

.save-message.error {
  color: var(--danger);
}

.header-actions button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 11px;
  background: var(--surface-raised);
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 13px;
  font-weight: 750;
  transition:
    border-color 240ms var(--motion),
    background 240ms var(--motion),
    color 240ms var(--motion),
    box-shadow 240ms var(--motion),
    transform 240ms var(--motion);
}

.header-actions button:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.header-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.report-layout {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
}

.report-list,
.editor-panel,
.weekly-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(247, 249, 253, 0.78)),
    var(--surface-raised);
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
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
  border-radius: 14px;
  padding: 12px;
  color: var(--ink-soft);
  transition:
    background 240ms var(--motion),
    color 240ms var(--motion),
    transform 240ms var(--motion);
}

.report-row:first-child {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.weekly-row {
  margin-top: 8px;
  border-top: 1px solid var(--line);
}

.report-row:hover {
  background: var(--surface-muted);
  transform: translateX(1px);
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

.editor-stack {
  display: grid;
  min-height: 0;
  grid-template-rows: minmax(360px, 1fr) minmax(280px, 0.72fr);
  gap: 16px;
}

.editor-panel {
  min-height: 0;
  overflow: hidden;
}

.editor-panel textarea,
.weekly-textarea {
  width: 100%;
  height: 100%;
  border: 0;
  padding: 22px;
  background:
    linear-gradient(180deg, rgba(243, 246, 248, 0.78), rgba(255, 255, 255, 0) 130px),
    repeating-linear-gradient(0deg, transparent 0, transparent 31px, rgba(82, 98, 122, 0.035) 32px),
    #fcfdfd;
  color: var(--ink);
  font-family: "Cascadia Mono", Consolas, "Microsoft YaHei UI", monospace;
  font-size: 13px;
  line-height: 1.68;
}

.editor-panel textarea {
  min-height: 360px;
}

.weekly-panel {
  display: grid;
  min-height: 0;
  grid-template-rows: auto minmax(210px, 1fr);
  overflow: hidden;
}

.weekly-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid var(--line);
  padding: 16px 18px;
}

.weekly-header p,
.weekly-header h2 {
  margin: 0;
}

.weekly-header p {
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
}

.weekly-header h2 {
  margin-top: 4px;
  color: var(--ink);
  font-size: 16px;
  font-weight: 760;
}

.weekly-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.weekly-actions button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 10px;
  background: var(--surface-raised);
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 750;
  transition:
    border-color 240ms var(--motion),
    background 240ms var(--motion),
    color 240ms var(--motion),
    box-shadow 240ms var(--motion),
    transform 240ms var(--motion);
}

.weekly-actions button:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.weekly-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.weekly-textarea {
  min-height: 210px;
}
</style>
