<script setup lang="ts">
import { computed } from "vue";
import { Bot, Camera, LockKeyhole, ShieldCheck } from "lucide-vue-next";

const props = defineProps<{
  providerStatus: string;
}>();

const providerText = computed(() => {
  if (props.providerStatus === "not_configured") return "AI 未配置";
  return "AI 可用";
});
</script>

<template>
  <aside class="privacy-panel" aria-label="隐私与采集">
    <div class="panel-heading">
      <p>采集策略</p>
      <h2>隐私与采集</h2>
    </div>

    <div class="privacy-list">
      <div class="privacy-item ok">
        <ShieldCheck :size="18" :stroke-width="1.9" />
        <div>
          <strong>本地优先</strong>
          <span>数据库和截图保存在本机。</span>
        </div>
      </div>
      <div class="privacy-item">
        <Camera :size="18" :stroke-width="1.9" />
        <div>
          <strong>截图调度</strong>
          <span>默认按设置间隔采集。</span>
        </div>
      </div>
      <div class="privacy-item warning">
        <Bot :size="18" :stroke-width="1.9" />
        <div>
          <strong>{{ providerText }}</strong>
          <span>AI 配置完整后会自动分析截图。</span>
        </div>
      </div>
      <div class="privacy-item">
        <LockKeyhole :size="18" :stroke-width="1.9" />
        <div>
          <strong>排除窗口</strong>
          <span>命中规则时跳过截图。</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.privacy-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(247, 249, 253, 0.76)),
    var(--surface-raised);
  box-shadow:
    var(--shadow-hairline),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.panel-heading {
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
  letter-spacing: 0;
}

.panel-heading h2 {
  margin-top: 4px;
  font-size: 17px;
}

.privacy-list {
  display: grid;
  gap: 9px;
  padding: 14px;
}

.privacy-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 14px;
  padding: 11px 12px;
  background: rgba(255, 255, 255, 0.58);
}

.privacy-item.ok {
  background: var(--ok-soft);
}

.privacy-item.warning {
  background: var(--warning-soft);
}

.privacy-item svg {
  margin-top: 2px;
  color: var(--accent);
}

.privacy-item strong,
.privacy-item span {
  display: block;
}

.privacy-item strong {
  margin-bottom: 3px;
  font-size: 13px;
}

.privacy-item span {
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.45;
}
</style>
