<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Activity, Database, FileText, TimerReset } from "lucide-vue-next";
import type { WorkEvent } from "../../shared/types";
import PrivacyPanel from "../components/PrivacyPanel.vue";
import ReportEditor from "../components/ReportEditor.vue";
import StatusBar from "../components/StatusBar.vue";
import TimelineList from "../components/TimelineList.vue";

interface TodayState {
  recording: boolean;
  capturedDurationMinutes: number;
  analyzedEventCount: number;
  providerStatus: string;
  events: WorkEvent[];
}

const defaultReport = "# 今日日报\n\n- 今日暂无记录。";
const state = ref<TodayState>({
  recording: false,
  capturedDurationMinutes: 0,
  analyzedEventCount: 0,
  providerStatus: "not_configured",
  events: []
});
const reportDraft = ref(defaultReport);
const generating = ref(false);
const copyState = ref("复制");

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
    value: reportDraft.value.trim() === defaultReport ? "草稿" : "已生成",
    icon: FileText
  },
  {
    label: "数据位置",
    value: "本地",
    icon: Database
  }
]);

async function loadToday(): Promise<void> {
  const dashboard = window.dailyAssistant?.dashboard;
  if (!dashboard) return;

  const today = await dashboard.getToday();
  state.value = {
    recording: today.recording,
    capturedDurationMinutes: today.capturedDurationMinutes,
    analyzedEventCount: today.analyzedEventCount,
    providerStatus: today.providerStatus,
    events: today.events
  };
  reportDraft.value = today.reportDraft || defaultReport;
}

async function pauseCapture(): Promise<void> {
  const result = await window.dailyAssistant?.dashboard.pauseCapture();
  state.value.recording = result?.recording ?? false;
}

async function resumeCapture(): Promise<void> {
  const result = await window.dailyAssistant?.dashboard.resumeCapture();
  state.value.recording = result?.recording ?? true;
}

async function generateReport(): Promise<void> {
  generating.value = true;
  try {
    const result = await window.dailyAssistant?.dashboard.generateReport();
    reportDraft.value = result?.content ?? defaultReport;
  } finally {
    generating.value = false;
  }
}

async function copyReport(): Promise<void> {
  await navigator.clipboard?.writeText(reportDraft.value);
  copyState.value = "已复制";
  window.setTimeout(() => {
    copyState.value = "复制";
  }, 1200);
}

onMounted(() => {
  void loadToday();
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
        v-model="reportDraft"
        :generating="generating"
        @generate="generateReport"
        @copy="copyReport"
      />
      <span class="copy-toast" :class="{ visible: copyState === '已复制' }">{{ copyState }}</span>
    </div>
  </section>
</template>

<style scoped>
.today-page {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  background:
    linear-gradient(rgba(255, 253, 248, 0.58) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 253, 248, 0.58) 1px, transparent 1px),
    var(--bg);
  background-size: 28px 28px;
}

.today-content {
  position: relative;
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(300px, 0.88fr) minmax(390px, 1.12fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  overflow: hidden;
  padding: 18px;
}

.overview-strip {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(4, minmax(120px, 1fr)) minmax(190px, 1.15fr);
  gap: 10px;
}

.overview-item,
.activity-note {
  min-height: 76px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 253, 248, 0.88);
  box-shadow: var(--shadow-soft);
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px;
}

.overview-item svg {
  color: var(--accent-strong);
}

.overview-item span,
.activity-note span {
  display: block;
  color: var(--ink-muted);
  font-size: 12px;
}

.overview-item strong,
.activity-note strong {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-note {
  display: grid;
  align-content: center;
  padding: 13px;
}

.activity-note strong {
  font-size: 14px;
}

.left-column {
  display: grid;
  min-height: 0;
  grid-template-rows: minmax(260px, 1fr) auto;
  gap: 16px;
}

.copy-toast {
  position: absolute;
  right: 26px;
  bottom: 26px;
  border-radius: 999px;
  padding: 7px 12px;
  background: var(--surface-strong);
  color: white;
  font-size: 12px;
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
