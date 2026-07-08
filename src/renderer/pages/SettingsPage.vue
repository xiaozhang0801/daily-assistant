<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Bot, KeyRound, Save, SlidersHorizontal } from "lucide-vue-next";

interface SettingsState {
  providerType: "minimax" | "openai_compatible";
  baseUrl: string;
  modelName: string;
  apiKey: string;
  uploadToAIEnabled: boolean;
  captureIntervalMinutes: number;
}

const settings = ref<SettingsState>({
  providerType: "minimax",
  baseUrl: "",
  modelName: "",
  apiKey: "",
  uploadToAIEnabled: false,
  captureIntervalMinutes: 5
});
const saveText = ref("保存");

async function loadSettings(): Promise<void> {
  const result = (await window.dailyAssistant?.settings.get()) as Partial<SettingsState> | undefined;
  if (!result) return;
  settings.value = { ...settings.value, ...result };
}

async function saveSettings(): Promise<void> {
  await window.dailyAssistant?.settings.save(settings.value);
  saveText.value = "已保存";
  window.setTimeout(() => {
    saveText.value = "保存";
  }, 1200);
}

onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <p>Settings</p>
        <h1>设置</h1>
      </div>
      <button class="save-button" type="button" title="保存设置" @click="saveSettings">
        <Save :size="16" :stroke-width="1.9" />
        <span>{{ saveText }}</span>
      </button>
    </div>

    <div class="settings-grid">
      <section class="settings-panel">
        <div class="panel-title">
          <Bot :size="18" :stroke-width="1.9" />
          <h2>AI 提供方</h2>
        </div>

        <div class="segmented" aria-label="AI 提供方">
          <button
            type="button"
            :class="{ active: settings.providerType === 'minimax' }"
            @click="settings.providerType = 'minimax'"
          >
            MiniMax
          </button>
          <button
            type="button"
            :class="{ active: settings.providerType === 'openai_compatible' }"
            @click="settings.providerType = 'openai_compatible'"
          >
            自定义
          </button>
        </div>

        <label v-if="settings.providerType === 'openai_compatible'">
          <span>Base URL</span>
          <input v-model="settings.baseUrl" type="text" placeholder="https://api.example.com/v1" />
        </label>
        <label>
          <span>模型</span>
          <input v-model="settings.modelName" type="text" placeholder="模型名称" />
        </label>
        <label>
          <span>API Key</span>
          <input v-model="settings.apiKey" type="password" placeholder="只保存在本机" />
        </label>
      </section>

      <section class="settings-panel">
        <div class="panel-title">
          <SlidersHorizontal :size="18" :stroke-width="1.9" />
          <h2>采集</h2>
        </div>

        <label>
          <span>截图间隔（分钟）</span>
          <input v-model.number="settings.captureIntervalMinutes" min="1" max="60" type="number" />
        </label>

        <button class="toggle-row" type="button" @click="settings.uploadToAIEnabled = !settings.uploadToAIEnabled">
          <span>允许上传截图给 AI</span>
          <strong>{{ settings.uploadToAIEnabled ? "开启" : "关闭" }}</strong>
        </button>
      </section>

      <section class="settings-panel wide">
        <div class="panel-title">
          <KeyRound :size="18" :stroke-width="1.9" />
          <h2>提示词</h2>
        </div>
        <textarea
          value="请根据截图识别今天完成的具体工作，输出结构化工作事件。"
          aria-label="截图分析提示词"
        ></textarea>
      </section>
    </div>
  </section>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24px;
  background: var(--bg);
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
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.page-header h1 {
  margin-top: 5px;
  font-size: 25px;
}

.save-button {
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
  font-size: 13px;
  font-weight: 800;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 16px;
}

.settings-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.settings-panel.wide {
  grid-column: 1 / -1;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.panel-title svg {
  color: var(--accent-strong);
}

.panel-title h2 {
  margin: 0;
  font-size: 17px;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  margin-bottom: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 4px;
  background: #f5f7f3;
}

.segmented button {
  border: 0;
  border-radius: var(--radius-sm);
  padding: 8px;
  background: transparent;
  cursor: pointer;
  font-weight: 750;
}

.segmented button.active {
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(23, 33, 36, 0.08);
  color: var(--accent-strong);
}

label {
  display: grid;
  gap: 7px;
  margin-top: 12px;
}

label span {
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 750;
}

input,
textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #fffefb;
  color: var(--ink);
}

input {
  height: 38px;
  padding: 0 11px;
}

textarea {
  min-height: 150px;
  padding: 12px;
  line-height: 1.6;
}

.toggle-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px;
  background: #fbfaf5;
  cursor: pointer;
}

.toggle-row span {
  color: var(--ink-soft);
  font-size: 13px;
}

.toggle-row strong {
  border-radius: 999px;
  padding: 4px 9px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 12px;
}
</style>
