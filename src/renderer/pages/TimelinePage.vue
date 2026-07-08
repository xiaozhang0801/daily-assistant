<script setup lang="ts">
import type { WorkEvent } from "../../shared/types";
import TimelineList from "../components/TimelineList.vue";

const events: WorkEvent[] = [];
</script>

<template>
  <section class="page">
    <div class="page-header">
      <div>
        <p>Timeline</p>
        <h1>完整时间线</h1>
      </div>
      <span>今日</span>
    </div>

    <div class="page-grid">
      <TimelineList :events="events" />
      <aside class="side-panel">
        <p>分组</p>
        <h2>工作类型</h2>
        <div class="category-list">
          <div>
            <span>开发</span>
            <strong>0</strong>
          </div>
          <div>
            <span>沟通</span>
            <strong>0</strong>
          </div>
          <div>
            <span>文档</span>
            <strong>0</strong>
          </div>
        </div>
      </aside>
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

.page-header > span {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 11px;
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 700;
}

.page-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
}

.side-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.side-panel p,
.side-panel h2 {
  margin: 0;
}

.side-panel p {
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.side-panel h2 {
  margin-top: 4px;
  font-size: 17px;
}

.category-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.category-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 10px 12px;
  background: #fbfaf5;
}

.category-list span {
  color: var(--ink-soft);
  font-size: 13px;
}

.category-list strong {
  font-size: 18px;
}
</style>
