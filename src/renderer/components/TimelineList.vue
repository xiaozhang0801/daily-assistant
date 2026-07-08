<script setup lang="ts">
import { computed } from "vue";
import { CheckCircle2, Clock3 } from "lucide-vue-next";
import type { WorkEvent } from "../../shared/types";
import { sortEventsNewestFirst } from "../pages/todayViewModel";

const props = defineProps<{
  events: WorkEvent[];
}>();

const sortedEvents = computed(() => sortEventsNewestFirst(props.events));

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
</script>

<template>
  <section class="timeline-panel" aria-label="今日时间线">
    <div class="panel-heading">
      <div>
        <p>记录流</p>
        <h2>今日时间线</h2>
      </div>
      <span>{{ sortedEvents.length }} 条</span>
    </div>

    <div v-if="sortedEvents.length" class="event-list">
      <article v-for="event in sortedEvents" :key="event.id" class="event-row">
        <div class="time-cell">
          <Clock3 :size="16" :stroke-width="1.9" />
          <span>{{ timeLabel(event.startedAt) }}</span>
        </div>
        <div class="event-body">
          <div class="event-title">
            <h3>{{ event.title }}</h3>
            <span>{{ event.category }}</span>
          </div>
          <p>{{ event.summary }}</p>
          <div class="event-meta">
            <CheckCircle2 :size="15" :stroke-width="1.9" />
            <span>{{ Math.round(event.confidence * 100) }}% 置信度</span>
            <span v-if="event.mergedEventCount && event.mergedEventCount > 1">合并 {{ event.mergedEventCount }} 条</span>
            <span>{{ timeLabel(event.startedAt) }} - {{ timeLabel(event.endedAt) }}</span>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <Clock3 :size="22" :stroke-width="1.8" />
      <h3>暂无事件</h3>
      <p>截图分析完成后，工作片段会按时间顺序出现在这里。</p>
    </div>
  </section>
</template>

<style scoped>
.timeline-panel {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(250, 252, 255, 0.98)),
    var(--surface);
  overflow: hidden;
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 18px 15px;
  border-bottom: 1px solid var(--line);
}

.panel-heading p,
.panel-heading h2 {
  margin: 0;
}

.panel-heading p {
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}

.panel-heading h2 {
  margin-top: 4px;
  font-size: 17px;
}

.panel-heading span {
  border-radius: 999px;
  padding: 5px 10px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 750;
}

.event-list {
  display: grid;
  min-height: 0;
  flex: 1;
  gap: 8px;
  overflow: auto;
  padding: 12px;
}

.event-row {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 14px;
  padding: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(247, 249, 253, 0.72)),
    var(--surface);
  box-shadow: var(--shadow-hairline);
  transition:
    background 240ms var(--motion),
    border-color 240ms var(--motion),
    transform 240ms var(--motion),
    box-shadow 240ms var(--motion);
}

.event-row:hover {
  border-color: rgba(54, 87, 214, 0.16);
  background: var(--surface);
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(57, 70, 96, 0.08);
}

.time-cell {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 700;
  padding-top: 3px;
}

.event-body {
  min-width: 0;
}

.event-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.event-title h3 {
  overflow: hidden;
  margin: 0;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.35;
  text-overflow: ellipsis;
}

.event-title span {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  background: var(--info-soft);
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 750;
}

.event-body p {
  margin: 7px 0 8px;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.55;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-muted);
  font-size: 12px;
}

.empty-state {
  display: grid;
  min-height: 280px;
  flex: 1;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--ink-muted);
  text-align: center;
  background:
    linear-gradient(145deg, rgba(54, 87, 214, 0.08), rgba(255, 255, 255, 0.68)),
    var(--surface-muted);
}

.empty-state h3,
.empty-state p {
  margin: 0;
}

.empty-state h3 {
  color: var(--ink);
  font-size: 15px;
}

.empty-state p {
  max-width: 280px;
  font-size: 13px;
  line-height: 1.6;
}
</style>
