<script setup lang="ts">
import { Clipboard, WandSparkles } from "lucide-vue-next";

defineProps<{
  modelValue: string;
  generating?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  generate: [];
  copy: [];
}>();
</script>

<template>
  <section class="report-panel" aria-label="日报草稿">
    <div class="panel-heading">
      <div>
        <p>Report</p>
        <h2>日报草稿</h2>
      </div>
      <div class="actions">
        <button class="ghost-button" type="button" title="复制日报" @click="emit('copy')">
          <Clipboard :size="16" :stroke-width="1.9" />
          <span>复制</span>
        </button>
        <button class="primary-button" type="button" title="生成日报" :disabled="generating" @click="emit('generate')">
          <WandSparkles :size="16" :stroke-width="1.9" />
          <span>{{ generating ? "生成中" : "生成" }}</span>
        </button>
      </div>
    </div>

    <textarea
      class="report-editor"
      :value="modelValue"
      spellcheck="false"
      aria-label="日报 Markdown 草稿"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>
  </section>
</template>

<style scoped>
.report-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 18px;
  border-bottom: 1px solid var(--line);
}

.panel-heading p,
.panel-heading h2 {
  margin: 0;
}

.panel-heading p {
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.panel-heading h2 {
  margin-top: 4px;
  font-size: 17px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ghost-button,
.primary-button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius);
  padding: 7px 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 750;
}

.ghost-button {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink-soft);
}

.ghost-button:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.primary-button {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: var(--accent-strong);
}

.primary-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.report-editor {
  width: 100%;
  min-height: 360px;
  flex: 1;
  border: 0;
  padding: 18px;
  background: #fffefb;
  color: var(--ink);
  font-family: "Cascadia Mono", Consolas, "Microsoft YaHei UI", monospace;
  font-size: 13px;
  line-height: 1.65;
}
</style>
