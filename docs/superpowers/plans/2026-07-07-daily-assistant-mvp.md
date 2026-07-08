# Daily Assistant MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows desktop daily-report assistant MVP with Electron, Vue, SQLite, local screenshots, customizable AI providers, and a polished productivity workbench UI.

**Architecture:** Electron owns privileged desktop capabilities and exposes a narrow IPC bridge. Vue 3 renders the local Web UI. Core services are split into storage, capture scheduling, AI providers, report generation, and settings so each part can be tested independently.

**Tech Stack:** Electron, Vue 3, Vite, TypeScript, Vitest, SQLite, Playwright for UI verification, MiniMax default AI preset, OpenAI-compatible custom provider support.

---

## Pre-Implementation Constraints

- The current workspace has a `.git` directory entry, but `git status --short` reports `fatal: not a git repository`. Treat repository initialization or repair as the first execution checkpoint.
- `node` and `npm` were not found in the current PowerShell PATH during planning. Check documented Windows Node locations before concluding Node is unavailable.
- MiniMax official documentation could not be fetched from the current shell during planning. Before writing provider request code, verify the current MiniMax official API docs for endpoint, model, image input format, authentication headers, and rate-limit behavior.
- This plan targets the personal MVP only. Enterprise management, ranking, leave, departments, and cloud sync stay out of scope.

## File Structure

Create the project as a single Electron/Vue app at the repository root.

- `package.json`: scripts, dependencies, dev dependencies.
- `tsconfig.json`: shared TypeScript settings.
- `vite.config.ts`: renderer build config.
- `electron.vite.config.ts`: Electron build wiring.
- `src/main/index.ts`: Electron app bootstrap, window, tray, IPC registration.
- `src/main/preload.ts`: safe renderer bridge.
- `src/main/ipc/*.ts`: IPC route registration grouped by domain.
- `src/main/services/storage/*`: SQLite connection, migrations, repositories.
- `src/main/services/capture/*`: screenshot capture, scheduler, blacklist checks.
- `src/main/services/ai/*`: provider interfaces, MiniMax provider, OpenAI-compatible provider, prompt handling.
- `src/main/services/report/*`: event-to-report assembly and report persistence.
- `src/shared/types/*.ts`: shared DTOs and domain types.
- `src/renderer/main.ts`: Vue entry.
- `src/renderer/App.vue`: app shell.
- `src/renderer/styles/*.css`: design tokens, layout, components.
- `src/renderer/pages/*.vue`: Today, Timeline, Reports, History, Settings.
- `src/renderer/components/*.vue`: reusable dashboard controls.
- `tests/unit/*`: service and provider unit tests.
- `tests/integration/*`: SQLite repository tests.
- `tests/e2e/*`: UI smoke tests when the app can run.

---

### Task 1: Repository And Toolchain Checkpoint

**Files:**
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `.npmrc`

- [ ] **Step 1: Verify repository state**

Run:

```powershell
git status --short
```

Expected:

```text
fatal: not a git repository (or any of the parent directories): .git
```

If this is still the output, run:

```powershell
git init
git status --short
```

Expected after init:

```text
?? docs/
```

- [ ] **Step 2: Verify Node and npm paths**

Run:

```powershell
Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
Get-Command npm -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
Test-Path C:\nvm4w\nodejs\node.exe
Test-Path C:\nvm4w\nodejs\npm.cmd
Test-Path C:\Users\ZhangHao\AppData\Local\nvm\node_global\npm.cmd
```

Expected:

```text
At least one valid Node executable and one valid npm command are found.
```

If sandbox denies reading those paths, request permission before dependency installation.

- [ ] **Step 3: Add project ignore rules**

Create `.gitignore`:

```gitignore
node_modules/
dist/
dist-electron/
release/
.vite/
coverage/
*.log
.env
.env.*
!.env.example
data/
captures/
```

- [ ] **Step 4: Pin Node intent**

Create `.nvmrc`:

```text
22
```

- [ ] **Step 5: Add npm defaults**

Create `.npmrc`:

```ini
engine-strict=false
fund=false
audit=false
```

- [ ] **Step 6: Commit checkpoint**

Run:

```powershell
git add .gitignore .nvmrc .npmrc docs
git commit -m "chore: initialize daily assistant workspace"
```

Expected:

```text
[main ...] chore: initialize daily assistant workspace
```

---

### Task 2: Scaffold Electron Vue TypeScript App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main/index.ts`
- Create: `src/main/preload.ts`
- Create: `src/renderer/main.ts`
- Create: `src/renderer/App.vue`
- Create: `src/renderer/styles/tokens.css`
- Create: `src/renderer/styles/base.css`

- [ ] **Step 1: Scaffold with a maintained Electron/Vue template**

Run one of these, using the Node/npm path verified in Task 1:

```powershell
npm create electron-vite@latest . -- --template vue-ts
```

Expected:

```text
Done. Now run npm install
```

If the scaffold refuses a non-empty directory, scaffold into a temporary sibling, then move only the generated app files into this workspace without overwriting `docs/`.

- [ ] **Step 2: Install dependencies**

Run:

```powershell
npm install
```

Expected:

```text
added ... packages
```

- [ ] **Step 3: Add baseline scripts**

Ensure `package.json` contains these scripts:

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "vue-tsc --noEmit && electron-vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "vue-tsc --noEmit"
  }
}
```

- [ ] **Step 4: Add design tokens**

Create `src/renderer/styles/tokens.css`:

```css
:root {
  color-scheme: light;
  --bg: #f6f4ef;
  --surface: #fffdf8;
  --surface-muted: #ece7dc;
  --ink: #1e2528;
  --ink-soft: #5c676b;
  --line: #d8d0c2;
  --accent: #0f8f7f;
  --accent-strong: #086a5e;
  --warning: #c9822b;
  --danger: #b94b48;
  --ok: #28835b;
  --shadow: 0 18px 50px rgba(30, 37, 40, 0.12);
  --radius: 8px;
  font-family: "Segoe UI", "Microsoft YaHei UI", sans-serif;
}
```

- [ ] **Step 5: Add baseline app CSS**

Create `src/renderer/styles/base.css`:

```css
@import "./tokens.css";

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 1024px;
  min-height: 720px;
  background: var(--bg);
  color: var(--ink);
}

button,
input,
textarea,
select {
  font: inherit;
}
```

- [ ] **Step 6: Wire CSS in renderer entry**

Ensure `src/renderer/main.ts` imports:

```ts
import "./styles/base.css";
```

- [ ] **Step 7: Verify scaffold**

Run:

```powershell
npm run build
npm test
```

Expected:

```text
Build exits 0.
Vitest exits 0 or reports no tests if no tests exist yet.
```

- [ ] **Step 8: Commit scaffold**

Run:

```powershell
git add package.json package-lock.json tsconfig.json vite.config.ts src
git commit -m "chore: scaffold electron vue app"
```

Expected:

```text
[main ...] chore: scaffold electron vue app
```

---

### Task 3: Shared Domain Types

**Files:**
- Create: `src/shared/types/capture.ts`
- Create: `src/shared/types/ai.ts`
- Create: `src/shared/types/report.ts`
- Create: `src/shared/types/settings.ts`
- Create: `src/shared/types/index.ts`
- Test: `tests/unit/shared-types.test.ts`

- [ ] **Step 1: Add shared type smoke test**

Create `tests/unit/shared-types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { AIProviderProfile, CaptureRecord, DailyReport, WorkEvent } from "../../src/shared/types";

describe("shared domain types", () => {
  it("supports the MVP capture to report shape", () => {
    const provider: AIProviderProfile = {
      id: "provider-1",
      name: "MiniMax",
      type: "minimax",
      baseUrl: null,
      apiKeyRef: "minimax-key",
      modelName: "configured-model",
      customHeaders: {},
      enabled: true
    };

    const capture: CaptureRecord = {
      id: "capture-1",
      capturedAt: "2026-07-07T09:00:00.000Z",
      imagePath: "captures/capture-1.png",
      activeApp: "Code.exe",
      windowTitle: "Daily Assistant",
      status: "captured",
      skipReason: null
    };

    const event: WorkEvent = {
      id: "event-1",
      captureId: capture.id,
      startedAt: capture.capturedAt,
      endedAt: "2026-07-07T09:15:00.000Z",
      title: "Implemented dashboard shell",
      summary: "Built the first workbench structure.",
      category: "development",
      confidence: 0.86,
      source: "ai"
    };

    const report: DailyReport = {
      id: "report-1",
      date: "2026-07-07",
      type: "daily",
      content: "- Implemented dashboard shell",
      generatedAt: "2026-07-07T18:00:00.000Z",
      updatedAt: "2026-07-07T18:00:00.000Z",
      providerId: provider.id,
      modelName: provider.modelName
    };

    expect(event.captureId).toBe(capture.id);
    expect(report.providerId).toBe(provider.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/unit/shared-types.test.ts
```

Expected:

```text
FAIL ... Cannot find module '../../src/shared/types'
```

- [ ] **Step 3: Add capture types**

Create `src/shared/types/capture.ts`:

```ts
export type CaptureStatus = "captured" | "skipped" | "analyzed" | "failed";

export interface CaptureRecord {
  id: string;
  capturedAt: string;
  imagePath: string;
  activeApp: string | null;
  windowTitle: string | null;
  status: CaptureStatus;
  skipReason: string | null;
}
```

- [ ] **Step 4: Add AI types**

Create `src/shared/types/ai.ts`:

```ts
export type AIProviderType = "minimax" | "openai_compatible";
export type PromptPurpose = "screenshot_analysis" | "daily_report";

export interface AIProviderProfile {
  id: string;
  name: string;
  type: AIProviderType;
  baseUrl: string | null;
  apiKeyRef: string;
  modelName: string;
  customHeaders: Record<string, string>;
  enabled: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  purpose: PromptPurpose;
  content: string;
  isDefault: boolean;
}

export interface ProviderStatus {
  ok: boolean;
  message: string;
}

export interface WorkEventDraft {
  title: string;
  summary: string;
  category: string;
  confidence: number;
}
```

- [ ] **Step 5: Add report types**

Create `src/shared/types/report.ts`:

```ts
export type ReportType = "daily";
export type WorkEventSource = "ai" | "manual";

export interface WorkEvent {
  id: string;
  captureId: string;
  startedAt: string;
  endedAt: string;
  title: string;
  summary: string;
  category: string;
  confidence: number;
  source: WorkEventSource;
}

export interface DailyReport {
  id: string;
  date: string;
  type: ReportType;
  content: string;
  generatedAt: string;
  updatedAt: string;
  providerId: string;
  modelName: string;
}
```

- [ ] **Step 6: Add setting types**

Create `src/shared/types/settings.ts`:

```ts
export interface AppSetting {
  key: string;
  value: string;
}

export interface CaptureSettings {
  intervalMinutes: number;
  storageDirectory: string;
  retentionDays: number;
  uploadToAIEnabled: boolean;
  blacklist: string[];
}
```

- [ ] **Step 7: Export shared types**

Create `src/shared/types/index.ts`:

```ts
export * from "./capture";
export * from "./ai";
export * from "./report";
export * from "./settings";
```

- [ ] **Step 8: Verify types**

Run:

```powershell
npm test -- tests/unit/shared-types.test.ts
npm run lint
```

Expected:

```text
PASS tests/unit/shared-types.test.ts
vue-tsc exits 0.
```

- [ ] **Step 9: Commit types**

Run:

```powershell
git add src/shared tests/unit/shared-types.test.ts
git commit -m "feat: add shared daily assistant domain types"
```

Expected:

```text
[main ...] feat: add shared daily assistant domain types
```

---

### Task 4: SQLite Storage Layer

**Files:**
- Create: `src/main/services/storage/schema.ts`
- Create: `src/main/services/storage/database.ts`
- Create: `src/main/services/storage/repositories.ts`
- Test: `tests/integration/storage.test.ts`

- [ ] **Step 1: Add storage integration test**

Create `tests/integration/storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInMemoryDatabase } from "../../src/main/services/storage/database";
import { createRepositories } from "../../src/main/services/storage/repositories";

describe("storage repositories", () => {
  it("persists captures, AI provider profiles, work events, and reports", () => {
    const db = createInMemoryDatabase();
    const repos = createRepositories(db);

    repos.aiProviders.save({
      id: "provider-1",
      name: "MiniMax",
      type: "minimax",
      baseUrl: null,
      apiKeyRef: "key",
      modelName: "model",
      customHeaders: {},
      enabled: true
    });

    repos.captures.save({
      id: "capture-1",
      capturedAt: "2026-07-07T09:00:00.000Z",
      imagePath: "captures/capture-1.png",
      activeApp: "Code.exe",
      windowTitle: "Daily Assistant",
      status: "captured",
      skipReason: null
    });

    repos.workEvents.save({
      id: "event-1",
      captureId: "capture-1",
      startedAt: "2026-07-07T09:00:00.000Z",
      endedAt: "2026-07-07T09:10:00.000Z",
      title: "Reviewed requirements",
      summary: "Read the MVP spec.",
      category: "planning",
      confidence: 0.9,
      source: "ai"
    });

    repos.reports.save({
      id: "report-1",
      date: "2026-07-07",
      type: "daily",
      content: "Reviewed requirements",
      generatedAt: "2026-07-07T18:00:00.000Z",
      updatedAt: "2026-07-07T18:00:00.000Z",
      providerId: "provider-1",
      modelName: "model"
    });

    expect(repos.captures.listByDate("2026-07-07")).toHaveLength(1);
    expect(repos.workEvents.listByDate("2026-07-07")).toHaveLength(1);
    expect(repos.reports.getByDate("2026-07-07")?.content).toContain("Reviewed");
    expect(repos.aiProviders.listEnabled()[0].name).toBe("MiniMax");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/integration/storage.test.ts
```

Expected:

```text
FAIL ... Cannot find module '../../src/main/services/storage/database'
```

- [ ] **Step 3: Install SQLite dependency**

Run:

```powershell
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

Expected:

```text
added ... packages
```

If native build fails on Windows, switch to `sql.js` for MVP storage and update imports in this task.

- [ ] **Step 4: Add schema**

Create `src/main/services/storage/schema.ts`:

```ts
export const schemaSql = `
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  captured_at TEXT NOT NULL,
  image_path TEXT NOT NULL,
  active_app TEXT,
  window_title TEXT,
  status TEXT NOT NULL,
  skip_reason TEXT
);

CREATE TABLE IF NOT EXISTS work_events (
  id TEXT PRIMARY KEY,
  capture_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence REAL NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_provider_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  base_url TEXT,
  api_key_ref TEXT NOT NULL,
  model_name TEXT NOT NULL,
  custom_headers TEXT NOT NULL,
  enabled INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
```

- [ ] **Step 5: Add database factory**

Create `src/main/services/storage/database.ts`:

```ts
import Database from "better-sqlite3";
import { schemaSql } from "./schema";

export type AppDatabase = Database.Database;

export function createDatabase(filePath: string): AppDatabase {
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.exec(schemaSql);
  return db;
}

export function createInMemoryDatabase(): AppDatabase {
  const db = new Database(":memory:");
  db.exec(schemaSql);
  return db;
}
```

- [ ] **Step 6: Add repositories**

Create `src/main/services/storage/repositories.ts`:

```ts
import type { AIProviderProfile, CaptureRecord, DailyReport, WorkEvent } from "../../../shared/types";
import type { AppDatabase } from "./database";

function dateRange(date: string) {
  return {
    start: `${date}T00:00:00.000Z`,
    end: `${date}T23:59:59.999Z`
  };
}

export function createRepositories(db: AppDatabase) {
  return {
    captures: {
      save(record: CaptureRecord) {
        db.prepare(`
          INSERT OR REPLACE INTO captures
          (id, captured_at, image_path, active_app, window_title, status, skip_reason)
          VALUES (@id, @capturedAt, @imagePath, @activeApp, @windowTitle, @status, @skipReason)
        `).run(record);
      },
      listByDate(date: string): CaptureRecord[] {
        const range = dateRange(date);
        return db.prepare(`
          SELECT id, captured_at as capturedAt, image_path as imagePath, active_app as activeApp,
                 window_title as windowTitle, status, skip_reason as skipReason
          FROM captures
          WHERE captured_at BETWEEN @start AND @end
          ORDER BY captured_at ASC
        `).all(range) as CaptureRecord[];
      }
    },
    workEvents: {
      save(event: WorkEvent) {
        db.prepare(`
          INSERT OR REPLACE INTO work_events
          (id, capture_id, started_at, ended_at, title, summary, category, confidence, source)
          VALUES (@id, @captureId, @startedAt, @endedAt, @title, @summary, @category, @confidence, @source)
        `).run(event);
      },
      listByDate(date: string): WorkEvent[] {
        const range = dateRange(date);
        return db.prepare(`
          SELECT id, capture_id as captureId, started_at as startedAt, ended_at as endedAt,
                 title, summary, category, confidence, source
          FROM work_events
          WHERE started_at BETWEEN @start AND @end
          ORDER BY started_at ASC
        `).all(range) as WorkEvent[];
      }
    },
    reports: {
      save(report: DailyReport) {
        db.prepare(`
          INSERT OR REPLACE INTO reports
          (id, date, type, content, generated_at, updated_at, provider_id, model_name)
          VALUES (@id, @date, @type, @content, @generatedAt, @updatedAt, @providerId, @modelName)
        `).run(report);
      },
      getByDate(date: string): DailyReport | null {
        const row = db.prepare(`
          SELECT id, date, type, content, generated_at as generatedAt, updated_at as updatedAt,
                 provider_id as providerId, model_name as modelName
          FROM reports
          WHERE date = ?
        `).get(date) as DailyReport | undefined;
        return row ?? null;
      }
    },
    aiProviders: {
      save(profile: AIProviderProfile) {
        db.prepare(`
          INSERT OR REPLACE INTO ai_provider_profiles
          (id, name, type, base_url, api_key_ref, model_name, custom_headers, enabled)
          VALUES (@id, @name, @type, @baseUrl, @apiKeyRef, @modelName, @customHeadersJson, @enabledValue)
        `).run({
          ...profile,
          customHeadersJson: JSON.stringify(profile.customHeaders),
          enabledValue: profile.enabled ? 1 : 0
        });
      },
      listEnabled(): AIProviderProfile[] {
        return db.prepare(`
          SELECT id, name, type, base_url as baseUrl, api_key_ref as apiKeyRef,
                 model_name as modelName, custom_headers as customHeaders, enabled
          FROM ai_provider_profiles
          WHERE enabled = 1
        `).all().map((row: any) => ({
          ...row,
          customHeaders: JSON.parse(row.customHeaders),
          enabled: Boolean(row.enabled)
        })) as AIProviderProfile[];
      }
    }
  };
}
```

- [ ] **Step 7: Verify storage**

Run:

```powershell
npm test -- tests/integration/storage.test.ts
npm run lint
```

Expected:

```text
PASS tests/integration/storage.test.ts
vue-tsc exits 0.
```

- [ ] **Step 8: Commit storage**

Run:

```powershell
git add package.json package-lock.json src/main/services/storage tests/integration/storage.test.ts
git commit -m "feat: add sqlite storage layer"
```

Expected:

```text
[main ...] feat: add sqlite storage layer
```

---

### Task 5: AI Provider Layer

**Files:**
- Create: `src/main/services/ai/provider.ts`
- Create: `src/main/services/ai/prompts.ts`
- Create: `src/main/services/ai/openaiCompatibleProvider.ts`
- Create: `src/main/services/ai/minimaxProvider.ts`
- Create: `src/main/services/ai/providerRegistry.ts`
- Test: `tests/unit/ai-providers.test.ts`

- [ ] **Step 1: Confirm MiniMax official API docs**

Run a browser or official docs lookup before coding `minimaxProvider.ts`.

Record a short implementation note that confirms these six values from official documentation:

```text
1. MiniMax base URL
2. MiniMax endpoint
3. MiniMax auth header
4. MiniMax image input format
5. MiniMax current vision-capable model
6. MiniMax rate-limit or quota error shape
```

Expected:

```text
All MiniMax values are confirmed from official documentation before provider code is finalized.
```

- [ ] **Step 2: Add provider tests**

Create `tests/unit/ai-providers.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createOpenAICompatibleProvider } from "../../src/main/services/ai/openaiCompatibleProvider";
import { createProviderRegistry } from "../../src/main/services/ai/providerRegistry";
import { defaultDailyReportPrompt, defaultScreenshotPrompt } from "../../src/main/services/ai/prompts";

describe("AI providers", () => {
  it("builds OpenAI-compatible screenshot analysis requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Implemented UI",
                summary: "Worked on the dashboard.",
                category: "development",
                confidence: 0.8
              })
            }
          }
        ]
      })
    });

    const provider = createOpenAICompatibleProvider({
      id: "custom",
      name: "Custom",
      type: "openai_compatible",
      baseUrl: "https://example.test/v1",
      apiKeyRef: "secret",
      modelName: "vision-model",
      customHeaders: { "X-Test": "yes" },
      enabled: true
    }, "api-key", fetchMock as any);

    const result = await provider.analyzeScreenshot({
      imageBase64: "abc",
      mimeType: "image/png",
      prompt: defaultScreenshotPrompt
    });

    expect(result.title).toBe("Implemented UI");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer api-key",
          "X-Test": "yes"
        })
      })
    );
  });

  it("selects MiniMax as the default preset", () => {
    const registry = createProviderRegistry();
    expect(registry.defaultProviderType).toBe("minimax");
  });

  it("contains editable default prompt templates", () => {
    expect(defaultScreenshotPrompt).toContain("Return JSON");
    expect(defaultDailyReportPrompt).toContain("daily report");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```powershell
npm test -- tests/unit/ai-providers.test.ts
```

Expected:

```text
FAIL ... Cannot find module '../../src/main/services/ai/openaiCompatibleProvider'
```

- [ ] **Step 4: Add provider interface**

Create `src/main/services/ai/provider.ts`:

```ts
import type { AIProviderProfile, ProviderStatus, WorkEventDraft, WorkEvent } from "../../../shared/types";

export interface ScreenshotAnalysisInput {
  imageBase64: string;
  mimeType: "image/png" | "image/jpeg";
  prompt: string;
}

export interface DailyReportInput {
  events: WorkEvent[];
  userInstruction: string;
  prompt: string;
}

export interface AIProvider {
  profile: AIProviderProfile;
  analyzeScreenshot(input: ScreenshotAnalysisInput): Promise<WorkEventDraft>;
  generateDailyReport(input: DailyReportInput): Promise<string>;
  checkConnection(): Promise<ProviderStatus>;
}
```

- [ ] **Step 5: Add default prompts**

Create `src/main/services/ai/prompts.ts`:

```ts
export const defaultScreenshotPrompt = [
  "You analyze a desktop screenshot for a personal daily report assistant.",
  "Return JSON only with title, summary, category, and confidence.",
  "Keep title short and describe the work activity, not private screen details."
].join("\n");

export const defaultDailyReportPrompt = [
  "Write a concise Chinese daily report from the work events.",
  "Group related work, avoid exaggeration, and keep the tone professional.",
  "Return Markdown daily report content only."
].join("\n");
```

- [ ] **Step 6: Add OpenAI-compatible provider**

Create `src/main/services/ai/openaiCompatibleProvider.ts`:

```ts
import type { AIProviderProfile, WorkEventDraft } from "../../../shared/types";
import type { AIProvider, DailyReportInput, ScreenshotAnalysisInput } from "./provider";

type FetchLike = typeof fetch;

function parseWorkEvent(content: string): WorkEventDraft {
  const parsed = JSON.parse(content) as WorkEventDraft;
  return {
    title: String(parsed.title),
    summary: String(parsed.summary),
    category: String(parsed.category),
    confidence: Number(parsed.confidence)
  };
}

export function createOpenAICompatibleProvider(
  profile: AIProviderProfile,
  apiKey: string,
  fetchImpl: FetchLike = fetch
): AIProvider {
  if (!profile.baseUrl) {
    throw new Error("OpenAI-compatible provider requires baseUrl.");
  }

  const endpoint = `${profile.baseUrl.replace(/\/$/, "")}/chat/completions`;

  async function post(messages: unknown[]) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...profile.customHeaders
      },
      body: JSON.stringify({
        model: profile.modelName,
        messages
      })
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed: ${response.status}`);
    }

    return response.json() as Promise<{ choices: Array<{ message: { content: string } }> }>;
  }

  return {
    profile,
    async analyzeScreenshot(input: ScreenshotAnalysisInput) {
      const payload = await post([
        {
          role: "user",
          content: [
            { type: "text", text: input.prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mimeType};base64,${input.imageBase64}`
              }
            }
          ]
        }
      ]);
      return parseWorkEvent(payload.choices[0].message.content);
    },
    async generateDailyReport(input: DailyReportInput) {
      const payload = await post([
        {
          role: "user",
          content: `${input.prompt}\n\nUser instruction: ${input.userInstruction}\n\nEvents:\n${JSON.stringify(input.events)}`
        }
      ]);
      return payload.choices[0].message.content;
    },
    async checkConnection() {
      return { ok: true, message: "Provider profile is configured." };
    }
  };
}
```

- [ ] **Step 7: Add MiniMax provider shell**

Create `src/main/services/ai/minimaxProvider.ts` after official docs verification:

```ts
import type { AIProviderProfile } from "../../../shared/types";
import type { AIProvider } from "./provider";
import { createOpenAICompatibleProvider } from "./openaiCompatibleProvider";

export function createMiniMaxProvider(profile: AIProviderProfile, apiKey: string, fetchImpl: typeof fetch = fetch): AIProvider {
  const resolvedProfile: AIProviderProfile = {
    ...profile,
    type: "minimax",
    baseUrl: profile.baseUrl,
    customHeaders: profile.customHeaders
  };

  return createOpenAICompatibleProvider(resolvedProfile, apiKey, fetchImpl);
}
```

If official MiniMax docs do not match OpenAI-compatible semantics, replace the body with the documented MiniMax request format and update tests accordingly.

- [ ] **Step 8: Add provider registry**

Create `src/main/services/ai/providerRegistry.ts`:

```ts
import type { AIProviderProfile } from "../../../shared/types";
import type { AIProvider } from "./provider";
import { createMiniMaxProvider } from "./minimaxProvider";
import { createOpenAICompatibleProvider } from "./openaiCompatibleProvider";

export function createProviderRegistry() {
  return {
    defaultProviderType: "minimax" as const,
    create(profile: AIProviderProfile, apiKey: string): AIProvider {
      if (profile.type === "minimax") {
        return createMiniMaxProvider(profile, apiKey);
      }
      return createOpenAICompatibleProvider(profile, apiKey);
    }
  };
}
```

- [ ] **Step 9: Verify AI provider layer**

Run:

```powershell
npm test -- tests/unit/ai-providers.test.ts
npm run lint
```

Expected:

```text
PASS tests/unit/ai-providers.test.ts
vue-tsc exits 0.
```

- [ ] **Step 10: Commit AI layer**

Run:

```powershell
git add src/main/services/ai tests/unit/ai-providers.test.ts
git commit -m "feat: add configurable ai provider layer"
```

Expected:

```text
[main ...] feat: add configurable ai provider layer
```

---

### Task 6: Capture Scheduler And Local Screenshot Records

**Files:**
- Create: `src/main/services/capture/captureScheduler.ts`
- Create: `src/main/services/capture/blacklist.ts`
- Create: `src/main/services/capture/screenshotCapture.ts`
- Test: `tests/unit/capture-scheduler.test.ts`

- [ ] **Step 1: Add scheduler test**

Create `tests/unit/capture-scheduler.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createCaptureScheduler } from "../../src/main/services/capture/captureScheduler";

describe("capture scheduler", () => {
  it("starts, pauses, resumes, and stops without double scheduling", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const scheduler = createCaptureScheduler({ intervalMs: 60_000, run });

    scheduler.start();
    scheduler.start();
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(1);

    scheduler.pause();
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(1);

    scheduler.resume();
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(2);

    scheduler.stop();
    vi.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/unit/capture-scheduler.test.ts
```

Expected:

```text
FAIL ... Cannot find module '../../src/main/services/capture/captureScheduler'
```

- [ ] **Step 3: Add scheduler**

Create `src/main/services/capture/captureScheduler.ts`:

```ts
export interface CaptureSchedulerOptions {
  intervalMs: number;
  run: () => void | Promise<void>;
}

export function createCaptureScheduler(options: CaptureSchedulerOptions) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let paused = false;

  function tick() {
    if (!paused) {
      void options.run();
    }
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(tick, options.intervalMs);
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    getState() {
      return {
        running: Boolean(timer),
        paused
      };
    }
  };
}
```

- [ ] **Step 4: Add blacklist matcher**

Create `src/main/services/capture/blacklist.ts`:

```ts
export function isBlacklistedWindow(activeApp: string | null, windowTitle: string | null, blacklist: string[]): boolean {
  const haystack = `${activeApp ?? ""} ${windowTitle ?? ""}`.toLowerCase();
  return blacklist.some((item) => haystack.includes(item.toLowerCase()));
}
```

- [ ] **Step 5: Add screenshot capture file writer**

Create `src/main/services/capture/screenshotCapture.ts`:

```ts
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CaptureRecord } from "../../../shared/types";

export interface ScreenshotCaptureOptions {
  storageDirectory: string;
  now?: () => Date;
  screenshotPng: () => Promise<Buffer>;
}

export async function captureScreenshot(options: ScreenshotCaptureOptions): Promise<CaptureRecord> {
  const now = options.now?.() ?? new Date();
  const id = randomUUID();
  const imagePath = join(options.storageDirectory, `${id}.png`);
  const png = await options.screenshotPng();

  await mkdir(dirname(imagePath), { recursive: true });
  await writeFile(imagePath, png);

  return {
    id,
    capturedAt: now.toISOString(),
    imagePath,
    activeApp: null,
    windowTitle: null,
    status: "captured",
    skipReason: null
  };
}
```

This keeps Electron-specific screenshot capture behind an injected byte provider while making file persistence testable in Node.

- [ ] **Step 6: Verify capture service**

Run:

```powershell
npm test -- tests/unit/capture-scheduler.test.ts
npm run lint
```

Expected:

```text
PASS tests/unit/capture-scheduler.test.ts
vue-tsc exits 0.
```

- [ ] **Step 7: Commit capture service**

Run:

```powershell
git add src/main/services/capture tests/unit/capture-scheduler.test.ts
git commit -m "feat: add capture scheduling service"
```

Expected:

```text
[main ...] feat: add capture scheduling service
```

---

### Task 7: Report Generation Service

**Files:**
- Create: `src/main/services/report/reportGenerator.ts`
- Test: `tests/unit/report-generator.test.ts`

- [ ] **Step 1: Add report generator test**

Create `tests/unit/report-generator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildDailyReportFallback } from "../../src/main/services/report/reportGenerator";

describe("report generator", () => {
  it("builds a readable Chinese fallback report from events", () => {
    const report = buildDailyReportFallback([
      {
        id: "event-1",
        captureId: "capture-1",
        startedAt: "2026-07-07T09:00:00.000Z",
        endedAt: "2026-07-07T10:00:00.000Z",
        title: "开发日报助手工作台",
        summary: "完成今日页面结构和状态栏设计。",
        category: "development",
        confidence: 0.9,
        source: "ai"
      }
    ]);

    expect(report).toContain("今日工作总结");
    expect(report).toContain("开发日报助手工作台");
    expect(report).toContain("完成今日页面结构和状态栏设计");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/unit/report-generator.test.ts
```

Expected:

```text
FAIL ... Cannot find module '../../src/main/services/report/reportGenerator'
```

- [ ] **Step 3: Add fallback report generator**

Create `src/main/services/report/reportGenerator.ts`:

```ts
import type { WorkEvent } from "../../../shared/types";

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function buildDailyReportFallback(events: WorkEvent[]): string {
  const lines = ["# 今日日报", "", "## 今日工作总结", ""];

  if (events.length === 0) {
    lines.push("- 今日暂无可用工作记录。");
    return lines.join("\n");
  }

  for (const event of events) {
    lines.push(`- ${timeLabel(event.startedAt)}-${timeLabel(event.endedAt)} ${event.title}：${event.summary}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Verify report generator**

Run:

```powershell
npm test -- tests/unit/report-generator.test.ts
npm run lint
```

Expected:

```text
PASS tests/unit/report-generator.test.ts
vue-tsc exits 0.
```

- [ ] **Step 5: Commit report service**

Run:

```powershell
git add src/main/services/report tests/unit/report-generator.test.ts
git commit -m "feat: add daily report generation service"
```

Expected:

```text
[main ...] feat: add daily report generation service
```

---

### Task 8: IPC Bridge And Main Process Wiring

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/main/preload.ts`
- Create: `src/main/ipc/dashboardIpc.ts`
- Create: `src/main/ipc/settingsIpc.ts`
- Create: `src/shared/types/ipc.ts`
- Test: `tests/unit/ipc-contract.test.ts`

- [ ] **Step 1: Add IPC contract test**

Create `tests/unit/ipc-contract.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dashboardChannels, settingsChannels } from "../../src/shared/types/ipc";

describe("IPC contract", () => {
  it("uses namespaced channel names", () => {
    expect(dashboardChannels.getToday).toBe("dashboard:getToday");
    expect(dashboardChannels.generateReport).toBe("dashboard:generateReport");
    expect(settingsChannels.get).toBe("settings:get");
    expect(settingsChannels.save).toBe("settings:save");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/unit/ipc-contract.test.ts
```

Expected:

```text
FAIL ... Cannot find module '../../src/shared/types/ipc'
```

- [ ] **Step 3: Add IPC channel constants**

Create `src/shared/types/ipc.ts`:

```ts
export const dashboardChannels = {
  getToday: "dashboard:getToday",
  pauseCapture: "dashboard:pauseCapture",
  resumeCapture: "dashboard:resumeCapture",
  generateReport: "dashboard:generateReport"
} as const;

export const settingsChannels = {
  get: "settings:get",
  save: "settings:save",
  testAIProvider: "settings:testAIProvider"
} as const;
```

- [ ] **Step 4: Register dashboard IPC**

Create `src/main/ipc/dashboardIpc.ts`:

```ts
import { ipcMain } from "electron";
import { dashboardChannels } from "../../shared/types/ipc";

export function registerDashboardIpc() {
  ipcMain.handle(dashboardChannels.getToday, async () => ({
    recording: false,
    capturedDurationMinutes: 0,
    analyzedEventCount: 0,
    providerStatus: "not_configured",
    events: [],
    reportDraft: ""
  }));

  ipcMain.handle(dashboardChannels.pauseCapture, async () => ({ ok: true }));
  ipcMain.handle(dashboardChannels.resumeCapture, async () => ({ ok: true }));
  ipcMain.handle(dashboardChannels.generateReport, async () => ({ content: "# 今日日报\n\n- 暂无记录。" }));
}
```

- [ ] **Step 5: Register settings IPC**

Create `src/main/ipc/settingsIpc.ts`:

```ts
import { ipcMain } from "electron";
import { settingsChannels } from "../../shared/types/ipc";

export function registerSettingsIpc() {
  ipcMain.handle(settingsChannels.get, async () => ({
    providerType: "minimax",
    baseUrl: "",
    modelName: "",
    uploadToAIEnabled: false,
    captureIntervalMinutes: 5
  }));

  ipcMain.handle(settingsChannels.save, async (_event, settings) => ({ ok: true, settings }));
  ipcMain.handle(settingsChannels.testAIProvider, async () => ({ ok: false, message: "AI provider is not configured." }));
}
```

- [ ] **Step 6: Expose preload bridge**

Ensure `src/main/preload.ts` exposes:

```ts
import { contextBridge, ipcRenderer } from "electron";
import { dashboardChannels, settingsChannels } from "../shared/types/ipc";

contextBridge.exposeInMainWorld("dailyAssistant", {
  dashboard: {
    getToday: () => ipcRenderer.invoke(dashboardChannels.getToday),
    pauseCapture: () => ipcRenderer.invoke(dashboardChannels.pauseCapture),
    resumeCapture: () => ipcRenderer.invoke(dashboardChannels.resumeCapture),
    generateReport: () => ipcRenderer.invoke(dashboardChannels.generateReport)
  },
  settings: {
    get: () => ipcRenderer.invoke(settingsChannels.get),
    save: (settings: unknown) => ipcRenderer.invoke(settingsChannels.save, settings),
    testAIProvider: () => ipcRenderer.invoke(settingsChannels.testAIProvider)
  }
});
```

- [ ] **Step 7: Wire IPC in main process**

Ensure `src/main/index.ts` calls:

```ts
import { registerDashboardIpc } from "./ipc/dashboardIpc";
import { registerSettingsIpc } from "./ipc/settingsIpc";

registerDashboardIpc();
registerSettingsIpc();
```

- [ ] **Step 8: Verify IPC**

Run:

```powershell
npm test -- tests/unit/ipc-contract.test.ts
npm run build
```

Expected:

```text
PASS tests/unit/ipc-contract.test.ts
Build exits 0.
```

- [ ] **Step 9: Commit IPC**

Run:

```powershell
git add src/main src/shared/types/ipc.ts tests/unit/ipc-contract.test.ts
git commit -m "feat: add electron ipc contract"
```

Expected:

```text
[main ...] feat: add electron ipc contract
```

---

### Task 9: Polished Renderer Workbench UI

**Files:**
- Modify: `src/renderer/App.vue`
- Create: `src/renderer/pages/TodayPage.vue`
- Create: `src/renderer/pages/TimelinePage.vue`
- Create: `src/renderer/pages/ReportsPage.vue`
- Create: `src/renderer/pages/HistoryPage.vue`
- Create: `src/renderer/pages/SettingsPage.vue`
- Create: `src/renderer/components/AppSidebar.vue`
- Create: `src/renderer/components/StatusBar.vue`
- Create: `src/renderer/components/TimelineList.vue`
- Create: `src/renderer/components/ReportEditor.vue`
- Create: `src/renderer/components/PrivacyPanel.vue`
- Create: `src/renderer/types/window.d.ts`

- [ ] **Step 1: Add renderer bridge typing**

Create `src/renderer/types/window.d.ts`:

```ts
export {};

declare global {
  interface Window {
    dailyAssistant: {
      dashboard: {
        getToday: () => Promise<any>;
        pauseCapture: () => Promise<{ ok: boolean }>;
        resumeCapture: () => Promise<{ ok: boolean }>;
        generateReport: () => Promise<{ content: string }>;
      };
      settings: {
        get: () => Promise<any>;
        save: (settings: unknown) => Promise<{ ok: boolean; settings: unknown }>;
        testAIProvider: () => Promise<{ ok: boolean; message: string }>;
      };
    };
  }
}
```

- [ ] **Step 2: Add app sidebar**

Create `src/renderer/components/AppSidebar.vue`:

```vue
<script setup lang="ts">
defineProps<{ active: string }>();
const emit = defineEmits<{ select: [page: string] }>();

const items = [
  { id: "today", label: "今日" },
  { id: "timeline", label: "时间线" },
  { id: "reports", label: "报告" },
  { id: "history", label: "历史" },
  { id: "settings", label: "设置" }
];
</script>

<template>
  <nav class="sidebar" aria-label="主导航">
    <div class="brand">
      <span class="brand-mark">日</span>
      <span>日报助手</span>
    </div>
    <button
      v-for="item in items"
      :key="item.id"
      class="nav-item"
      :class="{ active: active === item.id }"
      type="button"
      @click="emit('select', item.id)"
    >
      {{ item.label }}
    </button>
  </nav>
</template>

<style scoped>
.sidebar {
  width: 168px;
  min-height: 100vh;
  padding: 18px 12px;
  background: #1f292b;
  color: #f8f4ea;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  font-weight: 700;
}

.brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  background: var(--accent);
}

.nav-item {
  width: 100%;
  border: 0;
  border-radius: 8px;
  margin-bottom: 6px;
  padding: 10px 12px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.nav-item.active,
.nav-item:hover {
  background: rgba(255, 253, 248, 0.12);
}
</style>
```

- [ ] **Step 3: Add status bar**

Create `src/renderer/components/StatusBar.vue`:

```vue
<script setup lang="ts">
defineProps<{
  recording: boolean;
  duration: number;
  eventCount: number;
  providerStatus: string;
}>();

const emit = defineEmits<{ pause: []; resume: [] }>();
</script>

<template>
  <header class="status-bar">
    <div>
      <p class="eyebrow">今日状态</p>
      <h1>工作记录台</h1>
    </div>
    <div class="metrics">
      <span>{{ duration }} 分钟</span>
      <span>{{ eventCount }} 个事件</span>
      <span>{{ providerStatus }}</span>
      <button v-if="recording" type="button" @click="emit('pause')">暂停</button>
      <button v-else type="button" @click="emit('resume')">继续</button>
    </div>
  </header>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 28px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 253, 248, 0.86);
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: 24px;
}

.metrics {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink-soft);
}

button {
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 8px 12px;
  background: var(--accent);
  color: white;
  cursor: pointer;
}
</style>
```

- [ ] **Step 4: Add Today page and supporting components**

Create focused components for timeline, report editor, and privacy panel. Ensure the Today page loads `window.dailyAssistant.dashboard.getToday()` on mount and renders:

```vue
<template>
  <section class="today-grid">
    <TimelineList :events="state.events" />
    <ReportEditor v-model="reportDraft" @generate="generateReport" />
    <PrivacyPanel :provider-status="state.providerStatus" />
  </section>
</template>
```

Use actual props and emits rather than hard-coded global reads inside every component.

- [ ] **Step 5: Add shell navigation in App**

Update `src/renderer/App.vue` to keep a local `activePage` ref and render the matching page:

```vue
<script setup lang="ts">
import { ref } from "vue";
import AppSidebar from "./components/AppSidebar.vue";
import TodayPage from "./pages/TodayPage.vue";
import TimelinePage from "./pages/TimelinePage.vue";
import ReportsPage from "./pages/ReportsPage.vue";
import HistoryPage from "./pages/HistoryPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";

const activePage = ref("today");
</script>

<template>
  <div class="app-shell">
    <AppSidebar :active="activePage" @select="activePage = $event" />
    <main class="main-panel">
      <TodayPage v-if="activePage === 'today'" />
      <TimelinePage v-else-if="activePage === 'timeline'" />
      <ReportsPage v-else-if="activePage === 'reports'" />
      <HistoryPage v-else-if="activePage === 'history'" />
      <SettingsPage v-else />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.main-panel {
  flex: 1;
  min-width: 0;
}
</style>
```

- [ ] **Step 6: Verify renderer**

Run:

```powershell
npm run build
```

Expected:

```text
Build exits 0.
```

- [ ] **Step 7: Visual QA**

Run:

```powershell
npm run dev
```

Expected:

```text
Electron app opens with a nonblank dashboard.
No text overlaps at 1024x720.
Navigation switches pages.
Pause/resume controls call IPC without renderer errors.
```

- [ ] **Step 8: Commit renderer UI**

Run:

```powershell
git add src/renderer
git commit -m "feat: add polished daily assistant workbench"
```

Expected:

```text
[main ...] feat: add polished daily assistant workbench
```

---

### Task 10: Settings UI For Custom AI Providers

**Files:**
- Modify: `src/renderer/pages/SettingsPage.vue`
- Modify: `src/main/ipc/settingsIpc.ts`
- Modify: `src/main/services/storage/repositories.ts`
- Test: `tests/unit/ai-settings-view-model.test.ts`

- [ ] **Step 1: Add settings view-model test**

Create `tests/unit/ai-settings-view-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeAIProviderSettings } from "../../src/renderer/pages/settingsViewModel";

describe("AI settings view model", () => {
  it("requires base URL for OpenAI-compatible providers but not MiniMax preset", () => {
    expect(normalizeAIProviderSettings({
      providerType: "minimax",
      baseUrl: "",
      apiKey: "key",
      modelName: "model"
    }).errors).toHaveLength(0);

    expect(normalizeAIProviderSettings({
      providerType: "openai_compatible",
      baseUrl: "",
      apiKey: "key",
      modelName: "model"
    }).errors).toContain("自定义兼容接口需要填写 Base URL");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/unit/ai-settings-view-model.test.ts
```

Expected:

```text
FAIL ... Cannot find module '../../src/renderer/pages/settingsViewModel'
```

- [ ] **Step 3: Add settings view model**

Create `src/renderer/pages/settingsViewModel.ts`:

```ts
export interface AIProviderSettingsInput {
  providerType: "minimax" | "openai_compatible";
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export function normalizeAIProviderSettings(input: AIProviderSettingsInput) {
  const errors: string[] = [];

  if (!input.apiKey.trim()) {
    errors.push("需要填写 API Key");
  }

  if (!input.modelName.trim()) {
    errors.push("需要填写模型名称");
  }

  if (input.providerType === "openai_compatible" && !input.baseUrl.trim()) {
    errors.push("自定义兼容接口需要填写 Base URL");
  }

  return {
    value: {
      ...input,
      baseUrl: input.baseUrl.trim(),
      apiKey: input.apiKey.trim(),
      modelName: input.modelName.trim()
    },
    errors
  };
}
```

- [ ] **Step 4: Build Settings UI**

Update `src/renderer/pages/SettingsPage.vue` with:

- Provider segmented control: MiniMax / OpenAI-compatible.
- Base URL input visible for OpenAI-compatible provider.
- API Key password input.
- Model name input.
- Optional headers textarea for custom provider.
- Screenshot analysis prompt textarea.
- Daily report prompt textarea.
- Upload-to-AI toggle.
- Test connection button.
- Save button with validation errors.

- [ ] **Step 5: Wire settings IPC persistence**

Update `src/main/ipc/settingsIpc.ts` so `settings:save` writes provider profile and prompt template records through repositories.

- [ ] **Step 6: Verify settings**

Run:

```powershell
npm test -- tests/unit/ai-settings-view-model.test.ts
npm run build
```

Expected:

```text
PASS tests/unit/ai-settings-view-model.test.ts
Build exits 0.
```

- [ ] **Step 7: Commit custom AI settings**

Run:

```powershell
git add src/renderer/pages/SettingsPage.vue src/renderer/pages/settingsViewModel.ts src/main/ipc/settingsIpc.ts src/main/services/storage/repositories.ts tests/unit/ai-settings-view-model.test.ts
git commit -m "feat: add customizable ai provider settings"
```

Expected:

```text
[main ...] feat: add customizable ai provider settings
```

---

### Task 11: End-To-End Smoke Verification

**Files:**
- Create: `docs/qa/daily-assistant-mvp-smoke.md`

- [ ] **Step 1: Add manual QA checklist**

Create `docs/qa/daily-assistant-mvp-smoke.md`:

```markdown
# Daily Assistant MVP Smoke QA

## Environment

- OS: Windows
- Command: `npm run dev`
- Execution date recorded by tester:

## Checks

- [ ] App opens without a blank screen.
- [ ] Today page is the first screen.
- [ ] Sidebar navigation switches pages.
- [ ] Pause and resume buttons respond without renderer console errors.
- [ ] Settings saves MiniMax provider fields.
- [ ] Settings validates missing Base URL for OpenAI-compatible provider.
- [ ] Daily report generation shows editable Markdown text.
- [ ] Export or copy action preserves report content.
- [ ] No text overlap at 1024x720.
- [ ] Screenshot upload to AI remains disabled until explicitly enabled.
```

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm test
npm run build
npm run dev
```

Expected:

```text
All tests pass.
Build exits 0.
Electron app opens and passes the manual smoke checklist.
```

- [ ] **Step 3: Commit QA checklist**

Run:

```powershell
git add docs/qa/daily-assistant-mvp-smoke.md
git commit -m "test: add daily assistant smoke checklist"
```

Expected:

```text
[main ...] test: add daily assistant smoke checklist
```

---

## Self-Review

- Spec coverage: personal desktop MVP, refined UI, local screenshots, SQLite storage, custom AI provider settings, MiniMax default preset, report editing, and privacy controls are covered.
- Scope control: enterprise dashboards, employee management, rankings, cloud sync, and monthly analytics are not included.
- MiniMax risk: provider code must wait for official docs verification before hard-coding endpoint or image request format.
- Toolchain risk: Node/npm availability and git repository initialization are explicit first checkpoints.
- Completeness scan: no task depends on an unspecified implementation slot without a concrete checkpoint or test.
