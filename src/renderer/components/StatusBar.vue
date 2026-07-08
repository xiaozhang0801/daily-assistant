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
      <span class="metric">
        <Radio :size="16" :stroke-width="1.9" />
        {{ recording ? "记录中" : "已暂停" }}
      </span>
      <span class="metric">{{ duration }} 分钟</span>
      <span class="metric">{{ eventCount }} 个事件</span>
      <span class="metric">
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
  padding: 20px 28px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 253, 248, 0.88);
}

.title-block p {
  margin: 0 0 5px;
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 800;
}

.title-block h1 {
  margin: 0;
  font-size: 24px;
  letter-spacing: 0;
}

.metrics {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 7px 10px;
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 13px;
  white-space: nowrap;
}

.control-button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 8px 12px;
  background: var(--accent);
  color: white;
  cursor: pointer;
  font-weight: 700;
}

.control-button:hover {
  background: var(--accent-strong);
}
</style>
