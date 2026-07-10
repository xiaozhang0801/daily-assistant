<script setup lang="ts">
import { computed } from "vue";
import { Bot, Pause, Play, Radio } from "lucide-vue-next";

const props = defineProps<{
  recording: boolean;
  duration: number;
  eventCount: number;
  providerStatus: string;
}>();

const emit = defineEmits<{
  pause: [];
  resume: [];
}>();

const providerText = computed(() => {
  if (props.providerStatus === "not_configured") return "AI 未配置";
  if (props.providerStatus === "ready") return "AI 就绪";
  return props.providerStatus;
});
</script>

<template>
  <header class="status-bar">
    <div class="title-block">
      <p>今日状态</p>
      <h1>工作记录台</h1>
    </div>

    <div class="metrics" aria-label="今日概览">
      <span class="metric state-metric" :class="{ active: recording }">
        <Radio :size="16" :stroke-width="1.9" />
        {{ recording ? "记录中" : "已暂停" }}
      </span>
      <span class="metric">{{ duration }} 分钟</span>
      <span class="metric">{{ eventCount }} 个事件</span>
      <span
        class="metric provider-metric"
        :class="{ ready: providerStatus === 'ready', warning: providerStatus === 'not_configured' }"
      >
        <Bot :size="16" :stroke-width="1.9" />
        {{ providerText }}
      </span>
      <button v-if="recording" class="control-button" type="button" title="暂停记录" @click="emit('pause')">
        <Pause :size="16" :stroke-width="2" />
        <span>暂停</span>
      </button>
      <button v-else class="control-button" type="button" title="继续记录" @click="emit('resume')">
        <Play :size="16" :stroke-width="2" />
        <span>继续</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.status-bar {
  display: flex;
  min-height: 92px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--line);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 249, 253, 0.7)),
    var(--surface-glass);
  backdrop-filter: blur(18px);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset;
}

.title-block p {
  margin: 0 0 5px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.title-block h1 {
  margin: 0;
  color: var(--ink);
  font-size: 27px;
  font-weight: 760;
  letter-spacing: 0;
}

.metrics {
  display: flex;
  align-items: center;
  gap: 9px;
}

.metric {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 12px;
  background: rgba(255, 255, 255, 0.76);
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  box-shadow:
    var(--shadow-hairline),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.state-metric.active {
  border-color: rgba(54, 87, 214, 0.2);
  background: var(--ok-soft);
  color: var(--ok);
}

.provider-metric.ready {
  border-color: rgba(54, 87, 214, 0.22);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.provider-metric.warning {
  border-color: rgba(183, 121, 31, 0.22);
  background: var(--warning-soft);
  color: var(--warning);
}

.control-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--accent);
  border-radius: 999px;
  padding: 8px 15px;
  background: var(--accent);
  color: white;
  cursor: pointer;
  font-weight: 760;
  box-shadow:
    0 12px 26px rgba(54, 87, 214, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition:
    background 240ms var(--motion),
    box-shadow 240ms var(--motion),
    transform 240ms var(--motion);
}

.control-button:hover {
  background: var(--accent-strong);
  box-shadow:
    0 14px 30px rgba(54, 87, 214, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
</style>
