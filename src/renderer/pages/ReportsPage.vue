<script setup lang="ts">
import { ref } from "vue";
import { Copy, FileDown, FileText } from "lucide-vue-next";

const currentReport = ref("# 今日日报\n\n- 今日暂无记录。");
const reports = [
  { id: "today", date: "2026-07-08", status: "草稿", count: 0 },
  { id: "yesterday", date: "2026-07-07", status: "未生成", count: 0 }
];

async function copyReport(): Promise<void> {
  await navigator.clipboard?.writeText(currentReport.value);
}
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <p>Reports</p>
        <h1>日报库</h1>
      </div>
      <div class="header-actions">
        <button type="button" title="复制当前日报" @click="copyReport">
          <Copy :size="16" :stroke-width="1.9" />
          <span>复制</span>
        </button>
        <button type="button" title="导出 Markdown">
          <FileDown :size="16" :stroke-width="1.9" />
          <span>导出</span>
        </button>
      </div>
    </div>

    <div class="report-layout">
      <aside class="report-list" aria-label="日报列表">
        <article v-for="report in reports" :key="report.id" class="report-row">
          <FileText :size="17" :stroke-width="1.9" />
          <div>
            <strong>{{ report.date }}</strong>
            <span>{{ report.status }} · {{ report.count }} 条事件</span>
          </div>
        </article>
      </aside>

      <section class="editor-panel">
        <textarea v-model="currentReport" spellcheck="false" aria-label="日报内容"></textarea>
      </section>
    </div>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
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

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 8px 11px;
  background: var(--surface);
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 13px;
  font-weight: 750;
}

.header-actions button:hover {
  border-color: var(--accent);
  color: var(--accent-strong);
}

.report-layout {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
}

.report-list,
.editor-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.report-list {
  display: grid;
  align-content: start;
  gap: 0;
  overflow: auto;
  padding: 8px;
}

.report-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  border-radius: var(--radius);
  padding: 12px;
}

.report-row:first-child {
  background: var(--accent-soft);
}

.report-row strong,
.report-row span {
  display: block;
}

.report-row strong {
  font-size: 14px;
}

.report-row span {
  margin-top: 3px;
  color: var(--ink-soft);
  font-size: 12px;
}

.editor-panel {
  min-height: 0;
  overflow: hidden;
}

.editor-panel textarea {
  width: 100%;
  height: 100%;
  min-height: 520px;
  border: 0;
  padding: 22px;
  background: #fffefb;
  color: var(--ink);
  font-family: "Cascadia Mono", Consolas, "Microsoft YaHei UI", monospace;
  font-size: 13px;
  line-height: 1.68;
}
</style>
