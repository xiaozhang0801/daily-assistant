<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Activity, Database, FileText, TimerReset } from "lucide-vue-next";
import type { WorkEvent } from "../../shared/types";
import PrivacyPanel from "../components/PrivacyPanel.vue";
import ReportEditor from "../components/ReportEditor.vue";
import StatusBar from "../components/StatusBar.vue";
import TimelineList from "../components/TimelineList.vue";
import { todayRefreshIntervalMs } from "./todayViewModel";

interface TodayState {
  recording: boolean;
  capturedDurationMinutes: number;
  analyzedEventCount: number;
  providerStatus: string;
  events: WorkEvent[];
  reportSaved: boolean;
}

const defaultReport = "# 今日日报\n\n- 今日暂无记录。";
const state = ref<TodayState>({
  recording: false,
  capturedDurationMinutes: 0,
  analyzedEventCount: 0,
  providerStatus: "not_configured",
  events: [],
  reportSaved: false
});
const reportDraft = ref(defaultReport);
const generating = ref(false);
const saving = ref(false);
const reportDirty = ref(false);
const copyState = ref("复制");
const reportStatusMessage = ref("");
const reportErrorMessage = ref("");
let refreshTimer: number | undefined;
let loadingToday = false;

const latestActivity = computed(() => {
  const last = state.value.events.at(-1);
  return last?.title ?? "等待今日记录";
});

const overview = computed(() => [
  {
    label: "记录时长",
    value: `${state.value.capturedDurationMinutes}m`,
    icon: TimerReset
  },
  {
    label: "分析事件",
    value: String(state.value.analyzedEventCount),
    icon: Activity
  },
  {
    label: "日报状态",
    value: reportDirty.value ? "未保存" : state.value.reportSaved ? "已保存" : "草稿",
    icon: FileText
  },
  {
    label: "数据位置",
    value: "本地",
    icon: Database
  }
]);

function clockLabel(): string {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

async function loadToday(preserveReportDraft = false): Promise<void> {
  const dashboard = window.dailyAssistant?.dashboard;
  if (!dashboard) return;
  if (loadingToday) return;

  loadingToday = true;
  try {
    const today = await dashboard.getToday();
    state.value = {
      recording: today.recording,
      capturedDurationMinutes: today.capturedDurationMinutes,
      analyzedEventCount: today.analyzedEventCount,
      providerStatus: today.providerStatus,
      events: today.events,
      reportSaved: today.reportSaved
    };
    if (!preserveReportDraft && !reportDirty.value) {
      reportDraft.value = today.reportDraft || defaultReport;
    }
  } finally {
    loadingToday = false;
  }
}

async function pauseCapture(): Promise<void> {
  await window.dailyAssistant?.dashboard.pauseCapture();
  await loadToday();
}

async function resumeCapture(): Promise<void> {
  await window.dailyAssistant?.dashboard.resumeCapture();
  await loadToday();
}

async function generateReport(): Promise<void> {
  generating.value = true;
  reportStatusMessage.value = "";
  reportErrorMessage.value = "";
  try {
    const result = await window.dailyAssistant?.dashboard.generateReport();
    reportDraft.value = result?.content ?? defaultReport;
    reportDirty.value = true;
    reportStatusMessage.value = `已生成 ${clockLabel()}，未保存`;
    await loadToday(true);
  } catch (error) {
    reportErrorMessage.value = error instanceof Error ? error.message : "生成日报失败";
  } finally {
    generating.value = false;
  }
}

async function saveReport(): Promise<void> {
  const dashboard = window.dailyAssistant?.dashboard;
  if (!dashboard) return;

  saving.value = true;
  reportStatusMessage.value = "";
  reportErrorMessage.value = "";
  try {
    const result = await dashboard.saveReport(reportDraft.value);
    reportDraft.value = result.content;
    reportDirty.value = false;
    reportStatusMessage.value = `已保存 ${clockLabel()}`;
    await loadToday(true);
  } catch (error) {
    reportErrorMessage.value = error instanceof Error ? error.message : "保存日报失败";
  } finally {
    saving.value = false;
  }
}

function updateReportDraft(value: string): void {
  reportDraft.value = value;
  reportDirty.value = true;
  reportErrorMessage.value = "";
  if (reportStatusMessage.value.startsWith("已保存")) {
    reportStatusMessage.value = "未保存修改";
  }
}

async function copyReport(): Promise<void> {
  await navigator.clipboard?.writeText(reportDraft.value);
  copyState.value = "已复制";
  window.setTimeout(() => {
    copyState.value = "复制";
  }, 1200);
}

function refreshWhenVisible(): void {
  if (document.visibilityState === "visible") {
    void loadToday();
  }
}

onMounted(() => {
  void loadToday();
  refreshTimer = window.setInterval(() => {
    void loadToday();
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
  <section class="today-page">
    <StatusBar
      :recording="state.recording"
      :duration="state.capturedDurationMinutes"
      :event-count="state.analyzedEventCount"
      :provider-status="state.providerStatus"
      @pause="pauseCapture"
      @resume="resumeCapture"
    />

    <div class="today-content">
      <section class="overview-strip" aria-label="今日指标">
        <div v-for="item in overview" :key="item.label" class="overview-item">
          <component :is="item.icon" :size="18" :stroke-width="1.9" />
          <div>
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <div class="activity-note">
          <span>最近活动</span>
          <strong>{{ latestActivity }}</strong>
        </div>
      </section>

      <div class="left-column">
        <TimelineList :events="state.events" />
        <PrivacyPanel :provider-status="state.providerStatus" />
      </div>

      <ReportEditor
        :model-value="reportDraft"
        :generating="generating"
        :saving="saving"
        :status-message="reportStatusMessage"
        :error-message="reportErrorMessage"
        @update:model-value="updateReportDraft"
        @generate="generateReport"
        @save="saveReport"
        @copy="copyReport"
      />
      <span class="copy-toast" :class="{ visible: copyState === '已复制' }">{{ copyState }}</span>
    </div>
  </section>
</template>

<style scoped>
.today-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
}

.today-content {
  position: relative;
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(300px, 0.88fr) minmax(390px, 1.12fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  overflow: hidden;
  padding: 20px 22px 22px;
}

.overview-strip {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(4, minmax(120px, 1fr)) minmax(190px, 1.15fr);
  gap: 14px;
}

.overview-item,
.activity-note {
  min-height: 76px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-raised);
  box-shadow:
    var(--shadow-hairline),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 15px;
}

.overview-item svg {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border: 1px solid rgba(54, 87, 214, 0.14);
  border-radius: 13px;
  padding: 8px;
  background: var(--accent-soft);
  color: var(--accent);
}

.overview-item span,
.activity-note span {
  display: block;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 650;
}

.overview-item strong,
.activity-note strong {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: var(--ink);
  font-size: 19px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-note {
  display: grid;
  align-content: center;
  padding: 13px 14px;
  background:
    linear-gradient(135deg, rgba(82, 98, 122, 0.045), rgba(255, 255, 255, 0.68)),
    var(--surface);
}

.activity-note strong {
  font-size: 14px;
}

.left-column {
  display: grid;
  min-height: 0;
  grid-template-rows: minmax(260px, 1fr) auto;
  gap: 14px;
}

.copy-toast {
  position: absolute;
  right: 26px;
  bottom: 26px;
  border-radius: 999px;
  padding: 8px 13px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--accent-strong);
  font-size: 12px;
  box-shadow: var(--shadow-soft);
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.copy-toast.visible {
  opacity: 1;
  transform: translateY(0);
}
</style>
