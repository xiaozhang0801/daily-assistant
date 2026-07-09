<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { AlertCircle, Bot, GitBranch, KeyRound, Save, SlidersHorizontal, TestTube } from "lucide-vue-next";
import { defaultDailyReportPrompt, defaultScreenshotPrompt } from "../../main/services/ai/prompts";
import { normalizeAIProviderSettings, toConnectionStatusMessage } from "./settingsViewModel";

interface SettingsState {
  providerType: "minimax" | "openai_compatible";
  baseUrl: string;
  modelName: string;
  apiKey: string;
  customHeadersText: string;
  screenshotPrompt: string;
  dailyReportPrompt: string;
  uploadToAIEnabled: boolean;
  captureIntervalMinutes: number;
  gitSearchRoot: string;
}

const settings = ref<SettingsState>({
  providerType: "minimax",
  baseUrl: "",
  modelName: "",
  apiKey: "",
  customHeadersText: "",
  screenshotPrompt: defaultScreenshotPrompt,
  dailyReportPrompt: defaultDailyReportPrompt,
  uploadToAIEnabled: false,
  captureIntervalMinutes: 5,
  gitSearchRoot: ""
});
const saveText = ref("保存");
const testText = ref("测试连接");
const errors = ref<string[]>([]);
const connectionMessage = ref("");
const settingsDirty = ref(false);
const settingsLoaded = ref(false);

async function loadSettings(): Promise<void> {
  settingsLoaded.value = false;
  const result = (await window.dailyAssistant?.settings.get()) as Partial<SettingsState> | undefined;
  if (result) {
    settings.value = { ...settings.value, ...result };
  }
  await nextTick();
  settingsDirty.value = false;
  settingsLoaded.value = true;
}

async function saveSettings(): Promise<void> {
  const normalized = normalizeAIProviderSettings(settings.value);
  errors.value = normalized.errors;
  if (normalized.errors.length > 0) return;

  const bridge = window.dailyAssistant?.settings;
  if (!bridge) {
    connectionMessage.value = "没有连接到 Electron 主进程，无法保存设置。";
    return;
  }

  try {
    await bridge.save(normalized.value);
    settingsDirty.value = false;
    connectionMessage.value = "设置已保存，生成日报和截图分析将使用当前配置。";
    saveText.value = "已保存";
    window.setTimeout(() => {
      saveText.value = "保存";
    }, 1200);
  } catch (error) {
    connectionMessage.value = error instanceof Error ? error.message : "保存设置失败";
  }
}

async function testConnection(): Promise<void> {
  const normalized = normalizeAIProviderSettings(settings.value);
  errors.value = normalized.errors;
  connectionMessage.value = "";
  if (normalized.errors.length > 0) return;

  const bridge = window.dailyAssistant?.settings;
  if (!bridge) {
    connectionMessage.value = toConnectionStatusMessage(undefined);
    return;
  }

  testText.value = "测试中";
  try {
    const result = await bridge.testAIProvider(normalized.value);
    connectionMessage.value = toConnectionStatusMessage(result, { hasUnsavedChanges: settingsDirty.value });
  } catch (error) {
    connectionMessage.value = error instanceof Error ? error.message : "测试连接失败";
  } finally {
    testText.value = "测试连接";
  }
}

onMounted(() => {
  void loadSettings();
});

watch(
  settings,
  () => {
    if (!settingsLoaded.value) return;
    settingsDirty.value = true;
    connectionMessage.value = "当前设置有未保存修改。测试连接会使用当前表单值；生成日报前需要点击保存。";
  },
  { deep: true }
);
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <p>系统设置</p>
        <h1>设置</h1>
      </div>
      <div class="header-actions">
        <button class="test-button" type="button" title="测试连接" @click="testConnection">
          <TestTube :size="16" :stroke-width="1.9" />
          <span>{{ testText }}</span>
        </button>
        <button class="save-button" type="button" title="保存设置" @click="saveSettings">
          <Save :size="16" :stroke-width="1.9" />
          <span>{{ saveText }}</span>
        </button>
      </div>
    </div>

    <section v-if="errors.length || connectionMessage" class="settings-panel feedback-panel">
      <div class="panel-title">
        <AlertCircle :size="18" :stroke-width="1.9" />
        <h2>状态</h2>
      </div>
      <ul v-if="errors.length">
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>
      <p v-else>{{ connectionMessage }}</p>
    </section>

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
        <label>
          <span>自定义 Headers（JSON）</span>
          <textarea
            v-model="settings.customHeadersText"
            class="headers-textarea"
            spellcheck="false"
            placeholder="{ &quot;X-Custom&quot;: &quot;value&quot; }"
          ></textarea>
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

      <section class="settings-panel">
        <div class="panel-title">
          <GitBranch :size="18" :stroke-width="1.9" />
          <h2>代码日报</h2>
        </div>

        <label>
          <span>Git 搜索根目录</span>
          <input v-model="settings.gitSearchRoot" type="text" placeholder="C:\\project 或 C:\\project\\日报" />
        </label>
      </section>

      <section class="settings-panel wide">
        <div class="panel-title">
          <KeyRound :size="18" :stroke-width="1.9" />
          <h2>提示词</h2>
        </div>
        <div class="prompt-grid">
          <label>
            <span>截图分析提示词</span>
            <textarea v-model="settings.screenshotPrompt" spellcheck="false" aria-label="截图分析提示词"></textarea>
          </label>
          <label>
            <span>日报生成提示词</span>
            <textarea v-model="settings.dailyReportPrompt" spellcheck="false" aria-label="日报生成提示词"></textarea>
          </label>
        </div>
      </section>

    </div>
  </section>
</template>

<style scoped>
.page {
  min-height: 100dvh;
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

.save-button,
.test-button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.save-button {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: white;
  box-shadow:
    0 10px 22px rgba(54, 87, 214, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.test-button {
  border: 1px solid var(--line);
  background: var(--surface-raised);
  color: var(--ink-soft);
}

.test-button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.save-button:hover {
  background: var(--accent-strong);
  box-shadow:
    0 12px 26px rgba(54, 87, 214, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
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
  background: var(--surface-raised);
  box-shadow:
    var(--shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
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
  color: var(--accent);
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
  border-radius: 999px;
  padding: 4px;
  background: var(--surface-muted);
}

.segmented button {
  border: 0;
  border-radius: 999px;
  padding: 8px;
  background: transparent;
  cursor: pointer;
  font-weight: 750;
  transition:
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.segmented button.active {
  background: var(--surface);
  box-shadow: var(--shadow-hairline);
  color: var(--accent);
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
  border-radius: 12px;
  background: var(--surface-muted);
  color: var(--ink);
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

input:focus,
textarea:focus {
  border-color: rgba(54, 87, 214, 0.45);
  background: var(--surface);
  box-shadow: var(--ring);
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

.headers-textarea {
  min-height: 82px;
  font-family: "Cascadia Mono", Consolas, "Microsoft YaHei UI", monospace;
  font-size: 12px;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 14px;
}

.prompt-grid label {
  margin-top: 0;
}

.feedback-panel {
  margin-bottom: 16px;
  border-color: var(--warning);
  background: var(--warning-soft);
}

.feedback-panel ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: var(--danger);
  font-size: 13px;
}

.feedback-panel p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 13px;
}

.toggle-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  background: var(--surface-muted);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease;
}

.toggle-row:hover {
  border-color: var(--line-strong);
  background: var(--surface);
}

.toggle-row span {
  color: var(--ink-soft);
  font-size: 13px;
}

.toggle-row strong {
  border-radius: 999px;
  padding: 4px 9px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
}
</style>
