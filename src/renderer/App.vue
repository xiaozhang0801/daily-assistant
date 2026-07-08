<template>
  <main class="starter-shell">
    <section class="starter-panel">
      <p class="eyebrow">Daily Assistant MVP</p>
      <h1>日报助手</h1>
      <p class="summary">桌面端工作台已初始化，后续任务会接入截图、AI 分析、时间线和报告编辑。</p>
    </section>
  </main>
</template>

<style scoped>
.starter-shell {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 32px;
}

.starter-panel {
  width: min(560px, 100%);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 32px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 12px;
  font-size: 32px;
}

.summary {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.7;
}
</style>
