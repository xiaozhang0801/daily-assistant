# Intranet Auto Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an intranet auto-update flow for Windows builds, using version `0.1.1`, fixed generic update URL `http://192.168.19.220/daily-assistant/releases/`, manual Settings button, and one startup check per app launch when enabled.

**Architecture:** Use `electron-updater` only in the Electron main process. The renderer triggers startup/manual checks through preload IPC and renders status; `electron-builder` stores the fixed generic publish URL in packaged update metadata. `VITE_ENABLE_APP_UPDATE=true` controls renderer visibility and startup auto-check.

**Tech Stack:** Electron, electron-vite, Vue 3, TypeScript, electron-builder, electron-updater, Vitest.

---

## File Map

- Modify `package.json`: bump version to `0.1.1`, add `electron-updater`, add `build.publish.generic`.
- Modify `package-lock.json`: reflect dependency and root version changes.
- Create `src/shared/types/updater.ts`: updater status types and helper functions.
- Modify `src/shared/types/ipc.ts`: add updater channel names.
- Create `src/main/services/updater/appUpdater.ts`: wrap `electron-updater` status/event logic.
- Create `src/main/ipc/updaterIpc.ts`: register updater IPC handlers.
- Modify `src/main/index.ts`: register updater IPC.
- Modify `src/main/preload.ts`: expose `window.dailyAssistant.updater`.
- Modify `src/renderer/types/window.d.ts`: add updater bridge types.
- Modify `src/renderer/App.vue`: trigger one startup update check when enabled.
- Modify `src/renderer/pages/SettingsPage.vue`: render update card when enabled.
- Add/update tests under `tests/unit`.

---

### Task 1: Package And Publish Config

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/unit/update-config.test.ts`

- [ ] **Step 1: Install runtime updater dependency**

Run:

```powershell
C:\nvm4w\nodejs\npm.cmd install electron-updater
```

Expected: `package.json` contains `electron-updater` in `dependencies`, and `package-lock.json` is updated.

- [ ] **Step 2: Update package metadata**

Set `package.json` version to `0.1.1` and add this under `build`:

```json
"publish": [
  {
    "provider": "generic",
    "url": "http://192.168.19.220/daily-assistant/releases/"
  }
]
```

- [ ] **Step 3: Write config test**

Create `tests/unit/update-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { isAppUpdateFeatureEnabled } from "../../src/shared/types/updater";

describe("update config", () => {
  it("uses the requested release version", () => {
    expect(packageJson.version).toBe("0.1.1");
  });

  it("uses the fixed intranet generic publish URL", () => {
    expect(packageJson.build.publish).toEqual([
      {
        provider: "generic",
        url: "http://192.168.19.220/daily-assistant/releases/"
      }
    ]);
  });

  it("enables the update entry only for an explicit true value", () => {
    expect(isAppUpdateFeatureEnabled("true")).toBe(true);
    expect(isAppUpdateFeatureEnabled("false")).toBe(false);
    expect(isAppUpdateFeatureEnabled(undefined)).toBe(false);
  });
});
```

- [ ] **Step 4: Run focused test and confirm initial failure**

Run:

```powershell
C:\nvm4w\nodejs\npm.cmd test -- tests/unit/update-config.test.ts
```

Expected before implementation: FAIL because `src/shared/types/updater` does not exist.

---

### Task 2: Shared Updater Types And IPC Contract

**Files:**
- Create: `src/shared/types/updater.ts`
- Modify: `src/shared/types/ipc.ts`
- Modify: `src/shared/types/index.ts`
- Modify: `tests/unit/ipc-contract.test.ts`

- [ ] **Step 1: Create updater shared types**

Create `src/shared/types/updater.ts`:

```ts
export type AppUpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "not-available"
  | "error";

export interface AppUpdateStatus {
  phase: AppUpdatePhase;
  currentVersion: string;
  latestVersion?: string;
  percent?: number;
  message: string;
  error?: string;
}

export interface CheckForUpdatesRequest {
  automatic?: boolean;
}

export function isAppUpdateFeatureEnabled(value: unknown): boolean {
  return value === "true";
}
```

- [ ] **Step 2: Export shared types**

Add to `src/shared/types/index.ts`:

```ts
export type { AppUpdatePhase, AppUpdateStatus, CheckForUpdatesRequest } from "./updater";
export { isAppUpdateFeatureEnabled } from "./updater";
```

- [ ] **Step 3: Add updater channels**

Add to `src/shared/types/ipc.ts`:

```ts
export const updaterChannels = {
  getStatus: "updater:getStatus",
  checkForUpdates: "updater:checkForUpdates",
  quitAndInstall: "updater:quitAndInstall",
  status: "updater:status"
} as const;
```

- [ ] **Step 4: Extend IPC contract test**

Update `tests/unit/ipc-contract.test.ts` to import `updaterChannels` and assert:

```ts
expect(updaterChannels.getStatus).toBe("updater:getStatus");
expect(updaterChannels.checkForUpdates).toBe("updater:checkForUpdates");
expect(updaterChannels.quitAndInstall).toBe("updater:quitAndInstall");
expect(updaterChannels.status).toBe("updater:status");
```

- [ ] **Step 5: Run tests**

Run:

```powershell
C:\nvm4w\nodejs\npm.cmd test -- tests/unit/update-config.test.ts tests/unit/ipc-contract.test.ts
```

Expected: PASS after Task 1 and Task 2 implementation.

---

### Task 3: Main Updater Controller And IPC

**Files:**
- Create: `src/main/services/updater/appUpdater.ts`
- Create: `src/main/ipc/updaterIpc.ts`
- Modify: `src/main/index.ts`
- Add: `tests/unit/app-updater.test.ts`

- [ ] **Step 1: Write controller tests**

Create `tests/unit/app-updater.test.ts` with an EventEmitter-backed fake updater. Cover:

```ts
it("does not check updates when disabled", async () => {
  const controller = createAppUpdaterController({ enabled: false, packaged: true, currentVersion: "0.1.1", updater, emitStatus });
  const result = await controller.checkForUpdates({ automatic: true });
  expect(updater.checkForUpdates).not.toHaveBeenCalled();
  expect(result.phase).toBe("idle");
});

it("runs startup automatic check only once", async () => {
  const controller = createAppUpdaterController({ enabled: true, packaged: true, currentVersion: "0.1.1", updater, emitStatus });
  await controller.checkForUpdates({ automatic: true });
  await controller.checkForUpdates({ automatic: true });
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
});

it("blocks update checks in development builds", async () => {
  const controller = createAppUpdaterController({ enabled: true, packaged: false, currentVersion: "0.1.1", updater, emitStatus });
  const result = await controller.checkForUpdates();
  expect(result.phase).toBe("error");
  expect(result.message).toContain("自动更新仅在打包后的应用中可用");
});
```

- [ ] **Step 2: Implement updater controller**

`src/main/services/updater/appUpdater.ts` should expose `createAppUpdaterController`, maintain latest `AppUpdateStatus`, listen for `checking-for-update`, `update-available`, `download-progress`, `update-downloaded`, `update-not-available`, and `error`, and call `updater.checkForUpdates()`.

- [ ] **Step 3: Implement updater IPC**

`src/main/ipc/updaterIpc.ts` should register:

```ts
ipcMain.handle(updaterChannels.getStatus, async () => controller.getStatus());
ipcMain.handle(updaterChannels.checkForUpdates, async (_event, request) => controller.checkForUpdates(request));
ipcMain.handle(updaterChannels.quitAndInstall, async () => controller.quitAndInstall());
```

- [ ] **Step 4: Register IPC in main**

In `src/main/index.ts`, create the controller with:

```ts
const updatesEnabled = isAppUpdateFeatureEnabled(import.meta.env.VITE_ENABLE_APP_UPDATE);
const updaterController = createAppUpdaterController({ enabled: updatesEnabled });
registerUpdaterIpc(updaterController);
```

- [ ] **Step 5: Run controller tests**

Run:

```powershell
C:\nvm4w\nodejs\npm.cmd test -- tests/unit/app-updater.test.ts
```

Expected: PASS.

---

### Task 4: Preload Bridge And Startup Trigger

**Files:**
- Modify: `src/main/preload.ts`
- Modify: `src/renderer/types/window.d.ts`
- Modify: `src/renderer/App.vue`
- Add: `tests/unit/preload-contract.test.ts`
- Add: `tests/unit/app-startup-update.test.ts`

- [ ] **Step 1: Add preload contract test**

Use source parsing, matching the existing lightweight test style, to assert `preload.ts` exposes `updater`, `getStatus`, `checkForUpdates`, `quitAndInstall`, and `onStatus`.

- [ ] **Step 2: Expose updater bridge**

Add to `contextBridge.exposeInMainWorld("dailyAssistant", ...)`:

```ts
updater: {
  getStatus: () => ipcRenderer.invoke(updaterChannels.getStatus),
  checkForUpdates: (request?: CheckForUpdatesRequest) => ipcRenderer.invoke(updaterChannels.checkForUpdates, request),
  quitAndInstall: () => ipcRenderer.invoke(updaterChannels.quitAndInstall),
  onStatus: (listener: (status: AppUpdateStatus) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: AppUpdateStatus) => listener(status);
    ipcRenderer.on(updaterChannels.status, handler);
    return () => ipcRenderer.removeListener(updaterChannels.status, handler);
  }
}
```

- [ ] **Step 3: Add window types**

Extend `Window.dailyAssistant` with the same updater methods and imported shared types.

- [ ] **Step 4: Trigger startup auto check in App.vue**

Import `onMounted` and `isAppUpdateFeatureEnabled`, then call:

```ts
const updatesEnabled = isAppUpdateFeatureEnabled(import.meta.env.VITE_ENABLE_APP_UPDATE);

onMounted(() => {
  if (!updatesEnabled) return;
  void window.dailyAssistant?.updater.checkForUpdates({ automatic: true });
});
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
C:\nvm4w\nodejs\npm.cmd test -- tests/unit/preload-contract.test.ts tests/unit/app-startup-update.test.ts
```

Expected: PASS.

---

### Task 5: Settings Update UI

**Files:**
- Modify: `src/renderer/pages/SettingsPage.vue`
- Modify: `tests/unit/settings-page-layout.test.ts`

- [ ] **Step 1: Add layout tests**

Extend `tests/unit/settings-page-layout.test.ts` to assert the Settings template contains:

```ts
expect(template).toContain("应用更新");
expect(template).toContain("检查更新");
expect(template).toContain("立即重启安装");
expect(source).toContain("VITE_ENABLE_APP_UPDATE");
```

- [ ] **Step 2: Implement update state in SettingsPage**

Add refs for `updateStatus`, `updateMessage`, subscribe to `window.dailyAssistant.updater.onStatus`, load initial status with `getStatus`, implement `checkForUpdates` and `quitAndInstall`.

- [ ] **Step 3: Render update card**

Add a settings panel gated by `updatesEnabled`:

```vue
<section v-if="updatesEnabled" class="settings-panel">
  <div class="panel-title">
    <RefreshCw :size="18" :stroke-width="1.9" />
    <h2>应用更新</h2>
  </div>
  <p class="update-meta">当前版本：{{ updateStatus.currentVersion }}</p>
  <p class="update-message">{{ updateStatus.message }}</p>
  <progress v-if="updateStatus.phase === 'downloading'" :value="updateStatus.percent ?? 0" max="100"></progress>
  <div class="update-actions">
    <button class="test-button" type="button" :disabled="updateStatus.phase === 'checking' || updateStatus.phase === 'downloading'" @click="checkForUpdates">
      检查更新
    </button>
    <button v-if="updateStatus.phase === 'downloaded'" class="save-button" type="button" @click="quitAndInstall">
      立即重启安装
    </button>
  </div>
</section>
```

- [ ] **Step 4: Run Settings layout test**

Run:

```powershell
C:\nvm4w\nodejs\npm.cmd test -- tests/unit/settings-page-layout.test.ts
```

Expected: PASS.

---

### Task 6: Full Verification And Packaging

**Files:**
- All changed files

- [ ] **Step 1: Run unit tests**

Run:

```powershell
C:\nvm4w\nodejs\npm.cmd test -- tests/unit
```

Expected: all unit test files pass.

- [ ] **Step 2: Run build**

Run:

```powershell
C:\nvm4w\nodejs\npm.cmd run build
```

Expected: `vue-tsc --noEmit` and `electron-vite build` pass.

- [ ] **Step 3: Run Windows packaging with update flag**

Run:

```powershell
$env:VITE_ENABLE_APP_UPDATE='true'; C:\nvm4w\nodejs\npm.cmd run dist:win -- --publish never
```

Expected: `release` contains `latest.yml`, `日报助手 Setup 0.1.1.exe`, and `日报助手 Setup 0.1.1.exe.blockmap`.

- [ ] **Step 4: Inspect generated updater metadata**

Run:

```powershell
Get-Content -Encoding UTF8 release\latest.yml
```

Expected: metadata references version `0.1.1` and the generated installer.

- [ ] **Step 5: Final git diff review**

Run:

```powershell
git status --porcelain=v1
git diff --stat
```

Expected: only relevant updater implementation, tests, package files, and docs are changed.
