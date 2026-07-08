<script setup lang="ts">
import { Clipboard, Save, WandSparkles } from "lucide-vue-next";

defineProps<{
  modelValue: string;
  generating?: boolean;
  saving?: boolean;
  statusMessage?: string;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  generate: [];
  save: [];
  copy: [];
}>();
</script>

<template>
  <section class="report-panel" aria-label="日报草稿">
    <div class="panel-heading">
      <div>
        <p>日报编辑</p>
        <h2>日报草稿</h2>
        <span v-if="errorMessage" class="panel-message error">{{ errorMessage }}</span>
        <span v-else-if="statusMessage" class="panel-message">{{ statusMessage }}</span>
      </div>
      <div class="actions">
        <button class="ghost-button" type="button" title="复制日报" @click="emit('copy')">
          <Clipboard :size="16" :stroke-width="1.9" />
          <span>复制</span>
        </button>
        <button
          class="ghost-button"
          type="button"
          title="保存日报"
          :disabled="saving || !modelValue.trim()"
          @click="emit('save')"
        >
          <Save :size="16" :stroke-width="1.9" />
          <span>{{ saving ? "保存中" : "保存" }}</span>
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
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(250, 252, 255, 0.98)),
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
  gap: 14px;
  padding: 17px 18px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.64);
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

.panel-message {
  display: block;
  margin-top: 6px;
  color: var(--ok);
  font-size: 12px;
  font-weight: 650;
}

.panel-message.error {
  color: var(--danger);
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
  border-radius: 999px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 750;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.ghost-button {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink-soft);
}

.ghost-button:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.primary-button {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: white;
  box-shadow:
    0 10px 22px rgba(54, 87, 214, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.primary-button:hover:not(:disabled) {
  background: var(--accent-strong);
  box-shadow:
    0 12px 26px rgba(54, 87, 214, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
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
  padding: 22px;
  background:
    linear-gradient(180deg, rgba(243, 246, 248, 0.78), rgba(255, 255, 255, 0) 140px),
    repeating-linear-gradient(0deg, transparent 0, transparent 31px, rgba(82, 98, 122, 0.035) 32px),
    #fcfdfd;
  color: var(--ink);
  font-family: "Cascadia Mono", Consolas, "Microsoft YaHei UI", monospace;
  font-size: 13px;
  line-height: 1.65;
}
</style>
