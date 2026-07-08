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
        <p>Timeline</p>
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
  background: var(--surface);
  overflow: hidden;
  box-shadow: var(--shadow-hairline);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px 14px;
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
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.panel-heading h2 {
  margin-top: 4px;
  font-size: 17px;
}

.panel-heading span {
  border-radius: 999px;
  padding: 5px 9px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 750;
}

.event-list {
  display: grid;
  min-height: 0;
  flex: 1;
  gap: 0;
  overflow: auto;
  padding: 4px 0;
}

.event-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 14px;
  padding: 15px 18px;
  transition: background 160ms ease;
}

.event-row:hover {
  background: var(--surface-muted);
}

.event-row + .event-row {
  border-top: 1px solid var(--line);
}

.time-cell {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 700;
  padding-top: 2px;
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
  font-size: 14px;
  line-height: 1.35;
  text-overflow: ellipsis;
}

.event-title span {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 3px 8px;
  background: var(--teal-soft);
  color: var(--ink-soft);
  font-size: 11px;
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
  background: var(--surface-muted);
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
