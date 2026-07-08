<script setup lang="ts">
import { computed, ref } from "vue";
import AppSidebar from "./components/AppSidebar.vue";
import HistoryPage from "./pages/HistoryPage.vue";
import ReportsPage from "./pages/ReportsPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";
import TimelinePage from "./pages/TimelinePage.vue";
import TodayPage from "./pages/TodayPage.vue";

const activePage = ref("today");
const activeComponent = computed(() => {
  if (activePage.value === "timeline") return TimelinePage;
  if (activePage.value === "reports") return ReportsPage;
  if (activePage.value === "history") return HistoryPage;
  if (activePage.value === "settings") return SettingsPage;
  return TodayPage;
});
</script>

<template>
  <div class="app-shell">
    <AppSidebar :active="activePage" @select="activePage = $event" />
    <main class="main-panel">
      <component :is="activeComponent" />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(82, 98, 122, 0.045) 0, rgba(82, 98, 122, 0.018) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(238, 242, 248, 0.26)),
    var(--bg);
  background-size:
    72px 72px,
    auto;
}

.main-panel {
  min-width: 0;
  flex: 1;
  overflow: auto;
}
</style>
