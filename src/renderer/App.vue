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
  min-height: 100vh;
  background: var(--bg);
}

.main-panel {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}
</style>
